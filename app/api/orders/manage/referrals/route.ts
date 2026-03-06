import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// --- REVISI 1: Pakai SERVICE_ROLE_KEY agar bisa baca data lintas user ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refCode = searchParams.get('refCode');

  if (!refCode) {
    return NextResponse.json({ error: "Referral code required" }, { status: 400 });
  }

  try {
    // --- REVISI 2: Gunakan supabaseAdmin ---
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, created_at')
      .eq('referred_by', refCode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Pastikan return data berupa array (supaya dashboard lo ga error .map)
    return NextResponse.json(data || []);
    
  } catch (error: any) {
    console.error("Referral Fetch Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}