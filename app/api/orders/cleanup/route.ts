import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function GET() {
  // Ambil waktu 2 jam yang lalu
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