import { NextResponse } from 'next/server';
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // --- SATPAM TERPADU (Admin & Manager Wajib Lolos) ---
    const cookieStore = req.headers.get('cookie') || "";
    const isAuthorized = cookieStore.includes('isAdmin=true') || cookieStore.toLowerCase().includes('userrole=manager');

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses Ditolak! Lu bukan Admin/Manager Bos." }, { status: 403 });
    }

    const { selectedIds, globalCashback } = await req.json();

    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json({ success: false, error: "Pilih produk dulu bos!" }, { status: 400 });
    }

// 1. PISAHKAN ID (UUID vs ANGKA) AGAR POSTGRES GAK MABUK [cite: 2026-03-13]
    const uuidIds = selectedIds.filter((id: any) => isNaN(Number(id))); 
    const numericIds = selectedIds.filter((id: any) => !isNaN(Number(id)));

// 2. TARIK DATA DARI DUA GUDANG + STORE SETTINGS SEKALIGUS
    const [autoRes, semiRes, settingsRes] = await Promise.all([
      uuidIds.length > 0 ? supabaseAdmin.from('product_automatic').select('id, price, cost').in('id', uuidIds) : Promise.resolve({ data: [], error: null }),
      numericIds.length > 0 ? supabaseAdmin.from('product_semi_auto').select('id, price_numeric, cost_numeric').in('id', numericIds) : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from('store_settings').select('cashback_percent').limit(1).single()
    ]);

    if (autoRes.error) throw autoRes.error;
    if (semiRes.error) throw semiRes.error;

    const dbCashbackPercent = Number(settingsRes.data?.cashback_percent || 3);

    // 3. FUNGSI PEMBUAT UPDATE PAYLOAD
    const processUpdates = (products: any[], isSemiAuto: boolean) => {
      return products.map((p: any) => {
        const price = Number(isSemiAuto ? (p.price_numeric || 0) : (p.price || 0));
        const cost = Number(isSemiAuto ? (p.cost_numeric || 0) : (p.cost || 0));
        const profitKotor = price - cost;
        
        // Anti Boncos + Acuan Store Settings
        let finalCashback = 0;
        if (profitKotor > 0) {
          const cbNormal = Math.floor(price * (dbCashbackPercent / 100));
          const plafonMaks = Math.floor(profitKotor * (dbCashbackPercent / 10));
          finalCashback = Math.min(cbNormal, plafonMaks);
        }

        return {
          id: p.id,
          discount: 0,        // RESET DISKON KE 0
          promo_label: null,  // HAPUS LABEL PROMO
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