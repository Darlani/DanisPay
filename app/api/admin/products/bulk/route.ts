import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
     const { allStrategies, globalCashback } = await req.json();

     // 1. Panggil data dari 2 Gudang (Limit 50.000 agar muat banyak) [cite: 2026-03-13]
     // Gunakan id kategori sebagai fallback jika nama relasi tidak bisa ditarik
     const [autoRes, semiRes] = await Promise.all([
       supabaseAdmin.from('product_automatic')
         .select('id, cost, discount, lock_margin, category_id, categories(name)')
         .limit(50000),
       supabaseAdmin.from('product_semi_auto')
         .select('id, cost_numeric, discount, lock_margin, category_id, categories(name)')
         .limit(50000)
     ]);

     if (autoRes.error) console.error("Error Auto:", autoRes.error);
     if (semiRes.error) console.error("Error Semi:", semiRes.error);

     const autoProducts = autoRes.data || [];
     const semiProducts = semiRes.data || [];

     let updateCount = 0;
     const updatesAuto: any[] = [];
     const updatesSemi: any[] = [];

     // 2. Fungsi Eksekutor Perhitungan (Anti-Korupsi)
     const processProducts = (products: any[], isSemiAuto: boolean, targetArray: any[]) => {
       for (const product of products) {
         // Pastikan evaluasi strict untuk boolean true atau wujud string 'true' dari Supabase
         if (product.lock_margin === true || String(product.lock_margin).toLowerCase() === 'true') continue; // Jangan ganggu yang digembok!

         // Ambil nama kategori, jika null pakai 'DEFAULT'
         const categoryName = product.categories?.name?.toUpperCase() || "DEFAULT";
         
         // Cari strategi yang cocok
         const strategyList = allStrategies[categoryName] || allStrategies["DEFAULT"];
         const currentCost = Number(isSemiAuto ? (product.cost_numeric || 0) : (product.cost || 0));
         
         // 2. KASIH FALLBACK! Kalau nggak nemu range-nya, paksain pakai tier [0]
         const cfg = strategyList.find((c: any) => currentCost >= c.minCost && currentCost <= c.maxCost) || strategyList[0];
         
         if (!cfg) continue; // Safety net terakhir

         // --- BAGIAN BARU: SETTING MARGIN & DISKON SESUAI STRATEGI ---
         const newMargin = cfg.min; 
         
         // MATIKAN AUTO PROMO: Pertahankan diskon manual yang sudah ada di database, atau 0 jika tidak ada
         const newDiscount = Number(product.discount || 0);
         // -----------------------------------------------------------

         const newPrice = Math.ceil((currentCost * (1 + newMargin / 100)) / 100) * 100;
         
         // Hitung pakai newDiscount, bukan currentDiscount lama
         const hargaSetelahDiskon = newPrice - Math.floor(newPrice * (newDiscount / 100));
         const profitKotor = hargaSetelahDiskon - currentCost;

         let newCashback = 0;
         if (newDiscount > 0 && profitKotor > 0) {
             const randomPersen = (String(product.id).charCodeAt(0) % 6) + 15;
             newCashback = Math.floor(profitKotor * (randomPersen / 100));
         } else if (newDiscount === 0) {
             const gbCb = Number(globalCashback) || 3;
             const cbNormal = Math.floor(hargaSetelahDiskon * (gbCb / 100));
             const plafonMaks = Math.floor(profitKotor * 0.3); // Plafon 30% anti rugi
             newCashback = (cbNormal > plafonMaks && profitKotor > 0) ? plafonMaks : cbNormal;
         }

         // Pastikan cashback nggak pernah minus
         if (newCashback < 0 || profitKotor <= 0) newCashback = 0;

         // Masukkan ke array sesuai gudangnya dengan penamaan kolom yang benar
         if (isSemiAuto) {
           targetArray.push({
             id: product.id,
             margin_item: newMargin,
             discount: newDiscount,
             price_numeric: newPrice, // Khusus Semi Auto
             cashback: newCashback,
             updated_at: new Date().toISOString()
           });
         } else {
           targetArray.push({
             id: product.id,
             margin_item: newMargin,
             discount: newDiscount,
             price: newPrice, // Khusus Automatic
             cashback: newCashback,
             updated_at: new Date().toISOString()
           });
         }
         updateCount++;
       }
     };

     // Eksekusi proses hitung
     processProducts(autoProducts, false, updatesAuto);
     processProducts(semiProducts, true, updatesSemi);

     // 3. Chunk eksekusi biar Supabase nggak ngos-ngosan (Eksekusi 2 Gudang)
     const chunkSize = 50;

     // Eksekusi Gudang Automatic
     for (let i = 0; i < updatesAuto.length; i += chunkSize) {
         const chunk = updatesAuto.slice(i, i + chunkSize);
         const promises = chunk.map(upd => 
             supabaseAdmin.from('product_automatic').update(upd).eq('id', upd.id)
         );
         await Promise.all(promises);
     }

     // Eksekusi Gudang Semi-Auto
     for (let i = 0; i < updatesSemi.length; i += chunkSize) {
         const chunk = updatesSemi.slice(i, i + chunkSize);
         const promises = chunk.map(upd => 
             supabaseAdmin.from('product_semi_auto').update(upd).eq('id', upd.id)
         );
         await Promise.all(promises);
     }

     return NextResponse.json({ success: true, updatedCount: updateCount });
  } catch (error: any) {
     console.error("BULK UPDATE ERROR:", error.message);
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}