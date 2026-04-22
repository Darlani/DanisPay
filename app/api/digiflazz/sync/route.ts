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
    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('margin_json, cashback_percent, balance_digiflazz, is_maintenance_digiflazz, admin_fee_pasca')
      .limit(1)
      .single();

    const globalCashback = settingsData?.cashback_percent || 3;

    if (settingsData?.is_maintenance_digiflazz) {
      return NextResponse.json({ success: true, message: "MAINTENANCE AKTIF bos!" });
    }

    // --- RESET TABEL ITEMS AGAR ID MULAI DARI 1 ---
    // Pastikan sudah menjalankan 'ALTER SEQUENCE items_id_seq RESTART WITH 1;' di SQL Editor
    await supabaseAdmin.from('items').delete().neq('sku', 'KOSONGKAN_SEMUA_DATA');

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

    // SEKARANG KITA KENALAN PAKAI NAMA + BRAND_ID, TAPI TETAP BACKUP PAKAI SKU!
    const { data: existingProducts } = await supabaseAdmin.from('product_automatic').select('sku, name, brand_id, lock_margin, price, margin_item, discount');
    
    // Buat 2 jaring pengaman agar gembok tidak gampang lepas walau nama diedit di UI
    const existingNameMap = new Map(existingProducts?.map((p: any) => [`${p.brand_id}-${p.name.toLowerCase().trim()}`, p]));
    const existingSkuMap = new Map(existingProducts?.map((p: any) => [p.sku, p]));

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
        last_sync: syncTime
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

      let finalPrice = 0;
      let marginInfo = 0;

      // Cek gembok pakai Nama + ID Brand, JIKA GAGAL KARENA DIEDIT, tangkap pakai jaring SKU
      const productKey = `${bInfo.id}-${group.webName.toLowerCase().trim()}`;
      const existing = existingNameMap.get(productKey) || existingSkuMap.get(group.baseSku);
      
      const isLocked = existing?.lock_margin === true || String(existing?.lock_margin).toLowerCase() === 'true';

      // --- LOGIKA MARGIN UNIVERSAL (SAMA PERSIS DENGAN BULK UPDATE) ---
      const sKey = (catIdToNameMap.get(String(finalCategoryId)) || "DEFAULT").toUpperCase().trim();
      let strategy = ACTIVE_STRATEGIES[sKey];
      
      if (!strategy || !Array.isArray(strategy) || strategy.length === 0) {
          strategy = ACTIVE_STRATEGIES["DEFAULT"] || FALLBACK_STRATEGIES.DEFAULT;
      }

      const currentModal = Number(group.maxModal);
      const range = strategy.find((s: any) => currentModal >= Number(s.minCost) && currentModal <= Number(s.maxCost)) || strategy[0];
      
      // Jika digembok pakai yang lama, jika tidak pakai persentase dari strategi
      if (isLocked) {
        marginInfo = Number(existing.margin_item || 0);
      } else {
        marginInfo = Number(range.min ?? 10);
      }
      
      // Hitung Harga Baru dengan Persentase
      finalPrice = marginInfo === 0 
        ? currentModal 
        : Math.ceil((currentModal * (1 + marginInfo / 100)) / 100) * 100;

      // --- RUMUS CASHBACK OTOMATIS SAAT SYNC ---
      const currentDiscount = existing?.discount || 0;
      const hargaSetelahDiskon = finalPrice - Math.floor(finalPrice * (currentDiscount / 100));
      const profitKotor = hargaSetelahDiskon - group.maxModal;
      let finalCashback = 0;

      if (profitKotor > 0) {
        const cbNormal = Math.floor(hargaSetelahDiskon * (globalCashback / 100));
        const plafonMaks = Math.floor(profitKotor * (globalCashback / 10)); // Capped anti-rugi
        finalCashback = Math.min(cbNormal, plafonMaks);
      }

      productsToUpsert.push({
        sku: group.baseSku,
        name: group.webName, 
        brand: group.brand || "Umum", 
        sub_brand: group.subBrandSlug,
        brand_id: bInfo.id,
        category_id: finalCategoryId,
        cost: group.maxModal, 
        price: finalPrice, 
        stock: 999, 
        margin_item: marginInfo,
        discount: currentDiscount, 
        cashback: finalCashback, // <-- INI OBAT CASHBACK NOL KEMARIN
        lock_margin: isLocked, 
        is_active: true,
        provider: 'DIGIFLAZZ',
        updated_at: syncTime
      });
    });

    // 6. ===[ FINAL PUSH DENGAN CHUNKING BATCH ]===
    try {
        const chunkSize = 500; // Pecah pengiriman jadi 500 produk per kloter biar Supabase bernafas

// Saring data duplikat dari Digiflazz sebelum masuk gudang agar aman 100%
        const uniqueItemsData = Array.from(new Map(itemsData.map(item => [item.sku, item])).values());

        // Chunking untuk tabel ITEMS
        for (let i = 0; i < uniqueItemsData.length; i += chunkSize) {
            const chunk = uniqueItemsData.slice(i, i + chunkSize);
            const { error: errItems } = await supabaseAdmin.from('items').insert(chunk);
            if (errItems) console.error("PERINGATAN GUDANG ITEMS:", errItems.message); // Tidak throw error agar etalase tetap update!
        }

// Chunking untuk tabel PRODUCTS dengan Audit Log [cite: 2026-03-06]
        for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
            const chunk = productsToUpsert.slice(i, i + chunkSize);
            console.log(`📦 [SYNC] Mengirim Kloter ${i / chunkSize + 1}... (${i} / ${productsToUpsert.length} Produk)`);
            
            // JANGKARNYA PINDAH KE NAMA, BIAR ID UUID TIDAK BERUBAH-UBAH! [cite: 2026-03-13]
      const { error: errProducts } = await supabaseAdmin.from('product_automatic').upsert(chunk, { onConflict: 'name' });
            if (errProducts) throw new Error("Gagal upsert Products: " + errProducts.message);
        }

        // KEMBALIKAN BARIS INI: Membersihkan etalase dari produk yang sudah tutup/hilang di Digiflazz
        const { error: errorDelete } = await supabaseAdmin.from('product_automatic')
            .delete()
            .eq('provider', 'DIGIFLAZZ')
            .lt('updated_at', syncTime); 

        // --- CATAT LOG AKTIVITAS MANUAL SYNC ---
        try {
          await supabaseAdmin.from('activity_logs').insert([{
            action: "MANUAL SYNC",
            details: `Admin berhasil sinkronisasi ${productsToUpsert.length} produk dari Digiflazz via Dashboard.`,
            created_at: new Date().toISOString()
          }]);
        } catch (logErr) {
          console.error("Gagal log sync:", logErr);
        } 
            
        return NextResponse.json({ 
                    success: true, 
                    updated: productsToUpsert.length,
                    message: "MASTER SYNC: Etalase dibersihkan! Pra & Pasca siap jual." 
                });

    } catch (dbErr: any) {
        return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}