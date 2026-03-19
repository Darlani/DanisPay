import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id } = body;

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) {
      return NextResponse.json({ error: "Konfigurasi Digiflazz belum lengkap!" }, { status: 500 });
    }

    // 🚀 PERHATIAN: Pastikan api_ref_id ikut di-select!
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, api_ref_id, status, sku, game_id, category') 
      .eq('order_id', order_id)
      .single();

    const { data: settings } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();
    const isLiveMode = settings?.is_digiflazz_active === true;

    if (orderErr || !order) return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    if (order.status === 'Berhasil') return NextResponse.json({ error: "Pesanan sudah sukses!" }, { status: 400 });

    if (isLiveMode) {
      console.log(`🚀 [PASCABAYAR LIVE] Mengeksekusi Pembayaran Order #${order_id}...`);
      
      // 🚀 KUNCI SUKSES: Gunakan api_ref_id (ID saat Cek Tagihan di Frontend)
      const targetRefId = order.api_ref_id || order.order_id;
      const sign = crypto.createHash('md5').update(username + apiKey + targetRefId).digest('hex');
      
      const cleanCustomerNo = order.game_id.split('(')[0].trim();
      const upperSku = order.sku.toUpperCase();

      try {
        console.log(`📡 Menembak PAY-PASCA dengan Ref ID: ${targetRefId}`);
        // LANGSUNG TEMBAK PAY-PASCA (TIDAK ADA DOUBLE INQUIRY LAGI!)
        const res = await axios.post('https://api.digiflazz.com/v1/transaction', {
          commands: "pay-pasca",
          username: username,
          buyer_sku_code: upperSku,
          customer_no: cleanCustomerNo,
          ref_id: targetRefId, // Cocok 100% dengan ID Inquiry
          sign: sign
        }, { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000 
        });

        const digiData = res.data.data;

        if (digiData && (digiData.status === 'Sukses' || digiData.status === 'Pending')) {
          const isSuccess = digiData.status === 'Sukses';
          const updatePayload: any = { 
            status: isSuccess ? 'Berhasil' : 'Diproses',
            sn: digiData.sn || 'Proses di Vendor',
            vendor_sku: order.sku,
            updated_at: new Date().toISOString()
          };

          if (digiData.desc && typeof digiData.desc === 'object') {
              updatePayload.desc = JSON.stringify(digiData.desc);
              updatePayload.raw_tagihan = digiData.price || 0;
              updatePayload.customer_name = digiData.customer_name || digiData.desc.nama || null;
              const tarif = digiData.desc.tarif || "";
              const daya = digiData.desc.daya || "";
              if (tarif || daya) updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
              const detail = digiData.desc.tagihan?.detail?.[0];
              if (detail?.meter_awal && detail?.meter_akhir) {
                  updatePayload.stand_meter = `${detail.meter_awal} - ${detail.meter_akhir}`;
              }
          }

          await supabaseAdmin.from('orders').update(updatePayload).eq('order_id', order_id);
          return NextResponse.json({ success: true, status: digiData.status, sn: digiData.sn });

        } else {
          console.error(`❌ [DIGIFLAZZ FAIL] Msg: ${digiData?.message}`);
          return NextResponse.json({ error: digiData?.message || "Vendor Menolak", rc: digiData?.rc }, { status: 500 });
        }
      } catch (axiosErr: any) {
        // BONGKAR ERROR ASLI DARI DIGIFLAZZ
        const digiErrorMsg = axiosErr.response?.data?.data?.message || axiosErr.message;
        console.error(`🔥 Error Pay-Pasca (${targetRefId}):`, digiErrorMsg);
        return NextResponse.json({ error: digiErrorMsg }, { status: 500 });
      }
    } else {
      console.log(`🛠️ [MODE SIMULASI] Bypass Vendor.`);
      const dummySN = `SIM-${Math.floor(Math.random() * 99999999)}`;
      await supabaseAdmin.from('orders').update({ status: 'Berhasil', sn: dummySN }).eq('order_id', order_id);
      return NextResponse.json({ success: true, status: 'Sukses', sn: dummySN });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Terjadi kesalahan internal sistem!" }, { status: 500 });
  }
}