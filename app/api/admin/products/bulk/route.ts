import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
     const { allStrategies, globalCashback } = await req.json();

     // 1. TAMBAH LIMIT 50.000! Biar kalau produk bos ribuan, nggak mentok di 1000 doang
     const { data: products, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('id, cost, discount, lock_margin, categories(name)') 
        .limit(50000); 

     if (prodErr || !products) throw prodErr;

     let updateCount = 0;
     const updates = [];

     for (const product of products as any[]) {
         // Pastikan evaluasi strict untuk boolean true atau wujud string 'true' dari Supabase
         if (product.lock_margin === true || String(product.lock_margin).toLowerCase() === 'true') continue; // Jangan ganggu yang digembok!

         const categoryName = product.categories?.name?.toUpperCase() || "DEFAULT";
         
         // Cari strategi yang cocok
         const strategyList = allStrategies[categoryName] || allStrategies["DEFAULT"];
         const currentCost = Number(product.cost || 0);
         
         // 2. KASIH FALLBACK! Kalau nggak nemu range-nya, paksain pakai tier [0]
         const cfg = strategyList.find((c: any) => currentCost >= c.minCost && currentCost <= c.maxCost) || strategyList[0];
         
         if (!cfg) continue; // Safety net terakhir

        // --- BAGIAN BARU: SETTING MARGIN & DISKON SESUAI STRATEGI ---
         const newMargin = cfg.min; 
         
         // MATIKAN AUTO PROMO: Pertahankan diskon manual yang sudah ada di database, atau 0 jika tidak ada
         const newDiscount = product.discount || 0;
         // -----------------------------------------------------------

         const newPrice = Math.ceil((currentCost * (1 + newMargin / 100)) / 100) * 100;
         
         // Hitung pakai newDiscount, bukan currentDiscount lama
         const hargaSetelahDiskon = newPrice - Math.floor(newPrice * (newDiscount / 100));
         const profitKotor = hargaSetelahDiskon - currentCost;

         let newCashback = 0;
         if (newDiscount > 0 && profitKotor > 0) {
             const randomPersen = (product.id.charCodeAt(0) % 6) + 15;
             newCashback = Math.floor(profitKotor * (randomPersen / 100));
         } else if (newDiscount === 0) {
             const gbCb = Number(globalCashback) || 3;
             const cbNormal = Math.floor(hargaSetelahDiskon * (gbCb / 100));
             const plafonMaks = Math.floor(profitKotor * 0.3); // Plafon 30% anti rugi
             newCashback = (cbNormal > plafonMaks && profitKotor > 0) ? plafonMaks : cbNormal;
         }

         // Pastikan cashback nggak pernah minus
         if (newCashback < 0 || profitKotor <= 0) newCashback = 0;

         updates.push({
             id: product.id,
             margin_item: newMargin,
             discount: newDiscount, // <-- Masukin diskon baru ke wadah
             price: newPrice,
             cashback: newCashback,
             updated_at: new Date().toISOString()
         });
         updateCount++;
     }

     // 3. Chunk eksekusi biar Supabase nggak ngos-ngosan
     const chunkSize = 50;
     for (let i = 0; i < updates.length; i += chunkSize) {
         const chunk = updates.slice(i, i + chunkSize);
// Kita pastikan 'updated_at' benar-benar terekam agar sinkron dengan sistem Trigger SQL [cite: 2026-03-08]
         const promises = chunk.map(upd => 
             supabaseAdmin.from('products').update({
                 margin_item: upd.margin_item,
                 discount: upd.discount,
                 price: upd.price,
                 cashback: upd.cashback,
                 updated_at: new Date().toISOString() // Pakai waktu eksekusi terbaru [cite: 2026-03-06]
             }).eq('id', upd.id)
         );
         await Promise.all(promises);
     }

     return NextResponse.json({ success: true, updatedCount: updateCount });
  } catch (error: any) {
     console.error("BULK UPDATE ERROR:", error.message);
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}