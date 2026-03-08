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

    // 1. AMBIL VARIABEL DARI .ENV (SESUAIKAN NAMA VARIABEL BOS)
    const username = process.env.DIGIFLAZZ_USERNAME!;
    const apiKey = process.env.DIGIFLAZZ_API_KEY!; // Menggunakan API_KEY sesuai .env Bos

    // Proteksi jika lupa isi .env
    if (!username || !apiKey) {
      return NextResponse.json({ error: "Konfigurasi Digiflazz di .env belum lengkap!" }, { status: 500 });
    }

    // 2. VALIDASI ORDER & AMBIL SAKLAR SETTINGS
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

    // 3. CABANG LOGIKA: LIVE VS SIMULASI
    if (isLiveMode) {
      console.log(`🚀 [MODE LIVE] Menembak API Digiflazz untuk Order #${order_id}...`);
      
      // LOGIKA TANDA TANGAN (SIGNATURE) MD5 DIGIFLAZZ
      const sign = crypto.createHash('md5').update(username + apiKey + order_id).digest('hex');

      // TEMBAK API DIGIFLAZZ
      const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: "pay-pasca", // WAJIB ADA untuk lunasin tagihan pascabayar bos!
          username,
          buyer_sku_code: order.sku,
          customer_no: order.game_id,
          ref_id: order_id,
          sign: sign
        })
      });

      const digiData = await digiRes.json();

      // PENANGANAN RESPON DIGIFLAZZ
if (digiData.data && (digiData.data.status === 'Sukses' || digiData.data.status === 'Pending')) {
        const isSuccess = digiData.data.status === 'Sukses';
        
        // Biarkan raw_tagihan dan desc tetap kosong/NULL dulu Bos. 
        // Nanti diisi otomatis sama Webhook atau Auto-Check biar akurat 100%. [cite: 2026-03-06]
        await supabaseAdmin.from('orders').update({ 
          status: isSuccess ? 'Berhasil' : 'Diproses',
          sn: digiData.data.sn || 'Proses di Vendor',
          updated_at: new Date().toISOString() // Penting agar Auto-Check tidak bingung
        }).eq('order_id', order_id);

        return NextResponse.json({ 
          success: true, 
          status: digiData.data.status,
          sn: digiData.data.sn 
        });
      } else {
        return NextResponse.json({ 
          error: digiData.data?.message || "Gagal diproses oleh Vendor",
          raw: digiData.data 
        }, { status: 500 });
      }

    } else {
      // ==========================================================
      // 🛠️ MODE SIMULASI (AMAN DARI POTONGAN SALDO)
      // ==========================================================
      console.log(`🛠️ [MODE SIMULASI] Order #${order_id} diskip dari Digiflazz. Saldo AMAN!`);
      
      const dummySN = `SIM-${Math.floor(Math.random() * 999999)}`;
      
      await supabaseAdmin.from('orders').update({ 
        status: 'Berhasil', // Langsung anggap sukses di web kita
        sn: dummySN
      }).eq('order_id', order_id);

      return NextResponse.json({ 
        success: true, 
        status: 'Sukses',
        sn: dummySN,
        message: "Simulasi berhasil, tidak ada saldo Digiflazz yang terpotong."
      });
    }

  } catch (err: any) {
    console.error("Fatal Error Checkout:", err.message);
    return NextResponse.json({ error: "Terjadi kesalahan internal!" }, { status: 500 });
  }
}