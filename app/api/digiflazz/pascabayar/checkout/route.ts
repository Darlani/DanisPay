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
      return NextResponse.json({ error: "Konfigurasi Digiflazz di .env belum lengkap!" }, { status: 500 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, status, sku, game_id, category')
      .eq('order_id', order_id)
      .single();

    const { data: settings } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();
    const isLiveMode = settings?.is_digiflazz_active === true;

    if (orderErr || !order) return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    if (order.status === 'Berhasil') return NextResponse.json({ error: "Pesanan sudah sukses!" }, { status: 400 });

    if (isLiveMode) {
      console.log(`🚀 [PASCABAYAR LIVE] Mengeksekusi Pembayaran Order #${order_id}...`);
      
      const sign = crypto.createHash('md5').update(username + apiKey + order_id).digest('hex');
      const cleanCustomerNo = order.game_id.split('(')[0].trim();
      const upperSku = order.sku.toUpperCase();

      try {
        // =================================================================
        // 🚀 LANGKAH 1: INQUIRY KILAT SEBELUM BAYAR
        // =================================================================
        console.log(`[1/3] Menembak Inquiry ke Digiflazz untuk ref_id: ${order_id}`);
        const inqRes = await axios.post('https://api.digiflazz.com/v1/transaction', {
          commands: "inq-pasca",
          username: username,
          buyer_sku_code: upperSku,
          customer_no: cleanCustomerNo,
          ref_id: order_id, 
          sign: sign
        }, { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000 
        });

        const inqData = inqRes.data.data;
        
        // JIKA INQUIRY DITOLAK (Misal: Sudah dibayar / ID Salah), hentikan!
        if (inqData?.status === "Gagal") {
            console.error(`❌ Inquiry Ditolak Digiflazz: ${inqData.message}`);
            return NextResponse.json({ error: inqData.message || "Gagal sinkronisasi data tagihan.", rc: inqData.rc }, { status: 400 });
        }

        // =================================================================
        // ⏳ LANGKAH 2: JEDA NAPAS 1.5 DETIK (ANTI RACE-CONDITION)
        // Memberi waktu server Digiflazz menyimpan ID kita
        // =================================================================
        console.log(`[2/3] Inquiry diterima. Menjeda 1.5 detik agar database vendor sinkron...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // =================================================================
        // 🚀 LANGKAH 3: PROSES PEMBAYARAN (PAY-PASCA)
        // =================================================================
        console.log(`[3/3] Menembak Pay-Pasca ke Digiflazz...`);
        const res = await axios.post('https://api.digiflazz.com/v1/transaction', {
          commands: "pay-pasca",
          username: username,
          buyer_sku_code: upperSku,
          customer_no: cleanCustomerNo,
          ref_id: order_id, // PASTI COCOK!
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
            api_ref_id: order_id, 
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

          return NextResponse.json({ 
            success: true, 
            status: digiData.status, 
            sn: digiData.sn,
            message: digiData.message 
          });

        } else {
          console.error(`❌ [DIGIFLAZZ FAIL] Order #${order_id}: ${digiData?.message}`);
          return NextResponse.json({ 
            error: digiData?.message || "Gagal diproses oleh Vendor",
            rc: digiData?.rc 
          }, { status: 500 });
        }

      } catch (axiosErr: any) {
        console.error("🔥 Error Koneksi Digiflazz:", axiosErr.message);
        return NextResponse.json({ error: "Gagal menghubungi server Digiflazz. Cek Jaringan/Saldo!" }, { status: 500 });
      }

    } else {
      console.log(`🛠️ [MODE SIMULASI] Order #${order_id} - Bypass Vendor.`);
      const dummySN = `SIM-${Math.floor(Math.random() * 99999999)}`;
      await supabaseAdmin.from('orders').update({ 
        status: 'Berhasil', 
        sn: dummySN,
        updated_at: new Date().toISOString()
      }).eq('order_id', order_id);

      return NextResponse.json({ success: true, status: 'Sukses', sn: dummySN });
    }

  } catch (err: any) {
    console.error("🔥 Fatal Error Checkout:", err.message);
    return NextResponse.json({ error: "Terjadi kesalahan internal sistem!" }, { status: 500 });
  }
}