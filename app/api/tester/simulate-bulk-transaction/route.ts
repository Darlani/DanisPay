export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  requireSandboxCustomerAccess,
  hasActiveSandboxSessionCookie,
  touchSandboxActivity,
  createSandboxOrderGuarded,
  getSandboxSimulatedMemberType,
  setSandboxSimulatedMemberType,
} from '@/lib/auth/tester';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { CURATED_SANDBOX_PRODUCTS } from '@/lib/sandbox/curated-catalog';
import { sandboxFinancialEngine } from '@/lib/providers/sandbox/financial';
import { sandboxExecutionSimulator } from '@/lib/providers/sandbox/simulator';

// Operational limits for bulk and counter cart simulation
const MAX_LINE_COUNT = 20;
const MAX_QTY_PER_LINE = 100;
const MAX_TOTAL_QTY = 500;
const MAX_TRANSACTION_AMOUNT = 25_000_000; // Rp 25.000.000 limit

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_PAYLOAD_FIELDS = [
  'price',
  'effectivePrice',
  'effective_price',
  'total',
  'total_amount',
  'subtotal',
  'discount',
  'cashback',
  'margin',
  'used_balance',
  'used_coin',
  'userId',
  'user_id',
  'buy_price',
  'referred_by',
  'member_type',
  'sn',
  'simulatedSn',
  'simulatedSns',
];

interface UnifiedProductViewRow {
  id: string;
  sku: string;
  name: string;
  category_name: string | null;
  brand_name: string | null;
  sub_brand: string | null;
  price: number | null;
  discount: number | null;
  cashback: number | null;
  is_active: boolean | null;
  is_storefront_eligible: boolean | null;
}

interface NormalizedCartLine {
  lineId: string;
  productId: string;
  quantity: number;
  customerNo: string;
  sellingPrice?: number;
}

interface ProcessedCartLine {
  lineId: string;
  productId: string;
  sku: string;
  productName: string;
  brandName: string | null;
  categoryName: string | null;
  customerNo: string;
  quantity: number;
  basePrice: number;
  discount: number;
  modalUnitPrice: number;
  modalLineTotal: number;
  sellingPrice: number;
  salesLineTotal: number;
  estimatedMargin: number;
  cashbackPerUnit: number;
  lineCashback: number;
  simulatedSn: string;
  simulatedSns: string[];
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
    if (!hasActiveSandboxSessionCookie(req)) {
      return NextResponse.json(
        { error: 'Sesi mode Sandbox tidak aktif.', code: 'SANDBOX_SESSION_REQUIRED' },
        { status: 403 },
      );
    }

    // 3. Parse and sanitize payload: client must NOT supply financial tampering fields
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

    // Check top-level payload for forbidden financial tampering fields
    for (const field of FORBIDDEN_PAYLOAD_FIELDS) {
      if (field in body) {
        return NextResponse.json(
          {
            error: 'Permintaan tidak boleh memuat harga, subtotal, diskon, komisi, margin, saldo, atau identitas pengguna.',
            code: 'FORBIDDEN_PAYLOAD_FIELDS',
          },
          { status: 400 },
        );
      }
    }

