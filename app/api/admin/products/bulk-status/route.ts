import { NextResponse } from 'next/server';
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INT_REGEX = /^\d+$/;

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await req.json();
    const { selectedIds, is_active } = body;

    // 1. Validasi Keberadaan & Tipe Payload
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal 1 produk terlebih dahulu." },
        { status: 400 }
      );
    }

    if (selectedIds.length > 500) {
      return NextResponse.json(
        { success: false, error: "Maksimal 500 produk dalam 1 operasi massal." },
        { status: 400 }
      );
    }

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "Status is_active harus berupa nilai boolean (true/false)." },
        { status: 400 }
      );
    }

    // 2. Validasi Format Setiap ID & Pengelompokan
    const uuidIds: string[] = [];
    const numericIds: number[] = [];

    for (const rawId of selectedIds) {
      const idStr = String(rawId).trim();
      if (UUID_REGEX.test(idStr)) {
        uuidIds.push(idStr);
      } else if (INT_REGEX.test(idStr)) {
        numericIds.push(Number(idStr));
      } else {
        return NextResponse.json(
          { success: false, error: `Format ID produk tidak valid: ${idStr}` },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    // 3. Eksekusi Pembaruan ke Masing-Masing Tabel Fisik
    const [autoRes, semiRes] = await Promise.all([
      uuidIds.length > 0
        ? supabaseAdmin.from('product_automatic').update({ is_active, updated_at: now }).in('id', uuidIds)
        : Promise.resolve({ error: null }),
      numericIds.length > 0
        ? supabaseAdmin.from('product_semi_auto').update({ is_active, updated_at: now }).in('id', numericIds)
        : Promise.resolve({ error: null })
    ]);

    if (autoRes.error) throw autoRes.error;
    if (semiRes.error) throw semiRes.error;

    // 4. Catat Log Aktivitas
    try {
      const actionName = is_active ? "BULK AKTIFKAN PRODUK" : "BULK NONAKTIFKAN PRODUK";
      await supabaseAdmin.from('activity_logs').insert([{
        action: actionName,
        details: `Mengubah status ${selectedIds.length} produk menjadi ${is_active ? 'AKTIF' : 'NONAKTIF'}. (Auto: ${uuidIds.length}, Semi: ${numericIds.length})`,
        created_at: now
      }]);
    } catch (logErr) {
      console.error("Gagal mencatat log aktivitas bulk status:", logErr);
    }

    return NextResponse.json({
      success: true,
      updatedCount: selectedIds.length,
      is_active
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Terjadi kesalahan server.";
    console.error("🔥 Error API Bulk Status:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
