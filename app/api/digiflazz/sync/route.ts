import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; 
import { getSubBrandSlug } from '@/lib/constants/product-mappings';

// === BENTENG ANTI-CACHE NEXT.JS ===
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

const FALLBACK_STRATEGIES: any = {
  DEFAULT: [{ minCost: 0, maxCost: 999999999, min: 10, max: 15 }]
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

  const cookieStore = req.headers.get('cookie') || "";
  
  const isAuthorized = 
    cookieStore.includes('isAdmin=true') || 
    cookieStore.toLowerCase().includes('userrole=manager') || 
    (querySecret === WEBHOOK_SECRET && WEBHOOK_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Akses Ditolak! Sesi Expired atau Kunci Salah." }, { status: 403 });
  }

  const syncTime = new Date().toISOString();

  try {
    const username = process.env.DIGIFLAZZ_USERNAME as string;
    const apiKey = process.env.DIGIFLAZZ_API_KEY as string;

    // 1. AMBIL SETTINGS (PAKAI .limit(1) AGAR TIDAK GAGAL/NULL BILA ADA ERROR)
    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('margin_json, cashback_percent, balance_digiflazz, is_maintenance_digiflazz, admin_fee_pasca')
      .limit(1)
      .single();

    const globalCashback = settingsData?.cashback_percent || 3;

    if (settingsData?.is_maintenance_digiflazz) {
      return NextResponse.json({ success: true, message: "MAINTENANCE AKTIF bos!" });
    }

    await supabaseAdmin.from('items').delete().neq('sku', 'KOSONGKAN_SEMUA_DATA');

    const { data: dbCategories } = await supabaseAdmin.from('categories').select('id, name');
    
    // PEMETAAN NAMA KATEGORI ANTI SPASI
    const categoryMap = new Map(dbCategories?.map((c: any) => [(c.name || "").toLowerCase().trim(), c.id]));
    const catIdToNameMap = new Map(dbCategories?.map((c: any) => [c.id, (c.name || "").toUpperCase().trim()]));
    
    const ACTIVE_STRATEGIES = settingsData?.margin_json || FALLBACK_STRATEGIES;
    const MY_ADMIN_PROFIT = settingsData?.admin_fee_pasca || 2500;

    const signature = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');
    
    const [resPrepaid, resPasca] = await Promise.all([
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: 'prepaid', username, sign: signature }) }),
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: 'pasca', username, sign: signature }) })
    ]);

    const dataPrepaid = await resPrepaid.json();
    const dataPasca = await resPasca.json();

    if (!Array.isArray(dataPrepaid.data)) throw new Error("Akses ditolak Digiflazz Prabayar");
    if (!Array.isArray(dataPasca.data)) throw new Error("Akses ditolak Digiflazz Pasca");

    const digiItems = [...dataPrepaid.data, ...dataPasca.data];
    if (digiItems.length === 0) throw new Error("Data pricelist dari Digiflazz kosong!");

    // 4. MASTER BRAND AUTO-SYNC (DENGAN PENGAMAN BRAND KOSONG DARI DIGIFLAZZ)
    const { data: dbBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandMap = new Map(dbBrands?.map((b: any) => [b.slug, b]));

    const uniqueBrandMap = new Map();
    digiItems.forEach((i: any) => {
      // Jika Digiflazz mengirim brand kosong (Sering terjadi di PLN Pasca)
      let bName = i.brand;
      if (!bName || bName.trim() === "") bName = i.category;
      if (!bName || bName.trim() === "") bName = "UMUM";

      const slug = slugify(bName);
      if (!uniqueBrandMap.has(slug)) uniqueBrandMap.set(slug, { brand: bName, category: i.category });
    });

    const brandsToUpsert = Array.from(uniqueBrandMap.values()).map((item: any) => {
      const slugBrand = slugify(item.brand);
      const existing = brandMap.get(slugBrand);
      
      const rawCat = (item.category || "").toLowerCase().trim();
      let matchedId = categoryMap.get(rawCat);

      // PEMETAAN RAK KATEGORI CERDAS
      if (!matchedId) {
        if (rawCat.includes("game")) matchedId = categoryMap.get("game");
        else if (rawCat.includes("pulsa") || rawCat.includes("data") || rawCat.includes("paket")) matchedId = categoryMap.get("pulsa & data seluler"); 
        else if (rawCat.includes("pln") || rawCat.includes("listrik")) matchedId = categoryMap.get("tagihan prabayar"); // Default PLN ke Prabayar
        else if (rawCat.includes("pdam") || rawCat.includes("bpjs") || rawCat.includes("pasca")) matchedId = categoryMap.get("tagihan pascabayar");
        else if (rawCat.includes("emoney") || rawCat.includes("wallet") || rawCat.includes("saldo") || rawCat.includes("dana") || rawCat.includes("gopay") || rawCat.includes("ovo")) matchedId = categoryMap.get("e-wallet & saldo");
        else if (rawCat.includes("voucher") || rawCat.includes("tiket")) matchedId = categoryMap.get("voucher & gift card");
      }
      
      return { name: item.brand, slug: slugBrand, category: item.category, category_id: existing?.category_id || matchedId || null };
    });

    const { error: errBrands } = await supabaseAdmin.from('brands').upsert(brandsToUpsert, { onConflict: 'slug', ignoreDuplicates: false });
    if (errBrands) console.error("BRAND SYNC ERROR:", errBrands);

    const { data: updatedBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandIdMap = new Map(updatedBrands?.map((b: any) => [b.slug, { id: b.id, category_id: b.category_id }]));

    const itemsData: any[] = [];
    const productGroups = new Map();

    const { data: existingProducts } = await supabaseAdmin.from('product_automatic').select('sku, name, brand_id, lock_margin, price, margin_item, discount');
    
    const existingNameMap = new Map(existingProducts?.map((p: any) => [`${p.brand_id}-${p.name.toLowerCase().trim()}`, p]));
    const existingSkuMap = new Map(existingProducts?.map((p: any) => [p.sku, p]));

    digiItems.forEach((item: any) => {
      const isHealthy = item.buyer_product_status && item.seller_product_status;
      // Skip hanya jika ada status yang jelas-jelas False. Pasca biasanya tidak ada field ini.
      if (isHealthy === false) return; 

      const fullDesc = item.desc || ""; 
      const descUpper = fullDesc.toUpperCase();
      
      const regionalKeywords = ["ZONASI", "LOKAL", "JAWA", "SUMATERA", "KALIMANTAN", "SULAWESI", "JABAR", "JATENG", "JATIM", "NTB", "NTT"];
      const isZonasiMatch = regionalKeywords.some(key => descUpper.includes(key) || item.product_name.toUpperCase().includes(key));
      const rawCat = (item.category || "").toLowerCase();
      const isZonasiTarget = rawCat.includes("pulsa") || rawCat.includes("data");
      const zonaTag = (isZonasiTarget && isZonasiMatch) ? "ZONASI" : null;

      const isPasca = item.type === 'Pasca' || !item.price;
      const modal = isPasca ? (item.admin || 0) : item.price;
      
      // Amankan brand kosong lagi
      let bName = item.brand;
      if (!bName || bName.trim() === "") bName = item.category;
      if (!bName || bName.trim() === "") bName = "UMUM";
      const slugBrand = slugify(bName);

      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(bName, item.product_name, item.category, item.type || "");

      let webProductName = item.product_name;
      const words = webProductName.split(/\s+/);
      if (words.length > 1 && words[0].toLowerCase() === words[1].toLowerCase()) {
        webProductName = words.slice(1).join(" ");
      }

      if (zonaTag === "ZONASI") webProductName = `[ZONASI] ${webProductName}`;

      itemsData.push({
        sku: item.buyer_sku_code,
        brand_slug: slugBrand,
        name: item.product_name, 
        modal: modal,
        sub_brand_slug: subBrandSlug,
        desc: fullDesc, 
        zona_type: zonaTag,
        is_active: true,
        last_sync: syncTime
      });

      const groupKey = `${slugBrand}-${webProductName.toLowerCase().trim()}`;

      if (!productGroups.has(groupKey)) {
        productGroups.set(groupKey, { ...item, webName: webProductName, maxModal: modal, baseSku: item.buyer_sku_code, subBrandSlug, isPasca, slugBrand });
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

      // PENGAMANAN: Pindah Rak khusus barang Pascabayar (seperti PLN) agar tidak nyasar ke Prabayar
      let finalCategoryId = bInfo.category_id;
      if (group.isPasca) {
          const pascaId = categoryMap.get("tagihan pascabayar");
          if (pascaId) finalCategoryId = pascaId;
      }

      let finalPrice = 0;
      let marginInfo = 0;

      const productKey = `${bInfo.id}-${group.webName.toLowerCase().trim()}`;
      const existing = existingNameMap.get(productKey) || existingSkuMap.get(group.baseSku);
      const isLocked = existing?.lock_margin === true || String(existing?.lock_margin).toLowerCase() === 'true';

      if (group.isPasca) {
        finalPrice = group.maxModal + MY_ADMIN_PROFIT;
        marginInfo = MY_ADMIN_PROFIT;
      } else {
        if (isLocked) {
          marginInfo = Number(existing.margin_item || 0);
        } else {
          // BACA STRATEGI SESUAI KATEGORI
          const sKey = (catIdToNameMap.get(finalCategoryId) || "DEFAULT").trim().toUpperCase();
          let strategy = ACTIVE_STRATEGIES[sKey];

          // Kalau tidak ketemu, cari di DEFAULT
          if (!strategy || !Array.isArray(strategy) || strategy.length === 0) {
              strategy = ACTIVE_STRATEGIES["DEFAULT"] || FALLBACK_STRATEGIES.DEFAULT;
          }

          const range = strategy.find((s: any) => group.maxModal >= s.minCost && group.maxModal <= s.maxCost) || strategy[0];
          marginInfo = range.min ?? 10;
        }
        
        finalPrice = marginInfo === 0 
          ? group.maxModal 
          : Math.ceil((group.maxModal * (1 + marginInfo / 100)) / 100) * 100;
      }

      const currentDiscount = existing?.discount || 0;
      const hargaSetelahDiskon = finalPrice - Math.floor(finalPrice * (currentDiscount / 100));
      const profitKotor = hargaSetelahDiskon - group.maxModal;
      let finalCashback = 0;

      if (profitKotor > 0) {
        const cbNormal = Math.floor(hargaSetelahDiskon * (globalCashback / 100));
        const plafonMaks = Math.floor(profitKotor * (globalCashback / 10)); 
        finalCashback = Math.min(cbNormal, plafonMaks);
      }

      productsToUpsert.push({
        sku: group.baseSku,
        name: group.webName, 
        brand: group.brand || "UMUM", 
        sub_brand: group.subBrandSlug,
        brand_id: bInfo.id,
        category_id: finalCategoryId, // Gunakan Rak yang sudah diamankan
        cost: group.maxModal, 
        price: finalPrice, 
        stock: 999, 
        margin_item: marginInfo,
        discount: currentDiscount, 
        cashback: finalCashback, 
        lock_margin: isLocked, 
        is_active: true,
        provider: 'DIGIFLAZZ',
        updated_at: syncTime
      });
    });

    try {
        const chunkSize = 500; 

        for (let i = 0; i < itemsData.length; i += chunkSize) {
            const chunk = itemsData.slice(i, i + chunkSize);
            const { error: errItems } = await supabaseAdmin.from('items').upsert(chunk, { onConflict: 'sku' });
            if (errItems) throw new Error("Gagal upsert Items: " + errItems.message);
        }

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

        try {
          await supabaseAdmin.from('activity_logs').insert([{
            action: "AUTO SYNC",
            details: `Sukses sinkronisasi ${productsToUpsert.length} produk. PLN Pasca & Margin Aman!`,
            created_at: new Date().toISOString()
          }]);
        } catch (logErr) {} 
            
        return NextResponse.json({ 
            success: true, 
            updated: productsToUpsert.length,
            message: "MASTER SYNC: Etalase bersih! Pra & Pasca siap jual." 
        });

    } catch (dbErr: any) {
        return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}