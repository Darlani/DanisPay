import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    // --- SATPAM TERPADU (Wajib Gembok!) ---
    const cookieStore = req.headers.get('cookie') || "";
    const isAuthorized = cookieStore.includes('isAdmin=true') || cookieStore.toLowerCase().includes('userrole=manager');

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses Ditolak! Lu bukan Admin/Manager Bos." }, { status: 403 });
    }

    const { id, field, value } = await req.json(); // globalCashback dari frontend diabaikan

    if (!id || !field) throw new Error("Data tidak lengkap!");

    // 1. CARI PRODUK & SETTINGAN TOKO SECARA BERSAMAAN (Sumber kebenaran mutlak)
    const [autoRes, semiRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('product_automatic').select('*').eq('id', id).maybeSingle(),
      supabaseAdmin.from('product_semi_auto').select('*').eq('id', id).maybeSingle(),
      supabaseAdmin.from('store_settings').select('cashback_percent').limit(1).single()
    ]);

    const product = autoRes.data || semiRes.data;
    if (!product) throw new Error("Produk tidak ditemukan di rak manapun!");

    // Tarik nilai cashback langsung dari database bos
    const dbCashbackPercent = Number(settingsRes.data?.cashback_percent || 3);

    // Deteksi asal tabel
    const isSemiAuto = !!semiRes.data;
    const targetTable = isSemiAuto ? 'product_semi_auto' : 'product_automatic';

    let updateData: any = { updated_at: new Date().toISOString() };
    
    let currentPrice = Number(isSemiAuto ? (product.price_numeric || 0) : (product.price || 0));
    let currentCost = Number(isSemiAuto ? (product.cost_numeric || 0) : (product.cost || 0));
    let currentDiscount = Number(product.discount || 0);

    // 2. SET FIELD YANG DIEDIT BOS
    if (field === 'lock_margin') {
        updateData.lock_margin = value === true || value === 'true';
    } else if (field === 'discount') {
        updateData.discount = Number(value);
        currentDiscount = Number(value);
    } else if (field === 'margin_item') {
        const marginVal = Number(value);
        updateData.margin_item = marginVal;
        // Jika margin 0, gunakan real modal tanpa pembulatan ratusan agar tidak ada selisih Rp 50
        currentPrice = marginVal === 0 
          ? currentCost 
          : Math.ceil((currentCost * (1 + marginVal / 100)) / 100) * 100;
        
        if (isSemiAuto) {
          updateData.price_numeric = currentPrice;
        } else {
          updateData.price = currentPrice;
        }
    } else if (field === 'promo_label') {
        updateData.promo_label = value;
    } else if (field === 'cashback') {
        updateData.cashback = Number(value);
    }

    // 3. HITUNG ULANG CASHBACK (ACUAN MUTLAK DARI STORE_SETTINGS)
    if (field === 'margin_item' || field === 'discount') {
        const hargaSetelahDiskon = currentPrice - Math.floor(currentPrice * (currentDiscount / 100));
        const profitKotor = hargaSetelahDiskon - currentCost;

        if (profitKotor <= 0) {
            // ANTI-BONCOS MUTLAK
            updateData.cashback = 0; 
        } else {
            // RUMUS BENAR: Menggunakan nilai dari store_settings, tanpa random!
            const cbNormal = Math.floor(hargaSetelahDiskon * (dbCashbackPercent / 100));
            const plafonMaks = Math.floor(profitKotor * (dbCashbackPercent / 10)); // Maksimal 30% dari profit
            updateData.cashback = Math.min(cbNormal, plafonMaks);
        }
    }

    // 4. SAVE KE DATABASE
    const { error: updateErr } = await supabaseAdmin.from(targetTable).update(updateData).eq('id', id);
    if (updateErr) throw updateErr;

    const returnedData = {
      ...updateData,
      price: isSemiAuto ? updateData.price_numeric : updateData.price
    };

    return NextResponse.json({ success: true, updatedData: returnedData });
  } catch (error: any) {
    console.error("QUICK EDIT ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}