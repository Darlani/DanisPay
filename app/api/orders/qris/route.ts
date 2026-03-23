import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; // Gunakan admin untuk query

// Kode mentah dari GoPay Bos
const BASE_STATIC_QRIS = process.env.QRIS_BASE_STATIC || "";

// Helper buat bersihin karakter (opsional, jangan dipakai ke seluruh string QRIS)
function sanitizeString(str: string) {
  return str.replace(/[ ,&]/g, ""); 
}

function generateDynamicQRIS(staticQRIS: string, nominal: number) {
  // 1. Ambil string sehat dari .env (tanpa di-sanitize aneh-aneh)
  let payload = staticQRIS.trim();

  // 2. Ubah tipe dari Statis (11) ke Dinamis (12)
  payload = payload.replace("010211", "010212");

  // 3. Buang CRC bawaan di paling belakang (Hapus 8 karakter: "6304" + "XXXX")
  payload = payload.slice(0, -8);

  // 4. Siapkan Nominal (Tag 54)
  const amountStr = Math.floor(nominal).toString();
  const tag54 = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;

  // 5. Inject Nominal TEPAT setelah Tag 53 (Persis kelakuan aplikasi GoPay)
  if (payload.includes("5303360")) {
    const parts = payload.split("5303360");
    // Gabungkan kembali: Bagian Kiri + 5303360 + Nominal + Bagian Kanan
    payload = parts[0] + "5303360" + tag54 + parts[1];
  } else {
    payload += tag54;
  }

  // 6. Tutup dengan Header CRC
  payload += "6304";

  // 7. Mesin Hitung CRC16 (Wajib agar Bank percaya)
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