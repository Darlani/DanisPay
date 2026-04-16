import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    // --- SATPAM INTERNAL (Anti-Iseng) ---
    const cookieStore = req.headers.get('cookie') || "";
    const isAuthorized = cookieStore.includes('isAdmin=true') || cookieStore.toLowerCase().includes('userrole=manager');

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses Ditolak! Lu bukan Admin/Manager Bos." }, { status: 403 });
    }

    // Kita abaikan globalCashback dari frontend demi keamanan
    const { allStrategies } = await req.json();

// 1. Panggil data dari 2 Gudang + Store Settings (Limit 50.000 agar muat banyak)
     const [autoRes, semiRes, settingsRes] = await Promise.all([
       supabaseAdmin.from('product_automatic')
         // WAJIB ADA margin_item AGAR SISTEM INGAT ANGKA GEMBOKNYA
         .select('id, cost, margin_item, discount, lock_margin, category_id, categories(name)')
         .limit(50000),
       supabaseAdmin.from('product_semi_auto')
         // WAJIB ADA margin_item DI SINI JUGA
         .select('id, cost_numeric, margin_item, discount, lock_margin, category_id, categories(name)')
         .limit(50000),
       supabaseAdmin.from('store_settings').select('cashback_percent').limit(1).single()
     ]);

     // Tarik nilai murni dari database
     const dbCashbackPercent = Number(settingsRes.data?.cashback_percent || 3);

     if (autoRes.error) console.error("Error Auto:", autoRes.error);
     if (semiRes.error) console.error("Error Semi:", semiRes.error);

     const autoProducts = autoRes.data || [];
     const semiProducts = semiRes.data || [];

     let updateCount = 0;
     const updatesAuto: any[] = [];
     const updatesSemi: any[] = [];

// 2. Fungsi Eksekutor Perhitungan (Anti-Korupsi & Smart Lock)
     const processProducts = (products: any[], isSemiAuto: boolean, targetArray: any[]) => {
       for (const product of products) {
         // Cek apakah produk ini digembok
         const isLocked = product.lock_margin === true || String(product.lock_margin).toLowerCase() === 'true';

         const categoryName = product.categories?.name?.toUpperCase() || "DEFAULT";
         const strategyList = allStrategies[categoryName] || allStrategies["DEFAULT"];
         const currentCost = Number(isSemiAuto ? (product.cost_numeric || 0) : (product.cost || 0));
         
         const cfg = strategyList.find((c: any) => currentCost >= c.minCost && currentCost <= c.maxCost) || strategyList[0];
         if (!cfg && !isLocked) continue; // Safety net

         // 1. TENTUKAN MARGIN: Jika digembok, pakai margin lama. Jika tidak, ikut strategi baru!
         const newMargin = isLocked ? Number(product.margin_item || 0) : (cfg ? cfg.min : 0); 
         const newDiscount = Number(product.discount || 0);

         // 2. HITUNG HARGA JUAL (Bebas selisih Rp 50 jika margin 0)
         const newPrice = newMargin === 0 
           ? currentCost 
           : Math.ceil((currentCost * (1 + newMargin / 100)) / 100) * 100;
         
         const hargaSetelahDiskon = newPrice - Math.floor(newPrice * (newDiscount / 100));
         const profitKotor = hargaSetelahDiskon - currentCost;

         // 3. CASHBACK DINAMIS (Tetap update walau digembok)
         let newCashback = 0;
         if (profitKotor > 0) {
             const cbNormal = Math.floor(hargaSetelahDiskon * (dbCashbackPercent / 100));
             const plafonMaks = Math.floor(profitKotor * (dbCashbackPercent / 10)); // Capped Dinamis
             newCashback = Math.min(cbNormal, plafonMaks);
         }

         // 4. MASUKKAN KE ARRAY UPDATE
         if (isSemiAuto) {
           targetArray.push({
             id: product.id,
             margin_item: newMargin,
             discount: newDiscount,
             price_numeric: newPrice, // Khusus Semi Auto
             cashback: newCashback,
             lock_margin: product.lock_margin, // <-- Kunci permanen!
             updated_at: new Date().toISOString()
           });
         } else {
           targetArray.push({
             id: product.id,
             margin_item: newMargin,
             discount: newDiscount,
             price: newPrice, // Khusus Automatic
             cashback: newCashback,
             lock_margin: product.lock_margin, // <-- Kunci permanen!
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
     } // <--- INI YANG HILANG (Kurung kurawal penutup loop)

     // --- CATAT LOG AKTIVITAS KE BACKEND (ANTI ERROR 403) ---
     // Kita taruh di sini supaya log cuma tercipta kalau update produknya sukses
     try {
       await supabaseAdmin.from('activity_logs').insert([{
         action: "BULK UPDATE",
         details: `Melakukan update harga massal pada ${updateCount} produk via dashboard admin.`,
         created_at: new Date().toISOString()
       }]);
     } catch (logErr) {
       // Kita log ke console saja kalau gagal catat aktivitas, jangan sampai gagalkan proses bulk-nya
       console.error("Gagal mencatat log aktivitas:", logErr);
     }

     return NextResponse.json({ success: true, updatedCount: updateCount });
  } catch (error: any) {
     console.error("BULK UPDATE ERROR:", error.message);
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}