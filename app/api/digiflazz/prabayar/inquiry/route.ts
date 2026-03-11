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

    // 3. EKSEKUSI CEK ID KE DIGIFLAZZ [cite: 2026-03-06]
    let result;

    if (inquirySku === "PLN") {
      // 3A. JALUR KHUSUS PLN (Sesuai Dokumentasi Resmi)
      // Rumus: md5(username + apiKey + customer_no)
      const signPln = crypto.createHash('md5').update(username + apiKey + customer_id).digest('hex');
      
      const payloadPln = {
        username: username,
        customer_no: customer_id,
        sign: signPln
      };

      const resPln = await axios.post("https://api.digiflazz.com/v1/inquiry-pln", payloadPln, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });
      
      result = resPln.data;
      console.log("🔍 RESPONS INQUIRY PLN:", JSON.stringify(result, null, 2));

    } else {
      // 3B. JALUR GAME & E-WALLET (Pakai Endpoint Transaksi Umum)
      const ref_id = `CEKID-${Date.now()}`;
      // Rumus: md5(username + apikey + ref_id)
      const signGame = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

      const payloadGame = {
        commands: "plg-id",
        username: username,
        buyer_sku_code: inquirySku, 
        customer_no: customer_id,
        ref_id: ref_id,
        sign: signGame
      };

      const resGame = await axios.post("https://api.digiflazz.com/v1/transaction", payloadGame, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });

      result = resGame.data;
      console.log("🔍 RESPONS INQUIRY GAME:", JSON.stringify(result, null, 2));
    }

    // TANGANI JIKA GAGAL
    if (result.data?.status === "Gagal" || result.data?.rc !== "00") {
      let pesanUser = result.data?.message || "Gagal mengecek ID, Bos!";
      
      // RC 54: Nomor Tujuan Salah, RC 43: SKU Non Aktif
      if (result.data?.rc === '54') pesanUser = "Nomor ID Pelanggan salah/tidak ditemukan.";
      else if (result.data?.rc === '43') pesanUser = "Produk ini tidak mendukung fitur cek nama otomatis.";

      return NextResponse.json({
        success: false,
        message: pesanUser,
        rc: result.data?.rc
      }, { status: 400 }); 
    }

// 4. PARSING DATA JIKA SUKSES [cite: 2026-02-11]
    const digiData = result.data;
    
    // Ambil data dasar
    let customerName = digiData?.customer_name || digiData?.name || "Pelanggan Valid";
    let segmentPower = "";

    // KHUSUS PLN PRABAYAR: Digiflazz biasanya kirim tarif/daya di field 'segment_power'
    if (inquirySku === "PLN") {
       segmentPower = digiData?.segment_power || ""; 
       // Jika di dashboard Bosku nanti mau digabung: "BUDI - R1/900"
    }

    return NextResponse.json({
      success: true,
      data: {
        customerName: customerName,
        segmentPower: segmentPower, // Tambahkan ini agar UI bisa nampilin Daya (misal: R1/900VA)
        amount: 0, // Prabayar amount selalu 0 saat cek ID
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