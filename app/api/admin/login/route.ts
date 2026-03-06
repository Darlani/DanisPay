import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Coba Login via Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Email atau Password salah!" }, { status: 401 });
    }

    // 2. Ambil Profil menggunakan Service Role (Tembus RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan!" }, { status: 404 });
    }

    const role = profile.role?.toLowerCase();
    const isAdminOrManager = role === 'admin' || role === 'manager';

    // 3. Kembalikan data ke Frontend
    return NextResponse.json({
      success: true,
      user: profile,
      session: authData.session,
      isPinRequired: isAdminOrManager // Jika admin/manager, wajib PIN
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Kesalahan Server Internal" }, { status: 500 });
  }
}