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
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

  const cookieStore = req.headers.get('cookie');
  const isAdmin = cookieStore?.includes('isAdmin=true');

  const isAuthorized = (isAdmin) || (querySecret === WEBHOOK_SECRET && WEBHOOK_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Akses Ditolak!" }, { status: 403 });
  }

  const syncTime = new Date().toISOString();

  try {
    const username = process.env.DIGIFLAZZ_USERNAME as string;
    const apiKey = process.env.DIGIFLAZZ_API_KEY as string;

    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('margin_json, balance_digiflazz, is_maintenance_digiflazz, admin_fee_pasca')
      .single();

    if (settingsData?.is_maintenance_digiflazz) {
      return NextResponse.json({ success: true, message: "MAINTENANCE AKTIF!" });
    }

    const { data: dbCategories } = await supabaseAdmin.from('categories').select('id, name');
    const categoryMap = new Map(dbCategories?.map((c: any) => [c.name.toLowerCase(), c.id]));
    const ACTIVE_STRATEGIES = settingsData?.margin_json || FALLBACK_STRATEGIES;
    const MY_ADMIN_PROFIT = settingsData?.admin_fee_pasca || 2500;

    const signature = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');
    
    const [resPrepaid, resPasca] = await Promise.all([
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: 'prepaid', username, sign: signature }) }),
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: 'pasca', username, sign: signature }) })
    ]);

    const dataPrepaid = await resPrepaid.json();
    const dataPasca = await resPasca.json();

    const digiItems = [...dataPrepaid.data, ...dataPasca.data];
    if (digiItems.length === 0) throw new Error("Data pricelist kosong!");

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
        else if (rawCat.includes("pln") || rawCat.includes("listrik")) matchedId = categoryMap.get("ppob");
      }
      return { name: item.brand, slug: slugBrand, category: item.category, category_id: existing?.category_id || matchedId || null };
    });

    await supabaseAdmin.from('brands').upsert(brandsToUpsert, { onConflict: 'slug' });

    const { data: updatedBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandIdMap = new Map(updatedBrands?.map((b: any) => [b.slug, { id: b.id, category_id: b.category_id }]));

    const itemsData: any[] = [];
    const productGroups = new Map();

    const { data: existingProducts } = await supabaseAdmin.from('products').select('sku, lock_margin, price, margin_item, discount');
    const existingProductMap = new Map(existingProducts?.map((p: any) => [p.sku, p]));

    digiItems.forEach((item: any) => {
      const isHealthy = item.buyer_product_status && item.seller_product_status;
      if (!isHealthy) return;

      // 1. LOGIKA DETEKSI ZONASI
      const rawCat = (item.category || "").toLowerCase();
      const descStr = (item.desc || "").toUpperCase();
      const nameStr = (item.product_name || "").toUpperCase();
      let zonaTag = "NASIONAL"; 
      if (descStr.includes("ZONA") || descStr.includes("LOKAL") || nameStr.includes("ZONA") || nameStr.includes("JATIM") || nameStr.includes("JABAR")) {
        zonaTag = "ZONASI";
      }

      // 2. LOGIKA PERBAIKAN NAMA (SOLUSI INDOSAT 50)
      const brandName = item.brand || "";
      let webProductName = item.product_name;
      if (webProductName.toUpperCase().startsWith(brandName.toUpperCase())) {
          webProductName = webProductName.substring(brandName.length).trim();
      }
      // Tambahkan Tag Zonasi ke Nama Produk agar unik di Map
      const webFullName = `${brandName} ${webProductName} (${zonaTag})`;

      const isPasca = item.type === 'Pasca' || !item.price;
      const modal = isPasca ? (item.admin || 0) : item.price;
      const slugBrand = slugify(brandName);
      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(brandName, item.product_name, item.category, item.type || "");

      // SIMPAN KE TABEL ITEMS (Gudang amunisi lengkap)
      itemsData.push({
        sku: item.buyer_sku_code,
        brand_slug: slugBrand,
        name: item.product_name,
        modal: modal,
        sub_brand_slug: subBrandSlug,
        desc: item.desc || "Produk Digital",
        zona_type: zonaTag, // <--- SEKARANG TERISI
        is_active: true,
        last_sync: syncTime
      });

      // KELOMPOKKAN UNTUK TABEL PRODUCTS
      const groupKey = webFullName.toLowerCase().trim();
      if (!productGroups.has(groupKey)) {
        productGroups.set(groupKey, { 
          ...item, 
          webName: webFullName, 
          maxModal: modal, 
          baseSku: item.buyer_sku_code, 
          subBrandSlug, 
          isPasca, 
          slugBrand,
          zona_type: zonaTag // Simpan ke grup
        });
      } else {
        const existingGroup = productGroups.get(groupKey);
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

      const existing = existingProductMap.get(group.baseSku);
      const isLocked = existing?.lock_margin === true;
      let finalPrice = existing?.price || 0;
      let marginInfo = existing?.margin_item || 0;

      if (!isLocked) {
        if (group.isPasca) {
          finalPrice = group.maxModal + MY_ADMIN_PROFIT;
          marginInfo = MY_ADMIN_PROFIT;
        } else {
          const sKey = getStrategyKey(group.category);
          const strategy = ACTIVE_STRATEGIES[sKey] || ACTIVE_STRATEGIES.DEFAULT;
          const range = strategy.find((s: any) => group.maxModal >= s.minCost && group.maxModal <= s.maxCost) || strategy[0];
          finalPrice = Math.ceil((group.maxModal * (1 + (range.min || 10) / 100)) / 100) * 100;
          marginInfo = range.min || 10;
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
        updated_at: syncTime,
        desc: group.desc,       // <--- SEKARANG MASUK KE PRODUCTS
        zona_type: group.zona_type // <--- SEKARANG MASUK KE PRODUCTS
      });
    });

    const chunkSize = 500;
    for (let i = 0; i < itemsData.length; i += chunkSize) {
      await supabaseAdmin.from('items').upsert(itemsData.slice(i, i + chunkSize), { onConflict: 'sku' });
    }
    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      await supabaseAdmin.from('products').upsert(productsToUpsert.slice(i, i + chunkSize), { onConflict: 'sku' });
    }

    await supabaseAdmin.from('products').delete().eq('provider', 'DIGIFLAZZ').lt('updated_at', syncTime);
            
    return NextResponse.json({ success: true, updated: productsToUpsert.length, message: "SYNC BERHASIL!" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}