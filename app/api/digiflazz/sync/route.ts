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

    // 5. SMART FILTERING & IRON GUARD LOGIC
    const sortedItems = digiItems.sort((a: any, b: any) => (a.price || a.admin || 0) - (b.price || b.admin || 0));
    const selectedMap = new Map();

    sortedItems.forEach((item: any) => {
      const key = item.product_name.toLowerCase().trim();
      const isHealthy = item.buyer_product_status && item.seller_product_status;
      if (isHealthy && !selectedMap.has(key)) selectedMap.set(key, item);
    });

    // AMBIL DATA PRODUK LAMA UNTUK CEK STATUS GEMBOK
    const { data: existingProducts } = await supabaseAdmin.from('products').select('sku, lock_margin, price, margin_item, discount');
    const existingProductMap = new Map(existingProducts?.map((p: any) => [p.sku, p]));

    const itemsData: any[] = [];
    const productsToUpsert: any[] = [];

    Array.from(selectedMap.values()).forEach((item: any) => {
      const slugBrand = slugify(item.brand);
      const bInfo = brandIdMap.get(slugBrand);
      if (!bInfo) return;

      // KUNCI PERBAIKAN: Deteksi Pasca & Prabayar [cite: 2026-02-11]
      const isPasca = item.type === 'Pasca' || !item.price;
      const modal = isPasca ? (item.admin || 0) : item.price;
      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(item.brand, item.product_name, item.category, item.type || "");
      
      let finalPrice = 0;
      let marginInfo = 0;

      const existing = existingProductMap.get(item.buyer_sku_code);
      const isLocked = existing?.lock_margin === true || String(existing?.lock_margin).toLowerCase() === 'true';

      if (isLocked) {
        // JIKA DIGEMBOK: Ambil harga dan margin lama dari database, hiraukan kalkulasi baru
        finalPrice = existing.price || 0;
        marginInfo = existing.margin_item || 0;
      } else {
        // JIKA TIDAK DIGEMBOK: Hitung ulang normal
        if (isPasca) {
          finalPrice = modal + MY_ADMIN_PROFIT;
          marginInfo = MY_ADMIN_PROFIT;
        } else {
          const sKey = getStrategyKey(item.category);
          const strategy = ACTIVE_STRATEGIES[sKey] || ACTIVE_STRATEGIES.DEFAULT;
          const range = strategy.find((s: any) => modal >= s.minCost && modal <= s.maxCost) || strategy[0];
          const margin = range.min || 10;
          finalPrice = Math.ceil((modal * (1 + margin / 100)) / 100) * 100;
          marginInfo = margin;
        }
      }

      itemsData.push({
        sku: item.buyer_sku_code,
        brand_slug: slugBrand,
        name: item.product_name,
        modal: modal,
        sub_brand_slug: subBrandSlug,
        is_active: true,
        last_sync: syncTime
      });

      productsToUpsert.push({
        sku: item.buyer_sku_code,
        name: item.product_name || `Produk ${item.buyer_sku_code}`, 
        brand: item.brand || "Umum", 
        sub_brand: subBrandSlug,
        brand_id: bInfo.id,
        category_id: bInfo.category_id,
        cost: modal, 
        price: finalPrice, 
        stock: 999, 
        margin_item: marginInfo,
        discount: existing?.discount || 0, // Amankan diskon lama biar promo gak hilang
        lock_margin: isLocked, // Pastikan gembok tetap tertutup saat di-upsert
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
            
            const { error: errProducts } = await supabaseAdmin.from('products').upsert(chunk, { onConflict: 'sku' });
            if (errProducts) throw new Error("Gagal upsert Products: " + errProducts.message);
        }

        const { error: errorDelete } = await supabaseAdmin.from('products')
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