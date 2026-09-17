export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  requireSandboxCustomerAccess,
  SANDBOX_SESSION_COOKIE,
  touchSandboxActivity,
  createSandboxOrderGuarded,
  getSandboxSimulatedMemberType,
  setSandboxSimulatedMemberType,
} from '@/lib/auth/tester';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { CURATED_SANDBOX_PRODUCTS } from '@/lib/sandbox/curated-catalog';
import { sandboxFinancialEngine } from '@/lib/providers/sandbox/financial';
import { sandboxExecutionSimulator } from '@/lib/providers/sandbox/simulator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface UnifiedProductViewRow {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  brand_id: number | null;
  brand_name: string | null;
  sub_brand: string | null;
  price: number | null;
  discount: number | null;
  cashback: number | null;
  promo_label: string | null;
  is_active: boolean | null;
  is_storefront_eligible: boolean | null;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate customer & verify ACTIVE Sandbox access
    const authorization = await requireSandboxCustomerAccess(req);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: 'Akses Sandbox tidak aktif atau tidak sah.', code: authorization.code },
        { status: authorization.status },
      );
    }
    const userId = authorization.userId;

    // 2. Verify active Sandbox session cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const hasSandboxCookie = cookieHeader
      .split(';')
      .some((c) => c.trim().startsWith(`${SANDBOX_SESSION_COOKIE}=active`));

    if (!hasSandboxCookie) {
      return NextResponse.json(
        { error: 'Sesi mode Sandbox tidak aktif.', code: 'SANDBOX_SESSION_REQUIRED' },
        { status: 403 },
      );
    }

    // 3. Parse and sanitize payload: client must NOT supply price, commission, or user identity
    const rawBody = await req.text();
    let body: Record<string, unknown> = {};
    if (rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: 'Format JSON tidak valid.', code: 'INVALID_JSON' },
          { status: 400 },
        );
      }
    }

    if (
      'price' in body ||
      'total' in body ||
      'total_amount' in body ||
      'userId' in body ||
      'user_id' in body ||
      'buy_price' in body ||
      'cashback' in body ||
      'referred_by' in body ||
      'member_type' in body ||
      'used_balance' in body ||
      'used_coin' in body ||
      'effectivePrice' in body ||
      'effective_price' in body ||
      'discount' in body ||
      'margin' in body
    ) {
      return NextResponse.json(
        {
          error: 'Permintaan tidak boleh memuat harga, komisi, diskon, margin, saldo, atau identitas pengguna.',
          code: 'FORBIDDEN_PAYLOAD_FIELDS',
        },
        { status: 400 },
      );
    }

    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const customerNo = typeof body.customerNo === 'string' ? body.customerNo.trim() : '';

    if (!productId) {
      return NextResponse.json(
        { error: 'ID produk simulasi wajib diisi.', code: 'INVALID_PRODUCT' },
        { status: 400 },
      );
    }

    if (!customerNo || customerNo.length < 4 || customerNo.length > 30) {
      return NextResponse.json(
        { error: 'Nomor tujuan / ID pelanggan tidak valid (minimal 4 karakter).', code: 'INVALID_CUSTOMER_NO' },
        { status: 400 },
      );
    }

    // 4. Server-Side Authoritative Product Resolution from public.product_unified_view
    let targetId: string | null = null;
    let targetSku: string | null = null;

    if (UUID_REGEX.test(productId)) {
      targetId = productId;
    } else {
      // Check if caller supplied a legacy curated identifier (e.g. 'sim-prod-01')
      const legacyItem = CURATED_SANDBOX_PRODUCTS.find((p) => p.id === productId);
      if (legacyItem) {
        if (legacyItem.canonicalProductId && UUID_REGEX.test(legacyItem.canonicalProductId)) {
          targetId = legacyItem.canonicalProductId;
        } else if (legacyItem.canonicalSku) {
          targetSku = legacyItem.canonicalSku;
        }
      } else {
        targetSku = productId;
      }
    }

    let matchedProduct: UnifiedProductViewRow | null = null;

    if (targetId) {
      const { data, error } = await supabaseAdmin
        .from('product_unified_view')
        .select(
          'id, sku, name, category_id, category_name, brand_id, brand_name, sub_brand, price, discount, cashback, promo_label, is_active, is_storefront_eligible',
        )
        .eq('id', targetId)
        .maybeSingle();

      if (error) {
        console.error('🔥 [SIMULATE_TRANSACTION] Error querying product by id:', error.message);
      } else if (data) {
        matchedProduct = data as UnifiedProductViewRow;
      }
    }

    if (!matchedProduct && targetSku) {
      const { data, error } = await supabaseAdmin
        .from('product_unified_view')
        .select(
          'id, sku, name, category_id, category_name, brand_id, brand_name, sub_brand, price, discount, cashback, promo_label, is_active, is_storefront_eligible',
        )
        .eq('sku', targetSku)
        .maybeSingle();

      if (error) {
        console.error('🔥 [SIMULATE_TRANSACTION] Error querying product by sku:', error.message);
      } else if (data) {
        matchedProduct = data as UnifiedProductViewRow;
      }
    }

    // Fallback: If not matched by canonical mappings, attempt raw productId as SKU
    if (!matchedProduct && productId && productId !== targetSku) {
      const { data, error } = await supabaseAdmin
        .from('product_unified_view')
        .select(
          'id, sku, name, category_id, category_name, brand_id, brand_name, sub_brand, price, discount, cashback, promo_label, is_active, is_storefront_eligible',
        )
        .eq('sku', productId)
        .maybeSingle();

      if (error) {
        console.error('🔥 [SIMULATE_TRANSACTION] Error querying product fallback:', error.message);
      } else if (data) {
        matchedProduct = data as UnifiedProductViewRow;
      }
    }

    // 5. Strict Commercial Validation: Active, Storefront Eligible, Valid Price
    if (!matchedProduct) {
      return NextResponse.json(
        { error: 'Produk simulasi tidak ditemukan di katalog DaPay.', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 },
      );
    }

    if (matchedProduct.is_active !== true || matchedProduct.is_storefront_eligible !== true) {
      return NextResponse.json(
        {
          error: 'Produk simulasi sedang tidak aktif atau tidak memenuhi syarat storefront.',
          code: 'DYNAMIC_PRICE_UNAVAILABLE',
        },
        { status: 400 },
      );
    }

    const basePrice = Math.round(Number(matchedProduct.price)) || 0;
    if (basePrice <= 0) {
      return NextResponse.json(
        {
          error: 'Harga dasar produk simulasi tidak valid atau belum tersedia.',
          code: 'DYNAMIC_PRICE_UNAVAILABLE',
        },
        { status: 400 },
      );
    }

    // 6. Authoritative Price & Discount Calculation
    const rawDiscount = Number(matchedProduct.discount) || 0;
    const discount = rawDiscount > 0 ? rawDiscount : 0;
    const effectivePrice =
      discount > 0 ? Math.max(0, Math.floor(basePrice * (1 - discount / 100))) : basePrice;

    if (effectivePrice <= 0) {
      return NextResponse.json(
        {
          error: 'Harga efektif produk simulasi tidak valid.',
          code: 'DYNAMIC_PRICE_UNAVAILABLE',
        },
        { status: 400 },
      );
    }

    // 7. Check user email from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    const userEmail = profile?.email || null;

    // 8. Duplicate / Rapid Submission Guard (5-second window)
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentDuplicate } = await supabaseAdmin
      .from('sandbox_orders')
      .select('id')
      .eq('user_id', userId)
      .eq('sku', matchedProduct.sku)
      .eq('customer_no', customerNo)
      .gte('created_at', fiveSecondsAgo)
      .limit(1)
      .maybeSingle();

    if (recentDuplicate) {
      return NextResponse.json(
        {
          error: 'Permintaan transaksi duplikat terdeteksi. Silakan tunggu beberapa detik.',
          code: 'DUPLICATE_TRANSACTION',
        },
        { status: 429 },
      );
    }

    // 9. Optional Sandbox persona switch ('regular' | 'special')
    if (typeof body.simulatedMemberType === 'string') {
      const requested = body.simulatedMemberType.toLowerCase().trim();
      if (requested === 'regular' || requested === 'special') {
        await setSandboxSimulatedMemberType(userId, requested);
      }
    }
    const simMemberType = await getSandboxSimulatedMemberType(userId);

    // Persona Cashback Rule: Special gets catalog cashback, Regular gets 0
    const rawCatalogCashback = Math.max(0, Math.round(Number(matchedProduct.cashback)) || 0);
    const calculatedCashback = simMemberType === 'special' ? rawCatalogCashback : 0;

    // 10. Verify Sandbox wallet balance before order insertion
    const { data: wallet } = await supabaseAdmin
      .from('sandbox_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    const currentBalance = Number(wallet?.balance || 0);
    if (!wallet || currentBalance < effectivePrice) {
      return NextResponse.json(
        {
          error: 'Saldo virtual sandbox tidak mencukupi untuk simulasi ini.',
          code: 'INSUFFICIENT_SANDBOX_BALANCE',
          availableBalance: currentBalance,
          requiredAmount: effectivePrice,
        },
        { status: 400 },
      );
    }

    // 11. Create Sandbox Order atomically via guarded RPC (TOCTOU Quota Protection)
    const orderId = `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Pricing snapshot metadata for transparency and non-destructive audit
    const priceSnapshot = {
      source: 'product_unified_view',
      productId: matchedProduct.id,
      sku: matchedProduct.sku,
      basePrice,
      discount,
      effectivePrice,
      cashbackAwarded: calculatedCashback,
      simulatedMemberType: simMemberType,
      resolvedAt: new Date().toISOString(),
    };

    const orderResult = await createSandboxOrderGuarded(userId, {
      order_id: orderId,
      sku: matchedProduct.sku,
      product_name: matchedProduct.name,
      item_label: matchedProduct.sub_brand || matchedProduct.brand_name || 'Sandbox Product',
      category: matchedProduct.category_name || 'Sandbox',
      customer_no: customerNo,
      price: effectivePrice,
      buy_price: effectivePrice,
      cashback: calculatedCashback,
      used_balance: effectivePrice,
      used_coin: 0,
      email: userEmail,
    });

    if (!orderResult.allowed) {
      return NextResponse.json(
        {
          error: orderResult.message || 'Batas kuota simulasi transaksi tercapai.',
          code: orderResult.code || 'SIMULATION_QUOTA_EXCEEDED',
          dailyUsed: orderResult.dailyUsed,
          dailyLimit: orderResult.dailyLimit,
          hourlyUsed: orderResult.hourlyUsed,
          hourlyLimit: orderResult.hourlyLimit,
        },
        { status: 429 },
      );
    }

    if (!orderResult.ok || !orderResult.id) {
      return NextResponse.json(
        { error: 'Gagal membuat pesanan simulasi.', code: 'ORDER_CREATION_FAILED' },
        { status: 500 },
      );
    }

    const newOrder = { id: orderResult.id, order_id: orderId };

    // Persist price snapshot and discount to sandbox_orders record
    await supabaseAdmin
      .from('sandbox_orders')
      .update({
        notes: JSON.stringify(priceSnapshot),
        discount: discount,
      })
      .eq('id', newOrder.id);

    // 12. Atomic Sandbox Coin/Balance Debit via ACID RPC
    const paymentResult = await sandboxFinancialEngine.executeCoinPayment(orderId);
    if (!paymentResult.success) {
      await supabaseAdmin
        .from('sandbox_orders')
        .update({ status: 'Gagal', notes: paymentResult.message })
        .eq('id', newOrder.id);

      return NextResponse.json(
        {
          error: paymentResult.message || 'Pembayaran saldo sandbox gagal.',
          code: 'PAYMENT_FAILED',
        },
        { status: 400 },
      );
    }

    // 13. Dispatch order to Sandbox Simulator (Diproses) — zero vendor API calls
    const dispatchResult = await sandboxExecutionSimulator.dispatchSandboxOrder({
      id: newOrder.id,
      order_id: orderId,
      sku: matchedProduct.sku,
      customer_no: customerNo,
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        { error: 'Gagal memproses pesanan simulasi.', code: 'DISPATCH_FAILED' },
        { status: 500 },
      );
    }

    // 14. Resolve Sandbox Order (Berhasil / Gagal simulated resolution)
    const resolution = await sandboxExecutionSimulator.resolveSandboxOrder({
      id: newOrder.id,
      order_id: orderId,
      customer_no: customerNo,
      user_id: userId,
      user_email: userEmail,
      used_balance: effectivePrice,
    });

    // 15. Touch meaningful activity upon successful server-authoritative simulation completion
    if (resolution.finalStatus === 'Berhasil') {
      await touchSandboxActivity(userId);
    }

    // Fetch latest sandbox wallet state
    const { data: latestWallet } = await supabaseAdmin
      .from('sandbox_wallets')
      .select('balance, coin_balance')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      status: resolution.finalStatus,
      orderId,
      productName: matchedProduct.name,
      customerNo,
      amount: effectivePrice,
      cashbackAwarded: resolution.finalStatus === 'Berhasil' ? calculatedCashback : 0,
      simulatedMemberType: simMemberType,
      remainingBalance: Number(latestWallet?.balance ?? paymentResult.remainingBalance),
      remainingCoin: Number(latestWallet?.coin_balance ?? 0),
      sn: resolution.sn || null,
      message:
        resolution.finalStatus === 'Berhasil'
          ? 'Transaksi simulasi berhasil diproses!'
          : 'Transaksi simulasi selesai (status: Gagal).',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal.';
    console.error('🔥 [SIMULATE_TRANSACTION] Unhandled error:', message);
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
