import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, sku, category } = body;

    // 1. VALIDASI DATA AWAL [cite: 2026-02-11]
    if (!customer_id) {
      return NextResponse.json({ message: "ID Pelanggan kosong Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) {
      return NextResponse.json({ message: "Konfigurasi server belum lengkap Bos!" }, { status: 500 });
    }

    const lowerCat = category?.toLowerCase() || "";
    const lowerSku = sku?.toLowerCase() || "";

    // 2. LOGIKA DETEKSI PRODUK (PLN, GAME, E-WALLET, PULSA) [cite: 2026-03-06]
    let inquirySku = "";
    let requiresInquiry = false;

    // Deteksi berdasarkan Kategori atau SKU dari Frontend
    if (lowerCat.includes('pln') || lowerSku.includes('pln')) {
      inquirySku = "PLN"; // PLN wajib pakai master SKU "PLN"
      requiresInquiry = true;
    } else if (lowerCat.includes('game') || lowerCat.includes('e-wallet') || lowerCat.includes('uang elektronik') || lowerCat.includes('dana') || lowerCat.includes('ovo')) {
      inquirySku = sku; // Game & E-Wallet pakai SKU aslinya (misal: "ML10" atau "DANA10")
      requiresInquiry = true;
    }

    // Jika yang dibeli adalah Pulsa / Paket Data, kita Bypass (loloskan) agar render super cepat < 200ms
    if (!requiresInquiry) {
      return NextResponse.json({
        success: true,
        data: {
          customerName: "Lanjutkan Pembayaran (Nomor Valid)",
          amount: 0,
          period: "-"
        }
      });
    }

    // 3. EKSEKUSI CEK ID KE DIGIFLAZZ (HANYA PLN, GAME, E-WALLET) [cite: 2026-03-06]
    const ref_id = `CEKID-${Date.now()}`;
    // Rumus wajib Digiflazz untuk semua transaksi: md5(username + apikey + ref_id)
    const sign = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

    const payload = {
      commands: "plg-id",
      username: username,
      buyer_sku_code: inquirySku, // Akan otomatis mengisi "PLN" atau SKU Game (seperti "ML10")
      customer_no: customer_id,
      ref_id: ref_id,
      sign: sign
    };

    const res = await axios.post("https://api.digiflazz.com/v1/transaction", payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const result = res.data;
    console.log("🔍 CEK RESPON PLN PRABAYAR:", JSON.stringify(result, null, 2));

    if (result.data?.status === "Gagal") {
      let pesanUser = result.data?.message || "Gagal cek ID PLN, Bos!";
      if (result.data?.rc === '54') pesanUser = "Nomor ID Pelanggan PLN salah/tidak ditemukan.";

      return NextResponse.json({
        success: false,
        message: pesanUser,
        rc: result.data?.rc
      }, { status: 400 }); // Status 400 agar frontend menangkapnya sebagai peringatan biasa, bukan Crash/Error 500
    }

    // 4. PARSING DATA JIKA SUKSES [cite: 2026-02-11]
    return NextResponse.json({
      success: true,
      data: {
        customerName: result.data?.customer_name || result.data?.name || "Pelanggan PLN Valid",
        amount: 0,
        period: "Pengecekan Berhasil"
      }
    });

  } catch (error: any) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.data?.message || "Koneksi ke server pusat gagal Bos!";

    // Log error di VPS biar kita gampang lacaknya (Keamanan Backend) [cite: 2026-03-06]
    console.error("❌ ERROR DIGIFLAZZ PRABAYAR:", JSON.stringify(errorData, null, 2) || error.message);

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}