import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// Langsung ambil fungsi verify & totp dari library
const { verify, totp } = require('otplib');

export async function POST(req: Request) {
  try {
    const { userId, pin } = await req.json();

    // 1. Ambil Secret Key pakai Kunci Master
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('2fa_secret')
      .eq('id', userId)
      .single();

    if (!profile || !profile['2fa_secret']) {
       return NextResponse.json({ error: "Secret Key tidak ditemukan!" }, { status: 404 });
    }

    // 2. Verifikasi PIN dari HP Bos
    // Kita pakai try-catch internal buat nangkep error "Secret Too Short"
    let isValid = false;
    try {
      // Hilangkan spasi jika ada
      const cleanSecret = profile['2fa_secret'].trim();
      
      isValid = verify({
        token: pin || '',
        secret: cleanSecret
      });
    } catch (err: any) {
      console.error("⚠️ Detail Error 2FA:", err.message);
      return NextResponse.json({ 
        error: "Kunci di Database bermasalah (Min. 16 Karakter)!" 
      }, { status: 403 });
    }

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "KODE SALAH ATAU KADALUARSA!" }, { status: 403 });
    }

  } catch (error: any) {
    console.error("🔥 Error 2FA API:", error.message);
    return NextResponse.json({ error: "Gagal verifikasi kode!" }, { status: 500 });
  }
}