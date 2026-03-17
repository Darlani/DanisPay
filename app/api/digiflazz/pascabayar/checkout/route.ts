import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios'; // <--- TAMBAHKAN INI

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id } = body;

    const username = process.env.DIGIFLAZZ_USERNAME!;
    const apiKey = process.env.DIGIFLAZZ_API_KEY!;

    if (!username || !apiKey) {
      return NextResponse.json({ error: "Konfigurasi Digiflazz di .env belum lengkap!" }, { status: 500 });
    }

    // 1. AMBIL DATA ORDER & CEK SAKLAR LIVE
    const [orderRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('orders').select('id, order_id, status, sku, game_id, category').eq('order_id', order_id).single(),
      supabaseAdmin.from('store_settings').select('is_digiflazz_active').single()
    ]);

    const order = orderRes.data;
    const isLiveMode = settingsRes.data?.is_digiflazz_active === true;

    if (orderRes.error || !order) return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    if (order.status !== 'Pending' && order.status !== 'Diproses') {
      return NextResponse.json({ error: "Pesanan sudah diproses!" }, { status: 400 });
    }

    // 2. CABANG LOGIKA
if (isLiveMode) {
      console.log(`🚀 [PASCABAYAR LIVE] Mengeksekusi Pembayaran Order #${order_id}...`);
      
      const sign = crypto.createHash('md5').update(username + apiKey + order_id).digest('hex');

      // 1. Bersihkan ID & Paksa SKU Uppercase (Deklarasi Tunggal)
      const cleanCustomerId = order.game_id.split('(')[0].trim();
      const upperSku = order.sku.toUpperCase();

      try {
        // 2. Tembak API Digiflazz pakai Axios biar stabil
        const digiRes = await axios.post('https://api.digiflazz.com/v1/transaction', {
          commands: "pay-pasca", 
          username,
          buyer_sku_code: upperSku,
          customer_no: cleanCustomerId,
          ref_id: order_id,
          sign: sign
        }, { timeout: 30000 });

        const digiData = digiRes.data.data;

        // 3. Penanganan Respon
        if (digiData && (digiData.status === 'Sukses' || digiData.status === 'Pending')) {
          const isSuccess = digiData.status === 'Sukses';
          
          const updatePayload: any = { 
            status: isSuccess ? 'Berhasil' : 'Diproses',
            sn: digiData.sn || 'Proses di Vendor',
            api_ref_id: order_id, 
            vendor_sku: order.sku,
            updated_at: new Date().toISOString()
          };

          if (digiData.desc && typeof digiData.desc === 'object') {
              updatePayload.raw_tagihan = digiData.price || 0;
              updatePayload.desc = JSON.stringify(digiData.desc);
              updatePayload.customer_name = digiData.desc.nama || digiData.desc.nama_pelanggan || null;
              
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
          return NextResponse.json({ error: digiData?.message || "Gagal diproses oleh Vendor" }, { status: 500 });
        }
      } catch (axiosErr: any) {
        console.error("🔥 Axios Error:", axiosErr.message);
        return NextResponse.json({ error: "Gagal koneksi ke Digiflazz!" }, { status: 500 });
      }

    } else {
      // 🛠️ MODE SIMULASI
      console.log(`🛠️ [MODE SIMULASI] Saldo aman, hanya simulasi.`);
      const dummySN = `SIM-${Math.floor(Math.random() * 999999)}`;
      await supabaseAdmin.from('orders').update({ 
        status: 'Berhasil', 
        sn: dummySN,
        updated_at: new Date().toISOString()
      }).eq('order_id', order_id);

      return NextResponse.json({ success: true, status: 'Sukses', sn: dummySN });
    }

  } catch (err: any) {
    console.error("🔥 Fatal Error Checkout:", err.message);
    return NextResponse.json({ error: "Terjadi kesalahan internal!" }, { status: 500 });
  }
}