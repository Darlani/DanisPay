import { NextResponse } from "next/server";
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, sku, category } = body;

    if (!customer_id) {
      return NextResponse.json({ message: "ID Pelanggan kosong Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    // KHUSUS INQUIRY TOKEN PLN PRABAYAR
    const isPlnToken = category?.toLowerCase().includes('pln') || sku?.toLowerCase().includes('pln');

    if (isPlnToken) {
      const sign = crypto.createHash('md5').update(username + apiKey + customer_id).digest('hex');
      const res = await fetch("https://api.digiflazz.com/v1/inquiry-pln", {
        method: "POST",
        body: JSON.stringify({ username, customer_no: customer_id, sign }),
      });
      
      const result = await res.json();
      
      if (result.data?.status === "Gagal") {
          return NextResponse.json({ success: false, message: "ID Meteran PLN Salah / Tidak Ditemukan" }, { status: 400 });
      }
      
      return NextResponse.json({ 
          success: true, 
          data: { customerName: result.data.name, amount: 0, period: "Token Listrik Prabayar" } 
      });
    }

    // Jika bukan PLN (misal Game/Pulsa), kita kasih respons default aja karena digiflazz gak ada inquiry pulsa
    return NextResponse.json({ 
        success: true, 
        data: { customerName: "Validasi Langsung Saat Pembayaran", amount: 0, period: "-" } 
    });

  } catch (error) {
    return NextResponse.json({ message: "Server Error Bos!" }, { status: 500 });
  }
}