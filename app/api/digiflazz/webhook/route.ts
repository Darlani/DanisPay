import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// 1. FUNGSI LAPOR TELEGRAM [cite: 2026-02-11]
async function reportToTelegram(message: string) {
  // Ambil dari Env agar token Bos tidak terlihat di GitHub [cite: 2026-03-06]
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
  } catch (err) {
    console.error("💀 Telegram Gagal:", err);
  }
}

export async function POST(req: Request) {
  try {
    // 0. LOG AKSES MASUK (Untuk pantauan PM2) [cite: 2026-03-06]
    const clientIp = req.headers.get('x-forwarded-for') || "Unknown IP";
    console.log(`📡 [DIGIFLAZZ CALLBACK] Incoming request from: ${clientIp}`);

    // Ambil text mentah (raw) terlebih dahulu untuk memastikan validasi signature akurat
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = req.headers.get('X-Digiflazz-Delivery');
    
    // Ambil data env [cite: 2026-02-11]
    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const secretKey = process.env.DIGIFLAZZ_API_KEY?.trim() || ""; 

    // 2. VALIDASI KEAMANAN (MD5 sesuai rumus Digiflazz) [cite: 2026-02-28]
    if (!signature) {
      return NextResponse.json({ error: "No Signature" }, { status: 401 });
    }

    // Langsung gunakan rawBody agar string yang dienkripsi sama persis dengan milik Digiflazz
    const expectedSignature = crypto
      .createHash('md5')
      .update(username + secretKey + rawBody)
      .digest('hex');

    // Aktifkan proteksi penuh sekarang karena sudah mengudara [cite: 2026-03-06]
    if (signature !== expectedSignature) {
       console.error("❌ Upaya Ilegal! Signature Digiflazz tidak cocok.");
       return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
    }

    console.log("📩 WEBHOOK DIGIFLAZZ MASUK:", body);

    const eventData = body.data;
    if (!eventData) return NextResponse.json({ message: "No Data" }, { status: 400 });

    const rawRefId = eventData.ref_id;
    
    // --- MAGIS AUTO-FALLBACK: Bersihaan embel-embel -R2, -R3, dst ---
    // Regex ini akan mencari "-R" yang diikuti angka di paling ujung string, lalu menghapusnya
    const cleanOrderId = rawRefId.replace(/-R\d+$/, '');
    const refId = cleanOrderId; // <--- TAMBAHKAN BARIS INI BOSKU!
    // ---------------------------------------------------------------

    const status = eventData.status; // 'Sukses', 'Gagal', 'Pending'
    const sn = eventData.sn || "NO-SN";
    const message = eventData.message;

// 3. LOGIKA UPDATE DATABASE & REFUND [cite: 2026-03-09]
    console.log(`📝 [DIGIFLAZZ UPDATE] RefID Asli: ${cleanOrderId} (Dari vendor: ${rawRefId}) | Status: ${status} | SN: ${sn}`);

// A. Ambil data spesifik (Anti select *, hemat resource < 200ms) [cite: 2026-03-09]
    // TAMBAHAN: Tarik juga kolom api_ref_id untuk mencocokkan jejak fallback
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, api_ref_id, user_id, email, total_amount, status, category, profiles(id, balance, email)')
      .eq('order_id', cleanOrderId) 
      .single();

    if (!order) {
      console.error("❌ Order tidak ditemukan di database!");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // --- KUNCI ANTI-TABRAKAN FALLBACK ---
    // Pastikan Webhook yang masuk adalah untuk percobaan (Ref ID) terakhir yang kita pakai!
    // Jika ada api_ref_id di DB, dan itu TIDAK SAMA dengan rawRefId dari Digiflazz, AABAIKAN!
    if (order.api_ref_id && order.api_ref_id !== rawRefId) {
       console.log(`⚠️ Mengabaikan Webhook Usang. (Dari Vendor: ${rawRefId}, Yang Aktif di DB: ${order.api_ref_id})`);
       return NextResponse.json({ success: true, message: "Ignored outdated ref_id from previous fallback attempt" });
    }
    // ------------------------------------

if (status === 'Sukses') {
      const kategori = (order.category || "").toLowerCase();
      const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');
      const isTokenPLN = kategori.includes('pln') || kategori.includes('token'); // <--- PENTING: Deteksi Token PLN

      // Siapkan update dasar untuk KEDUANYA (Prabayar & Pascabayar)
      const updatePayload: any = {
        status: 'Berhasil',
        sn: sn,
        notes: 'Transaksi diselesaikan oleh Webhook Supplier',
        updated_at: new Date().toISOString()
      };

      // JIKA PASCABAYAR ATAU TOKEN PLN: Tambahkan struk desc
      if (isPostpaid || isTokenPLN) {
        
        // Biarkan Supabase menyimpan object asli untuk tipe JSONB
        updatePayload.desc = eventData.desc || null;

        // --- MAGIS EKSTRAKSI DATA PASCABAYAR & TOKEN PLN ---
        if (eventData.desc && typeof eventData.desc === 'object') {
          // Ekstrak Nama
          updatePayload.customer_name = eventData.desc.nama || eventData.desc.nama_pelanggan || null;
          
          // Ekstrak Tarif & Daya
          const tarif = eventData.desc.tarif || "";
          const daya = eventData.desc.daya || "";
          if (tarif || daya) updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
          
          // Ekstrak Stand Meter (HANYA ADA DI PASCABAYAR)
          const detailTagihan = eventData.desc.tagihan?.detail?.[0];
          if (detailTagihan && detailTagihan.meter_awal && detailTagihan.meter_akhir) {
            updatePayload.stand_meter = `${detailTagihan.meter_awal} - ${detailTagihan.meter_akhir}`;
          } else if (eventData.desc.stand_meter) {
            updatePayload.stand_meter = String(eventData.desc.stand_meter);
          }
        }
      }

      await supabaseAdmin.from('orders').update(updatePayload).eq('id', order.id);
      await reportToTelegram(`✅ <b>SUKSES!</b>\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>`);

    } else if (status === 'Pending') {
      await supabaseAdmin.from('orders').update({ sn, updated_at: new Date().toISOString() }).eq('id', order.id);
      await reportToTelegram(`⏳ <b>PENDING!</b>\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>`);

  } else if (status === 'Gagal' && order.status !== 'Gagal') {
      // B. EKSEKUSI LOGIKA REFUND AKURAT (Sesuai kolom balance Bos) [cite: 2026-03-09]
      const refundValue = order.total_amount; 

      if (order.user_id) {
        const currentBalance = (order.profiles as any)?.balance || 0;
        const newBalance = currentBalance + refundValue;
        const userEmail = (order.profiles as any)?.email || order.email;

        // 1. Update Saldo Utama
        await supabaseAdmin.from('profiles').update({ balance: newBalance }).eq('id', order.user_id);
        
        // 2. Catat Sejarah Mutasi (Sesuai gambar tabel balance_logs Bos) [cite: 2026-03-09]
        await supabaseAdmin.from('balance_logs').insert([{
          user_id: order.user_id,
          user_email: userEmail,
          amount: refundValue,
          type: 'Refund',
          description: `Refund Gagal Order #${order.order_id}`,
          initial_balance: currentBalance,
          final_balance: newBalance
        }]);

        // 3. Update Status Order
        await supabaseAdmin.from('orders').update({ 
          status: 'Gagal', 
          notes: `Otomatis Refund Balance: Rp ${refundValue.toLocaleString('id-ID')}`,
          updated_at: new Date().toISOString() 
        }).eq('id', order.id);
      }
      
      else {
        // SKENARIO GUEST: Tandai Admin untuk Transfer Manual [cite: 2026-03-06]
        await supabaseAdmin.from('orders').update({ 
          status: 'Gagal', 
          notes: `Gagal - WAJIB REFUND MANUAL: Rp ${refundValue.toLocaleString('id-ID')} (GUEST)`,
          updated_at: new Date().toISOString() 
        }).eq('id', order.id);
      }
      await reportToTelegram(`❌ <b>GAGAL!</b>\n🆔 Inv: <code>${refId}</code>\n⚠️ Refund: ${order.user_id ? 'Koin Otomatis' : 'Manual (Guest)'}\n💬 Pesan: ${message}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 Webhook Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}