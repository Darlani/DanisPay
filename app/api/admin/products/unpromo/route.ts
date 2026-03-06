import { NextResponse } from 'next/server';
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { selectedIds, globalCashback } = await req.json();

    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json({ success: false, error: "Pilih produk dulu bos!" }, { status: 400 });
    }

    // 1. Ambil SEMUA kolom (*) biar nggak ada yang ketinggalan atau kena cegat NOT NULL
    const { data: products, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('*') // Pakai bintang biar semua kolom (brand, sku, sub_brand, dll) ikut narik
      .in('id', selectedIds);

    if (fetchError) throw fetchError;

    // 2. Siapkan data update - Pakai spread operator (...) biar kolom lain nggak berubah
    const updates = (products || []).map((p: any) => {
      const price = Number(p.price || 0);
      const cost = Number(p.cost || 0);
      const profitKotor = price - cost;
      
      const cbNormal = Math.floor(price * (Number(globalCashback || 3) / 100));
      // Plafon cashback 30% dari profit (Biar DanisPay nggak boncos)
      const plafonMaks = Math.max(0, Math.floor(profitKotor * 0.3));
      const finalCashback = cbNormal > plafonMaks ? plafonMaks : cbNormal;

      return {
        ...p,            // <--- INI KUNCINYA: Masukin semua data asli p (brand, sku, dll)
        discount: 0,     // Matikan diskon
        promo_label: null, // Hapus label promo
        cashback: finalCashback,
        updated_at: new Date().toISOString()
      };
    });

    // 3. Eksekusi Upsert (Update massal)
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .upsert(updates);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, updatedCount: updates.length });
  } catch (error: any) {
    console.error("UNPROMO_ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}