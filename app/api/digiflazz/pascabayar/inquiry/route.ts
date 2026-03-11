import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, sku, category } = body;

    if (!customer_id || !sku) {
      return NextResponse.json({ message: "Data tidak lengkap Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) {
      return NextResponse.json({ message: "Konfigurasi server belum lengkap Bos!" }, { status: 500 });
    }

    // 1. LOGIKA MAPPING SKU (Tetap Aman)
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

    const ref_id = `INQ-${Date.now()}`;
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
    const digiData = result.data;

    if (digiData?.status === "Gagal") {
      let pesanUser = "Gagal cek tagihan, Bos!";
      if (digiData?.rc === '02') {
        pesanUser = "Tagihan ID ini sudah Lunas atau tidak ada tagihan aktif.";
      } else if (digiData?.rc === '54') {
        pesanUser = "Nomor ID Pelanggan salah, coba cek lagi kodenya.";
      }
      return NextResponse.json({ success: false, message: pesanUser, rc: digiData?.rc }, { status: 400 });
    }

    // 2. MAGIS EKSTRAKSI DATA (Sesuai kodingan Webhook/Auto-Check) [cite: 2026-03-11]
    let customerName = digiData.customer_name || digiData.name || "Pelanggan";
    let segmentPower = "";
    let standMeter = "";

    if (digiData.desc && typeof digiData.desc === 'object') {
      // Ambil Nama dari desc jika di field utama kosong
      customerName = digiData.desc.nama || digiData.desc.nama_pelanggan || customerName;
      
      // Ambil Tarif/Daya
      const tarif = digiData.desc.tarif || "";
      const daya = digiData.desc.daya || "";
      if (tarif || daya) segmentPower = `${tarif}${daya ? '/' + daya : ''}`;

      // Ambil Stand Meter
      const detail = digiData.desc.tagihan?.detail?.[0];
      if (detail?.meter_awal && detail?.meter_akhir) {
        standMeter = `${detail.meter_awal} - ${detail.meter_akhir}`;
      }
    }

    // 3. KIRIM KE FRONTEND DENGAN FORMAT LENGKAP
    return NextResponse.json({
      success: true,
      data: {
        customerName: customerName,
        segmentPower: segmentPower, // Baru! Munculkan di UI (Contoh: R1/450)
        standMeter: standMeter,     // Baru! Munculkan di UI
        amount: digiData.price || 0,
        adminSupplier: digiData.admin || 0,
        period: digiData.periode || "Bulan ini",
        desc: digiData.desc 
      }
    });

  } catch (error: any) {
    console.error("❌ ERROR API:", error.message);
    return NextResponse.json({ message: "Server Error Bos! Hubungi IT." }, { status: 500 });
  }
}