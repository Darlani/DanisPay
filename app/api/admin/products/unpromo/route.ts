import { NextResponse } from 'next/server';
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { selectedIds, globalCashback } = await req.json();

    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json({ success: false, error: "Pilih produk dulu bos!" }, { status: 400 });
    }

// 1. PISAHKAN ID (UUID vs ANGKA) AGAR POSTGRES GAK MABUK [cite: 2026-03-13]
    const uuidIds = selectedIds.filter((id: any) => isNaN(Number(id))); 
    const numericIds = selectedIds.filter((id: any) => !isNaN(Number(id)));

    // 2. TARIK DATA DARI DUA GUDANG SECARA SPESIFIK
    const [autoRes, semiRes] = await Promise.all([
      uuidIds.length > 0 
        ? supabaseAdmin.from('product_automatic').select('id, price, cost').in('id', uuidIds)
        : Promise.resolve({ data: [], error: null }),
      numericIds.length > 0
        ? supabaseAdmin.from('product_semi_auto').select('id, price_numeric, cost_numeric').in('id', numericIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (autoRes.error) throw autoRes.error;
    if (semiRes.error) throw semiRes.error;

    // 3. FUNGSI PEMBUAT UPDATE PAYLOAD (Hanya kolom yang mau diubah saja Bos!)
    const processUpdates = (products: any[], isSemiAuto: boolean) => {
      return products.map((p: any) => {
        const price = Number(isSemiAuto ? (p.price_numeric || 0) : (p.price || 0));
        const cost = Number(isSemiAuto ? (p.cost_numeric || 0) : (p.cost || 0));
        const profitKotor = price - cost;
        
        // Hitung Cashback Normal (Reset ke settingan global)
        const cbNormal = Math.floor(price * (Number(globalCashback || 3) / 100));
        const plafonMaks = Math.max(0, Math.floor(profitKotor * 0.3));
        const finalCashback = (cbNormal > plafonMaks && profitKotor > 0) ? plafonMaks : cbNormal;

        return {
          id: p.id,
          discount: 0,        // RESET DISKON KE 0
          promo_label: null,  // HAPUS LABEL PROMO
          cashback: finalCashback,
          updated_at: new Date().toISOString()
        };
      });
    };

    const updatesAuto = processUpdates(autoRes.data || [], false);
    const updatesSemi = processUpdates(semiRes.data || [], true);

    // 4. EKSEKUSI UPDATE (Gunakan Update, jangan Upsert biar lebih aman)
    const promises = [];
    if (updatesAuto.length > 0) {
      promises.push(...updatesAuto.map(upd => 
        supabaseAdmin.from('product_automatic').update(upd).eq('id', upd.id)
      ));
    }
    if (updatesSemi.length > 0) {
      promises.push(...updatesSemi.map(upd => 
        supabaseAdmin.from('product_semi_auto').update(upd).eq('id', upd.id)
      ));
    }

    await Promise.all(promises);

    return NextResponse.json({ success: true, updatedCount: updatesAuto.length + updatesSemi.length });
  } catch (error: any) {
    console.error("UNPROMO_ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}