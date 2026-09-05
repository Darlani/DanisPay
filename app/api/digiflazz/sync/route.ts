import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; 
import { getSubBrandSlug } from '@/lib/constants/product-mappings';

// === MATIKAN CACHE NEXT.JS AGAR ROBOT MEMBACA DATABASE TERBARU ===
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// --- HELPER ---
const slugify = (text: string) => 
  text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

const fetchDigiBalance = async (username: string, apiKey: string) => {
  const sign = crypto.createHash('md5').update(username + apiKey + "depo").digest('hex');
  const res = await fetch('https://api.digiflazz.com/v1/cek-saldo', {
    method: 'POST',
    body: JSON.stringify({ cmd: 'deposit', username, sign }),
    cache: 'no-store'
  });
  const data = await res.json();
  return data.data ? data.data.deposit : 0;
};

// Hapus getStrategyKey lama karena namanya tidak sinkron dengan format JSON Database.
const FALLBACK_STRATEGIES: any = {
  DEFAULT: [{ minCost: 0, maxCost: 999999999, min: 10, max: 15 }]
};

export async function GET(req: Request) {
// 1. SATPAM INTERNAL (Khusus Admin & Manager via Dashboard)
  const cookieStore = req.headers.get('cookie') || "";
  
  const isAuthorized = 
    cookieStore.includes('isAdmin=true') || 
    cookieStore.toLowerCase().includes('userrole=manager');

  if (!isAuthorized) {
    return NextResponse.json({ error: "Akses Ditolak! Sesi Expired. Silakan login kembali." }, { status: 403 });
  }

  const syncTime = new Date().toISOString();

  try {
    const username = process.env.DIGIFLAZZ_USERNAME as string;
    const apiKey = process.env.DIGIFLAZZ_API_KEY as string;

// 1. AMBIL SETTINGS & MASTER DATA
    const [{ data: settingsData }, { data: digiProvider }] = await Promise.all([
      supabaseAdmin
        .from('store_settings')
        .select('margin_json, cashback_percent, admin_fee_pasca')
        .limit(1)
        .single(),
      supabaseAdmin
        .from('providers')
        .select('is_enabled, is_catalog_enabled, is_maintenance')
        .eq('code', 'DIGIFLAZZ')
        .maybeSingle()
    ]);

    const globalCashback = settingsData?.cashback_percent || 3;

    if (digiProvider?.is_maintenance) {
      return NextResponse.json({ success: true, message: "MAINTENANCE DIGIFLAZZ AKTIF bos!" });
    }

    if (digiProvider && (!digiProvider.is_enabled || !digiProvider.is_catalog_enabled)) {
      return NextResponse.json({ success: true, message: "SINKRONISASI DIGIFLAZZ DINONAKTIFKAN DI REGISTRY!" });
    }

    // CATATAN: Pembersihan global items (delete all) TELAH DIHAPUS untuk isolasi multi-provider (P.3B)

    const { data: dbCategories } = await supabaseAdmin.from('categories').select('id, name');
const categoryMap = new Map(dbCategories?.map((c: any) => [(c.name || "").toLowerCase().trim(), c.id]));
    
    // Tambahkan Peta ID ke Nama Kategori (Huruf Besar) untuk mencocokkan kunci Strategi Margin
    // PAKSA ID JADI TEKS BIKIN PENCOCOKAN GAK MUNGKIN MELESET
    const catIdToNameMap = new Map(dbCategories?.map((c: any) => [String(c.id), (c.name || "").toUpperCase().trim()]));
    
    let ACTIVE_STRATEGIES = settingsData?.margin_json || FALLBACK_STRATEGIES;
    if (typeof ACTIVE_STRATEGIES === 'string') ACTIVE_STRATEGIES = JSON.parse(ACTIVE_STRATEGIES); // Jaga-jaga kalau json nyangkut jadi teks
    const MY_ADMIN_PROFIT = settingsData?.admin_fee_pasca || 2500; // Markup Khusus Pasca

    // 3. TARIK HARGA DIGIFLAZZ (DUAL FETCH: PRABAYAR & PASCABAYAR) [cite: 2026-02-11]
    const signature = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');
    
    const [resPrepaid, resPasca] = await Promise.all([
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: 'prepaid', username, sign: signature }) }),
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: 'pasca', username, sign: signature }) })
    ]);

    const dataPrepaid = await resPrepaid.json();
    const dataPasca = await resPasca.json();

    // Cek jika respon Digiflazz bukan array (biasanya nolak karena IP belum whitelist atau API Key salah)
    if (!Array.isArray(dataPrepaid.data)) {
        console.error("DIGIFLAZZ PREPAID ERROR:", dataPrepaid);
        throw new Error(typeof dataPrepaid.data === 'string' ? dataPrepaid.data : "Akses ditolak Digiflazz (Cek Whitelist IP/Key Prabayar)");
    }
    if (!Array.isArray(dataPasca.data)) {
        console.error("DIGIFLAZZ PASCA ERROR:", dataPasca);
        throw new Error(typeof dataPasca.data === 'string' ? dataPasca.data : "Akses ditolak Digiflazz (Cek Whitelist IP/Key Pascabayar)");
    }

    // Gabungkan data keduanya
    const digiItems = [...dataPrepaid.data, ...dataPasca.data];
    if (digiItems.length === 0) throw new Error("Data pricelist dari Digiflazz kosong bos!");

