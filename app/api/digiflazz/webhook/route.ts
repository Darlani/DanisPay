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

    // 3. LOGIKA UPDATE DATABASE BERDASARKAN STATUS [cite: 2026-02-11]
    if (status === 'Sukses') {
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'Berhasil', 
          sn: sn,
          raw_tagihan: eventData.price || 0,
          desc: eventData.desc || null,
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', refId);
        
      await reportToTelegram(`✅ <b>TRANSAKSI SUKSES!</b>\n\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>\n💰 Status: Sukses di Supplier`);

    } else if (status === 'Pending') {
      // Update SN saja agar user tahu proses sedang berjalan [cite: 2026-02-17]
      await supabaseAdmin
        .from('orders')
        .update({ 
          sn: sn,
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', refId);
        
      await reportToTelegram(`⏳ <b>TRANSAKSI PENDING!</b>\n\n🆔 Inv: <code>${refId}</code>\n📦 SN: <code>${sn}</code>\n⚠️ Status: Sedang diproses supplier`);

    } else if (status === 'Gagal') {
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'Gagal', 
          notes: message,
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', refId);
        
      await reportToTelegram(`❌ <b>TRANSAKSI GAGAL!</b>\n\n🆔 Inv: <code>${refId}</code>\n⚠️ Alasan: ${message}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 Webhook Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}