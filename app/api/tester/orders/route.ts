import { NextResponse } from 'next/server';
import { requireSandboxCustomerAccess } from '@/lib/auth/tester';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

function maskCustomerNo(customerNo: string | null | undefined): string {
  if (!customerNo) return '-';
  const str = customerNo.trim();
  if (str.length <= 6) {
    return str.slice(0, 2) + '****' + str.slice(-2);
  }
  return str.slice(0, 4) + '****' + str.slice(-3);
}

export async function GET(req: Request) {
  try {
    // 1. Authenticate customer & verify ACTIVE Sandbox access (rejects non-testers & Admin/Manager)
    const authorization = await requireSandboxCustomerAccess(req);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: 'Akses Sandbox tidak aktif atau tidak sah.', code: authorization.code },
        { status: authorization.status },
      );
    }
    const userId = authorization.userId;

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const statusFilter = searchParams.get('status')?.trim() || 'Semua';
    const categoryFilter = searchParams.get('category')?.trim() || 'Semua';
    const search = searchParams.get('search')?.trim() || '';

    // 4. Query public.sandbox_orders ONLY for this authenticated user
    let query = supabaseAdmin
      .from('sandbox_orders')
      .select(
        'id, order_id, sku, product_name, item_label, category, customer_no, customer_name, price, total_amount, used_balance, used_coin, buy_price, cashback, referral_commission, status, sn, provider_used, notes, created_at, updated_at',
        { count: 'exact' },
      )
      .eq('user_id', userId);

    if (statusFilter && statusFilter !== 'Semua') {
      const lower = statusFilter.toLowerCase();
      if (lower === 'berhasil' || lower === 'success') {
        query = query.or('status.ilike.%berhasil%,status.ilike.%success%');
      } else if (lower === 'proses' || lower === 'diproses') {
        query = query.or('status.ilike.%proses%,status.ilike.%diproses%');
      } else if (lower === 'pending') {
        query = query.ilike('status', '%pending%');
      } else if (lower === 'gagal' || lower === 'failed') {
        query = query.or('status.ilike.%gagal%,status.ilike.%failed%');
      } else {
        query = query.ilike('status', `%${statusFilter}%`);
      }
    }

    if (categoryFilter && categoryFilter !== 'Semua') {
      query = query.eq('category', categoryFilter);
    }

    if (search) {
      query = query.or(
        `order_id.ilike.%${search}%,product_name.ilike.%${search}%,customer_no.ilike.%${search}%,sn.ilike.%${search}%`,
      );
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 5. Parallel count & summary query
    const [ordersResult, summaryResult] = await Promise.all([
      query,
      supabaseAdmin
        .from('sandbox_orders')
        .select('status, total_amount, price, category')
        .eq('user_id', userId),
    ]);

    if (ordersResult.error) {
      return NextResponse.json(
        { error: 'Gagal memuat riwayat pesanan sandbox.' },
        { status: 500 },
      );
    }

    const rawOrders = ordersResult.data || [];
    const ordersList = rawOrders.map((o) => ({
      ...o,
      is_sandbox: true,
      masked_customer_no: maskCustomerNo(o.customer_no),
    }));

    const allOrders = summaryResult.data || [];
    let totalSpent = 0;
    let successCount = 0;
    let processingCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    const categoriesSet = new Set<string>();

    for (const ord of allOrders) {
      if (ord.category?.trim()) {
        categoriesSet.add(ord.category.trim());
      }
      const st = String(ord.status || '').toLowerCase().trim();
      const amount = Number(ord.total_amount ?? ord.price ?? 0) || 0;

      if (st.includes('berhasil') || st.includes('success')) {
        successCount++;
        totalSpent += amount;
      } else if (st.includes('proses') || st.includes('diproses')) {
        processingCount++;
      } else if (st.includes('pending')) {
        pendingCount++;
      } else {
        failedCount++;
      }
    }

    const totalFiltered = ordersResult.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersList,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages,
        },
        summary: {
          totalCount: allOrders.length,
          totalSpent,
          successCount,
          processingCount,
          failedCount,
          expiredCount: 0,
          pendingCount,
          statusCounts: {
            semua: allOrders.length,
            pending: pendingCount,
            expired: 0,
            proses: processingCount,
            berhasil: successCount,
            gagal: failedCount,
          },
        },
        categories: Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, 'id')),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan server.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