// 4. ===[ MASTER BRAND AUTO-SYNC ANTI GAGAL ]===
    const { data: dbBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const existingBrandSlugs = new Set(dbBrands?.map((b: any) => b.slug));

    const newBrandsMap = new Map();
    digiItems.forEach((i: any) => {
      let bName = i.brand;
      if (!bName || bName.trim() === "") bName = i.category;
      if (!bName || bName.trim() === "") bName = "UMUM";

      const slug = slugify(bName);
      // HANYA DAFTARKAN MERK BARU YANG BELUM ADA DI DATABASE!
      if (!existingBrandSlugs.has(slug) && !newBrandsMap.has(slug)) {
        const rawCat = (i.category || "").toLowerCase().trim();
        let matchedId = categoryMap.get(rawCat);

        if (!matchedId) {
          if (rawCat.includes("game")) matchedId = categoryMap.get("games");
          else if (rawCat.includes("pulsa") || rawCat.includes("data") || rawCat.includes("paket")) matchedId = categoryMap.get("pulsa & data seluler"); 
          else if (rawCat.includes("pln") || rawCat.includes("listrik")) matchedId = categoryMap.get("tagihan prabayar"); 
          else if (rawCat.includes("pdam") || rawCat.includes("bpjs") || rawCat.includes("pasca") || rawCat.includes("telepon")) matchedId = categoryMap.get("tagihan pascabayar");
          else if (rawCat.includes("emoney") || rawCat.includes("wallet") || rawCat.includes("saldo")) matchedId = categoryMap.get("e-wallet & saldo");
          else if (rawCat.includes("voucher") || rawCat.includes("tiket")) matchedId = categoryMap.get("voucher & gift card");
        }
        newBrandsMap.set(slug, { name: bName, slug: slug, category: i.category, category_id: matchedId || null });
      }
    });

    // MASUKKAN MERK BARU DENGAN CARA INSERT (BEBAS ERROR SQL)
    if (newBrandsMap.size > 0) {
      const brandsToInsert = Array.from(newBrandsMap.values());
      await supabaseAdmin.from('brands').insert(brandsToInsert);
    }

    // AMBIL ULANG SELURUH DATA MERK YANG SUDAH LENGKAP
    const { data: updatedBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandIdMap = new Map(updatedBrands?.map((b: any) => [b.slug, { id: b.id, category_id: b.category_id }]));

// 5. SMART FILTERING, ZONASI, & IRON GUARD LOGIC
    const itemsData: any[] = [];
    const productGroups = new Map();

    interface ExistingProduct {
      id: string;
      sku: string;
      name: string;
      brand_id: number;
      cost: number;
      lock_margin: boolean;
      price: number;
      margin_item: number;
      discount: number;
      cashback?: number;
    }

    // SEKARANG KITA KENALAN PAKAI NAMA + BRAND_ID, TAPI TETAP BACKUP PAKAI SKU!
    const { data: existingProducts } = await supabaseAdmin.from('product_automatic').select('id, sku, name, brand_id, cost, lock_margin, price, margin_item, discount');
    
    // Buat 2 jaring pengaman agar gembok tidak gampang lepas walau nama diedit di UI
    const existingNameMap = new Map((existingProducts as ExistingProduct[] | null)?.map(p => [`${p.brand_id}-${p.name.toLowerCase().trim()}`, p]));
    const existingSkuMap = new Map((existingProducts as ExistingProduct[] | null)?.map(p => [p.sku, p]));
    const existingCostMap = new Map((existingProducts as ExistingProduct[] | null)?.map(p => [p.id, Number(p.cost) || 0]));

    digiItems.forEach((item: any) => {
      const isHealthy = item.buyer_product_status && item.seller_product_status;
      if (!isHealthy) return; // Skip yang lagi gangguan

// --- DETEKSI ZONASI & DESKRIPSI LENGKAP ---
      const fullDesc = item.desc || ""; 
      const descUpper = fullDesc.toUpperCase();
      
      // Daftar kata kunci wilayah yang memicu tag ZONASI
      const regionalKeywords = [
        // --- ISTILAH UMUM ---
        "ZONA", "ZONASI", "LOKAL", "AREA", "REGIONAL", "CLUSTER", "PROMO WILAYAH", "KHUSUS",

        // --- PULAU & CLUSTER OPERATOR ---
        "JAWA", "SUMATERA", "KALIMANTAN", "SULAWESI", "BALI", "NUSA TENGGARA", "NUSRA", 
        "PAPUA", "MALUKU", "SULAMPUA", "KALISUMAPA", "SUMBAGSEL", "SUMBAGUT",

        // --- PROVINSI & SINGKATAN (JAWA) ---
        "JABAR", "JATENG", "JATIM", "DIY", "YOGYAKARTA", "JABODETABEK", "BANTEN", "JAKARTA", "MADURA",

        // --- PROVINSI & SINGKATAN (SUMATERA) ---
        "ACEH", "SUMUT", "SUMBAR", "RIAU", "KEPRI", "JAMBI", "BENGKULU", "SUMSEL", "BABEL", "LAMPUNG",

        // --- PROVINSI & SINGKATAN (KALIMANTAN) ---
        "KALBAR", "KALTENG", "KALSEL", "KALTIM", "KALTARA",

        // --- PROVINSI & SINGKATAN (SULAWESI) ---
        "SULUT", "SULTENG", "SULSEL", "SULTRA", "GORONTALO", "SULBAR",

        // --- PROVINSI & SINGKATAN (BALI & NUSA TENGGARA) ---
        "NTB", "NTT",

        // --- PROVINSI & SINGKATAN (PAPUA & MALUKU) ---
        "TERNATE", "AMBON", "PAPUA BARAT", "PAPUA SELATAN", "PAPUA TENGAH", "PAPUA PEGUNUNGAN"
      ];

      // Cek apakah ada salah satu kata kunci di deskripsi atau nama produk
      const isZonasiMatch = regionalKeywords.some(key => 
        descUpper.includes(key) || item.product_name.toUpperCase().includes(key)
      );

      // 1. Definisikan rawCat di sini agar bisa digunakan di bawahnya
      const rawCat = (item.category || "").toLowerCase();

      // 2. Set ZONASI jika kategori sesuai (Pulsa/Data/Internet) dan kata kunci wilayah ditemukan
      const isZonasiTarget = rawCat.includes("pulsa") || rawCat.includes("data") || rawCat.includes("internet");
      const zonaTag = (isZonasiTarget && isZonasiMatch) ? "ZONASI" : null;

// SETTING MODAL & BRAND
      const isPasca = item.type === 'Pasca' || !item.price;
      const modal = isPasca ? (item.admin || 0) : item.price;

      // KAMU TERLEWAT BAGIAN INI BOS! 👇
      let bName = item.brand;
      if (!bName || bName.trim() === "") bName = item.category;
      if (!bName || bName.trim() === "") bName = "UMUM";

      const slugBrand = slugify(bName);
      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(bName, item.product_name, item.category, item.type || "");

// NAMA PRODUK (Utuh & Hapus kata ganda di depan)
      let webProductName = item.product_name;
      const words = webProductName.split(/\s+/);
      
      // Jika kata pertama dan kedua sama (misal: "INDOSAT INDOSAT"), ambil dari kata kedua dst.
      if (words.length > 1 && words[0].toLowerCase() === words[1].toLowerCase()) {
        webProductName = words.slice(1).join(" ");
      }

      // Tambahkan label [ZONASI] di depan nama jika terdeteksi zonasi
      if (zonaTag === "ZONASI") {
        webProductName = `[ZONASI] ${webProductName}`;
      }

      // --- 1. SIMPAN SEMUA VARIASI KE TABEL ITEMS ---
      itemsData.push({
        sku: item.buyer_sku_code,
        brand_slug: slugBrand,
        name: item.product_name, // Kolom name Items dibiarkan utuh asli Digiflazz
        modal: modal,
        sub_brand_slug: subBrandSlug,
        desc: fullDesc, // Informasi lengkap sesuai dari Digiflazz
        zona_type: zonaTag,
        is_active: true,
        last_sync: syncTime,
        provider: 'DIGIFLAZZ',
        webProductName: webProductName
      });

// --- 2. KELOMPOKKAN UNTUK TABEL PRODUCTS (Cari Modal Termahal) ---
      // Tambahkan slugBrand agar produk nominal sama antar brand (misal: Axis 5k vs XL 5k) tidak bentrok
      const groupKey = `${slugBrand}-${webProductName.toLowerCase().trim()}`;

      if (!productGroups.has(groupKey)) {
        productGroups.set(groupKey, { 
          ...item, 
          webName: webProductName, 
          maxModal: modal, 
          baseSku: item.buyer_sku_code, 
          subBrandSlug, 
          isPasca, 
          slugBrand 
        });
      } else {
        const existingGroup = productGroups.get(groupKey);
        // Jika nemu yang namanya sama tapi harganya lebih MAHAL, update acuan modalnya!
        if (modal > existingGroup.maxModal) {
          existingGroup.maxModal = modal;
          existingGroup.baseSku = item.buyer_sku_code;
        }
      }
    });

    const productsToUpsert: any[] = [];

Array.from(productGroups.values()).forEach((group: any) => {
      const bInfo = brandIdMap.get(group.slugBrand);
      if (!bInfo) return;

      // TAMBAHKAN KODE INI AGAR PASCABAYAR MASUK RAK YANG BENAR 👇
      let finalCategoryId = bInfo.category_id;
      if (group.isPasca) {
          const pascaId = categoryMap.get("tagihan pascabayar");
          if (pascaId) finalCategoryId = pascaId;
      }
      // SAMPAI SINI 👆

      // Cek produk lama di database untuk mengambil data harga terakhir
      const productKey = `${bInfo.id}-${group.webName.toLowerCase().trim()}`;
      const existing = existingNameMap.get(productKey) || existingSkuMap.get(group.baseSku);

      // 5. UPDATE MODAL SAJA (Pertahankan harga & margin lama agar tidak rusak sebelum di-Bulk Update)
      productsToUpsert.push({
        id: existing?.id,
        sku: group.baseSku,
        name: group.webName, 
        brand: group.brand || "Umum", 
        sub_brand: group.subBrandSlug,
        brand_id: bInfo.id,
        category_id: finalCategoryId,
        cost: Math.max(Number(existing?.cost || 0), Number(group.maxModal || 0)), // Pertahankan modal tertinggi cross-provider
        
        // --- PERTAHANKAN DATA LAMA ---
        price: existing?.price || 0,
        margin_item: existing?.margin_item || 0,
        discount: existing?.discount || 0,
        cashback: existing?.cashback || 0,
        lock_margin: existing?.lock_margin || false,
        // -----------------------------
        
        stock: 999, 
        is_active: true,
        provider: 'DIGIFLAZZ',
        updated_at: syncTime
      });
    });

    // 6. ===[ FINAL PUSH DENGAN CHUNKING BATCH ]===
    try {
        const chunkSize = 500; // Pecah pengiriman jadi 500 produk per kloter biar Supabase bernafas

        // Chunking untuk tabel PRODUCTS terlebih dahulu agar ID produk terbit
        const upsertedProductMap = new Map<string, string>();
        for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
            const chunk = productsToUpsert.slice(i, i + chunkSize);
            console.log(`📦 [SYNC] Mengirim Kloter ${i / chunkSize + 1}... (${i} / ${productsToUpsert.length} Produk)`);

            const { data: upserted, error: errProducts } = await supabaseAdmin
              .from('product_automatic')
              .upsert(chunk, { onConflict: 'name' })
              .select('id, name, brand_id');
            if (errProducts) throw new Error("Gagal upsert Products: " + errProducts.message);
            if (upserted) {
              for (const p of upserted) {
                upsertedProductMap.set(`${p.brand_id}-${(p.name || '').toLowerCase().trim()}`, p.id);
              }
            }
        }

        // Saring data duplikat dari Digiflazz sebelum masuk gudang dan pasangkan product_automatic_id
        const uniqueItemsData = Array.from(new Map(itemsData.map(item => [item.sku, item])).values()).map(item => {
          const bInfo = brandIdMap.get(item.brand_slug);
          const targetKey = `${bInfo?.id}-${item.webProductName.toLowerCase().trim()}`;
          const targetId = upsertedProductMap.get(targetKey) || null;
          return {
            sku: item.sku,
            brand_slug: item.brand_slug,
            name: item.name,
            modal: item.modal,
            sub_brand_slug: item.sub_brand_slug,
            desc: item.desc,
            zona_type: item.zona_type,
            is_active: item.is_active,
            last_sync: item.last_sync,
            provider: item.provider,
            product_automatic_id: targetId
          };
        });

        // 7. Provider-Scoped Upsert ke Tabel product_providers_items (UNIQUE: provider, sku)
        for (let i = 0; i < uniqueItemsData.length; i += chunkSize) {
            const chunk = uniqueItemsData.slice(i, i + chunkSize);
            const { error: errItems } = await supabaseAdmin
              .from('product_providers_items')
              .upsert(chunk, { onConflict: 'provider,sku' });
            if (errItems) console.error("PERINGATAN GUDANG ITEMS:", errItems.message);
        }

        // 8. Provider-Scoped Stale Deactivation (HANYA DIGIFLAZZ)
        // Amunisi Digiflazz yang tidak hadir dalam feed sync kali ini dinonaktifkan
        await supabaseAdmin
          .from('product_providers_items')
          .update({ is_active: false })
          .eq('provider', 'DIGIFLAZZ')
          .or(`last_sync.lt.${syncTime},last_sync.is.null`);

        // 9. Rekonsiliasi Universal MAX-Cost Across All Active Mapped Items Across All Providers
        const { data: allActiveMappedItems } = await supabaseAdmin
          .from('product_providers_items')
          .select('product_automatic_id, modal')
          .eq('is_active', true)
          .not('product_automatic_id', 'is', null);

        if (allActiveMappedItems && allActiveMappedItems.length > 0) {
          const universalMaxCostMap = new Map<string, number>();
          for (const it of allActiveMappedItems) {
            if (!it.product_automatic_id) continue;
            const currentMax = universalMaxCostMap.get(it.product_automatic_id) || 0;
            const m = Number(it.modal) || 0;
            if (m > currentMax) universalMaxCostMap.set(it.product_automatic_id, m);
          }

          const costUpdates: { id: string; cost: number }[] = [];
          for (const [prodId, correctCost] of universalMaxCostMap.entries()) {
            const currentCost = existingCostMap.get(prodId);
            if (currentCost !== correctCost) {
              costUpdates.push({ id: prodId, cost: correctCost });
            }
          }

          for (let i = 0; i < costUpdates.length; i += 200) {
            const chunk = costUpdates.slice(i, i + 200);
            await Promise.all(
              chunk.map(u => supabaseAdmin.from('product_automatic').update({ cost: u.cost, updated_at: syncTime }).eq('id', u.id))
            );
          }
        }

        // 10. Perbarui Telemetri Provider Registry (DIGIFLAZZ Sukses)
        await supabaseAdmin
          .from('providers')
          .update({
            last_sync_at: syncTime,
            last_sync_status: 'SUCCESS',
            last_error: null,
            updated_at: new Date().toISOString()
          })
          .eq('code', 'DIGIFLAZZ');

        // --- CATAT LOG AKTIVITAS MANUAL SYNC ---
        try {
          await supabaseAdmin.from('activity_logs').insert([{
            action: "MANUAL SYNC",
            details: `Admin berhasil sinkronisasi ${productsToUpsert.length} produk dari Digiflazz via Dashboard (Provider-Scoped).`,
            created_at: new Date().toISOString()
          }]);
        } catch (logErr) {
          console.error("Gagal log sync:", logErr);
        } 
            
        return NextResponse.json({ 
                    success: true, 
                    updated: productsToUpsert.length,
                    message: "MASTER SYNC: Provider-Scoped Sync selesai! Pra & Pasca siap jual."
                });

    } catch (dbErr: unknown) {
        const dbErrorMessage = dbErr instanceof Error ? dbErr.message : 'Database error';
        return NextResponse.json({ success: false, error: dbErrorMessage }, { status: 500 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';

    // Catat kegagalan ke telemetri public.providers tanpa merusak gudang items
    try {
      await supabaseAdmin
        .from('providers')
        .update({
          last_sync_at: syncTime,
          last_sync_status: 'FAILED',
          last_error: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('code', 'DIGIFLAZZ');
    } catch (telemetryErr) {
      console.error("Gagal update telemetri providers:", telemetryErr);
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}