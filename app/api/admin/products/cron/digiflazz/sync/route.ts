import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; 
import { getSubBrandSlug } from '@/lib/constants/product-mappings';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const slugify = (text: string) => 
  text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const WEBHOOK_SECRET = process.env.CRON_SECRET;

  if (!WEBHOOK_SECRET || querySecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Akses Ditolak!" }, { status: 403 });
  }

  const syncTime = new Date().toISOString();

  try {
    const username = process.env.DIGIFLAZZ_USERNAME as string;
    const apiKey = process.env.DIGIFLAZZ_API_KEY as string;

    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('is_maintenance_digiflazz')
      .single();

    if (settingsData?.is_maintenance_digiflazz) {
      return NextResponse.json({ success: true, message: "MAINTENANCE AKTIF!" });
    }

    // 1. Bersihkan tabel items (Gudang Data Mentah)
    await supabaseAdmin.from('items').delete().neq('sku', 'KOSONGKAN_SEMUA_DATA');

    // 2. Ambil Kategori & Data Produk Lama untuk Gembok Harga
    const [{ data: dbCategories }, { data: existingProducts }] = await Promise.all([
      supabaseAdmin.from('categories').select('id, name'),
      supabaseAdmin.from('product_automatic').select('sku, name, brand_id, lock_margin, price, margin_item, discount, cashback')
    ]);

    const categoryMap = new Map(dbCategories?.map((c: any) => [(c.name || "").toLowerCase().trim(), c.id]));
    const existingNameMap = new Map(existingProducts?.map((p: any) => [`${p.brand_id}-${p.name.toLowerCase().trim()}`, p]));
    const existingSkuMap = new Map(existingProducts?.map((p: any) => [p.sku, p]));
    
    // 3. Tarik Data Digiflazz
    const signature = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');
    const [resPrepaid, resPasca] = await Promise.all([
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', body: JSON.stringify({ cmd: 'prepaid', username, sign: signature }) }),
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', body: JSON.stringify({ cmd: 'pasca', username, sign: signature }) })
    ]);

    const dataPrepaid = await resPrepaid.json();
    const dataPasca = await resPasca.json();
    const digiItems = [...(dataPrepaid.data || []), ...(dataPasca.data || [])];

    if (digiItems.length === 0) throw new Error("Data pricelist kosong!");

    // 4. Auto-Sync Brands dengan Smart Category Fallback
    const { data: dbBrands } = await supabaseAdmin.from('brands').select('id, slug');
    const existingBrandSlugs = new Set(dbBrands?.map((b: any) => b.slug));
    const newBrandsMap = new Map();

    digiItems.forEach((i: any) => {
      let bName = i.brand || i.category || "UMUM";
      const slug = slugify(bName);
      if (!existingBrandSlugs.has(slug) && !newBrandsMap.has(slug)) {
        const rawCat = (i.category || "").toLowerCase().trim();
        let matchedId = categoryMap.get(rawCat);

        // --- LOGIKA FALLBACK SAKTI ---
        if (!matchedId) {
          if (rawCat.includes("game")) matchedId = categoryMap.get("games");
          else if (rawCat.includes("pulsa") || rawCat.includes("data")) matchedId = categoryMap.get("pulsa & data seluler");
          else if (rawCat.includes("pln")) matchedId = categoryMap.get("tagihan prabayar");
        }
        newBrandsMap.set(slug, { name: bName, slug: slug, category_id: matchedId || null });
      }
    });

    if (newBrandsMap.size > 0) await supabaseAdmin.from('brands').insert(Array.from(newBrandsMap.values()));

    const { data: updatedBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandIdMap = new Map(updatedBrands?.map((b: any) => [b.slug, { id: b.id, category_id: b.category_id }]));

    // 5. Proses Grouping & Zonasi
    const itemsData: any[] = [];
    const productGroups = new Map();
    const regionalKeywords = ["ZONA", "ZONASI", "LOKAL", "AREA", "REGIONAL", "JAWA", "SUMATERA", "KALIMANTAN"];

    digiItems.forEach((item: any) => {
      if (!item.buyer_product_status || !item.seller_product_status) return;

      const isPasca = item.type === 'Pasca' || !item.price;
      const modal = isPasca ? (item.admin || 0) : item.price;
      const rawCat = (item.category || "").toLowerCase();
      
      // Deteksi Zonasi
      const isZonasi = regionalKeywords.some(key => item.desc?.toUpperCase().includes(key) || item.product_name.toUpperCase().includes(key));
      const zonaTag = (isZonasi && (rawCat.includes("pulsa") || rawCat.includes("data"))) ? "ZONASI" : null;

      let bName = item.brand || item.category || "UMUM";
      const slugBrand = slugify(bName);
      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(bName, item.product_name, item.category, item.type || "");

      let webProductName = item.product_name;
      if (zonaTag === "ZONASI") webProductName = `[ZONASI] ${webProductName}`;

      itemsData.push({
        sku: item.buyer_sku_code, brand_slug: slugBrand, name: item.product_name, 
        modal: modal, sub_brand_slug: subBrandSlug, is_active: true, last_sync: syncTime
      });

      const groupKey = `${slugBrand}-${webProductName.toLowerCase().trim()}`;
      if (!productGroups.has(groupKey) || modal > productGroups.get(groupKey).maxModal) {
        productGroups.set(groupKey, { ...item, webName: webProductName, maxModal: modal, subBrandSlug, isPasca, slugBrand });
      }
    });

    // 6. Push Batch (Gembok Harga Aktif)
    const productsToUpsert = Array.from(productGroups.values()).map(group => {
      const bInfo = brandIdMap.get(group.slugBrand);
      let finalCategoryId = bInfo?.category_id || null;
      if (group.isPasca) finalCategoryId = categoryMap.get("tagihan pascabayar") || finalCategoryId;

      const productKey = `${bInfo?.id}-${group.webName.toLowerCase().trim()}`;
      const existing = existingNameMap.get(productKey) || existingSkuMap.get(group.buyer_sku_code);

      return {
        sku: group.buyer_sku_code,
        name: group.webName,
        brand: group.brand || "Umum",
        sub_brand: group.subBrandSlug,
        brand_id: bInfo?.id,
        category_id: finalCategoryId,
        cost: group.maxModal,
        provider: 'DIGIFLAZZ',
        updated_at: syncTime,
        // PERTAHANKAN DATA LAMA AGAR TIDAK RESET JADI 0
        price: existing?.price || 0,
        margin_item: existing?.margin_item || 0,
        discount: existing?.discount || 0,
        cashback: existing?.cashback || 0,
        lock_margin: existing?.lock_margin || false,
        stock: 999, is_active: true
      };
    });

    const chunkSize = 500;
    const uniqueItems = Array.from(new Map(itemsData.map(i => [i.sku, i])).values());
    for (let i = 0; i < uniqueItems.length; i += chunkSize) await supabaseAdmin.from('items').insert(uniqueItems.slice(i, i + chunkSize));
    for (let i = 0; i < productsToUpsert.length; i += chunkSize) await supabaseAdmin.from('product_automatic').upsert(productsToUpsert.slice(i, i + chunkSize), { onConflict: 'name' });

    // Hapus Produk yang sudah tidak ada di Digiflazz
    await supabaseAdmin.from('product_automatic').delete().eq('provider', 'DIGIFLAZZ').lt('updated_at', syncTime);

    try {
      await supabaseAdmin.from('activity_logs').insert([{
        action: "AUTO SYNC (CRON)",
        details: `Robot Jam 12 Malam sukses sinkronisasi ${productsToUpsert.length} produk Digiflazz.`,
        created_at: new Date().toISOString()
      }]);
    } catch (logErr) { console.error(logErr); }

    return NextResponse.json({ success: true, message: "CRON SYNC SUCCESS!" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}