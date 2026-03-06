import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function GET(req: Request) {
  // 1. Satpam API: Hanya izinkan jika ada secret yang cocok [cite: 2026-03-06]
  const authHeader = req.headers.get('Authorization');
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Akses Ditolak!" }, { status: 401 });
  }

  // 2. Logika Cleanup (Ambil waktu 2 jam yang lalu)
  const duaJamLalu = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Cari & Update order Pending yang sudah lewat 2 jam secara atomik
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'Gagal' })
    .eq('status', 'Pending')
    .lt('created_at', duaJamLalu)
    .select(); // Mengambil data yang berhasil diupdate

  if (error) {
    console.error("Cleanup Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    cleaned: data?.length || 0 
  });
}