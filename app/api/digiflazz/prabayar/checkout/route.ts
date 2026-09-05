export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { providerExecutionEngine } from '@/lib/providers/engine';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { order_id?: string } | null;
    const order_id = body?.order_id;

    if (!order_id) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    }

    const [orderRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('orders')
        .select('id, order_id, status, sku, customer_no, category')
        .eq('order_id', order_id)
        .single(),
      supabaseAdmin.from('store_settings').select('is_digiflazz_active').single()
    ]);

    const order = orderRes.data;
    const isLiveMode = settingsRes.data?.is_digiflazz_active === true;

    if (orderRes.error || !order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    }

    if (order.status !== 'Pending' && order.status !== 'Diproses') {
      return NextResponse.json({ error: "Pesanan sudah diproses!" }, { status: 400 });
    }

    if (!isLiveMode) {
      // 🛠️ MODE SIMULASI
      const dummySN = `SIM-PRA-${Math.floor(Math.random() * 999999)}`;
      await supabaseAdmin.from('orders').update({ status: 'Berhasil', sn: dummySN }).eq('order_id', order_id);
      return NextResponse.json({ success: true, status: 'Sukses', sn: dummySN });
    }

    console.error(`🚀 [PROVIDER-ENGINE] Mengeksekusi order #${order_id} via ProviderExecutionEngine...`);

    const result = await providerExecutionEngine.executeOrder(order_id);

    if (result.status === 'SUCCESS' || result.status === 'PENDING') {
      // --- TAMBAHAN LOGIKA STRUK (Agar Token PLN langsung muncul Nama) ---
      const kategori = (order.category || "").toLowerCase();
      const isTokenPLN = kategori.includes('pln') || kategori.includes('token');

      const rawObj = typeof result.rawResponse === 'object' && result.rawResponse !== null
        ? (result.rawResponse as Record<string, unknown>)
        : undefined;
      const raw = (rawObj && typeof rawObj.data === 'object' && rawObj.data !== null
        ? rawObj.data
        : rawObj) as Record<string, unknown> | undefined;

      if (isTokenPLN && raw?.desc && typeof raw.desc === 'object' && raw.desc !== null) {
        const descObj = raw.desc as Record<string, unknown>;
        const nama = typeof descObj.nama === 'string' ? descObj.nama : undefined;
        const namaPelanggan = typeof descObj.nama_pelanggan === 'string' ? descObj.nama_pelanggan : undefined;

        const updatePayload: Record<string, unknown> = {
          desc: JSON.stringify(descObj),
          customer_name: nama || namaPelanggan || null,
        };

        const tarif = typeof descObj.tarif === 'string' ? descObj.tarif : "";
        const daya = typeof descObj.daya === 'string' ? descObj.daya : "";
        if (tarif || daya) {
          updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
        }

        await supabaseAdmin.from('orders').update(updatePayload).eq('order_id', order_id);
      }

      return NextResponse.json({
        success: true,
        status: result.status === 'SUCCESS' ? 'Sukses' : 'Pending',
        sn: result.serialNumber || (result.status === 'SUCCESS' ? 'SN-TERBIT' : 'Proses di Vendor'),
        sku_used: result.winningSku,
      });
    }

    if (result.status === 'CLAIM_REJECTED') {
      return NextResponse.json({ error: "Pesanan sudah diproses!" }, { status: 400 });
    }

    if (result.status === 'FAILED' && result.error?.includes('Canonical product not found')) {
      return NextResponse.json({ error: "Data produk tidak ditemukan di katalog." }, { status: 404 });
    }

    if (result.status === 'NO_CANDIDATES') {
      return NextResponse.json({ error: "Semua stok alternatif sedang gangguan" }, { status: 500 });
    }

    // result.status === 'FAILED'
    const rawObj = typeof result.rawResponse === 'object' && result.rawResponse !== null
      ? (result.rawResponse as Record<string, unknown>)
      : undefined;
    const raw = (rawObj && typeof rawObj.data === 'object' && rawObj.data !== null
      ? rawObj.data
      : rawObj) as Record<string, unknown> | undefined;

    const errorMsg = (raw && typeof raw.message === 'string' && raw.message)
      ? raw.message
      : (result.error || "Semua stok alternatif sedang gangguan");

    console.error(`🚨 [FINAL FAIL] Order: ${order_id} | SKU Terakhir: ${result.winningSku || '-'} | Pesan Vendor:`, JSON.stringify(raw || errorMsg));

    return NextResponse.json({
      error: errorMsg,
      raw: raw || null,
    }, { status: 500 });

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Fatal Error Checkout Prabayar:", errorMsg);
    return NextResponse.json({ error: "Terjadi kesalahan internal!" }, { status: 500 });
  }
}
