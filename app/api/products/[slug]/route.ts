import { NextResponse } from 'next/server';
import { supabase } from "@/utils/supabaseClient";
import { getSubBrandSlug } from '@/lib/constants/product-mappings';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const { slug } = params;

    // 1. PARALEL TAHAP 1: Tarik Settings, Brand, dan Payment (TANPA JOIN PRODUCTS)
    const [settingsRes, brandRes, payRes] = await Promise.all([
      supabase.from('store_settings').select('is_maintenance, is_maintenance_digiflazz').single(),
      supabase.from('brands').select('id, name, image_url, category, categories(name)').eq('slug', slug).maybeSingle(),
      supabase.from('payment_accounts').select('id, name, logo_url, is_maintenance, is_qr, start_hour, end_hour, min_price')
    ]);

    const brandData = brandRes.data;

    // Proteksi 404: Jika brand tidak ditemukan
    if (!brandData) {
      return NextResponse.json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });
    }

    // 2. TAHAP 2: Ambil Produk dari Dua Jalur (Semi-Auto & Automatic) [cite: 2026-03-13]
    const [autoRes, semiRes] = await Promise.all([
      supabase.from('product_automatic')
        // Tambahkan promo_label di bawah ini
        .select('id, name, price, sku, cost, cashback, discount, promo_label, sub_brand, is_active')
        .eq('brand_id', brandData.id).eq('is_active', true),
      supabase.from('product_semi_auto')
        // Tambahkan promo_label di bawah ini juga
        .select('id, name, price_numeric, sku, cost_numeric, cashback, discount, promo_label, sub_brand, is_active')
        .eq('brand_id', brandData.id).eq('is_active', true)
    ]);

    // Satukan barang dari kedua gudang
    const autoItems = autoRes.data || [];
    const semiAutoItems = (semiRes.data || []).map(item => ({
      ...item,
      price: item.price_numeric, // Mapping agar nama kolom sinkron
      cost: item.cost_numeric
    }));

    const allItems = [...autoItems, ...semiAutoItems].sort((a, b) => a.price - b.price);

    // 3. Mapping untuk Tampilan UI
    const mappedItems = allItems.map((item: any) => ({
      ...item,
      id: item.id.toString(),
      label: item.name,
      promo_label: item.promo_label, // <-- Pastikan ini ikut terkirim
      sub_brand: getSubBrandSlug(brandData.name || '', item.name || '', brandData.category || '', '')
    }));

    const catName = (brandData as any).categories?.name || brandData.category || "game";

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
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}