    // 4. Validate input array structure
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Daftar produk tidak boleh kosong.', code: 'INVALID_ITEMS' },
        { status: 400 },
      );
    }

    if (body.items.length > MAX_LINE_COUNT) {
      return NextResponse.json(
        {
          error: `Maksimal pemilihan varian adalah ${MAX_LINE_COUNT} SKU per simulasi massal.`,
          code: 'MAX_SKU_EXCEEDED',
        },
        { status: 400 },
      );
    }

    const fallbackCustomerNo = typeof body.customerNo === 'string' ? body.customerNo.trim() : '';

    // 5. Normalize Cart Lines (Supporting both Counter Cart & Legacy Bulk payloads)
    const normalizedLines: NormalizedCartLine[] = [];
    let totalQuantityCount = 0;
    let hasLineSpecificDestination = false;

    for (let i = 0; i < body.items.length; i++) {
      const rawItem = body.items[i];
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        return NextResponse.json(
          { error: 'Format item pesanan tidak valid.', code: 'INVALID_ITEMS' },
          { status: 400 },
        );
      }

      const itemObj = rawItem as Record<string, unknown>;

      // Check item-level forbidden financial tampering fields
      for (const field of FORBIDDEN_PAYLOAD_FIELDS) {
        if (field in itemObj) {
          return NextResponse.json(
            {
              error: 'Item pesanan tidak boleh memuat manipulasi harga atau diskon.',
              code: 'FORBIDDEN_PAYLOAD_FIELDS',
            },
            { status: 400 },
          );
        }
      }

      const rawPid = typeof itemObj.productId === 'string' ? itemObj.productId.trim() : '';
      if (!rawPid) {
        return NextResponse.json(
          { error: `ID produk pada baris #${i + 1} wajib diisi.`, code: 'INVALID_PRODUCT' },
          { status: 400 },
        );
      }

      const rawQty = itemObj.quantity;
      if (
        typeof rawQty !== 'number' ||
        !Number.isInteger(rawQty) ||
        rawQty < 1 ||
        rawQty > MAX_QTY_PER_LINE
      ) {
        return NextResponse.json(
          {
            error: `Kuantitas per produk harus berupa bilangan bulat antara 1 sampai ${MAX_QTY_PER_LINE} item.`,
            code: 'INVALID_QUANTITY',
          },
          { status: 400 },
        );
      }

      // Resolve destination: per-line takes precedence, fallback to top-level customerNo
      let itemCustomerNo = '';
      if (typeof itemObj.customerNo === 'string' && itemObj.customerNo.trim().length > 0) {
        itemCustomerNo = itemObj.customerNo.trim();
        hasLineSpecificDestination = true;
      } else if (fallbackCustomerNo.length > 0) {
        itemCustomerNo = fallbackCustomerNo;
      }

      if (!itemCustomerNo || itemCustomerNo.length < 4 || itemCustomerNo.length > 50) {
        return NextResponse.json(
          {
            error: `Nomor tujuan / ID pelanggan pada baris #${i + 1} tidak valid (minimal 4 karakter).`,
            code: 'INVALID_CUSTOMER_NO',
          },
          { status: 400 },
        );
      }

      // Resolve selling price if provided by client (simulation-only)
      let sellingPrice: number | undefined = undefined;
      if (itemObj.sellingPrice !== undefined) {
        const sp = Number(itemObj.sellingPrice);
        if (!Number.isFinite(sp) || sp < 0) {
          return NextResponse.json(
            {
              error: `Harga jual pada baris #${i + 1} tidak valid.`,
              code: 'INVALID_SELLING_PRICE',
            },
            { status: 400 },
          );
        }
        sellingPrice = Math.round(sp);
      }

      totalQuantityCount += rawQty;

      normalizedLines.push({
        lineId:
          typeof itemObj.cartItemId === 'string' && itemObj.cartItemId.trim().length > 0
            ? itemObj.cartItemId.trim()
            : `line_${i + 1}_${Date.now().toString(36)}`,
        productId: rawPid,
        quantity: rawQty,
        customerNo: itemCustomerNo,
        sellingPrice,
      });
    }

    if (totalQuantityCount > MAX_TOTAL_QTY) {
      return NextResponse.json(
        {
          error: `Total kuantitas simulasi (${totalQuantityCount}) melebihi batas maksimal ${MAX_TOTAL_QTY} item per transaksi.`,
          code: 'INVALID_TOTAL_QUANTITY',
        },
        { status: 400 },
      );
    }

    // 6. Server-Side Product Resolution (Single Batched Query — Anti N+1)
    const uniqueProductIds = Array.from(new Set(normalizedLines.map((l) => l.productId)));
    const targetUuids: string[] = [];
    const targetSkus: string[] = [];
    const rawToResolvedKeyMap = new Map<string, { type: 'uuid' | 'sku'; key: string }>();

    for (const rawId of uniqueProductIds) {
      if (UUID_REGEX.test(rawId)) {
        targetUuids.push(rawId);
        rawToResolvedKeyMap.set(rawId, { type: 'uuid', key: rawId });
      } else {
        const legacy = CURATED_SANDBOX_PRODUCTS.find((p) => p.id === rawId);
        if (legacy?.canonicalProductId && UUID_REGEX.test(legacy.canonicalProductId)) {
          targetUuids.push(legacy.canonicalProductId);
          rawToResolvedKeyMap.set(rawId, { type: 'uuid', key: legacy.canonicalProductId });
        } else if (legacy?.canonicalSku) {
          targetSkus.push(legacy.canonicalSku);
          rawToResolvedKeyMap.set(rawId, { type: 'sku', key: legacy.canonicalSku });
        } else {
          targetSkus.push(rawId);
          rawToResolvedKeyMap.set(rawId, { type: 'sku', key: rawId });
        }
      }
    }

    let query = supabaseAdmin
      .from('product_unified_view')
      .select(
        'id, sku, name, category_name, brand_name, sub_brand, price, discount, cashback, is_active, is_storefront_eligible',
      );

    if (targetUuids.length > 0 && targetSkus.length > 0) {
      query = query.or(`id.in.(${targetUuids.join(',')}),sku.in.(${targetSkus.join(',')})`);
    } else if (targetUuids.length > 0) {
      query = query.in('id', targetUuids);
    } else {
      query = query.in('sku', targetSkus);
    }

    const { data: matchedRows, error: queryError } = await query;
    if (queryError) {
      console.error('🔥 [SIMULATE_BULK] Database resolution error:', queryError.message);
      return NextResponse.json(
        { error: 'Gagal me-resolve katalog produk simulasi.', code: 'DATABASE_ERROR' },
        { status: 500 },
      );
    }

    const productByIdMap = new Map<string, UnifiedProductViewRow>();
    const productBySkuMap = new Map<string, UnifiedProductViewRow>();

    for (const row of (matchedRows || []) as UnifiedProductViewRow[]) {
      if (row.id) productByIdMap.set(row.id, row);
      if (row.sku) productBySkuMap.set(row.sku, row);
    }

    // 7. Resolve Simulation Persona (Regular vs Special)
    if (typeof body.simulatedMemberType === 'string') {
      const requested = body.simulatedMemberType.toLowerCase().trim();
      if (requested === 'regular' || requested === 'special') {
        await setSandboxSimulatedMemberType(userId, requested);
      }
    }
    const simMemberType = await getSandboxSimulatedMemberType(userId);
    const isSpecialPersona = simMemberType === 'special';

    // 8. Strict Server-Side Pricing & Line Financial Calculations
    const processedLines: ProcessedCartLine[] = [];
    let grandTotalModal = 0;
    let totalSimulatedSales = 0;
    let totalEstimatedMargin = 0;
    let totalCashbackCoin = 0;
    let representativeBrand: string | null = null;
    let representativeCategory: string | null = null;

    const nowEpoch = Date.now();

    for (let idx = 0; idx < normalizedLines.length; idx++) {
      const line = normalizedLines[idx];
      const mapping = rawToResolvedKeyMap.get(line.productId);
      const matched =
        mapping?.type === 'uuid'
          ? productByIdMap.get(mapping.key)
          : productBySkuMap.get(mapping?.key || line.productId);

      if (!matched) {
        return NextResponse.json(
          {
            error: `Produk simulasi "${line.productId}" tidak ditemukan di katalog DaPay.`,
            code: 'PRODUCT_NOT_FOUND',
          },
          { status: 404 },
        );
      }

      if (matched.is_active !== true || matched.is_storefront_eligible !== true) {
        return NextResponse.json(
          {
            error: `Varian "${matched.name}" sedang tidak aktif atau tidak memenuhi syarat storefront.`,
            code: 'DYNAMIC_PRICE_UNAVAILABLE',
          },
          { status: 400 },
        );
      }

      const basePrice = Math.round(Number(matched.price)) || 0;
      if (basePrice <= 0) {
        return NextResponse.json(
          {
            error: `Harga untuk varian "${matched.name}" tidak valid atau belum tersedia.`,
            code: 'DYNAMIC_PRICE_UNAVAILABLE',
          },
          { status: 400 },
        );
      }

      const rawDiscount = Number(matched.discount) || 0;
      const discount = rawDiscount > 0 ? rawDiscount : 0;
      const effectivePrice =
        discount > 0 ? Math.max(0, Math.floor(basePrice * (1 - discount / 100))) : basePrice;

      if (effectivePrice <= 0) {
        return NextResponse.json(
          {
            error: `Harga efektif untuk varian "${matched.name}" tidak valid.`,
            code: 'DYNAMIC_PRICE_UNAVAILABLE',
          },
          { status: 400 },
        );
      }

      const modalUnitPrice = effectivePrice;
      const modalLineTotal = modalUnitPrice * line.quantity;

      // If client supplied selling price, use it; otherwise default to modalUnitPrice
      const lineSellingPrice = line.sellingPrice !== undefined ? line.sellingPrice : modalUnitPrice;
      const salesLineTotal = lineSellingPrice * line.quantity;
      const estimatedMargin = (lineSellingPrice - modalUnitPrice) * line.quantity;

      const unitCashback = isSpecialPersona
        ? Math.max(0, Math.round(Number(matched.cashback)) || 0)
        : 0;
      const lineCashback = unitCashback * line.quantity;

      grandTotalModal += modalLineTotal;
      totalSimulatedSales += salesLineTotal;
      totalEstimatedMargin += estimatedMargin;
      totalCashbackCoin += lineCashback;

      if (!representativeBrand) representativeBrand = matched.brand_name;
      if (!representativeCategory) representativeCategory = matched.category_name;

      const simulatedSns: string[] = [];
      for (let q = 0; q < line.quantity; q++) {
        simulatedSns.push(
          `SN${nowEpoch}${(idx + 1).toString().padStart(2, '0')}${(q + 1).toString().padStart(2, '0')}${Math.floor(100 + Math.random() * 900)}`
        );
      }
      const simulatedSn = simulatedSns[0];

      processedLines.push({
        lineId: line.lineId,
        productId: matched.id,
        sku: matched.sku,
        productName: matched.name,
        brandName: matched.brand_name,
        categoryName: matched.category_name,
        customerNo: line.customerNo,
        quantity: line.quantity,
        basePrice,
        discount,
        modalUnitPrice,
        modalLineTotal,
        sellingPrice: lineSellingPrice,
        salesLineTotal,
        estimatedMargin,
        cashbackPerUnit: unitCashback,
        lineCashback,
        simulatedSn,
        simulatedSns,
      });
    }

    if (grandTotalModal > MAX_TRANSACTION_AMOUNT) {
      return NextResponse.json(
        {
          error: `Total nominal modal simulasi (Rp ${grandTotalModal.toLocaleString('id-ID')}) melebihi batas maksimal transaksi Rp ${MAX_TRANSACTION_AMOUNT.toLocaleString('id-ID')}.`,
          code: 'MAX_TRANSACTION_EXCEEDED',
        },
        { status: 400 },
      );
    }

    // 9. Check user profile email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
    const userEmail = profile?.email || null;

    // 10. Idempotency & Rapid Duplicate Submission Guard
    const idempotencyKey =
      typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim().length > 0
        ? body.idempotencyKey.trim().substring(0, 100)
        : null;

    if (idempotencyKey) {
      const { data: existingOrder } = await supabaseAdmin
        .from('sandbox_orders')
        .select('id, order_id, status, price, cashback, notes')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .limit(1)
        .maybeSingle();

      if (existingOrder) {
        return NextResponse.json(
          {
            error: 'Permintaan transaksi dengan idempotency key ini sudah pernah diproses.',
            code: 'DUPLICATE_TRANSACTION',
            orderId: existingOrder.order_id,
          },
          { status: 429 },
        );
      }
    }

    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentDuplicate } = await supabaseAdmin
      .from('sandbox_orders')
      .select('id')
      .eq('user_id', userId)
      .eq('sku', 'BULK-SIMULATION')
      .gte('created_at', fiveSecondsAgo)
      .limit(1)
      .maybeSingle();

    if (recentDuplicate) {
      return NextResponse.json(
        {
          error: 'Permintaan transaksi massal duplikat terdeteksi. Silakan tunggu beberapa detik.',
          code: 'DUPLICATE_TRANSACTION',
        },
        { status: 429 },
      );
    }

    // 11. Verify Sandbox wallet balance before order creation
    const { data: wallet } = await supabaseAdmin
      .from('sandbox_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    const currentBalance = Number(wallet?.balance || 0);
    if (!wallet || currentBalance < grandTotalModal) {
      return NextResponse.json(
        {
          error: 'Saldo virtual sandbox tidak mencukupi untuk simulasi pembelian massal ini.',
          code: 'INSUFFICIENT_SANDBOX_BALANCE',
          availableBalance: currentBalance,
          requiredAmount: grandTotalModal,
        },
        { status: 400 },
      );
    }

    // 12. Create Atomic Master Order via Guarded RPC (Consumes 1 Simulation Quota)
    const orderId = `SIM-BULK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const isCounterCart =
      hasLineSpecificDestination ||
      processedLines.some((l) => l.sellingPrice !== l.modalUnitPrice);

    const snapshotV2 = {
      snapshotVersion: 2,
      isCounterCart,
      simulatedMemberType: simMemberType,
      resolvedAt: new Date().toISOString(),
      totals: {
        totalLines: processedLines.length,
        totalQuantity: totalQuantityCount,
        grandTotalModal,
        totalSimulatedSales,
        totalEstimatedMargin,
        totalCashbackCoin,
      },
      lines: processedLines.map((l) => ({
        lineId: l.lineId,
        productId: l.productId,
        sku: l.sku,
        productName: l.productName,
        customerNo: l.customerNo,
        quantity: l.quantity,
        modalUnitPrice: l.modalUnitPrice,
        modalLineTotal: l.modalLineTotal,
        sellingPrice: l.sellingPrice,
        salesLineTotal: l.salesLineTotal,
        estimatedMargin: l.estimatedMargin,
        cashbackPerUnit: l.cashbackPerUnit,
        lineCashback: l.lineCashback,
        simulatedSn: l.simulatedSn,
        simulatedSns: l.simulatedSns,
      })),
    };

    const primaryCustomerNo =
      processedLines[0]?.customerNo || fallbackCustomerNo || '081234567890';

    const orderResult = await createSandboxOrderGuarded(userId, {
      order_id: orderId,
      sku: 'BULK-SIMULATION',
      product_name: isCounterCart
        ? `Keranjang Reseller (${processedLines.length} Transaksi, ${totalQuantityCount} Item)`
        : `Pembelian Massal (${processedLines.length} SKU, ${totalQuantityCount} Item)`,
      item_label: representativeBrand || 'Grosir Sandbox',
      category: representativeCategory || 'Counter Cart',
      customer_no: primaryCustomerNo,
      price: grandTotalModal,
      buy_price: grandTotalModal,
      cashback: totalCashbackCoin,
      used_balance: grandTotalModal,
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
        { error: 'Gagal membuat pesanan simulasi massal.', code: 'ORDER_CREATION_FAILED' },
        { status: 500 },
      );
    }

    const newOrder = { id: orderResult.id, order_id: orderId };

    // Persist full itemized Snapshot V2 and idempotency_key to sandbox_orders record
    await supabaseAdmin
      .from('sandbox_orders')
      .update({
        notes: JSON.stringify(snapshotV2),
        idempotency_key: idempotencyKey,
      })
      .eq('id', newOrder.id);

    // 13. Atomic Sandbox Coin/Balance Debit via ACID RPC
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

    // 14. Dispatch order to Sandbox Simulator (Diproses) — zero vendor API calls
    const dispatchResult = await sandboxExecutionSimulator.dispatchSandboxOrder({
      id: newOrder.id,
      order_id: orderId,
      sku: 'BULK-SIMULATION',
      customer_no: primaryCustomerNo,
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        { error: 'Gagal memproses pesanan simulasi.', code: 'DISPATCH_FAILED' },
        { status: 500 },
      );
    }

    // 15. Resolve Sandbox Order (Berhasil / Gagal simulated resolution)
    const resolution = await sandboxExecutionSimulator.resolveSandboxOrder({
      id: newOrder.id,
      order_id: orderId,
      customer_no: primaryCustomerNo,
      user_id: userId,
      user_email: userEmail,
      used_balance: grandTotalModal,
    });

    // 16. Touch meaningful activity upon successful server-authoritative simulation completion
    if (resolution.finalStatus === 'Berhasil') {
      await touchSandboxActivity(userId);
    }

    // Fetch latest sandbox wallet state
    const { data: latestWallet } = await supabaseAdmin
      .from('sandbox_wallets')
      .select('balance, coin_balance')
      .eq('user_id', userId)
      .maybeSingle();

    // 17. Return Comprehensive Response Contract (New Data Contract + Full Legacy Backward Compatibility)
    return NextResponse.json({
      success: true,
      status: resolution.finalStatus,
      orderId,
      totalItems: processedLines.length,
      totalQuantity: totalQuantityCount,
      amount: grandTotalModal,
      cashbackAwarded: resolution.finalStatus === 'Berhasil' ? totalCashbackCoin : 0,
      remainingBalance: Number(latestWallet?.balance ?? paymentResult.remainingBalance),
      remainingCoin: Number(latestWallet?.coin_balance ?? 0),
      simulatedMemberType: simMemberType,
      sn: resolution.sn || processedLines[0]?.simulatedSn || null,
      data: {
        orderId,
        status: resolution.finalStatus,
        totalModal: grandTotalModal,
        totalSimulatedSales,
        totalEstimatedMargin,
        totalCashbackCoin,
        lines: processedLines.map((l) => ({
          lineId: l.lineId,
          productId: l.productId,
          productName: l.productName,
          customerNo: l.customerNo,
          quantity: l.quantity,
          modalUnitPrice: l.modalUnitPrice,
          modalLineTotal: l.modalLineTotal,
          sellingPrice: l.sellingPrice,
          salesLineTotal: l.salesLineTotal,
          estimatedMargin: l.estimatedMargin,
          lineCashback: l.lineCashback,
          simulatedSn: l.simulatedSn,
          simulatedSns: l.simulatedSns,
        })),
      },
      lines: processedLines.map((l) => ({
        productId: l.productId,
        sku: l.sku,
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.modalUnitPrice,
        subtotal: l.modalLineTotal,
        cashback: l.lineCashback,
        simulatedSn: l.simulatedSn,
        simulatedSns: l.simulatedSns,
      })),
      message:
        resolution.finalStatus === 'Berhasil'
          ? 'Transaksi simulasi massal berhasil diproses!'
          : 'Transaksi simulasi massal selesai (status: Gagal).',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal.';
    console.error('🔥 [SIMULATE_BULK] Unhandled error:', message);
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
