import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi bos!" }, { status: 400 });
    }

// Pakai variable siteUrl yang pasti (utamakan dari ENV) biar link gak nyasar ke localhost
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://danispay.my.id';
    
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      // Pastikan path-nya lengkap dan mengarah ke UI ganti password
      redirectTo: `${siteUrl}/update-password`, 
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Link reset password telah dikirim!" });
  } catch (error: any) {
    console.error("RESET_PASSWORD_ERROR:", error.message);
    return NextResponse.json({ error: "Gagal mengirim email reset. Pastikan email terdaftar." }, { status: 500 });
  }
}