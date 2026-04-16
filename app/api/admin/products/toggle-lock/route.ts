import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const cookieStore = req.headers.get('cookie') || "";
    const isAuthorized = cookieStore.includes('isAdmin=true') || cookieStore.toLowerCase().includes('userrole=manager');

    if (!isAuthorized) return NextResponse.json({ error: "Akses Ditolak!" }, { status: 403 });

    const { selectedIds, lockValue } = await req.json();

    const uuidIds = selectedIds.filter((id: any) => isNaN(Number(id))); 
    const numericIds = selectedIds.filter((id: any) => !isNaN(Number(id)));

    if (uuidIds.length > 0) await supabaseAdmin.from('product_automatic').update({ lock_margin: lockValue }).in('id', uuidIds);
    if (numericIds.length > 0) await supabaseAdmin.from('product_semi_auto').update({ lock_margin: lockValue }).in('id', numericIds);

    // --- CATAT LOG AKTIVITAS ---
    try {
      await supabaseAdmin.from('activity_logs').insert([{
        action: lockValue ? "LOCK MARGIN" : "STOP LOCK",
        details: `${lockValue ? 'Mengunci' : 'Membuka'} margin untuk ${selectedIds.length} produk.`,
        created_at: new Date().toISOString()
      }]);
    } catch (logErr) { console.error("Gagal log:", logErr); }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}