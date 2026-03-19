import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, sku, category, amount: userAmount } = body;

    // Bersihkan ID Pelanggan
    const cleanId = customer_id ? String(customer_id).split('(')[0].trim() : "";

    if (!cleanId || !sku) {
      return NextResponse.json({ message: "Data ID atau SKU tidak lengkap Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) {
      return NextResponse.json({ message: "Konfigurasi server belum lengkap Bos!" }, { status: 500 });
    }

    // ====================================================================
    // 🚀 PERBAIKAN LOGIKA SKU:
    // Gunakan SKU asli dari database Bos (yang sudah ter-mapping dengan Seller).
    // Jangan di-hardcode ke 'pln' karena tiap seller SKU-nya beda-beda.
    // ====================================================================
    let inquirySku = String(sku).toLowerCase(); 
    const lowerCat = String(category || "").toLowerCase();

    // HANYA jika dari frontend mengirimkan SKU yang aneh/kosong, baru kita beri fallback
    if (!inquirySku || inquirySku === 'undefined') {
        if (lowerCat.includes('pln')) inquirySku = 'pln';
        else if (lowerCat.includes('pdam')) inquirySku = 'pdam';
        else if (lowerCat.includes('bpjs')) inquirySku = 'bpjs';
    }

    const ref_id = `INQ-${Date.now()}`;
    const sign = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

    const payload: any = {
      commands: "inq-pasca",
      username: username,
      buyer_sku_code: inquirySku, // Menggunakan SKU Seller yang sesuai
      customer_no: cleanId,
      ref_id: ref_id,
      sign: sign
    };

    if (lowerCat.includes('e-money') || inquirySku.includes('emoney')) {
      payload.amount = userAmount || 0;
    }

    console.log(`📡 [INQUIRY] Tembak Digiflazz untuk SKU Seller: ${inquirySku}...`);

    const res = await axios.post("https://api.digiflazz.com/v1/transaction", payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000 
    });

    const result = res.data;
    const digiData = result.data;

    if (digiData?.status === "Gagal") {
      let pesanUser = digiData.message || "Gagal cek tagihan, Bos!";
      if (digiData?.rc === '02') pesanUser = "Tagihan sudah Lunas atau tidak ada tagihan aktif.";
      if (digiData?.rc === '54') pesanUser = "Nomor ID Pelanggan salah, cek lagi kodenya.";
      
      return NextResponse.json({ success: false, message: pesanUser, rc: digiData?.rc }, { status: 400 });
    }

    let customerName = digiData.customer_name || digiData.name || "Pelanggan";
    let segmentPower = "";
    let standMeter = "";

    if (digiData.desc && typeof digiData.desc === 'object') {
      customerName = digiData.desc.nama || digiData.desc.nama_pelanggan || customerName;
      const tarif = digiData.desc.tarif || "";
      const daya = digiData.desc.daya || "";
      if (tarif || daya) segmentPower = `${tarif}${daya ? '/' + daya : ''}`;

      const detail = digiData.desc.tagihan?.detail?.[0];
      if (detail?.meter_awal && detail?.meter_akhir) {
        standMeter = `${detail.meter_awal} - ${detail.meter_akhir}`;
      }
    }

  return NextResponse.json({
      success: true,
      data: {
        customerName: customerName,
        segmentPower: segmentPower,
        standMeter: standMeter,
        amount: digiData.price || 0,
        adminSupplier: digiData.admin || 0,
        period: digiData.periode || "Bulan ini",
        desc: digiData.desc,
        ref_id: ref_id // <--- 🚀 TAMBAHKAN BARIS INI AGAR ID INQUIRY TEREKAM
      }
    });

  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.error("❌ TIMEOUT: Server Digiflazz terlalu lama merespon.");
      return NextResponse.json({ message: "Server Provider lambat, silakan coba 1 menit lagi." }, { status: 504 });
    }
    console.error("❌ ERROR API INQUIRY:", error.message);
    return NextResponse.json({ message: "Gagal koneksi ke server pusat!" }, { status: 500 });
  }
}