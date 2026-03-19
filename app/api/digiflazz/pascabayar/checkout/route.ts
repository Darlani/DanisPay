import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 🚀 FUNGSI INI ADALAH LOGIKA MURNI (Jalur VVIP)
 * Bisa dipanggil langsung oleh Admin (manage/route.ts) tanpa lewat HTTP Request
 */
export async function runCheckoutPascabayar(order_id: string) {
  try {
    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) return { error: "Konfigurasi Digiflazz di server tidak lengkap!" };

    // 1. Ambil data order lengkap
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, api_ref_id, status, sku, game_id, category')
      .eq('order_id', order_id)
      .single();

    if (orderErr || !order) return { error: "Pesanan tidak ditemukan di database." };
    if (order.status === 'Berhasil') return { error: "Pesanan ini sudah sukses sebelumnya." };

    const { data: settings } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();
    const isLiveMode = settings?.is_digiflazz_active === true;

    if (isLiveMode) {
      console.log(`📡 [LOGIKA VVIP] Menembak PAY-PASCA untuk ID: ${order_id}`);
      
      // Gunakan api_ref_id yang kita simpan saat Cek Tagihan agar Digiflazz kenal
      const targetRefId = order.api_ref_id || order.order_id;
      const sign = crypto.createHash('md5').update(username + apiKey + targetRefId).digest('hex');
      const cleanCustomerNo = order.game_id.split('(')[0].trim();
      const upperSku = order.sku.toUpperCase();

      const res = await axios.post('https://api.digiflazz.com/v1/transaction', {
        commands: "pay-pasca",
        username: username,
        buyer_sku_code: upperSku,
        customer_no: cleanCustomerNo,
        ref_id: targetRefId,
        sign: sign
      }, { timeout: 45000 });

      const digiData = res.data.data;

      if (digiData && (digiData.status === 'Sukses' || digiData.status === 'Pending')) {
        const isSuccess = digiData.status === 'Sukses';
        const updatePayload: any = { 
          status: isSuccess ? 'Berhasil' : 'Diproses',
          sn: digiData.sn || 'Proses di Vendor',
          vendor_sku: order.sku,
          updated_at: new Date().toISOString()
        };

        // Ekstraksi data detail jika ada
        if (digiData.desc && typeof digiData.desc === 'object') {
            updatePayload.desc = JSON.stringify(digiData.desc);
            updatePayload.raw_tagihan = digiData.price || 0;
            updatePayload.customer_name = digiData.customer_name || digiData.desc.nama || null;
            const tarif = digiData.desc.tarif || "";
            const daya = digiData.desc.daya || "";
            if (tarif || daya) updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
            // 🚀 Sekarang dia cek di .tagihan.detail atau langsung di .detail
            const detail = digiData.desc.tagihan?.detail?.[0] || digiData.desc.detail?.[0];

            if (detail?.meter_awal && detail?.meter_akhir) {
                updatePayload.stand_meter = `${detail.meter_awal} - ${detail.meter_akhir}`;
            }
        }

        await supabaseAdmin.from('orders').update(updatePayload).eq('order_id', order_id);
        return { success: true, status: digiData.status, data: digiData };

      } else {
        return { error: digiData?.message || "Vendor Digiflazz menolak transaksi.", rc: digiData?.rc };
      }
    } else {
      // MODE SIMULASI
      const dummySN = `SIM-${Math.floor(Math.random() * 99999999)}`;
      await supabaseAdmin.from('orders').update({ 
        status: 'Berhasil', 
        sn: dummySN, 
        updated_at: new Date().toISOString() 
      }).eq('order_id', order_id);
      return { success: true, status: 'Sukses (Simulasi)', sn: dummySN };
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.data?.message || err.message;
    console.error("🔥 Error di runCheckoutPascabayar:", errorMsg);
    return { error: errorMsg };
  }
}

/**
 * 🌐 HANDLER API NORMAL (Untuk dipanggil dari Frontend/Browser)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id } = body;
    
    if (!order_id) return NextResponse.json({ error: "Order ID wajib diisi!" }, { status: 400 });

    const result = await runCheckoutPascabayar(order_id);

    if (result.error) {
      return NextResponse.json({ error: result.error, rc: result.rc }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal membaca data request." }, { status: 500 });
  }
}