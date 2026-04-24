import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(req: Request) {
  // 1. SATPAM ROBOT (MacroDroid Secret)
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

  if (!WEBHOOK_SECRET || querySecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Akses Ditolak Bos!" }, { status: 403 });
  }

  try {
    // 2. AMBIL DATA STRATEGI & SETTINGS (Pake Limit Anti Crash)
    const { data: settings } = await supabaseAdmin
      .from('store_settings')
      .select('margin_json, cashback_percent')
      .not('margin_json', 'is', null)
      .limit(1) // <--- PENGAMAN 1 (Anti Error Multiple Rows)
      .single();

    if (!settings?.margin_json) throw new Error("Strategi margin_json tidak ditemukan di database!");

    const allStrategies = typeof settings.margin_json === 'string' 
      ? JSON.parse(settings.margin_json) 
      : settings.margin_json;
    const dbCashbackPercent = Number(settings.cashback_percent || 3);

    // 3. TARIK PRODUK KHUSUS DIGIFLAZZ (Pake Limit Anti Timeout)
    const [autoRes, semiRes] = await Promise.all([
      supabaseAdmin.from('product_automatic')
        .select('id, cost, margin_item, discount, lock_margin, category_id, categories(name)')
        .eq('provider', 'DIGIFLAZZ')
        .limit(50000), // <--- PENGAMAN 2
      supabaseAdmin.from('product_semi_auto')
        .select('id, cost_numeric, margin_item, discount, lock_margin, category_id, categories(name)')
        .eq('provider', 'DIGIFLAZZ')
        .limit(50000) // <--- PENGAMAN 2
    ]);

    const autoProducts = autoRes.data || [];
    const semiProducts = semiRes.data || [];
    let updateCount = 0;
    const updatesAuto: any[] = [];
    const updatesSemi: any[] = [];

    // 4. FUNGSI EKSEKUTOR
    const processProducts = (products: any[], isSemiAuto: boolean, targetArray: any[]) => {
      for (const product of products) {
        const isLocked = product.lock_margin === true || String(product.lock_margin).toLowerCase() === 'true';
        const categoryName = product.categories?.name?.toUpperCase() || "DEFAULT";
        const strategyList = allStrategies[categoryName] || allStrategies["DEFAULT"];
        const currentCost = Number(isSemiAuto ? (product.cost_numeric || 0) : (product.cost || 0));
        
        const cfg = strategyList.find((c: any) => currentCost >= c.minCost && currentCost <= c.maxCost) || strategyList[0];

        // Margin & Harga Jual
        const newMargin = isLocked ? Number(product.margin_item || 0) : (cfg ? cfg.min : 0);
        const newPrice = newMargin === 0 
          ? currentCost 
          : Math.ceil((currentCost * (1 + newMargin / 100)) / 100) * 100;
        
        const newDiscount = Number(product.discount || 0);
        const hargaSetelahDiskon = newPrice - Math.floor(newPrice * (newDiscount / 100));
        const profitKotor = hargaSetelahDiskon - currentCost;

        // Cashback
        let newCashback = 0;
        if (profitKotor > 0) {
          const cbNormal = Math.floor(hargaSetelahDiskon * (dbCashbackPercent / 100));
          const plafonMaks = Math.floor(profitKotor * (dbCashbackPercent / 10));
          newCashback = Math.min(cbNormal, plafonMaks);
        }

        const baseData = {
          id: product.id,
          margin_item: newMargin,
          discount: newDiscount,
          cashback: newCashback,
          lock_margin: product.lock_margin,
          updated_at: new Date().toISOString()
        };

        targetArray.push(isSemiAuto ? { ...baseData, price_numeric: newPrice } : { ...baseData, price: newPrice });
        updateCount++;
      }
    };

    processProducts(autoProducts, false, updatesAuto);
    processProducts(semiProducts, true, updatesSemi);

    // 5. EKSEKUSI BATCH UPDATE
    const chunkSize = 50;
    for (let i = 0; i < updatesAuto.length; i += chunkSize) {
      const chunk = updatesAuto.slice(i, i + chunkSize);
      await Promise.all(chunk.map(upd => supabaseAdmin.from('product_automatic').update(upd).eq('id', upd.id)));
    }
    for (let i = 0; i < updatesSemi.length; i += chunkSize) {
      const chunk = updatesSemi.slice(i, i + chunkSize);
      await Promise.all(chunk.map(upd => supabaseAdmin.from('product_semi_auto').update(upd).eq('id', upd.id)));
    }

    // 6. LOG AKTIVITAS (Dibungkus Try-Catch agar tidak menggagalkan fungsi utama)
    try {
      await supabaseAdmin.from('activity_logs').insert([{
        action: "AUTO BULK DIGIFLAZZ (CRON)",
        details: `Robot otomatis merapikan harga ${updateCount} produk Digiflazz sesuai Save Strategy.`,
        created_at: new Date().toISOString()
      }]);
    } catch (logErr) {
      console.error("Gagal catat log cron bulk:", logErr);
    }

    return NextResponse.json({ success: true, message: `Auto Bulk Digiflazz Berhasil: ${updateCount} Produk.` });

  } catch (error: any) {
    console.error("CRON BULK ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}