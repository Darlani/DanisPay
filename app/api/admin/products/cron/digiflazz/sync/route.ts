import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; 
import { getSubBrandSlug } from '@/lib/constants/product-mappings';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

interface DigiItem {
  buyer_sku_code: string;
  product_name: string;
  category: string;
  brand: string;
  type?: string;
  price?: number;
  admin?: number;
  desc?: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
}

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
  cashback: number;
}

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

    // 1. Verifikasi Maintenance & Status Operasional Provider
    const [{ data: settingsData }, { data: digiProvider }] = await Promise.all([
      supabaseAdmin
        .from('store_settings')
        .select('is_maintenance_digiflazz')
        .single(),
      supabaseAdmin
        .from('providers')
        .select('is_enabled, is_catalog_enabled, is_maintenance')
        .eq('code', 'DIGIFLAZZ')
        .maybeSingle()
    ]);

    if (settingsData?.is_maintenance_digiflazz || digiProvider?.is_maintenance) {
      return NextResponse.json({ success: true, message: "MAINTENANCE DIGIFLAZZ AKTIF!" });
    }

    if (digiProvider && (!digiProvider.is_enabled || !digiProvider.is_catalog_enabled)) {
      return NextResponse.json({ success: true, message: "SINKRONISASI DIGIFLAZZ DINONAKTIFKAN DI REGISTRY!" });
    }

    // 2. Ambil Kategori & Data Produk Lama untuk Gembok Harga & MAX-Cost Preservation
    const [{ data: dbCategories }, { data: existingProducts }] = await Promise.all([
      supabaseAdmin.from('categories').select('id, name'),
      supabaseAdmin.from('product_automatic').select('id, sku, name, brand_id, cost, lock_margin, price, margin_item, discount, cashback')
    ]);

    const categoryMap = new Map((dbCategories as { id: number; name: string }[] | null)?.map(c => [(c.name || "").toLowerCase().trim(), c.id]));
    const existingNameMap = new Map((existingProducts as ExistingProduct[] | null)?.map(p => [`${p.brand_id}-${p.name.toLowerCase().trim()}`, p]));
    const existingSkuMap = new Map((existingProducts as ExistingProduct[] | null)?.map(p => [p.sku, p]));
    const existingCostMap = new Map((existingProducts as ExistingProduct[] | null)?.map(p => [p.id, Number(p.cost) || 0]));

    // 3. Tarik Data Digiflazz (SAFE FETCH SEBELUM REKONSILIASI)
    const signature = crypto.createHash('md5').update(username + apiKey + 'pricelist').digest('hex');
    const [resPrepaid, resPasca] = await Promise.all([
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', body: JSON.stringify({ cmd: 'prepaid', username, sign: signature }) }),
      fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', body: JSON.stringify({ cmd: 'pasca', username, sign: signature }) })
    ]);

    if (!resPrepaid.ok || !resPasca.ok) {
      throw new Error(`HTTP Error dari Digiflazz API: Prepaid(${resPrepaid.status}) / Pasca(${resPasca.status})`);
    }

    const dataPrepaid = await resPrepaid.json();
    const dataPasca = await resPasca.json();
    const digiItems = [...(dataPrepaid.data || []), ...(dataPasca.data || [])];

    // FEED INTEGRITY CHECK: Jangan anggap feed kosong sebagai penghapusan seluruh produk
    if (!Array.isArray(dataPrepaid.data) || !Array.isArray(dataPasca.data) || digiItems.length < 50) {
      throw new Error("Pricelist Digiflazz kosong atau feed tidak valid!");
    }

    // 4. Auto-Sync Brands dengan Smart Category Fallback
    const { data: dbBrands } = await supabaseAdmin.from('brands').select('id, slug');
    const existingBrandSlugs = new Set((dbBrands as { id: number; slug: string }[] | null)?.map(b => b.slug));
    const newBrandsMap = new Map();

    (digiItems as DigiItem[]).forEach(i => {
      const bName = i.brand || i.category || "UMUM";
      const slug = slugify(bName);
      if (!existingBrandSlugs.has(slug) && !newBrandsMap.has(slug)) {
        const rawCat = (i.category || "").toLowerCase().trim();
        let matchedId = categoryMap.get(rawCat);

        // --- LOGIKA FALLBACK SAKTI ---
        if (!matchedId) {
          if (rawCat.includes("game")) matchedId = categoryMap.get("game");
          else if (rawCat.includes("pulsa") || rawCat.includes("data")) matchedId = categoryMap.get("pulsa & data seluler");
          else if (rawCat.includes("pln")) matchedId = categoryMap.get("tagihan prabayar");
        }
        newBrandsMap.set(slug, { name: bName, slug: slug, category_id: matchedId || null });
      }
    });

    if (newBrandsMap.size > 0) await supabaseAdmin.from('brands').insert(Array.from(newBrandsMap.values()));

    const { data: updatedBrands } = await supabaseAdmin.from('brands').select('id, slug, category_id');
    const brandIdMap = new Map((updatedBrands as { id: number; slug: string; category_id: number | null }[] | null)?.map(b => [b.slug, { id: b.id, category_id: b.category_id }]));

    // 5. Proses Grouping & Zonasi
    interface ItemRecord {
      sku: string;
      brand_slug: string;
      name: string;
      modal: number;
      sub_brand_slug: string;
      is_active: boolean;
      last_sync: string;
      provider: string;
      webProductName: string;
    }

    interface ProductGroupRecord extends DigiItem {
      webName: string;
      maxModal: number;
      subBrandSlug: string;
      isPasca: boolean;
      slugBrand: string;
    }

    const itemsData: ItemRecord[] = [];
    const productGroups = new Map<string, ProductGroupRecord>();
    const regionalKeywords = ["ZONA", "ZONASI", "LOKAL", "AREA", "REGIONAL", "JAWA", "SUMATERA", "KALIMANTAN"];

    (digiItems as DigiItem[]).forEach(item => {
      if (!item.buyer_product_status || !item.seller_product_status) return;

      const isPasca = item.type === 'Pasca' || !item.price;
      const modal = isPasca ? (item.admin || 0) : (item.price || 0);
      const rawCat = (item.category || "").toLowerCase();
      
      // Deteksi Zonasi
      const isZonasi = regionalKeywords.some(key => item.desc?.toUpperCase().includes(key) || item.product_name.toUpperCase().includes(key));
      const zonaTag = (isZonasi && (rawCat.includes("pulsa") || rawCat.includes("data"))) ? "ZONASI" : null;

      const bName = item.brand || item.category || "UMUM";
      const slugBrand = slugify(bName);
      const subBrandSlug = isPasca ? 'PASCABAYAR' : getSubBrandSlug(bName, item.product_name, item.category, item.type || "");

      let webProductName = item.product_name;
      if (zonaTag === "ZONASI") webProductName = `[ZONASI] ${webProductName}`;

      itemsData.push({
        sku: item.buyer_sku_code, brand_slug: slugBrand, name: item.product_name, 
        modal: modal, sub_brand_slug: subBrandSlug, is_active: true, last_sync: syncTime,
        provider: 'DIGIFLAZZ',
        webProductName: webProductName
      });

      const groupKey = `${slugBrand}-${webProductName.toLowerCase().trim()}`;
      const existingGroup = productGroups.get(groupKey);
      if (!existingGroup || modal > existingGroup.maxModal) {
        productGroups.set(groupKey, { ...item, webName: webProductName, maxModal: modal, subBrandSlug, isPasca, slugBrand });
      }
    });

    // 6. Push Batch Products (Preserve Existing Max-Cost & Gembok Harga)
    const productsToUpsert = Array.from(productGroups.values()).map(group => {
      const bInfo = brandIdMap.get(group.slugBrand);
      let finalCategoryId = bInfo?.category_id || null;
      if (group.isPasca) finalCategoryId = categoryMap.get("tagihan pascabayar") || finalCategoryId;

      const productKey = `${bInfo?.id}-${group.webName.toLowerCase().trim()}`;
      const existing = existingNameMap.get(productKey) || existingSkuMap.get(group.buyer_sku_code);

      // Jangan pernah menimpa modal cross-provider yang lebih tinggi secara prematur
      const preservedCost = Math.max(Number(existing?.cost || 0), Number(group.maxModal || 0));

      return {
        id: existing?.id,
        sku: group.buyer_sku_code,
        name: group.webName,
        brand: group.brand || "Umum",
        sub_brand: group.subBrandSlug,
        brand_id: bInfo?.id,
        category_id: finalCategoryId,
        cost: preservedCost,
        provider: 'DIGIFLAZZ',
        updated_at: syncTime,
        price: existing?.price || 0,
        margin_item: existing?.margin_item || 0,
        discount: existing?.discount || 0,
        cashback: existing?.cashback || 0,
        lock_margin: existing?.lock_margin || false,
        stock: 999, is_active: true
      };
    });

    const chunkSize = 500;
    const upsertedProductMap = new Map<string, string>();
    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize);
      const { data: upserted } = await supabaseAdmin
        .from('product_automatic')
        .upsert(chunk, { onConflict: 'name' })
        .select('id, name, brand_id');
      if (upserted) {
        for (const p of upserted) {
          upsertedProductMap.set(`${p.brand_id}-${(p.name || '').toLowerCase().trim()}`, p.id);
        }
      }
    }

    // 7. Provider-Scoped Upsert ke Tabel items (UNIQUE: provider, sku)
    const uniqueItems = Array.from(new Map(itemsData.map(i => [i.sku, i])).values()).map(item => {
      const bInfo = brandIdMap.get(item.brand_slug);
      const targetKey = `${bInfo?.id}-${item.webProductName.toLowerCase().trim()}`;
      const targetId = upsertedProductMap.get(targetKey) || null;
      return {
        sku: item.sku,
        brand_slug: item.brand_slug,
        name: item.name,
        modal: item.modal,
        sub_brand_slug: item.sub_brand_slug,
        is_active: item.is_active,
        last_sync: item.last_sync,
        provider: 'DIGIFLAZZ',
        product_automatic_id: targetId
      };
    });

    for (let i = 0; i < uniqueItems.length; i += chunkSize) {
      const chunk = uniqueItems.slice(i, i + chunkSize);
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

    try {
      await supabaseAdmin.from('activity_logs').insert([{
        action: "AUTO SYNC (CRON)",
        details: `Robot Jam 12 Malam sukses sinkronisasi ${productsToUpsert.length} produk Digiflazz (Provider-Scoped).`,
        created_at: new Date().toISOString()
      }]);
    } catch (logErr) { console.error(logErr); }

    return NextResponse.json({ success: true, message: "CRON SYNC SUCCESS!" });

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