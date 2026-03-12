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

// 1. CEK SAKLAR DULU
    const { data: st } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();
    if (!st?.is_digiflazz_active) {
       return NextResponse.json({ error: "Mode Simulasi: Dilarang cek status ke vendor!" }, { status: 403 });
    }

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

    // --- KUNCI ANTI-BONCOS (Baca Rekam Jejak Auto-Fallback) ---
    const targetRefId = order.api_ref_id || order_id;
    const targetSku = order.vendor_sku || order.sku;
    // -----------------------------------------------------------

    const sign = crypto.createHash('md5').update(username + apiKey + targetRefId).digest('hex');

    const kategori = (order.category || "").toLowerCase();
    const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');
    const isTokenPLN = kategori.includes('pln') || kategori.includes('token'); // <--- TAMBAHAN DETEKSI TOKEN

    // 3. TEMBAK API CEK STATUS (Digiflazz v1)
    console.log(`🔍 [CHECK STATUS] Menjemput bola untuk Inv: ${targetRefId} (${isPostpaid ? 'Pascabayar' : 'Prabayar'})`);

    const payload: any = {
      username,
      buyer_sku_code: targetSku,
      customer_no: order.game_id,
      ref_id: targetRefId,
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

// 4. LOGIKA UPDATE DATABASE 
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

      await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('order_id', order_id); // Tetap cari berdasarkan ID Asli dari DB Bosku

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