import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) { return handleRequest(req, 'POST'); }
export async function PUT(req: Request) { return handleRequest(req, 'PUT'); }

async function handleRequest(req: Request, method: string) {
  try {
    const payload = await req.json();
    
    // 1. Hitung Harga Jual Dasar (hBase)
    const hBase = Math.ceil((payload.cost * (1 + payload.margin_item / 100)) / 100) * 100;

    // 2. Potong Diskon (hFinal)
    const currentDiscount = Number(payload.discount || 0);
    const nominalDiskon = Math.floor(hBase * (currentDiscount / 100));
    const hFinal = hBase - nominalDiskon;

    // 3. Hitung Profit & Capped Cashback (30% dari Profit)
    const profitKotor = hFinal - payload.cost;
    const persenCB = Number(payload.globalCashback) || 3;
    const cbNormal = Math.floor(hFinal * (persenCB / 100));
    const plafonMaks = Math.max(0, Math.floor(profitKotor * 0.3));

    // Satpam anti-bocor: Cashback tidak boleh lebih dari 30% profit
    const finalCashback = profitKotor > 0 ? Math.min(cbNormal, plafonMaks) : 0;

    // ======================================================================
    // 4. 🧠 OTAK PINTAR DETEKSI GUDANG & MAPPING KOLOM
    // ======================================================================
    const isSemiAuto = payload.provider !== 'DIGIFLAZZ';
    const targetTable = isSemiAuto ? 'product_semi_auto' : 'product_automatic';

    // Payload dasar (Kolom yang namanya sama di kedua tabel)
    const dbPayload: any = {
      name: payload.name, 
      brand_id: payload.brand_id,
      brand: payload.brand_name,
      sku: payload.sku,
      sub_brand: payload.sub_brand,
      margin_item: payload.margin_item,
      discount: currentDiscount,
      cashback: finalCashback,
      category_id: payload.category_id,
      stock: payload.stock,
      is_active: true,
      lock_margin: payload.lock_margin,
      provider: payload.provider,
      updated_at: new Date().toISOString()
    };

    // Mapping kolom harga yang namanya beda (Sangat Krusial!)
    if (isSemiAuto) {
      dbPayload.cost_numeric = payload.cost;
      dbPayload.price_numeric = hBase;
    } else {
      dbPayload.cost = payload.cost;
      dbPayload.price = hBase;
    }

    // ======================================================================
    // 5. EKSEKUSI DATABASE KE TABEL YANG TEPAT
    // ======================================================================
    if (method === 'PUT' && payload.id) {
      const { error } = await supabaseAdmin.from(targetTable).update(dbPayload).eq('id', payload.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from(targetTable).insert([dbPayload]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🔥 Error API Single Product:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}