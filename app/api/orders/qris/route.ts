import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; // Gunakan admin untuk query

// Kode mentah dari GoPay Bos
const BASE_STATIC_QRIS = "00020101021126610014COM.GO-JEK.WWW01189360091431052743690210G1052743690303UMI51440014ID.CO.QRIS.WWW0215ID10264886471930303UMI5204481453033605802ID5923DaPay, Pulsa & Internet6006BATANG61055125262070703A016304075D";

// Mesin Injector CRC16
function generateDynamicQRIS(staticQRIS: string, nominal: number) {
  let qris = staticQRIS.replace("010211", "010212");
  qris = qris.slice(0, -8);

  const amountStr = nominal.toString();
  const amountLen = amountStr.length.toString().padStart(2, '0');
  const tag54 = `54${amountLen}${amountStr}`;

  qris += tag54 + "6304";

  let crc = 0xFFFF;
  for (let i = 0; i < qris.length; i++) {
    crc ^= qris.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return qris + crcHex;
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID missing" }, { status: 400 });
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

    // Generate string QRIS Dinamis pakai data dari database
    const dynamicString = generateDynamicQRIS(BASE_STATIC_QRIS, order.total_amount);

    return NextResponse.json({ 
      success: true, 
      qrisString: dynamicString 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}