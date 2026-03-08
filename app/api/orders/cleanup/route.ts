import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function GET(req: Request) {
  // 1. SATPAM API: Bisa lewat Header atau URL (Query Param) agar Crontab gampang manggilnya [cite: 2026-03-06]
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const authHeader = req.headers.get('Authorization');
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

  const isAuthorized = authHeader === `Bearer ${WEBHOOK_SECRET}` || querySecret === WEBHOOK_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Akses Ditolak! Kunci rahasia salah." }, { status: 401 });
  }

  // 2. LOGIKA CLEANUP: Pesanan lebih dari 2 jam = Hangus
  const duaJamLalu = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  console.log(`🧹 [CLEANUP] Memulai pembersihan pesanan Pending sebelum: ${duaJamLalu}`);

  try {
    // Jalankan Update secara atomik. Pakai count: 'exact' saja agar database tidak narik data berat.
    const { count, error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'Gagal',
        notes: 'Otomatis dibatalkan oleh sistem (Expired 2 Jam)' 
      })
      .eq('status', 'Pending')
      .lt('created_at', duaJamLalu);

    if (error) throw error;

    console.log(`✅ [CLEANUP SUKSES]: ${count || 0} pesanan sampah berhasil dibersihkan.`);

    return NextResponse.json({ 
      success: true, 
      message: "Cleanup Berhasil",
      cleaned_count: count || 0 
    });

  } catch (error: any) {
    console.error("❌ [CLEANUP FATAL ERROR]:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}