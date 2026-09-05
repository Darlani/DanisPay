import { NextResponse } from 'next/server';
import { supabase } from "@/utils/supabaseClient";
import { getSubBrandSlug } from '@/lib/constants/product-mappings';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

interface UnifiedProductRow {
  id: string | number;
  name: string;
  sku: string;
  price: number;
  discount: number | null;
  cashback: number | null;
  promo_label: string | null;
  sub_brand: string | null;
  is_active: boolean | null;
  stock: number | null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { slug } = params;

    // 1. PARALEL TAHAP 1: Tarik Settings, Brand Aktif, dan Payment
    const [settingsRes, brandRes, payRes] = await Promise.all([
      supabase.from('store_settings').select('is_maintenance, is_maintenance_digiflazz').single(),
      supabase.from('brands').select('id, name, image_url, category, categories(name)').eq('slug', slug).eq('active', true).maybeSingle(),
      supabase.from('payment_accounts').select('id, name, logo_url, is_maintenance, is_qr, start_hour, end_hour, min_price')
    ]);

    const brandData = brandRes.data;

    // Proteksi 404: Jika brand tidak ditemukan atau tidak aktif
    if (!brandData) {
      return NextResponse.json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });
    }

    // 2. TAHAP 2: Ambil Produk dari Unified Catalog View (Satu kueri terpadu dengan proyeksi aman)
    const productsRes = await supabase
      .from('product_unified_view')
      .select('id, name, sku, price, discount, cashback, promo_label, sub_brand, is_active, stock')
      .eq('brand_id', brandData.id)
      .eq('is_active', true)
      .eq('is_storefront_eligible', true)
      .order('price', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true });

    if (productsRes.error) {
      throw productsRes.error;
    }

    const rawItems = (productsRes.data || []) as unknown as UnifiedProductRow[];

    // 3. Mapping untuk Tampilan UI (Proyeksi publik eksplisit yang aman tanpa data finansial internal)
    const mappedItems = rawItems.map((item: UnifiedProductRow) => ({
      id: item.id.toString(),
      name: item.name,
      label: item.name,
      price: item.price,
      sku: item.sku,
      discount: item.discount,
      cashback: item.cashback,
      promo_label: item.promo_label,
      sub_brand: getSubBrandSlug(brandData.name || '', item.name || '', brandData.category || '', item.sub_brand || ''),
      is_active: item.is_active,
      stock: item.stock
    }));

    const catRel = brandData.categories as { name?: string } | null;
    const catName = catRel?.name || brandData.category || "game";

    return NextResponse.json({ 
      success: true, 
      productData: {
        name: brandData.name,
        category: catName.toLowerCase(),
        img: brandData.image_url || "/images/default-game.jpg",
        is_maintenance_digiflazz: settingsRes.data?.is_maintenance_digiflazz || false,
        maintenance: settingsRes.data?.is_maintenance || false,
        items: mappedItems
      },
      payData: payRes.data 
    }, {
      // AKTIFKAN CACHE
      headers: { 
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' 
      }
    });
  } catch {
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}