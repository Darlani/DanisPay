import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { id, field, value, globalCashback } = await req.json();

    if (!id || !field) throw new Error("Data tidak lengkap!");

    // 1. CARI PRODUK DI KEDUA GUDANG SEKALIGUS [cite: 2026-03-13]
    const [autoRes, semiRes] = await Promise.all([
      supabaseAdmin.from('product_automatic').select('*').eq('id', id).maybeSingle(),
      supabaseAdmin.from('product_semi_auto').select('*').eq('id', id).maybeSingle()
    ]);

    const product = autoRes.data || semiRes.data;
    if (!product) throw new Error("Produk tidak ditemukan di rak manapun!");

    // Deteksi dari tabel mana dia berasal untuk update nanti
    const isSemiAuto = !!semiRes.data;
    const targetTable = isSemiAuto ? 'product_semi_auto' : 'product_automatic';

    let updateData: any = { updated_at: new Date().toISOString() };
    
    // Mapping nama kolom sesuai asal gudangnya
    let currentPrice = Number(isSemiAuto ? (product.price_numeric || 0) : (product.price || 0));
    let currentCost = Number(isSemiAuto ? (product.cost_numeric || 0) : (product.cost || 0));
    let currentDiscount = Number(product.discount || 0);

    // 2. SET FIELD YANG DIEDIT BOS (Anti-Korupsi Logika)
    if (field === 'lock_margin') {
        updateData.lock_margin = value === true || value === 'true'; // Ini yang bikin gembok aktif!
    } else if (field === 'discount') {
        updateData.discount = Number(value);
        currentDiscount = Number(value);
    } else if (field === 'margin_item') {
        updateData.margin_item = Number(value);
        currentPrice = Math.ceil((currentCost * (1 + Number(value) / 100)) / 100) * 100;
        
        // PENTING: Update harga ke kolom yang benar sesuai gudangnya
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

    // 3. HITUNG ULANG CASHBACK (Logika Asli Bos: Kecuali bos lagi ngetik manual di kolom cashback)
    if (field === 'margin_item' || field === 'discount') {
        const hargaSetelahDiskon = currentPrice - Math.floor(currentPrice * (currentDiscount / 100));
        const profitKotor = hargaSetelahDiskon - currentCost;

        if (currentDiscount > 0 && profitKotor > 0) {
            const randomPersen = (String(product.id).charCodeAt(0) % 6) + 15;
            updateData.cashback = Math.floor(profitKotor * (randomPersen / 100));
        } else if (currentDiscount === 0) {
            const gbCb = Number(globalCashback) || 3;
            const cbNormal = Math.floor(hargaSetelahDiskon * (gbCb / 100));
            const plafonMaks = Math.floor(profitKotor * 0.3);
            updateData.cashback = (cbNormal > plafonMaks && profitKotor > 0) ? plafonMaks : cbNormal;
        } else {
            updateData.cashback = 0; // Kalo boncos, cashback dimatiin
        }
    }

// 4. SAVE KE DATABASE (Sesuai alamat gudangnya)
    const { error: updateErr } = await supabaseAdmin.from(targetTable).update(updateData).eq('id', id);
    if (updateErr) throw updateErr;

    // Format balikan agar sesuai dengan nama kolom di frontend
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