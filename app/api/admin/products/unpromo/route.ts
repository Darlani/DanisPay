import { NextResponse } from 'next/server';
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { selectedIds, globalCashback } = await req.json();

    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json({ success: false, error: "Pilih produk dulu bos!" }, { status: 400 });
    }

    // 1. CARI DI KEDUA GUDANG SEKALIGUS (Tetap pakai select * sesuai request Bos)
    const [autoRes, semiRes] = await Promise.all([
      supabaseAdmin.from('product_automatic').select('*').in('id', selectedIds),
      supabaseAdmin.from('product_semi_auto').select('*').in('id', selectedIds)
    ]);

    const autoProducts = autoRes.data || [];
    const semiProducts = semiRes.data || [];

    // 2. FUNGSI PEMBUAT UPDATE PAYLOAD
    const createUpdates = (products: any[], isSemiAuto: boolean) => {
      return products.map((p: any) => {
        // Handle perbedaan nama kolom untuk semi_auto
        const price = Number(isSemiAuto ? (p.price_numeric || 0) : (p.price || 0));
        const cost = Number(isSemiAuto ? (p.cost_numeric || 0) : (p.cost || 0));
        const profitKotor = price - cost;
        
        const cbNormal = Math.floor(price * (Number(globalCashback || 3) / 100));
        const plafonMaks = Math.max(0, Math.floor(profitKotor * 0.3));
        const finalCashback = cbNormal > plafonMaks ? plafonMaks : cbNormal;

        return {
          ...p,            // Masukkan semua data asli
          discount: 0,     // Matikan diskon
          promo_label: null, // Hapus label promo
          cashback: finalCashback,
          updated_at: new Date().toISOString()
        };
      });
    };

    const autoUpdates = createUpdates(autoProducts, false);
    const semiUpdates = createUpdates(semiProducts, true);

    // 3. EKSEKUSI UPSERT KE MASING-MASING GUDANG
    const updatePromises = [];
    if (autoUpdates.length > 0) {
      updatePromises.push(supabaseAdmin.from('product_automatic').upsert(autoUpdates));
    }
    if (semiUpdates.length > 0) {
      updatePromises.push(supabaseAdmin.from('product_semi_auto').upsert(semiUpdates));
    }

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, updatedCount: autoUpdates.length + semiUpdates.length });
  } catch (error: any) {
    console.error("UNPROMO_ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}