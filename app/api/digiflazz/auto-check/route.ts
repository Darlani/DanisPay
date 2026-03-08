import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// 1. FUNGSI LAPOR TELEGRAM [cite: 2026-02-11]
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

export async function GET(req: Request) {
  try {
    // 1. SATPAM API: Gunakan secret agar tidak sembarang orang bisa manggil [cite: 2026-03-06]
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get('secret');
    const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

    if (querySecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Akses Ditolak!" }, { status: 401 });
    }

    // 2. CARI PESANAN YANG STATUSNYA 'DIPROSES' [cite: 2026-03-06]
    // Kita ambil maksimal 5 order per menit agar tidak kena rate limit Digiflazz
    const { data: pendingOrders, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('status', 'Diproses')
      .order('updated_at', { ascending: true })
      .limit(5);

    if (fetchErr || !pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ message: "Tidak ada pesanan yang perlu dicek." });
    }

    console.log(`🕵️ [AUTO-CHECK] Memulai patroli untuk ${pendingOrders.length} pesanan...`);

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    // 3. LOOPING JEMPUT BOLA
    for (const order of pendingOrders) {
      const sign = crypto.createHash('md5').update(username + apiKey + order.order_id).digest('hex');
      const isPostpaid = (order.category || "").toLowerCase().includes('pascabayar');

      const payload: any = {
        username,
        buyer_sku_code: order.sku,
        customer_no: order.game_id,
        ref_id: order.order_id,
        sign: sign
      };

      if (isPostpaid) payload.commands = "status-pasca";

      try {
        const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await digiRes.json();
        const digiData = result.data;

        if (digiData) {
          const newStatus = digiData.status; // Sukses, Gagal, Pending
          const sn = digiData.sn || order.sn;

          if (newStatus === 'Sukses') {
            await supabaseAdmin.from('orders').update({
              status: 'Berhasil',
              sn: sn,
              raw_tagihan: digiData.price || 0,
              desc: digiData.desc || null,
              updated_at: new Date().toISOString()
            }).eq('order_id', order.order_id);

            await reportToTelegram(`🤖 <b>AUTO-CHECK SUKSES!</b>\n\n🆔 Inv: <code>${order.order_id}</code>\n📦 SN: <code>${sn}</code>\n💰 Status: Otomatis sinkron via Patroli.`);
          } 
          else if (newStatus === 'Gagal') {
            await supabaseAdmin.from('orders').update({
              status: 'Gagal',
              notes: digiData.message,
              updated_at: new Date().toISOString()
            }).eq('order_id', order.order_id);

            await reportToTelegram(`🤖 <b>AUTO-CHECK GAGAL!</b>\n\n🆔 Inv: <code>${order.order_id}</code>\n⚠️ Alasan: ${digiData.message}`);
          }
        }
      } catch (e) {
        console.error(`Gagal cek order ${order.order_id}:`, e);
      }
    }

    return NextResponse.json({ success: true, processed: pendingOrders.length });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}