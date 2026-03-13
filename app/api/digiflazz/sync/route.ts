import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; 
import { getSubBrandSlug } from '@/lib/constants/product-mappings';

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

const FALLBACK_STRATEGIES: any = {
  DEFAULT: [{ minCost: 0, maxCost: 999999999, min: 10 }]
};

const getStrategyKey = (rawCat: string) => {
  const c = (rawCat || "").toUpperCase();
  if (c.includes("GAME") || c.includes("MOBILE LEGEND") || c.includes("FREE FIRE")) return "GAME";
  if (c.includes("PULSA") || c.includes("DATA") || c.includes("PAKET") || c.includes("PLN") || c.includes("LISTRIK")) return "PPOB";
  if (c.includes("E-MONEY") || c.includes("WALLET") || c.includes("DANA") || c.includes("GOPAY")) return "E-MONEY";
  if (c.includes("STREAMING") || c.includes("VIDEO") || c.includes("NETFLIX")) return "ENTERTAINMENT";
  return "DEFAULT";
};

export async function GET(req: Request) {
// 1. SATPAM DUAL JALUR (Cookie untuk Admin, Secret untuk Robot VPS) [cite: 2026-03-06]
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

  const cookieStore = req.headers.get('cookie');
  const isAdmin = cookieStore?.includes('isAdmin=true');

  const isAuthorized = (isAdmin) || (querySecret === WEBHOOK_SECRET && WEBHOOK_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Akses Ditolak! Sesi Expired atau Kunci Salah." }, { status: 403 });
  }

  const syncTime = new Date().toISOString();

  try {
    const username = process.env.DIGIFLAZZ_USERNAME as string;
    const apiKey = process.env.DIGIFLAZZ_API_KEY as string;

    // 1. AMBIL SETTINGS & MASTER DATA
    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('margin_json, balance_digiflazz, is_maintenance_digiflazz, admin_fee_pasca')
      .single();

    if (settingsData?.is_maintenance_digiflazz) {
      return NextResponse.json({ success: true, message: "MAINTENANCE AKTIF bos!" });
    }

    // --- RESET TABEL ITEMS AGAR ID MULAI DARI 1 ---
    // Pastikan sudah menjalankan 'ALTER SEQUENCE items_id_seq RESTART WITH 1;' di SQL Editor
    await supabaseAdmin.from('items').delete().neq('sku', 'KOSONGKAN_SEMUA_DATA');

    const { data: dbCategories } = await supabaseAdmin.from('categories').select('id, name');
    const categoryMap = new Map(dbCategories?.map((c: any) => [c.name.toLowerCase(), c.id]));
    const ACTIVE_STRATEGIES = settingsData?.margin_json || FALLBACK_STRATEGIES;
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

    // 4. ===[ MASTER BRAND AUTO-SYNC & AUTO-MAPPING ]===
    const { data: dbBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandMap = new Map(dbBrands?.map((b: any) => [b.slug, b]));

    const uniqueBrandMap = new Map();
    digiItems.forEach((i: any) => {
      const slug = slugify(i.brand || "");
      if (!uniqueBrandMap.has(slug)) uniqueBrandMap.set(slug, { brand: i.brand, category: i.category });
    });

    const brandsToUpsert = Array.from(uniqueBrandMap.values()).map((item: any) => {
      const slugBrand = slugify(item.brand);
      const existing = brandMap.get(slugBrand);
      
      const rawCat = (item.category || "").toLowerCase();
      let matchedId = categoryMap.get(rawCat);

      if (!matchedId) {
        if (rawCat.includes("game")) matchedId = categoryMap.get("games");
        else if (rawCat.includes("pulsa") || rawCat.includes("data")) matchedId = categoryMap.get("pulsa & data");
        else if (rawCat.includes("pln") || rawCat.includes("listrik") || rawCat.includes("pdam") || rawCat.includes("bpjs")) matchedId = categoryMap.get("ppob");
        else if (rawCat.includes("emoney") || rawCat.includes("wallet")) matchedId = categoryMap.get("e-money");
      }
      
      return { name: item.brand, slug: slugBrand, category: item.category, category_id: existing?.category_id || matchedId || null };
    });

    const { error: errBrands } = await supabaseAdmin.from('brands').upsert(brandsToUpsert, { onConflict: 'slug', ignoreDuplicates: false });
    if (errBrands) console.error("BRAND SYNC ERROR:", errBrands);

    const { data: updatedBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandIdMap = new Map(updatedBrands?.map((b: any) => [b.slug, { id: b.id, category_id: b.category_id }]));

// 5. SMART FILTERING, ZONASI, & IRON GUARD LOGIC
    const itemsData: any[] = [];
    const productGroups = new Map();

    // AMBIL DATA PRODUK LAMA (AUTOMATIC) UNTUK CEK STATUS GEMBOK
    const { data: existingProducts } = await supabaseAdmin.from('product_automatic').select('sku, lock_margin, price, margin_item, discount');
    const existingProductMap = new Map(existingProducts?.map((p: any) => [p.sku, p]));

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
      const slugBrand = slugify(item.brand || "");
      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(item.brand, item.product_name, item.category, item.type || "");

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

      let finalPrice = 0;
      let marginInfo = 0;

      const existing = existingProductMap.get(group.baseSku);
      const isLocked = existing?.lock_margin === true || String(existing?.lock_margin).toLowerCase() === 'true';

      if (isLocked) {
        finalPrice = existing.price || 0;
        marginInfo = existing.margin_item || 0;
      } else {
        if (group.isPasca) {
          finalPrice = group.maxModal + MY_ADMIN_PROFIT;
          marginInfo = MY_ADMIN_PROFIT;
        } else {
          const sKey = getStrategyKey(group.category);
          const strategy = ACTIVE_STRATEGIES[sKey] || ACTIVE_STRATEGIES.DEFAULT;
          const range = strategy.find((s: any) => group.maxModal >= s.minCost && group.maxModal <= s.maxCost) || strategy[0];
          const margin = range.min || 10;
          
          finalPrice = Math.ceil((group.maxModal * (1 + margin / 100)) / 100) * 100;
          marginInfo = margin;
        }
      }

      productsToUpsert.push({
        sku: group.baseSku,
        name: group.webName, 
        brand: group.brand || "Umum", 
        sub_brand: group.subBrandSlug,
        brand_id: bInfo.id,
        category_id: bInfo.category_id,
        cost: group.maxModal, 
        price: finalPrice, 
        stock: 999, 
        margin_item: marginInfo,
        discount: existing?.discount || 0, 
        lock_margin: isLocked, 
        is_active: true,
        provider: 'DIGIFLAZZ',
        updated_at: syncTime
      });
    });

    // 6. ===[ FINAL PUSH DENGAN CHUNKING BATCH ]===
    try {
        const chunkSize = 500; // Pecah pengiriman jadi 500 produk per kloter biar Supabase bernafas

        // Chunking untuk tabel ITEMS
        for (let i = 0; i < itemsData.length; i += chunkSize) {
            const chunk = itemsData.slice(i, i + chunkSize);
            const { error: errItems } = await supabaseAdmin.from('items').upsert(chunk, { onConflict: 'sku' });
            if (errItems) throw new Error("Gagal upsert Items: " + errItems.message);
        }

// Chunking untuk tabel PRODUCTS dengan Audit Log [cite: 2026-03-06]
        for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
            const chunk = productsToUpsert.slice(i, i + chunkSize);
            console.log(`📦 [SYNC] Mengirim Kloter ${i / chunkSize + 1}... (${i} / ${productsToUpsert.length} Produk)`);
            
            const { error: errProducts } = await supabaseAdmin.from('product_automatic').upsert(chunk, { onConflict: 'sku' });
            if (errProducts) throw new Error("Gagal upsert Products: " + errProducts.message);
        }

        const { error: errorDelete } = await supabaseAdmin.from('product_automatic')
            .delete()
            .eq('provider', 'DIGIFLAZZ')
            .lt('updated_at', syncTime); 
            
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