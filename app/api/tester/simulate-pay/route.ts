import { NextResponse } from 'next/server';
import { requireSandboxCustomerAccess } from '@/lib/auth/tester';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { sandboxExecutionSimulator } from '@/lib/providers/sandbox/simulator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authorization = await requireSandboxCustomerAccess(req);
    if (!authorization.ok) {
      return NextResponse.json({ error: 'Akses Sandbox tidak aktif.' }, { status: authorization.status });
    }
    const user = { id: authorization.userId };

    const body = await req.json().catch(() => ({}));
    const orderIdInput = typeof body.order_id === 'string' ? body.order_id.trim() : '';

    if (!orderIdInput) {
      return NextResponse.json({ error: 'Order ID wajib disertakan.' }, { status: 400 });
    }

    // 1. Ambil data pesanan dari sandbox_orders
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdInput);
    let query = supabaseAdmin
      .from('sandbox_orders')
      .select('id, order_id, status, sku, customer_no, user_id, email, used_balance')
      .eq('user_id', user.id);

    if (isUUID) {
      query = query.or(`id.eq.${orderIdInput},order_id.eq.${orderIdInput}`);
    } else {
      query = query.eq('order_id', orderIdInput);
    }

    const { data: initialOrder, error: fetchErr } = await query.maybeSingle();
    const order = initialOrder;

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    // 2. Status Guard: Izinkan pesanan 'Pending' (untuk dispatch ke Diproses) dan 'Diproses' (untuk resolve)
    if (order.status !== 'Pending' && order.status !== 'Diproses') {
      return NextResponse.json(
        { error: `Pesanan sudah dalam status '${order.status}' dan tidak dapat disimulasikan lagi.` },
        { status: 400 }
      );
    }

    // Kasus A: Jika pesanan sudah berada di 'Diproses', langsung eksekusi penyelesaian pesanan
    if (order.status === 'Diproses') {
      const resolution = await sandboxExecutionSimulator.resolveSandboxOrder({
        id: order.id,
        order_id: order.order_id,
        customer_no: order.customer_no,
        user_id: order.user_id,
        user_email: order.email,
        used_balance: order.used_balance,
        force_fail: body.force_fail === true,
      });

      if (!resolution.resolved) {
        return NextResponse.json(
          { error: 'Pesanan tidak dapat diselesaikan atau sudah diproses worker lain.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        order_id: order.order_id,
        status: resolution.finalStatus,
        sn: resolution.sn || null,
        message: `Pesanan berhasil diselesaikan (Status: ${resolution.finalStatus}).`,
      });
    }

    // Kasus B: Pesanan masih 'Pending' -> Dispatch ke Sandbox Simulator (Ubah status ke 'Diproses')
    const dispatchResult = await sandboxExecutionSimulator.dispatchSandboxOrder({
      id: order.id,
      order_id: order.order_id,
      sku: order.sku,
      customer_no: order.customer_no,
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        { error: dispatchResult.message || 'Gagal mengubah status pesanan ke Diproses.' },
        { status: 500 }
      );
    }

    // 5. Opsi autoResolve:
    // Jika body.auto_resolve === false, berhenti di 'Diproses' agar tester bisa melihat tampilan Diproses!
    const autoResolve = body.auto_resolve !== false;
    let finalOutcome = { status: 'Diproses', sn: null as string | null };

    if (autoResolve) {
      const resolution = await sandboxExecutionSimulator.resolveSandboxOrder({
        id: order.id,
        order_id: order.order_id,
        customer_no: order.customer_no,
        user_id: order.user_id,
        user_email: order.email,
        used_balance: order.used_balance,
        force_fail: body.force_fail === true,
      });

      if (resolution.resolved) {
        finalOutcome = {
          status: resolution.finalStatus,
          sn: resolution.sn || null,
        };
      }
    }

    return NextResponse.json({
      success: true,
      order_id: order.order_id,
      status: finalOutcome.status,
      sn: finalOutcome.sn,
      message: `Simulasi pembayaran berhasil diproses (Status: ${finalOutcome.status}).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal server.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
