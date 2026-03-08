import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// 1. FUNGSI LAPOR TELEGRAM (Internal)
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
    const { order_id } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: "Order ID diperlukan" }, { status: 400 });
    }

    // 1. AMBIL DATA ORDER DARI DATABASE
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order tidak ditemukan di DB" }, { status: 404 });
    }

    // PROTEKSI 90 HARI (Aturan Digiflazz: Jangan cek status > 90 hari agar tidak jadi order baru) [cite: 2026-03-06]
    const createdDate = new Date(order.created_at);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    if (createdDate < ninetyDaysAgo) {
      return NextResponse.json({ error: "Order terlalu lama (> 90 hari), dilarang cek status!" }, { status: 403 });
    }

    // 2. SIAPKAN KREDENSI DIGIFLAZZ
    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";
    const sign = crypto.createHash('md5').update(username + apiKey + order_id).digest('hex');

    const kategori = (order.category || "").toLowerCase();
    const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');

    // 3. TEMBAK API CEK STATUS (Digiflazz v1)
    console.log(`🔍 [CHECK STATUS] Menjemput bola untuk Inv: ${order_id} (${isPostpaid ? 'Pascabayar' : 'Prabayar'})`);

    const payload: any = {
      username,
      buyer_sku_code: order.sku,
      customer_no: order.game_id,
      ref_id: order_id,
      sign: sign
    };

    // Jika Pascabayar, tambahkan command status-pasca sesuai dokumentasi
    if (isPostpaid) {
      payload.commands = "status-pasca";
    }

    const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await digiRes.json();
    const digiData = result.data;

    if (!digiData) {
      return NextResponse.json({ error: "Tidak ada respon dari Digiflazz", raw: result }, { status: 500 });
    }

    const newStatus = digiData.status; // Sukses, Gagal, Pending
    const sn = digiData.sn || order.sn;
    const message = digiData.message;

    // 4. LOGIKA UPDATE DATABASE (Sesuai masukan Bos: Isi modal saat sudah Sukses) [cite: 2026-03-06]
    if (newStatus === 'Sukses') {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'Berhasil',
          sn: sn,
          raw_tagihan: digiData.price || 0, // Isi modal di sini Bos!
          desc: digiData.desc || null,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', order_id);

      await reportToTelegram(`✅ <b>DETEKTIF BERHASIL!</b>\n\n🆔 Inv: <code>${order_id}</code>\n📦 SN: <code>${sn}</code>\n💰 Info: Status diperbarui via Jemput Bola.`);
    } 
    else if (newStatus === 'Gagal') {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'Gagal',
          notes: message,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', order_id);

      await reportToTelegram(`❌ <b>DETEKTIF MELAPORKAN GAGAL!</b>\n\n🆔 Inv: <code>${order_id}</code>\n⚠️ Alasan: ${message}`);
    }

    return NextResponse.json({ 
      success: true, 
      status: newStatus, 
      sn: sn, 
      message: message,
      price: digiData.price 
    });

  } catch (err: any) {
    console.error("🔥 Error Check Status:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}