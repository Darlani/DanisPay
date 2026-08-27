import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Server sedang mengalami kendala konfigurasi." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let body: { email?: string; password?: string } | null = null;
    try {
      body = (await req.json()) as { email?: string; password?: string };
    } catch {
      return NextResponse.json(
        { error: "Format request tidak valid." },
        { status: 400 }
      );
    }

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Coba Login via Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return NextResponse.json(
        { error: "Email atau Password salah!" },
        { status: 401 }
      );
    }

    // 2. Ambil Profil menggunakan Service Role (Tembus RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan!" },
        { status: 404 }
      );
    }

    // 3. Kembalikan data ke Frontend
    return NextResponse.json({
      success: true,
      user: profile,
      session: authData.session,
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Login Route Error:", errorMsg);
    return NextResponse.json(
      { error: "Server sedang mengalami kendala. Silakan coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}