import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
// Kita tambahkan .trim() biar kalau ada spasi gak sengaja di .env langsung dibuang bos! [cite: 2026-02-11]
    const username = process.env.DIGIFLAZZ_USERNAME?.trim();
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim(); 

    // 1. CEK ENV
    if (!username || !apiKey) {
      console.error("❌ ERROR: ENV KOSONG!");
      return NextResponse.json({ success: false, error: "Cek file .env Bos, Username/API Key kosong!" });
    }

    // Pastikan urutannya: USERNAME + API_KEY + "depo"
    const sign = crypto.createHash('md5').update(username + apiKey + "depo").digest('hex'); 

    // 2. CEK KE DIGIFLAZZ
    const response = await fetch('https://api.digiflazz.com/v1/cek-saldo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'deposit', username, sign }),
      cache: 'no-store'
    });

    const data = await response.json();
    console.log("🔍 RESPONS DIGIFLAZZ:", data); // Intip ini di terminal Bos!

    if (data.data) {
      const newBalance = data.data.deposit;
      const storeId = 'f2caefe6-7bf4-49d8-b37c-c210a7d93562';

      // 3. UPDATE DATABASE
      const { data: updateRes, error: dbError } = await supabaseAdmin
        .from('store_settings')
        .update({ balance_digiflazz: newBalance })
        .eq('id', storeId)
        .select();

      if (dbError) {
        console.error("❌ ERROR SUPABASE:", dbError.message);
        return NextResponse.json({ success: true, balance: newBalance, warning: "Saldo ditarik tapi gagal simpan ke DB" });
      }

      return NextResponse.json({ success: true, balance: newBalance });
    } else {
      // Kita bongkar semua pesan error dari Digiflazz biar kelihatan Bos! [cite: 2026-02-11]
      console.error("❌ DIGIFLAZZ REJECTED:", data);
      return NextResponse.json({ 
        success: false, 
        message: data.data?.message || data.message || "Gagal tarik data dari Digiflazz",
        raw: data // Kita kirim data mentah buat debug
      });
    }
  } catch (error: any) {
    console.error("❌ CRASH API:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}