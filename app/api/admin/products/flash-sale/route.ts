import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    // --- SATPAM INTERNAL (WAJIB ADA!) ---
    const cookieStore = req.headers.get('cookie') || "";
    const isAuthorized = cookieStore.includes('isAdmin=true') || cookieStore.toLowerCase().includes('userrole=manager');

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses Ditolak! Lu bukan Admin/Manager Bos." }, { status: 403 });
    }

    // globalCashback dari frontend kita abaikan, ambil dari DB langsung
    const { selectedIds, launchOptions, promoLabel, allStrategies } = await req.json();

    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada produk terpilih" }, { status: 400 });
    }

    // 1. PISAHKAN ID (UUID vs ANGKA)
    const uuidIds = selectedIds.filter((id: any) => isNaN(Number(id))); 
    const numericIds = selectedIds.filter((id: any) => !isNaN(Number(id)));

    // 2. CARI PRODUK & SETTINGAN TOKO SECARA BERSAMAAN
    const [autoRes, semiRes, settingsRes] = await Promise.all([
      uuidIds.length > 0 
        ? supabaseAdmin.from('product_automatic').select('id, cost, margin_item, lock_margin, discount, promo_label, categories(name)').in('id', uuidIds)
        : Promise.resolve({ data: [], error: null }),
      numericIds.length > 0
        ? supabaseAdmin.from('product_semi_auto').select('id, cost_numeric, margin_item, lock_margin, discount, promo_label, categories(name)').in('id', numericIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from('store_settings').select('cashback_percent').limit(1).single()
    ]);

    if (autoRes.error) throw autoRes.error;
    if (semiRes.error) throw semiRes.error;

    const dbCashbackPercent = Number(settingsRes.data?.cashback_percent || 3);

    const autoProducts = autoRes.data || [];
    const semiProducts = semiRes.data || [];

    // 2. FUNGSI EKSEKUSI PENGATURAN PROMO
    const processUpdates = (products: any[], isSemiAuto: boolean) => {
      return products.map((p: any) => {
        let updatedProduct = { ...p };

        // OPSI LOCK MARGIN
        if (launchOptions?.lock) {
          updatedProduct.lock_margin = true;
        }

        // Penyesuaian nama kolom khusus gudang Semi-Auto
        const currentCost = Number(isSemiAuto ? (p.cost_numeric || 0) : (p.cost || 0));

        // OPSI PROMO & DISKON
        if (launchOptions?.promo) {
           const categoryName = p.categories?.name?.toUpperCase() || "DEFAULT";
           let strategyList = allStrategies?.[categoryName] || allStrategies?.["DEFAULT"];
           
           // Cari range diskon sesuai modal
           let cfg = strategyList?.find((c: any) => currentCost >= c.minCost && currentCost <= c.maxCost) || strategyList?.[0];

           if (cfg) {
               // PENTING: Pakai ?? agar 0 tetap dibaca 0, bukan lari ke nilai bawaan!
               const minD = cfg.minDisc ?? 0;
               const maxD = cfg.maxDisc ?? 0;
               
               // Rumus jitu diskon
               let newDisc = minD;
               if (maxD > 0 && maxD >= minD) {
                   newDisc = Math.floor(Math.random() * (maxD - minD + 1)) + minD;
               }
               
               updatedProduct.discount = newDisc;
               updatedProduct.promo_label = promoLabel || "PROMO";
           }
        }

// 3. KALKULASI ULANG PROFIT & CASHBACK (Murni dari Store Settings & Anti-Boncos)
        const margin = Number(updatedProduct.margin_item || 0);
        const cost = currentCost;
        const price = Math.ceil((cost * (1 + margin / 100)) / 100) * 100;
        const disc = Number(updatedProduct.discount || 0);
        
        const hargaSetelahDiskon = price - Math.floor(price * (disc / 100));
        const profitKotor = hargaSetelahDiskon - cost;

        let newCashback = 0;

        // Jika profit minus atau nol, mutlak 0 (Anti Boncos)
        if (profitKotor > 0) {
          const cbNormal = Math.floor(hargaSetelahDiskon * (dbCashbackPercent / 100));
          const plafonMaks = Math.floor(profitKotor * (dbCashbackPercent / 10));
          newCashback = Math.min(cbNormal, plafonMaks);
        }

        return {
           id: updatedProduct.id,
           lock_margin: updatedProduct.lock_margin,
           discount: updatedProduct.discount,
           promo_label: updatedProduct.promo_label,
           cashback: newCashback,
           updated_at: new Date().toISOString()
        };
      });
    };

    const updatesAuto = processUpdates(autoProducts, false);
    const updatesSemi = processUpdates(semiProducts, true);

    // 4. Update pakai Admin Client (Bypass RLS, Chunk per 50 baris)
    const chunkSize = 50;
    const promises = [];

    // Tembak update ke gudang Automatic
    for (let i = 0; i < updatesAuto.length; i += chunkSize) {
       const chunk = updatesAuto.slice(i, i + chunkSize);
       promises.push(...chunk.map(upd => supabaseAdmin.from('product_automatic').update(upd).eq('id', upd.id)));
    }

    // Tembak update ke gudang Semi-Auto
    for (let i = 0; i < updatesSemi.length; i += chunkSize) {
       const chunk = updatesSemi.slice(i, i + chunkSize);
       promises.push(...chunk.map(upd => supabaseAdmin.from('product_semi_auto').update(upd).eq('id', upd.id)));
    }

    await Promise.all(promises);

    return NextResponse.json({ success: true, updatedCount: updatesAuto.length + updatesSemi.length });
  } catch (error: any) {
    console.error("FLASH_SALE_ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}