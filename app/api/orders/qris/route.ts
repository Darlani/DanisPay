import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; // Gunakan admin untuk query

// Kode mentah dari GoPay Bos
const BASE_STATIC_QRIS = process.env.QRIS_BASE_STATIC || "";

function generateDynamicQRIS(staticQRIS: string, nominal: number) {
  // 1. Ambil string asli dari .env
  let payload = staticQRIS.trim();

  // PENTING: Jangan ubah "010211" menjadi "010212".
  // Biarkan berstatus "Statis" (11) di mata Bank, TAPI kita injeksi nominal (Tag 54) ke dalamnya.
  // Ini trik "Open-Static" aman untuk menghindari validasi Tag 62 dari bank.
  
  // 2. Buang CRC bawaan di paling belakang (Hapus 4 karakter hex: "XXXX")
  // Kita HANYA buang nilainya, jangan buang tag "6304"-nya
  payload = payload.slice(0, -4);

  // 3. Inject Nominal (Tag 54) persis sebelum Tag 58
  const amountStr = Math.floor(nominal).toString();
  const tag54 = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  
  if (payload.includes("5802ID")) {
    const parts = payload.split("5802ID");
    payload = parts[0] + tag54 + "5802ID" + parts[1];
  } else {
    // Fallback darurat jika aneh
    payload = payload.replace("6304", tag54 + "6304"); 
  }

  // 4. Hitung ulang CRC16
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }

  const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID missing" }, { status: 400 });
    }

    // Pagar Pengaman: Pastikan kunci QRIS di .env sudah diisi [cite: 2026-03-06]
    if (!BASE_STATIC_QRIS) {
      console.error("❌ Error: QRIS_BASE_STATIC belum diisi di .env VPS!");
      return NextResponse.json({ error: "Sistem QRIS belum siap" }, { status: 500 });
    }

// Ambil data spesifik agar performa maksimal
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount, status, qris_string, created_at') // Tambahkan created_at di sini
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

  if (order.status !== 'Pending') {
      return NextResponse.json({ error: "Order is not pending" }, { status: 400 });
    }

    // Pagar Keamanan: Cek apakah sudah lewat 2 jam (Sinkron dengan Frontend)
    const createdAt = new Date(order.created_at).getTime();
    const now = new Date().getTime();
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    if (now - createdAt > twoHoursInMs) {
      // Opsional: Update status jadi Gagal/Expired di sini biar database bersih
      await supabaseAdmin
        .from('orders')
        .update({ status: 'Gagal' })
        .eq('order_id', orderId);

      return NextResponse.json({ error: "Order sudah kadaluarsa (2 jam)" }, { status: 400 });
    }

    // Jika sudah ada QRIS, langsung return (Hemat CPU & Speed < 200ms)
    if (order.qris_string) {
      return NextResponse.json({ 
        success: true, 
        qrisString: order.qris_string 
      });
    }

// Pastikan nominal adalah angka bulat untuk Tag 54
    const nominalAmount = Math.floor(Number(order.total_amount));

    // Generate string QRIS Dinamis
    const dynamicString = generateDynamicQRIS(BASE_STATIC_QRIS, nominalAmount);

    // Update 'updated_at' & Simpan QRIS agar tidak generate ulang
    // Kita jalankan update, lalu return hasil ke user
    await supabaseAdmin
      .from('orders')
      .update({ 
        updated_at: new Date().toISOString(),
        qris_string: dynamicString // Masukkan ke kolom baru
      })
      .eq('order_id', orderId);

    return NextResponse.json({ 
      success: true, 
      qrisString: dynamicString 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}