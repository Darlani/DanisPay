import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { selectedIds, launchOptions, promoLabel, allStrategies, globalCashback } = await req.json();

    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada produk terpilih" }, { status: 400 });
    }

    // 1. CARI PRODUK DI DUA GUDANG [cite: 2026-03-13]
    const [autoRes, semiRes] = await Promise.all([
      supabaseAdmin.from('product_automatic').select('*, categories!product_automatic_category_id_fkey(name)').in('id', selectedIds),
      supabaseAdmin.from('product_semi_auto').select('*, categories!product_semi_auto_category_id_fkey(name)').in('id', selectedIds)
    ]);

    if (autoRes.error) throw autoRes.error;
    if (semiRes.error) throw semiRes.error;

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

        // 3. KALKULASI ULANG PROFIT & CASHBACK (Mencegah CB Bocor!)
        const margin = Number(updatedProduct.margin_item || 0);
        const cost = currentCost; // Pakai variabel yang sudah diamankan di atas
        const price = Math.ceil((cost * (1 + margin / 100)) / 100) * 100; // Harga Jual Asli
        const disc = Number(updatedProduct.discount || 0);
        
        const hargaSetelahDiskon = price - Math.floor(price * (disc / 100));
        const profitKotor = hargaSetelahDiskon - cost;

        let newCashback = 0;
        if (disc > 0 && profitKotor > 0) {
           // Diskon jalan, CB pakai random kecil
           const randomPersen = (String(p.id).charCodeAt(0) % 6) + 15;
           newCashback = Math.floor(profitKotor * (randomPersen / 100));
        } else if (disc === 0) {
           // Promo tapi diskon 0% (seperti e-wallet), CB normal dengan plafon 30%
           const gbCb = Number(globalCashback) || 3;
           const cbNormal = Math.floor(hargaSetelahDiskon * (gbCb / 100));
           const plafonMaks = Math.floor(profitKotor * 0.3);
           newCashback = (cbNormal > plafonMaks && profitKotor > 0) ? plafonMaks : cbNormal;
        }

        // Safety Guard! Kalau rugi, Cashback harus 0.
        if (newCashback < 0 || profitKotor <= 0) newCashback = 0;

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