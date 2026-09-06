import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { providerExecutionEngine } from '@/lib/providers/engine';
import { requireAdminOrManager } from '@/utils/serverAuth';

/**
 * 🚀 FUNGSI INI ADALAH LOGIKA MURNI (Jalur VVIP)
 * Dipanggil langsung oleh Admin (manage/route.ts) atau via HTTP POST tepercaya.
 * Mendelegasikan eksekusi sepenuhnya ke ProviderExecutionEngine + DigiflazzAdapter.
 */
export async function runCheckoutPascabayar(order_id: string) {
  try {
    if (!order_id) {
      return { error: 'Order ID wajib diisi!' };
    }

    // 1. Ambil data order & saklar simulasi
    const [orderRes, settingsRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, order_id, api_ref_id, status, sku, customer_no, category')
        .eq('order_id', order_id)
        .single(),
      supabaseAdmin
        .from('store_settings')
        .select('*')
        .single(),
    ]);

    const order = orderRes.data;
    if (orderRes.error || !order) {
      return { error: 'Pesanan tidak ditemukan di database.' };
    }

    if (order.status === 'Berhasil') {
      return { error: 'Pesanan ini sudah sukses sebelumnya.' };
    }

    const isLiveMode = (settingsRes.data as { is_live_mode?: boolean | null } | null)?.is_live_mode === true;

    if (!isLiveMode) {
      // MODE SIMULASI
      const dummySN = `SIM-${Math.floor(Math.random() * 99999999)}`;
      await supabaseAdmin.from('orders').update({
        status: 'Berhasil',
        sn: dummySN,
        updated_at: new Date().toISOString(),
      }).eq('order_id', order_id);
      return { success: true, status: 'Sukses (Simulasi)', sn: dummySN };
    }

    console.log(`📡 [PASCABAYAR-CHECKOUT] Mengeksekusi order #${order_id} via ProviderExecutionEngine...`);

    const result = await providerExecutionEngine.executeOrder(order_id);

    if (result.status === 'SUCCESS' || (result.status === 'PENDING' && result.success === true)) {
      const rawData = typeof result.rawResponse === 'object' && result.rawResponse !== null
        ? (result.rawResponse as Record<string, unknown>).data || result.rawResponse
        : null;

      return {
        success: true,
        status: result.status === 'SUCCESS' ? 'Sukses' : 'Pending',
        sn: result.serialNumber || (result.status === 'SUCCESS' ? 'SN-TERBIT' : 'Proses di Vendor'),
        data: rawData,
      };
    }

    if (result.status === 'PENDING' && result.success === false) {
      // UNKNOWN transport outcome: Network timeout occurred after request was dispatched
      return {
        error: result.error || 'Network timeout / transport ambiguity. Pesanan tetap Diproses.',
      };
    }

    if (result.status === 'CLAIM_REJECTED') {
      return { error: 'Pesanan sedang atau sudah diproses!' };
    }

    if (result.status === 'NO_CANDIDATES') {
      return { error: 'Tidak ada supplier aktif untuk produk ini.' };
    }

    // Skenario FAILED
    const rawData = typeof result.rawResponse === 'object' && result.rawResponse !== null
      ? (result.rawResponse as Record<string, unknown>).data as Record<string, unknown> | undefined
      : undefined;

    const errorMsg = (rawData && typeof rawData.message === 'string' && rawData.message)
      ? rawData.message
      : (result.error || 'Vendor Digiflazz menolak transaksi.');
    const rc = rawData && typeof rawData.rc === 'string' ? rawData.rc : undefined;

    return {
      error: errorMsg,
      rc,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('🔥 Error di runCheckoutPascabayar:', errorMsg);
    return { error: errorMsg };
  }
}

/**
 * 🌐 HANDLER API (Untuk dipanggil secara terautentikasi oleh Admin atau Server Internal)
 * Otorisasi:
 * 1. Header 'x-webhook-secret' (Server-to-server dari process/coin)
 * 2. ATAU Authorization: Bearer <Admin/Manager token>
 */
export async function POST(req: Request) {
  try {
    // 1. Validasi Otorisasi: Cek internal server secret dahulu
    const webhookSecret = req.headers.get('x-webhook-secret');
    const configuredSecret = process.env.MACRODROID_SECRET?.trim();
    const isInternalServer = Boolean(configuredSecret && webhookSecret && webhookSecret === configuredSecret);

    if (!isInternalServer) {
      // Jika bukan server secret, wajib admin atau manager terverifikasi
      const auth = await requireAdminOrManager(req);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
      }
    }

    const body = (await req.json().catch(() => null)) as { order_id?: string } | null;
    const order_id = body?.order_id;

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID wajib diisi!' }, { status: 400 });
    }

    const result = await runCheckoutPascabayar(order_id);

    if (result.error) {
      return NextResponse.json({ error: result.error, rc: result.rc }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal membaca data request.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}