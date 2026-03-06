import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { id, field, value, globalCashback } = await req.json();

    if (!id || !field) throw new Error("Data tidak lengkap!");

    // 1. Tarik data lama
    const { data: product, error: fetchErr } = await supabaseAdmin.from('products').select('*').eq('id', id).single();
    if (fetchErr || !product) throw fetchErr || new Error("Produk tidak ditemukan");

    let updateData: any = { updated_at: new Date().toISOString() };
    let currentPrice = Number(product.price || 0);
    let currentCost = Number(product.cost || 0);
    let currentDiscount = Number(product.discount || 0);

    // 2. Set field yang diedit bos
    if (field === 'lock_margin') {
        updateData.lock_margin = value === true || value === 'true'; // Ini yang bikin gembok aktif!
    } else if (field === 'discount') {
        updateData.discount = Number(value);
        currentDiscount = Number(value);
    } else if (field === 'margin_item') {
        updateData.margin_item = Number(value);
        currentPrice = Math.ceil((currentCost * (1 + Number(value) / 100)) / 100) * 100;
        updateData.price = currentPrice;
    } else if (field === 'promo_label') {
        updateData.promo_label = value;
    } else if (field === 'cashback') {
        updateData.cashback = Number(value);
    }

    // 3. HITUNG ULANG CASHBACK (Kecuali bos lagi ngetik manual di kolom cashback)
    if (field === 'margin_item' || field === 'discount') {
        const hargaSetelahDiskon = currentPrice - Math.floor(currentPrice * (currentDiscount / 100));
        const profitKotor = hargaSetelahDiskon - currentCost;

        if (currentDiscount > 0 && profitKotor > 0) {
            const randomPersen = (product.id.charCodeAt(0) % 6) + 15;
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

    // 4. Save ke Database
    const { error: updateErr } = await supabaseAdmin.from('products').update(updateData).eq('id', id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QUICK EDIT ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}