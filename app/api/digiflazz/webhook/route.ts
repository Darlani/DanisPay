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

    const refId = eventData.ref_id;
    const status = eventData.status; // 'Sukses', 'Gagal', 'Pending'
    const sn = eventData.sn || "NO-SN";
    const message = eventData.message;

// 3. LOGIKA UPDATE DATABASE & REFUND [cite: 2026-03-09]
    console.log(`📝 [DIGIFLAZZ UPDATE] RefID: ${refId} | Status: ${status} | SN: ${sn}`);

// A. Ambil data spesifik (Optimasi < 200ms & ganti ke kolom balance) [cite: 2026-03-09]
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, status, profiles(id, balance)')
      .eq('order_id', refId)
      .single();

    if (!order) {
      console.error("❌ Order tidak ditemukan di database!");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (status === 'Sukses') {
      const modalAsli = eventData.price || 0;
      await supabaseAdmin.from('orders').update({ 
          status: 'Berhasil', sn, raw_tagihan: modalAsli,
          notes: 'Transaksi diselesaikan oleh Webhook Supplier',
          updated_at: new Date().toISOString() 
        }).eq('id', order.id);
      await reportToTelegram(`✅ <b>SUKSES!</b>\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>`);

    } else if (status === 'Pending') {
      await supabaseAdmin.from('orders').update({ sn, updated_at: new Date().toISOString() }).eq('id', order.id);
      await reportToTelegram(`⏳ <b>PENDING!</b>\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>`);

    } else if (status === 'Gagal' && order.status !== 'Gagal') {
      // B. EKSEKUSI LOGIKA REFUND (Harga + Kode Unik) [cite: 2026-03-08]
      const refundValue = order.total_amount; 

    if (order.user_id) {
        // SKENARIO MEMBER: Refund ke Saldo Balance (Sesuai database lama) [cite: 2026-03-09]
        const currentBalance = (order.profiles as any)?.balance || 0;
        await supabaseAdmin.from('profiles').update({ balance: currentBalance + refundValue }).eq('id', order.user_id);
        
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