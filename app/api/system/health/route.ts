import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function GET() {
  const start = Date.now();
  
  try {
    // 1. Cek Koneksi Database & Validasi Kolom 'notes' [cite: 2026-03-08]
    // Kita lakukan query ringan untuk memastikan schema cache Supabase sudah update
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('notes')
      .limit(1);

    if (error) {
      return NextResponse.json({
        status: "Sakit (Database Error)",
        error_code: error.code,
        message: error.message,
        hint: "Jalankan 'NOTIFY pgrst, reload schema' di SQL Editor Supabase"
      }, { status: 500 });
    }

    const duration = Date.now() - start;

    // 2. Respon Sukses jika semua kabel tersambung [cite: 2026-03-06]
    return NextResponse.json({
      status: "Sehat Walafiat",
      latency: `${duration}ms`,
      database: "Connected",
      schema_check: "Notes column detected",
      hostname: process.env.NEXT_PUBLIC_SITE_URL || "Undefined (Cek .env!)",
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json({
      status: "Sakit Parah (Internal Server Error)",
      error: err.message
    }, { status: 500 });
  }
}