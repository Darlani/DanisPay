import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios'; // Tambahkan ini Bos biar gak merah! [cite: 2026-03-06]

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, sku, category } = body;

    if (!customer_id) {
      return NextResponse.json({ message: "ID Pelanggan kosong Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    // 1. LOGIKA INQUIRY UNIFIED (PLN, GAME, HP) [cite: 2026-02-11]
    // Rumus Signature plg-id: md5(username + apiKey + "plg-id")
    const sign = crypto.createHash('md5').update(username + apiKey + "plg-id").digest('hex');

    // TRIK PANCINGAN IP: Biar Bos gampang whitelist di Digiflazz [cite: 2026-03-06]
    try {
      const ipCheck = await axios.get('https://api.ipify.org?format=json');
      console.log("🚀 IP VERCEL PRABAYAR:", ipCheck.data.ip);
    } catch (e) { console.error("Gagal intip IP"); }

    // Tembak API Digiflazz Jalur Direct [cite: 2026-03-06]
    const res = await axios.post("https://api.digiflazz.com/v1/transaction", {
      commands: "plg-id",
      username: username,
      buyer_sku_code: sku, // SKU wajib ada buat cek Game/PLN [cite: 2026-02-11]
      customer_no: customer_id,
      sign: sign
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000 
    });

    const result = res.data;
    console.log("🔍 CEK RESPON PRABAYAR:", JSON.stringify(result, null, 2));

    // Jika ID ditemukan atau produk mendukung pengecekan [cite: 2026-02-11]
    if (result.data && result.data.status !== "Gagal") {
      return NextResponse.json({ 
        success: true, 
        data: { 
          customerName: result.data.customer_name || "Pelanggan Terverifikasi", 
          amount: 0, 
          period: "Pengecekan Berhasil" 
        } 
      });
    }

    // Jika Gagal (Misal Pulsa biasa yang memang tidak ada fiture cek nama) [cite: 2026-02-11]
    // Kita kasih kelonggaran: kalau gagal tapi bukan error IP, tetap izinkan lanjut (khusus Pulsa/Game tertentu)
    const isIpError = result.data?.message?.toLowerCase().includes('ip');
    
    if (isIpError) {
      return NextResponse.json({ 
        success: false, 
        message: "Server sedang penyesuaian IP, coba lagi nanti ya Bos." 
      }, { status: 403 });
    }

    return NextResponse.json({ 
        success: true, 
        data: { 
          customerName: "Lanjutkan ke Pembayaran", 
          amount: 0, 
          period: "-" 
        } 
    });

  } catch (error: any) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.data?.message || "Koneksi ke server pusat gagal Bos!";
    
    // Log error di VPS biar kita gampang lacaknya [cite: 2026-03-06]
    console.error("❌ ERROR DIGIFLAZZ:", JSON.stringify(errorData, null, 2));
    
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}