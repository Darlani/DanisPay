import { NextResponse } from 'next/server';
import { requireSandboxCustomerAccess, SANDBOX_SESSION_COOKIE, touchSandboxActivity } from '@/lib/auth/tester';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { CURATED_SANDBOX_PRODUCTS } from '@/lib/sandbox/curated-catalog';
import { sandboxFinancialEngine } from '@/lib/providers/sandbox/financial';
import { sandboxExecutionSimulator } from '@/lib/providers/sandbox/simulator';

export const dynamic = 'force-dynamic';

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

    // 3. Parse and sanitize payload: client must NOT supply price or user identity
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
      'user_id' in body
    ) {
      return NextResponse.json(
        { error: 'Permintaan tidak boleh memuat harga atau identitas pengguna.', code: 'FORBIDDEN_PAYLOAD_FIELDS' },
        { status: 400 },
      );
    }

    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const customerNo = typeof body.customerNo === 'string' ? body.customerNo.trim() : '';

    // 4. Validate curated product from authoritative catalog
    const product = CURATED_SANDBOX_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Produk simulasi tidak valid.', code: 'INVALID_PRODUCT' },
        { status: 400 },
      );
    }

    if (!customerNo || customerNo.length < 4 || customerNo.length > 30) {
      return NextResponse.json(
        { error: 'Nomor tujuan / ID pelanggan tidak valid (minimal 4 karakter).', code: 'INVALID_CUSTOMER_NO' },
        { status: 400 },
      );
    }

    // 5. Check user email from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    const userEmail = profile?.email || null;

    // 6. Duplicate / Rapid Submission Guard (5-second window)
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentDuplicate } = await supabaseAdmin
      .from('sandbox_orders')
      .select('id')
      .eq('user_id', userId)
      .eq('sku', product.sku)
      .eq('customer_no', customerNo)
      .gte('created_at', fiveSecondsAgo)
      .limit(1)
      .maybeSingle();

    if (recentDuplicate) {
      return NextResponse.json(
        { error: 'Permintaan transaksi duplikat terdeteksi. Silakan tunggu beberapa detik.', code: 'DUPLICATE_TRANSACTION' },
        { status: 429 },
      );
    }

    // 7. Verify Sandbox wallet balance before creating order
    const { data: wallet } = await supabaseAdmin
      .from('sandbox_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    const currentBalance = Number(wallet?.balance || 0);
    if (!wallet || currentBalance < product.demoPrice) {
      return NextResponse.json(
        {
          error: 'Saldo koin virtual tidak mencukupi untuk simulasi ini.',
          code: 'INSUFFICIENT_SANDBOX_BALANCE',
          availableBalance: currentBalance,
          requiredAmount: product.demoPrice,
        },
        { status: 400 },
      );
    }

    // 8. Create Sandbox Order in public.sandbox_orders ONLY
    const orderId = `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const { data: newOrder, error: insertErr } = await supabaseAdmin
      .from('sandbox_orders')
      .insert({
        order_id: orderId,
        user_id: userId,
        email: userEmail,
        sku: product.sku,
        product_name: product.name,
        item_label: product.categoryLabel,
        category: product.category,
        customer_no: customerNo,
        price: product.demoPrice,
        total_amount: product.demoPrice,
        used_balance: product.demoPrice,
        buy_price: product.demoPrice,
        payment_method: 'KOIN_SANDBOX',
        status: 'Pending',
        provider_used: 'SANDBOX_SIMULATOR',
      })
      .select('id, order_id')
      .single();

    if (insertErr || !newOrder) {
      return NextResponse.json(
        { error: 'Gagal membuat pesanan simulasi.', code: 'ORDER_CREATION_FAILED' },
        { status: 500 },
      );
    }

    // 9. Atomic Coin Debit via ACID RPC
    const paymentResult = await sandboxFinancialEngine.executeCoinPayment(orderId);
    if (!paymentResult.success) {
      // If debit failed (e.g. concurrent balance race), mark order Gagal
      await supabaseAdmin
        .from('sandbox_orders')
        .update({ status: 'Gagal', notes: paymentResult.message })
        .eq('id', newOrder.id);

      return NextResponse.json(
        {
          error: paymentResult.message || 'Pembayaran koin sandbox gagal.',
          code: 'PAYMENT_FAILED',
        },
        { status: 400 },
      );
    }

    // 10. Dispatch order to Sandbox Simulator (Diproses)
    const dispatchResult = await sandboxExecutionSimulator.dispatchSandboxOrder({
      id: newOrder.id,
      order_id: orderId,
      sku: product.sku,
      customer_no: customerNo,
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        { error: 'Gagal memproses pesanan simulasi.', code: 'DISPATCH_FAILED' },
        { status: 500 },
      );
    }

    // 11. Resolve Sandbox Order (Berhasil / Gagal simulated resolution)
    const resolution = await sandboxExecutionSimulator.resolveSandboxOrder({
      id: newOrder.id,
      order_id: orderId,
      customer_no: customerNo,
      user_id: userId,
      user_email: userEmail,
      used_balance: product.demoPrice,
    });

    // 12. Touch meaningful activity upon successful server-authoritative simulation completion
    if (resolution.finalStatus === 'Berhasil') {
      await touchSandboxActivity(userId);
    }

    return NextResponse.json({
      success: true,
      status: resolution.finalStatus,
      orderId,
      productName: product.name,
      customerNo,
      amount: product.demoPrice,
      remainingBalance: paymentResult.remainingBalance,
      sn: resolution.sn || null,
      message:
        resolution.finalStatus === 'Berhasil'
          ? 'Transaksi simulasi berhasil diproses!'
          : 'Transaksi simulasi selesai (status: Gagal).',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal.';
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
