import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; // Gunakan admin untuk query

// Kode mentah dari GoPay Bos
const BASE_STATIC_QRIS = process.env.QRIS_BASE_STATIC || "";

// Helper buat bersihin karakter (opsional, jangan dipakai ke seluruh string QRIS)
function sanitizeString(str: string) {
  return str.replace(/[ ,&]/g, ""); 
}

function generateDynamicQRIS(staticQRIS: string, nominal: number) {
  // 1. Bersihkan string awal
  let base = staticQRIS.trim();
  
  // 2. Fix Nama Merchant (Tag 59) -> BNI/Mandiri alergi karakter ',' dan '&'
  // Kita ganti menjadi spasi agar tetap 23 karakter: "DAPAY  PULSA   INTERNET"
  if (base.includes("5923DaPay, Pulsa & Internet")) {
     base = base.replace("5923DaPay, Pulsa & Internet", "5923DAPAY PULSA DAN INTERNET");
  }

  // 3. Fix Kode Pos Rusak (Tag 61) -> Ganti '0A' menjadi standar '05' + 5 digit angka
  if (base.includes("610A01")) {
    base = base.replace("610A01", "610500000"); 
  }

  // 4. Ubah ke Dinamis (010212) & Potong sebelum Tag 63 (CRC)
  let payload = base.replace("010211", "010212").split("6304")[0];
  
  // 5. Format & Inject Nominal (Tag 54) + No Tip (Tag 55)
  const amountStr = Math.floor(nominal).toString();
  const tag54 = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  const tag55 = "550201";

  if (payload.includes("5303360")) {
    payload = payload.replace(/54\d{2}\d+/, "").replace(/55\d{2}\d+/, "");
    payload = payload.replace("5303360", `5303360${tag54}${tag55}`);
  } else {
    payload += tag54 + tag55;
  }

  // 6. Hitung ulang CRC16 agar bank percaya ini data valid
  payload += "6304";
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