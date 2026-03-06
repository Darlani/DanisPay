import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, email, use_koin } = body;

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || ""; 

    if (!username || !apiKey) {
      return NextResponse.json({ error: "Konfigurasi Digiflazz di .env belum lengkap!" }, { status: 500 });
    }

    // 1. VALIDASI ORDER & AMBIL SAKLAR SETTINGS
    const [orderRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('orders').select('*').eq('order_id', order_id).single(),
      supabaseAdmin.from('store_settings').select('is_digiflazz_active').single()
    ]);

    const order = orderRes.data;
    const isLiveMode = settingsRes.data?.is_digiflazz_active === true; // CEK SAKLAR BOS!

    if (orderRes.error || !order) return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    // Izinkan status 'Pending' (dari Web) dan 'Diproses' (dari Admin/Koin/Webhook)
    if (order.status !== 'Pending' && order.status !== 'Diproses') {
      return NextResponse.json({ error: "Pesanan sudah diproses!" }, { status: 400 });
    }

    // 2. CABANG LOGIKA: LIVE VS SIMULASI
    if (isLiveMode) {
      console.log(`🚀 [PRABAYAR LIVE] Menembak API Digiflazz untuk Order #${order_id}...`);
      
      const sign = crypto.createHash('md5').update(username + apiKey + order_id).digest('hex');

      // TEMBAK API DIGIFLAZZ (KHUSUS PRABAYAR, TANPA COMMANDS)
      const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          buyer_sku_code: order.sku,
          customer_no: order.game_id,
          ref_id: order_id,
          sign: sign
          // Tidak pakai "commands: pay-pasca" di sini Bos!
        })
      });

      const digiData = await digiRes.json();

      if (digiData.data && (digiData.data.status === 'Sukses' || digiData.data.status === 'Pending')) {
        const isSuccess = digiData.data.status === 'Sukses';
        
        await supabaseAdmin.from('orders').update({ 
          // Pakai status 'Diproses' untuk jembatan UI loading
          status: isSuccess ? 'Berhasil' : 'Diproses',
          sn: digiData.data.sn || 'Proses di Vendor'
        }).eq('order_id', order_id);

        return NextResponse.json({ success: true, status: digiData.data.status, sn: digiData.data.sn });
      } else {
        return NextResponse.json({ error: digiData.data?.message || "Gagal diproses oleh Vendor", raw: digiData.data }, { status: 500 });
      }

    } else {
      // 🛠️ MODE SIMULASI PRABAYAR
      console.log(`🛠️ [PRABAYAR SIMULASI] Order #${order_id} diskip dari Digiflazz. Saldo AMAN!`);
      const dummySN = `SIM-PRA-${Math.floor(Math.random() * 999999)}`;
      
      await supabaseAdmin.from('orders').update({ status: 'Berhasil', sn: dummySN }).eq('order_id', order_id);

      return NextResponse.json({ success: true, status: 'Sukses', sn: dummySN, message: "Simulasi Prabayar berhasil." });
    }

  } catch (err: any) {
    console.error("Fatal Error Checkout Prabayar:", err.message);
    return NextResponse.json({ error: "Terjadi kesalahan internal!" }, { status: 500 });
  }
}