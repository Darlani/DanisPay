import { NextResponse } from 'next/server';
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INT_REGEX = /^\d+$/;

export async function POST(req: Request) { return handleRequest(req, 'POST'); }
export async function PUT(req: Request) { return handleRequest(req, 'PUT'); }

async function handleRequest(req: Request, method: string) {
  try {
    // --- 1. OTORISASI (Admin & Manager) ---
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const payload = await req.json();

    // --- 2. VALIDASI DASAR & INPUT STRING ---
    const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!rawName || rawName.length < 3 || rawName.length > 255) {
      return NextResponse.json(
        { success: false, error: "Nama produk wajib diisi (minimal 3 karakter, maksimal 255)." },
        { status: 400 }
      );
    }

    const rawSku = typeof payload.sku === 'string' ? payload.sku.trim() : '';
    if (!rawSku || rawSku.length > 100) {
      return NextResponse.json(
        { success: false, error: "SKU produk wajib diisi (maksimal 100 karakter)." },
        { status: 400 }
      );
    }

    const brandIdNum = Number(payload.brand_id);
    if (!Number.isInteger(brandIdNum) || brandIdNum <= 0) {
      return NextResponse.json(
        { success: false, error: "Brand wajib dipilih." },
        { status: 400 }
      );
    }

    // Validasi Angka Moneter & Finansial (Anti-NaN, Anti-Negatif, Anti-Infinity)
    const costNum = Number(payload.cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      return NextResponse.json(
        { success: false, error: "Harga modal (cost) harus berupa angka positif." },
        { status: 400 }
      );
    }

    const marginNum = payload.margin_item !== undefined && payload.margin_item !== null && payload.margin_item !== ''
      ? Number(payload.margin_item)
      : 0;
    if (!Number.isFinite(marginNum) || marginNum < 0) {
      return NextResponse.json(
        { success: false, error: "Margin harus berupa angka non-negatif." },
        { status: 400 }
      );
    }

    const discountNum = payload.discount !== undefined && payload.discount !== null && payload.discount !== ''
      ? Number(payload.discount)
      : 0;
    if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 100) {
      return NextResponse.json(
        { success: false, error: "Diskon harus berupa angka antara 0 hingga 100%." },
        { status: 400 }
      );
    }

    const stockNum = payload.stock !== undefined && payload.stock !== null && payload.stock !== ''
      ? Number(payload.stock)
      : 999;
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return NextResponse.json(
        { success: false, error: "Stok harus berupa bilangan bulat non-negatif." },
        { status: 400 }
      );
    }

    // Validasi Boolean
    let isActive = true;
    if (typeof payload.is_active === 'boolean') {
      isActive = payload.is_active;
    } else if (payload.is_active === 'true') {
      isActive = true;
    } else if (payload.is_active === 'false') {
      isActive = false;
    } else if (payload.is_active !== undefined && payload.is_active !== null) {
      return NextResponse.json({ success: false, error: "Nilai is_active tidak valid." }, { status: 400 });
    }

    const lockMargin = payload.lock_margin === true || payload.lock_margin === 'true';
    const rawProvider = typeof payload.provider === 'string' && payload.provider.trim()
      ? payload.provider.trim()
      : 'DIGIFLAZZ';
    const rawSubBrand = typeof payload.sub_brand === 'string' && payload.sub_brand.trim()
      ? payload.sub_brand.trim()
      : null;
    const rawPromoLabel = typeof payload.promo_label === 'string' && payload.promo_label.trim()
      ? payload.promo_label.trim().slice(0, 50)
      : null;

    // --- 3. AUTO-RESOLVE KATEGORI & BRAND ---
    // Jika category_id tidak diberikan, ambil dari category_id brand terkait
    let finalCategoryId: string | null = typeof payload.category_id === 'string' && payload.category_id.trim()
      ? payload.category_id.trim()
      : null;
    let finalBrandName = typeof payload.brand_name === 'string' ? payload.brand_name.trim() : '';

    const { data: brandRow } = await supabaseAdmin
      .from('brands')
      .select('id, name, category_id')
      .eq('id', brandIdNum)
      .maybeSingle();

    if (!finalBrandName && brandRow?.name) {
      finalBrandName = brandRow.name;
    }
    if (!finalCategoryId && brandRow?.category_id) {
      finalCategoryId = String(brandRow.category_id);
    }

    // --- 4. KALKULASI HARGA JUAL & CASHBACK (Server Authoritative) ---
    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('cashback_percent')
      .limit(1)
      .single();
    const dbCashbackPercent = Number(settingsData?.cashback_percent || 3);

    const hBase = marginNum === 0
      ? costNum
      : Math.ceil((costNum * (1 + marginNum / 100)) / 100) * 100;

    const nominalDiskon = Math.floor(hBase * (discountNum / 100));
    const hFinal = hBase - nominalDiskon;
    const profitKotor = hFinal - costNum;

    let finalCashback = 0;
    if (profitKotor > 0) {
      const cbNormal = Math.floor(hFinal * (dbCashbackPercent / 100));
      const plafonMaks = Math.floor(profitKotor * (dbCashbackPercent / 10));
      finalCashback = Math.min(cbNormal, plafonMaks);
    }

    // --- 5. AUTHORITATIVE SOURCE TABLE RESOLUTION ---
    let targetTable: 'product_automatic' | 'product_semi_auto';
    let targetId: string | number | null = null;

    if (method === 'PUT') {
      // EDIT: Physical source immutable, diverifikasi otoritatif oleh server
      const rawId = String(payload.id || '').trim();
      if (!rawId) {
        return NextResponse.json({ success: false, error: "ID produk wajib disertakan untuk edit." }, { status: 400 });
      }

      if (UUID_REGEX.test(rawId)) {
        // Cek keberadaan di product_automatic
        const { data: existsAuto } = await supabaseAdmin
          .from('product_automatic')
          .select('id')
          .eq('id', rawId)
          .maybeSingle();

        if (existsAuto) {
          targetTable = 'product_automatic';
          targetId = rawId;
        } else {
          return NextResponse.json(
            { success: false, error: `Produk otomatis dengan ID ${rawId} tidak ditemukan.` },
            { status: 404 }
          );
        }
      } else if (INT_REGEX.test(rawId)) {
        // Cek keberadaan di product_semi_auto
        const numId = Number(rawId);
        const { data: existsSemi } = await supabaseAdmin
          .from('product_semi_auto')
          .select('id')
          .eq('id', numId)
          .maybeSingle();

        if (existsSemi) {
          targetTable = 'product_semi_auto';
          targetId = numId;
        } else {
          return NextResponse.json(
            { success: false, error: `Produk semi-otomatis dengan ID ${rawId} tidak ditemukan.` },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: `Format ID produk tidak valid: ${rawId}` },
          { status: 400 }
        );
      }
    } else {
      // CREATE: Sumber ditentukan eksplisit atau via provider fallback
      if (payload.source_table === 'product_automatic' || payload.source_table === 'product_semi_auto') {
        targetTable = payload.source_table;
      } else {
        // Fallback kompatibilitas jika source_table tidak dikirim saat pembuatan baru
        targetTable = rawProvider === 'DIGIFLAZZ' ? 'product_automatic' : 'product_semi_auto';
      }
    }

    // --- 6. SUSUN PAYLOAD SESUAI TABEL FISIK ---
    const now = new Date().toISOString();
    const isSemiAuto = targetTable === 'product_semi_auto';

    const dbPayload: Record<string, unknown> = {
      name: rawName,
      brand_id: brandIdNum,
      brand: finalBrandName,
      sku: rawSku,
      sub_brand: rawSubBrand,
      margin_item: marginNum,
      discount: discountNum,
      cashback: finalCashback,
      category_id: finalCategoryId,
      stock: stockNum,
      is_active: isActive,
      lock_margin: lockMargin,
      provider: rawProvider,
      promo_label: rawPromoLabel,
      updated_at: now
    };

    if (isSemiAuto) {
      dbPayload.cost_numeric = costNum;
      dbPayload.price_numeric = hBase;
    } else {
      dbPayload.cost = costNum;
      dbPayload.price = hBase;
    }

    // --- 7. EKSEKUSI MUTASI DATABASE ---
    if (method === 'PUT' && targetId !== null) {
      const { error: updateErr } = await supabaseAdmin
        .from(targetTable)
        .update(dbPayload)
        .eq('id', targetId);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from(targetTable)
        .insert([dbPayload]);

      if (insertErr) throw insertErr;
    }

    // --- 8. LOG AKTIVITAS ---
    try {
      const actionName = method === 'PUT' ? "UPDATE PRODUK" : "TAMBAH PRODUK";
      await supabaseAdmin.from('activity_logs').insert([{
        action: actionName,
        details: `${actionName}: ${rawName} (${rawProvider}) pada rak ${targetTable}`,
        created_at: now
      }]);
    } catch (logErr) {
      console.error("Gagal mencatat activity log:", logErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: targetId,
        source_table: targetTable,
        name: rawName,
        price: hBase,
        is_active: isActive
      }
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Terjadi kesalahan server.";
    console.error("🔥 Error API Single Product:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}