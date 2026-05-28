import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios';

// --- SISTEM ANTI-SPAM (KHUSUS GAME/E-WALLET) ---
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 3; 
const WINDOW_MS = 60 * 1000; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, sku, category } = body;

    // 1. VALIDASI DATA AWAL
    if (!customer_id) {
      return NextResponse.json({ message: "ID Pelanggan kosong Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) {
      return NextResponse.json({ message: "Konfigurasi server belum lengkap!" }, { status: 500 });
    }

    const lowerCat = category?.toLowerCase() || "";
    const lowerSku = sku?.toLowerCase() || "";

    // 2. LOGIKA DETEKSI PRODUK
    let inquirySku = "";
    let requiresInquiry = false;

    if (lowerCat.includes('pln') || lowerSku.includes('pln')) {
      inquirySku = "PLN";
      requiresInquiry = true;
    } else if (lowerCat.includes('game') || lowerCat.includes('e-wallet')) {
      inquirySku = sku;
      requiresInquiry = true;
    }

    // Bypass Pulsa/Data (Render < 200ms)
    if (!requiresInquiry) {
      return NextResponse.json({
        success: true,
        data: { customerName: "Lanjutkan Pembayaran", amount: 0, period: "-" }
      });
    }

    // ==========================================
    // 3. RATE LIMITER (HANYA MENCEGAT JIKA BUKAN PLN)
    // ==========================================
    if (inquirySku !== "PLN") {
      const forwardedFor = req.headers.get('x-forwarded-for');
      const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'IP_Lokal');
      
      const now = Date.now();
      const clientData = rateLimitMap.get(ip);

      if (clientData) {
        if (now - clientData.lastReset < WINDOW_MS) {
          if (clientData.count >= LIMIT) {
            console.warn(`🚨 SPAM BLOCKED: IP ${ip} mencoba inquiry Game terlalu banyak.`);
            return NextResponse.json({ message: "Terlalu banyak permintaan! Tunggu 1 menit ya Bos." }, { status: 429 });
          }
          clientData.count += 1;
        } else {
          rateLimitMap.set(ip, { count: 1, lastReset: now });
        }
      } else {
        rateLimitMap.set(ip, { count: 1, lastReset: now });
      }
    }

    // 4. EKSEKUSI KE DIGIFLAZZ
    let result: any;
    // Bersihkan ID dari spasi agar Sign MD5 tidak meleset
    const cleanCustomerId = String(customer_id).replace(/[^0-9a-zA-Z]/g, '');

    if (inquirySku === "PLN") {
      // JALUR PLN PRABAYAR (TOKEN) -> Bebas Limit
      const signPln = crypto.createHash('md5').update(username + apiKey + cleanCustomerId).digest('hex');
      
      const resPln = await axios.post("https://api.digiflazz.com/v1/inquiry-pln", {
        username,
        customer_no: cleanCustomerId,
        sign: signPln
      }, { 
        validateStatus: (s) => s < 500 
      });
      
      result = resPln.data;
      console.log("🔍 RESPONS INQUIRY PLN:", JSON.stringify(result, null, 2));

    } else {
      // JALUR GAME / E-WALLET -> Terkena Limit 3x
      const ref_id = `CEKID-${Date.now()}`;
      const signGame = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

      const resGame = await axios.post("https://api.digiflazz.com/v1/transaction", {
        commands: "plg-id",
        username,
        buyer_sku_code: inquirySku, 
        customer_no: customer_id, // ID Game biarkan asli (karena kadang ada zonk/kurung)
        ref_id,
        sign: signGame
      }, {
        validateStatus: (s) => s < 500
      });

      result = resGame.data;
    }

    // TANGANI JIKA GAGAL
    if (!result?.data || result.data?.status === "Gagal" || result.data?.rc !== "00") {
      let pesanUser = result?.data?.message || "Gagal mengecek ID, Bos!";
      
      // Jika RC 02, berikan pesan yang lebih edukatif
      if (result?.data?.rc === '02') {
        pesanUser = inquirySku === "PLN" 
          ? "ID Pelanggan tidak ditemukan. Pastikan nomor sudah benar dan sesuai dengan jenis PLN (Token)." 
          : "ID Pelanggan tidak ditemukan.";
      }

      return NextResponse.json({
        success: false,
        message: pesanUser,
        rc: result?.data?.rc
      }, { status: 400 }); 
    }

    // 5. PARSING SUKSES
    const digiData = result.data;
    return NextResponse.json({
      success: true,
      data: {
        customerName: digiData?.customer_name || digiData?.name || "Pelanggan Valid",
        segmentPower: digiData?.segment_power || "", 
        amount: 0, 
        period: "Pengecekan Berhasil"
      }
    });

  } catch (error: any) {
    console.error("🔥 ERROR API:", error.message);
    return NextResponse.json({ message: "Koneksi server gagal, coba lagi nanti!" }, { status: 500 });
  }
}