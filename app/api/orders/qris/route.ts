import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; // Gunakan admin untuk query

// Kode mentah dari GoPay Bos
const BASE_STATIC_QRIS = process.env.QRIS_BASE_STATIC || "";

function generateDynamicQRIS(staticQRIS: string, nominal: number) {
  // Ubah status jadi dinamis (010212) [cite: 2026-03-06]
  let payload = staticQRIS.replace("010211", "010212");
  
  // Cari posisi Tag 6304 (CRC) agar pemotongan presisi [cite: 2026-03-06]
  const crcTagIndex = payload.indexOf("6304");
  if (crcTagIndex !== -1) {
    payload = payload.substring(0, crcTagIndex);
  }

  // Inject Tag 54 (Amount)
  const amountStr = nominal.toString();
  const amountLen = amountStr.length.toString().padStart(2, '0');
  const tag54 = `54${amountLen}${amountStr}`;

  // Gabungkan payload + Tag 54 + Tag 6304 [cite: 2026-03-06]
  payload += tag54 + "6304";

  // Hitung CRC16-CCITT
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
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

    // Ambil nominal asli dari database (Anti-cheat)
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount, status')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== 'Pending') {
      return NextResponse.json({ error: "Order is not pending" }, { status: 400 });
    }

// Generate string QRIS Dinamis pakai data dari database [cite: 2026-03-06]
    const dynamicString = generateDynamicQRIS(BASE_STATIC_QRIS, order.total_amount);

    // Sentuhan tipis: Update 'updated_at' agar Robot Patroli tahu user sedang aktif bayar [cite: 2026-03-08]
    await supabaseAdmin
      .from('orders')
      .update({ updated_at: new Date().toISOString() })
      .eq('order_id', orderId);

    return NextResponse.json({ 
      success: true, 
      qrisString: dynamicString 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}