import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// 1. FUNGSI LAPOR TELEGRAM
async function reportToTelegram(message: string) {
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
    // 0. LOG AKSES MASUK
    const clientIp = req.headers.get('x-forwarded-for') || "Unknown IP";
    console.log(`📡 [DIGIFLAZZ CALLBACK] Incoming request from: ${clientIp}`);

    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = req.headers.get('X-Digiflazz-Delivery');
    
    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const secretKey = process.env.DIGIFLAZZ_API_KEY?.trim() || ""; 

    // 2. VALIDASI KEAMANAN (MD5)
    if (!signature) return NextResponse.json({ error: "No Signature" }, { status: 401 });

    const expectedSignature = crypto.createHash('md5').update(username + secretKey + rawBody).digest('hex');

    if (signature !== expectedSignature) {
       console.error("❌ Upaya Ilegal! Signature Digiflazz tidak cocok.");
       return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
    }

    console.log("📩 WEBHOOK DIGIFLAZZ MASUK:", body);

    const eventData = body.data;
    if (!eventData) return NextResponse.json({ message: "No Data" }, { status: 400 });

    const rawRefId = eventData.ref_id;
    // Bersihaan embel-embel -R2, -R3, dst
    const cleanOrderId = rawRefId.replace(/-R\d+$/, '');
    const refId = cleanOrderId;

    const status = eventData.status; 
    const sn = eventData.sn || "NO-SN";
    const message = eventData.message;

    console.log(`📝 [DIGIFLAZZ UPDATE] RefID Asli: ${cleanOrderId} (Dari vendor: ${rawRefId}) | Status: ${status} | SN: ${sn}`);

    // A. Ambil data spesifik dari Database (Tambahkan : { data: any } agar TypeScript tidak cerewet)
    const { data: order }: { data: any } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, api_ref_id, sku, game_id, user_id, email, total_amount, status, category, product_name, price, used_balance, buy_price, profiles(id, balance, email)')
      .eq('order_id', cleanOrderId) 
      .single();

    if (!order) {
      console.error("❌ Order tidak ditemukan di database!");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // --- KUNCI ANTI-TABRAKAN FALLBACK ---
    if (order.api_ref_id && order.api_ref_id !== rawRefId) {
       console.log(`⚠️ Mengabaikan Webhook Usang. (Dari Vendor: ${rawRefId}, Yang Aktif di DB: ${order.api_ref_id})`);
       return NextResponse.json({ success: true, message: "Ignored outdated ref_id from previous fallback attempt" });
    }

    // 3. LOGIKA UPDATE DATABASE
    if (status === 'Sukses') {
      const kategori = (order.category || "").toLowerCase();
      const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');
      const isTokenPLN = kategori.includes('pln') || kategori.includes('token'); 

      const updatePayload: any = {
        status: 'Berhasil',
        sn: sn,
        notes: 'Transaksi diselesaikan oleh Webhook Supplier',
        updated_at: new Date().toISOString()
      };

      if (isPostpaid || isTokenPLN) {
        updatePayload.desc = eventData.desc || null;
        if (eventData.desc && typeof eventData.desc === 'object') {
          // 🚀 FALLBACK DETAIL: Cek di .detail atau .tagihan.detail agar anti-meleset
          const detail = eventData.desc.detail?.[0] || eventData.desc.tagihan?.detail?.[0];
          
          // Ambil Nama Pelanggan (Cari di semua kemungkinan folder)
          updatePayload.customer_name = eventData.desc.nama || eventData.desc.nama_pelanggan || eventData.customer_name || null;
          
          // Ambil Tarif/Daya
          const tarif = eventData.desc.tarif || "";
          const daya = eventData.desc.daya || "";
          if (tarif || daya) updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
          
          // 🚀 UPDATE STAND METER: Pastikan info meteran masuk ke database
          if (detail?.meter_awal && detail?.meter_akhir) {
            updatePayload.stand_meter = `${detail.meter_awal} - ${detail.meter_akhir}`;
          } else if (eventData.desc.stand_meter) {
            updatePayload.stand_meter = String(eventData.desc.stand_meter);
          }

          // Sinkronkan harga vendor ke raw_tagihan khusus Pascabayar
          if (isPostpaid) updatePayload.raw_tagihan = eventData.price || 0;
        }
      }

      await supabaseAdmin.from('orders').update(updatePayload).eq('id', order.id);
      await reportToTelegram(`✅ <b>SUKSES!</b>\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>`);

    } else if (status === 'Pending') {
      await supabaseAdmin.from('orders').update({ sn, updated_at: new Date().toISOString() }).eq('id', order.id);
      await reportToTelegram(`⏳ <b>PENDING!</b>\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>`);

    } else if (status === 'Gagal' && order.status !== 'Gagal') {
      
      // ====================================================================
      // 🚀 MESIN AUTO-RETRY VIA WEBHOOK (LEVEL DEWA)
      // ====================================================================
      const kategori = (order.category || "").toLowerCase();
      const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');

      if (!isPostpaid) {
        console.log(`⚠️ Webhook Gagal diterima. Mengecek Amunisi Auto-Retry untuk Order #${cleanOrderId}...`);
        
        let currentAttempt = 1;
        const match = order.api_ref_id?.match(/-R(\d+)$/);
        if (match) currentAttempt = parseInt(match[1], 10);

        // Ganti ke nama tabel baru: product_automatic [cite: 2026-03-13]
const { data: mainProd } = await supabaseAdmin.from('product_automatic').select('name, brand').eq('sku', order.sku).single();

        if (mainProd) {
          // 1. AMBIL NAMA UTUH (KECILKAN HURUFNYA & BERSIHKAN SPASI KOSONG)
          const exactTargetName = mainProd.name.toLowerCase().trim();
          const targetBrandSlug = mainProd.brand?.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || "";
          const isZonasi = (mainProd.name || "").toUpperCase().includes('ZONASI');

          const { data: candidates } = await supabaseAdmin.from('items')
            .select('sku, modal, name, zona_type')
            .eq('brand_slug', targetBrandSlug)
            .eq('is_active', true)
            .order('modal', { ascending: true }); // Tetap urutkan dari Termurah ke Termahal

          // 2. COCOKKAN NAMA 100% SAMA PERSIS (ANTI SALAH SASARAN!) [cite: 2026-03-07]
          const validAlternatives = (candidates || []).filter(item => {
            const itemName = item.name.toLowerCase().trim();
            const itemZona = (item.zona_type || "").toUpperCase() === 'ZONASI';
            
            // Kalau namanya gak sama persis, TOLAK MENTAH-MENTAH!
            return itemName === exactTargetName && itemZona === isZonasi;
          });

          if (currentAttempt < validAlternatives.length) {
            const nextAlt = validAlternatives[currentAttempt]; 
            const nextAttempt = currentAttempt + 1;
            const nextRefId = `${cleanOrderId}-R${nextAttempt}`;

            console.log(`🚀 [WEBHOOK AUTO-RETRY] Mengalihkan ke Supplier ke-${nextAttempt}: SKU ${nextAlt.sku}`);

            const sign = crypto.createHash('md5').update(username + secretKey + nextRefId).digest('hex');
            
            try {
              const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username, buyer_sku_code: nextAlt.sku, customer_no: order.game_id, ref_id: nextRefId, sign
                })
              });

              const digiData = await digiRes.json();
              const d = digiData.data;

              // BATALKAN REFUND JIKA RETRY SUKSES/PENDING
              if (d && (d.status === 'Sukses' || d.status === 'Pending')) {
                await supabaseAdmin.from('orders').update({
                  api_ref_id: nextRefId,
                  vendor_sku: nextAlt.sku,
                  status: d.status === 'Sukses' ? 'Berhasil' : 'Diproses',
                  sn: d.sn || `Retry Auto ke-${nextAttempt}`,
                  updated_at: new Date().toISOString()
                }).eq('id', order.id);

            // Mode Senyap: Tidak lapor Telegram saat ganti supplier otomatis via Webhook
            console.log(`🔄 [AUTO-RETRY WEBHOOK] Inv: ${cleanOrderId} otomatis pindah ke Supplier ke-${nextAttempt} (${nextAlt.sku})`);

            return NextResponse.json({ success: true, message: `Auto-Retry ke-${nextAttempt} Triggered` });
              }
            } catch (err) {
              console.error("🔥 Webhook Retry Gagal Koneksi:", err);
            }
          } else {
            console.log(`💀 Amunisi Habis! Semua ${validAlternatives.length} supplier gagal untuk Order #${cleanOrderId}. Melanjutkan Refund...`);
          }
        }
      }
      // ====================================================================

      // B. EKSEKUSI LOGIKA REFUND AKURAT (Jika semua amunisi habis / Pascabayar)
      const refundValue = order.total_amount; 

      if (order.user_id) {
        const currentBalance = (order.profiles as any)?.balance || 0;
        const newBalance = currentBalance + refundValue;
        const userEmail = (order.profiles as any)?.email || order.email;

        // 1. Update Saldo Utama
        await supabaseAdmin.from('profiles').update({ balance: newBalance }).eq('id', order.user_id);
        
        // 2. Catat Sejarah Mutasi
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
          notes: `Otomatis Refund Balance: Rp ${refundValue.toLocaleString('id-ID')} (Semua Suplier Gagal)`,
          updated_at: new Date().toISOString() 
        }).eq('id', order.id);
      } 
      else {
        // SKENARIO GUEST
        await supabaseAdmin.from('orders').update({ 
          status: 'Gagal', 
          notes: `Gagal - WAJIB REFUND MANUAL: Rp ${refundValue.toLocaleString('id-ID')} (GUEST / Suplier Habis)`,
          updated_at: new Date().toISOString() 
        }).eq('id', order.id);
      }

      // Hitung jumlah retry yang sudah dilakukan
      let currentAttempt = 1;
      const matchId = order.api_ref_id?.match(/-R(\d+)$/);
      if (matchId) currentAttempt = parseInt(matchId[1], 10);
      const retryText = currentAttempt > 1 ? `\n🔄 AUTO-RETRY HABIS: ${currentAttempt}x` : "";

      const nominalTransfer = (order.price || 0) + (order.used_balance || 0);
      const userStatus = order.user_id ? 'MEMBER (Koin Kembali)' : 'GUEST (Butuh Refund Manual)';

      await reportToTelegram(`❌ <b>TRANSAKSI GAGAL!</b> 😭${retryText}\n\n📦 Produk: ${order.product_name}\n💰 Nominal: Rp ${nominalTransfer.toLocaleString('id-ID')}\n⚠️ Alasan: ${message || 'Stok Kosong / Gangguan'}\n👤 User: ${userStatus}\n🆔 Inv: <code>${cleanOrderId}</code>\n🔄 Status: DIPROSES ➡️ GAGAL`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 Webhook Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}