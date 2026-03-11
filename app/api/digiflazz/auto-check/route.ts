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

export async function GET(req: Request) {
  try {
    // 1. SATPAM API
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get('secret');
    const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

    if (querySecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Akses Ditolak!" }, { status: 401 });
    }

    // 2. CARI PESANAN YANG STATUSNYA 'DIPROSES'
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
      
      // --- KUNCI ANTI-BONCOS (Membaca Rekam Jejak Auto-Fallback) ---
      // Jika ada api_ref_id (hasil fallback), pakai itu. Jika tidak, pakai order_id biasa.
      const targetRefId = order.api_ref_id || order.order_id;
      // Sama halnya dengan SKU, gunakan vendor_sku jika ada!
      const targetSku = order.vendor_sku || order.sku;
      // -----------------------------------------------------------

const sign = crypto.createHash('md5').update(username + apiKey + targetRefId).digest('hex');
      
      // --- DETEKSI KATEGORI (PASCABAYAR & TOKEN PLN) ---
      const kategori = (order.category || "").toLowerCase();
      const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');
      const isTokenPLN = kategori.includes('pln') || kategori.includes('token');
      // -------------------------------------------------

      const payload: any = {
        username,
        buyer_sku_code: targetSku,
        customer_no: order.game_id,
        ref_id: targetRefId,
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
            const updatePayload: any = {
              status: 'Berhasil',
              sn: sn, 
              updated_at: new Date().toISOString()
            };

            // JIKA PASCABAYAR ATAU TOKEN PLN: Bongkar data struk
            if (isPostpaid || isTokenPLN) {
              
              // Biarkan Supabase menyimpan object asli untuk tipe JSONB
              updatePayload.desc = digiData.desc || null;

              // --- MAGIS EKSTRAKSI DATA PASCABAYAR & TOKEN PLN ---
              if (digiData.desc && typeof digiData.desc === 'object') {
                updatePayload.customer_name = digiData.desc.nama || digiData.desc.nama_pelanggan || null;
                
                const tarif = digiData.desc.tarif || "";
                const daya = digiData.desc.daya || "";
                if (tarif || daya) updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
                
                // stand_meter HANYA ADA di Pascabayar
                const detailTagihan = digiData.desc.tagihan?.detail?.[0];
                if (detailTagihan && detailTagihan.meter_awal && detailTagihan.meter_akhir) {
                  updatePayload.stand_meter = `${detailTagihan.meter_awal} - ${detailTagihan.meter_akhir}`;
                } else if (digiData.desc.stand_meter) {
                  updatePayload.stand_meter = String(digiData.desc.stand_meter);
                }
              }
            }

            // Eksekusi Update
            await supabaseAdmin.from('orders').update(updatePayload).eq('order_id', order.order_id);
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