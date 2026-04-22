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
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

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
      .limit(1)
      .single();

    if (settingsData?.is_maintenance_digiflazz) {
      return NextResponse.json({ success: true, message: "MAINTENANCE AKTIF!" });
    }

    // 1. Bersihkan tabel items (Gudang Data Mentah)
    await supabaseAdmin.from('items').delete().neq('sku', 'KOSONGKAN_SEMUA_DATA');

    // 2. Ambil Kategori & Brand untuk Mapping
    const { data: dbCategories } = await supabaseAdmin.from('categories').select('id, name');
    const categoryMap = new Map(dbCategories?.map((c: any) => [(c.name || "").toLowerCase().trim(), c.id]));
    
    const signature = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');
    const [resPrepaid, resPasca] = await Promise.all([
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', body: JSON.stringify({ cmd: 'prepaid', username, sign: signature }) }),
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', body: JSON.stringify({ cmd: 'pasca', username, sign: signature }) })
    ]);

    const dataPrepaid = await resPrepaid.json();
    const dataPasca = await resPasca.json();
    const digiItems = [...(dataPrepaid.data || []), ...(dataPasca.data || [])];

    if (digiItems.length === 0) throw new Error("Data pricelist kosong!");

    // 3. Auto-Sync Brands Baru
    const { data: dbBrands } = await supabaseAdmin.from('brands').select('id, slug');
    const existingBrandSlugs = new Set(dbBrands?.map((b: any) => b.slug));
    const newBrandsMap = new Map();

    digiItems.forEach((i: any) => {
      let bName = i.brand || i.category || "UMUM";
      const slug = slugify(bName);
      if (!existingBrandSlugs.has(slug) && !newBrandsMap.has(slug)) {
        const rawCat = (i.category || "").toLowerCase().trim();
        let matchedId = categoryMap.get(rawCat);
        // ... (Logic mapping kategori tetap sama agar brand masuk rak yang benar)
        newBrandsMap.set(slug, { name: bName, slug: slug, category_id: matchedId || null });
      }
    });

    if (newBrandsMap.size > 0) await supabaseAdmin.from('brands').insert(Array.from(newBrandsMap.values()));

    const { data: updatedBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandIdMap = new Map(updatedBrands?.map((b: any) => [b.slug, { id: b.id, category_id: b.category_id }]));

    // 4. Proses Grouping (Cari Modal Termahal)
    const itemsData: any[] = [];
    const productGroups = new Map();

    digiItems.forEach((item: any) => {
      if (!item.buyer_product_status || !item.seller_product_status) return;

      const isPasca = item.type === 'Pasca' || !item.price;
      const modal = isPasca ? (item.admin || 0) : item.price;
      let bName = item.brand || item.category || "UMUM";
      const slugBrand = slugify(bName);
      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(bName, item.product_name, item.category, item.type || "");

      let webProductName = item.product_name;
      const words = webProductName.split(/\s+/);
      if (words.length > 1 && words[0].toLowerCase() === words[1].toLowerCase()) webProductName = words.slice(1).join(" ");

      itemsData.push({
        sku: item.buyer_sku_code, brand_slug: slugBrand, name: item.product_name, 
        modal: modal, sub_brand_slug: subBrandSlug, is_active: true, last_sync: syncTime
      });

      const groupKey = `${slugBrand}-${webProductName.toLowerCase().trim()}`;
      if (!productGroups.has(groupKey) || modal > productGroups.get(groupKey).maxModal) {
        productGroups.set(groupKey, { ...item, webName: webProductName, maxModal: modal, subBrandSlug, isPasca, slugBrand });
      }
    });

    // 5. Simpan Modal Terbaru ke Product Automatic
    const productsToUpsert = Array.from(productGroups.values()).map(group => {
      const bInfo = brandIdMap.get(group.slugBrand);
      let finalCategoryId = bInfo?.category_id || null;
      if (group.isPasca) finalCategoryId = categoryMap.get("tagihan pascabayar") || finalCategoryId;

      return {
        sku: group.buyer_sku_code,
        name: group.webName,
        brand: group.brand || "Umum",
        brand_id: bInfo?.id,
        category_id: finalCategoryId,
        cost: group.maxModal, // <--- KITA UPDATE MODAL SAJA DI SINI
        provider: 'DIGIFLAZZ',
        updated_at: syncTime
      };
    });

    // 6. Push Batch
    const chunkSize = 500;
    const uniqueItems = Array.from(new Map(itemsData.map(i => [i.sku, i])).values());
    for (let i = 0; i < uniqueItems.length; i += chunkSize) await supabaseAdmin.from('items').insert(uniqueItems.slice(i, i + chunkSize));
    for (let i = 0; i < productsToUpsert.length; i += chunkSize) await supabaseAdmin.from('product_automatic').upsert(productsToUpsert.slice(i, i + chunkSize), { onConflict: 'name' });

    // Bersihkan produk yang sudah tidak ada di Digiflazz
    await supabaseAdmin.from('product_automatic').delete().eq('provider', 'DIGIFLAZZ').lt('updated_at', syncTime);

    return NextResponse.json({ success: true, message: "SYNC MODAL BERHASIL! Silakan panggil Bulk Update." });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}