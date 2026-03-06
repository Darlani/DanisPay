import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, sku, category } = body;

    // 1. VALIDASI DATA [cite: 2026-02-11]
    if (!customer_id || !sku) {
      return NextResponse.json({ message: "Data tidak lengkap Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) {
      return NextResponse.json({ message: "Konfigurasi server belum lengkap Bos!" }, { status: 500 });
    }

    // 2. LOGIKA MAPPING SKU MASTER (VERSI DINAMIS)
    let inquirySku = sku; 
    const lowerCat = category?.toLowerCase() || "";
    const lowerName = sku.toLowerCase();

    if (lowerCat.includes('pln') || lowerName.includes('pln')) {
      inquirySku = 'pln'; 
    } else if (lowerCat.includes('pdam') || lowerName.includes('pdam')) {
      inquirySku = 'pdam';
    } else if (lowerCat.includes('bpjs') || lowerName.includes('bpjs')) {
      inquirySku = 'bpjs';
    } else if (lowerCat.includes('internet') || lowerCat.includes('telkom') || lowerName.includes('indihome')) {
      inquirySku = 'internet';
    } else if (lowerCat.includes('hp') || lowerCat.includes('halo')) {
      inquirySku = 'hp'; 
    }

    // 3. EKSEKUSI PASCABAYAR DIRECT [cite: 2026-03-06]
    const ref_id = `INQ-${Date.now()}`;

    // TRIK PANCINGAN: Intip IP Vercel yang lagi dipakai Bos! [cite: 2026-03-06]
    try {
      const ipCheck = await axios.get('https://api.ipify.org?format=json');
      console.log("🚀 IP VERCEL SAAT INI:", ipCheck.data.ip);
    } catch (e) {
      console.error("Gagal intip IP");
    }
    const sign = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

    const res = await axios.post("https://api.digiflazz.com/v1/transaction", {
      commands: "inq-pasca",
      username: username,
      buyer_sku_code: inquirySku.toLowerCase(),
      customer_no: customer_id,
      ref_id: ref_id,
      sign: sign
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000 
    });

    const result = res.data; 
    console.log("🔍 CEK RESPON LENGKAP:", JSON.stringify(result, null, 2));

    if (result.data?.status === "Gagal") {
      let pesanUser = "Gagal cek tagihan, Bos!";
      
      if (result.data?.rc === '02') {
        pesanUser = "Tagihan ID ini sudah Lunas atau tidak ada tagihan bulan ini, Mantap!";
      } else if (result.data?.rc === '43') {
        pesanUser = "Produk sedang gangguan/off di pusat, coba bentar lagi ya Bos.";
      } else if (result.data?.rc === '54') {
        pesanUser = "Nomor ID Pelanggan tidak ditemukan, coba cek lagi kodenya.";
      }

      return NextResponse.json({ 
        success: false, 
        message: pesanUser,
        rc: result.data?.rc 
      }, { status: 400 });
    }

    // 4. PARSING DATA UNTUK FRONTEND [cite: 2026-02-11]
    return NextResponse.json({
      success: true,
      data: {
        customerName: result.data.customer_name || result.data.name,
        amount: result.data.price || 0,
        adminSupplier: result.data.admin || 0,
        period: result.data.periode || "Tagihan Aktif",
        desc: result.data.desc 
      }
    });

  } catch (error: any) {
    console.error("❌ ERROR API:", error.message);
    return NextResponse.json({ message: "Server Error Bos! Hubungi IT." }, { status: 500 });
  }
}