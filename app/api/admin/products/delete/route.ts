import { NextResponse } from 'next/server';
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { selectedIds } = await req.json();
    if (!selectedIds || selectedIds.length === 0) throw new Error("Pilih produk dulu!");

    const uuidIds = selectedIds.filter((id: any) => isNaN(Number(id))); 
    const numericIds = selectedIds.filter((id: any) => !isNaN(Number(id)));

    // Eksekusi Hapus
    if (uuidIds.length > 0) await supabaseAdmin.from('product_automatic').delete().in('id', uuidIds);
    if (numericIds.length > 0) await supabaseAdmin.from('product_semi_auto').delete().in('id', numericIds);

    // --- CATAT LOG AKTIVITAS ---
    try {
      await supabaseAdmin.from('activity_logs').insert([{
        action: "HAPUS PRODUK",
        details: `Menghapus ${selectedIds.length} produk sekaligus via server.`,
        created_at: new Date().toISOString()
      }]);
    } catch (logErr) { console.error("Gagal log:", logErr); }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}