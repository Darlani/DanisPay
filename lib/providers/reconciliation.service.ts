import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import type { GenericWebhookResult, NormalizedExecutionStatus } from './types';

interface OrderRow {
  id: string;
  order_id: string;
  api_ref_id: string | null;
  sku: string;
  customer_no: string;
  user_id: string | null;
  email: string | null;
  user_contact: string | null;
  payment_method: string | null;
  total_amount: number | null;
  status: string;
  category: string | null;
  product_name: string;
  price: number | null;
  used_balance: number | null;
  buy_price: number | null;
  provider_used: string | null;
  vendor_sku: string | null;
  provider_ref_id: string | null;
  sn?: string | null;
}

interface WebhookDescDetail {
  meter_awal?: string | number;
  meter_akhir?: string | number;
}

interface WebhookDesc {
  detail?: WebhookDescDetail[];
  tagihan?: {
    detail?: WebhookDescDetail[];
  };
  nama?: string;
  nama_pelanggan?: string;
  tarif?: string;
  daya?: string;
  stand_meter?: string | number;
}

interface WebhookRawEventData {
  ref_id?: string;
  status?: string;
  sn?: string;
  message?: string;
  price?: number;
  customer_name?: string;
  desc?: WebhookDesc | string | null;
}

/**
 * Normalized resolution input for the shared reconciliation service.
 * Supports events coming from Webhooks (push) as well as Auto-Check / Polling (pull).
 */
export interface GenericOrderResolution {
  readonly normalizedStatus: NormalizedExecutionStatus;
  readonly providerReference?: string;
  readonly serialNumber?: string;
  readonly message?: string;
  readonly metadata?: Record<string, unknown>;
  readonly rawPayload?: unknown;
}

/**
 * Result structure returned by shared reconciliation functions.
 */
export interface ReconciliationResponse {
  readonly success: boolean;
  readonly status: number;
  readonly message?: string;
  readonly error?: string;
}

/**
 * Sends transaction alert to admin Telegram channel.
 * Wrapped safely so failure never aborts or rolls back order status.
 */
async function reportToTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('💀 Telegram Gagal:', errMsg);
  }
}

/**
 * Dispatches customer digital transaction receipt via background fetch.
 * Wrapped safely so failure never aborts order status.
 */
function sendReceiptAsync(payload: Record<string, unknown>): void {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
  fetch(`${siteUrl}/api/transaction/send-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[RECONCILIATION] Failed auto-receipt dispatch:', errMsg);
  });
}

/**
 * Centralized Domain Reconciliation Primitive.
 *
 * Reconciles an order's status transition (SUCCESS, PENDING, FAILED) across both
 * Webhook (push) and Auto-Check/Polling (pull) dispatch channels:
 * 1. Order lookup by clean order_id
 * 2. Provider attribution verification (cross-provider isolation)
 * 3. Waterfall correlation ref_id verification (stale attempt protection)
 * 4. Terminal state guards (anti-downgrade & idempotency)
 * 5. Atomic state transition & refund execution (via refund_failed_order_atomic)
 * 6. Provider-neutral metadata unpacking (postpaid, meter, PLN token)
 * 7. Post-mutation side-effects (Telegram notifications & receipts)
 */
export async function reconcileOrderResolution(
  providerCode: string,
  orderId: string,
  rawRefId: string,
  resolution: GenericOrderResolution
): Promise<ReconciliationResponse> {
  const normalizedProvider = (providerCode || '').trim().toUpperCase();
  const cleanOrderId = orderId.trim();

  console.log(
    `📝 [RECONCILIATION] Processing provider=${normalizedProvider} | orderId=${cleanOrderId} | refId=${rawRefId} | status=${resolution.normalizedStatus}`
  );

  // 1. Order Lookup: Primary by DaPay cleanOrderId, Fallback by (provider_used, provider_ref_id)
  let orderData: OrderRow | null = null;

  if (cleanOrderId) {
    const { data, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_id, api_ref_id, sku, customer_no, user_id, email, user_contact, payment_method, total_amount, status, category, product_name, price, used_balance, buy_price, provider_used, vendor_sku, provider_ref_id, sn'
      )
      .eq('order_id', cleanOrderId)
      .maybeSingle();

    if (!orderErr && data) {
      orderData = data as OrderRow;
    }
  }

  // Fallback Lookup: if cleanOrderId was absent or not found, try fallback by providerReference
  if (!orderData && resolution.providerReference) {
    const cleanRef = resolution.providerReference.trim();
    if (cleanRef.length > 0) {
      const { data: candidates, error: searchErr } = await supabaseAdmin
        .from('orders')
        .select(
          'id, order_id, api_ref_id, sku, customer_no, user_id, email, user_contact, payment_method, total_amount, status, category, product_name, price, used_balance, buy_price, provider_used, vendor_sku, provider_ref_id, sn'
        )
        .eq('provider_used', normalizedProvider)
        .eq('provider_ref_id', cleanRef);

      if (!searchErr && candidates) {
        if (candidates.length === 1) {
          orderData = candidates[0] as OrderRow;
          console.log(`🔍 [RECONCILIATION] Fallback lookup matched order ${orderData.order_id} via ${normalizedProvider}:${cleanRef}`);
        } else if (candidates.length > 1) {
          console.error(
            `🚨 [RECONCILIATION] Ambiguous match: ${candidates.length} orders found for ${normalizedProvider}:${cleanRef}. Failing closed.`
          );
          return { success: false, status: 409, error: 'Ambiguous provider reference match' };
        }
      }
    }
  }

  if (!orderData) {
    console.error(`❌ [RECONCILIATION] Order tidak ditemukan di database: ${cleanOrderId || resolution.providerReference || 'unknown'}`);
    return { success: false, status: 404, error: 'Order not found' };
  }

  const order = orderData as OrderRow;

  // 2. Cross-Provider Attribution Guard
  // An event from Provider A must NEVER reconcile or mutate an order executing under Provider B
  if (order.provider_used && order.provider_used.toUpperCase() !== normalizedProvider) {
    console.log(
      `⚠️ [RECONCILIATION] Cross-Provider Mismatch Ignored. (Incoming: ${normalizedProvider}, Order Provider: ${order.provider_used})`
    );
    return {
      success: true,
      status: 200,
      message: `Ignored status from provider ${normalizedProvider}: order is assigned to ${order.provider_used}`,
    };
  }

  // 3. Stale Attempt Protection Guard
  // If an order advanced in the waterfall (e.g. from -R1 to -R2), an outdated event for -R1 must be safely ignored
  if (rawRefId && order.api_ref_id && order.api_ref_id !== rawRefId) {
    console.log(
      `⚠️ [RECONCILIATION] Mengabaikan Status Usang. (Dari Vendor: ${rawRefId}, Yang Aktif di DB: ${order.api_ref_id})`
    );
    return {
      success: true,
      status: 200,
      message: 'Ignored outdated ref_id from previous fallback attempt',
    };
  }

  const rawPayloadObj = resolution.rawPayload as { data?: WebhookRawEventData } | undefined;
  const eventData = rawPayloadObj?.data;

  // 4. REKONSILIASI STATUS: SUCCESS
  if (resolution.normalizedStatus === 'SUCCESS') {
    if (order.status === 'Berhasil') {
      return { success: true, status: 200, message: 'Order already completed' };
    }

    if (order.status !== 'Diproses') {
      return {
        success: true,
        status: 200,
        message: `Order status is ${order.status}, ignoring late success event`,
      };
    }

    const kategori = (order.category || '').toLowerCase();
    const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');
    const isTokenPLN = kategori.includes('pln') || kategori.includes('token');
    const sn = resolution.serialNumber || order.sn || 'NO-SN';

    const updatePayload: Record<string, unknown> = {
      status: 'Berhasil',
      sn,
      notes: `Transaksi diselesaikan oleh Rekonsiliasi Supplier (${normalizedProvider})`,
      updated_at: new Date().toISOString(),
    };

    // SAME ATTEMPT REFERENCE PRESERVATION:
    // providerReference present -> write/update provider_ref_id
    // providerReference absent -> DO NOT overwrite existing provider_ref_id
    if (typeof resolution.providerReference === 'string' && resolution.providerReference.trim().length > 0) {
      updatePayload.provider_ref_id = resolution.providerReference.trim();
    }

    if (isPostpaid || isTokenPLN) {
      updatePayload.desc = eventData?.desc || null;

      const descObj =
        resolution.metadata ||
        (eventData?.desc && typeof eventData.desc === 'object'
          ? (eventData.desc as Record<string, unknown>)
          : null);

      if (descObj) {
        const typedDesc = descObj as WebhookDesc;
        const detail = typedDesc.detail?.[0] || typedDesc.tagihan?.detail?.[0];

        updatePayload.customer_name =
          typedDesc.nama ||
          typedDesc.nama_pelanggan ||
          (typeof descObj.customer_name === 'string' ? descObj.customer_name : undefined) ||
          eventData?.customer_name ||
          null;

        const tarif = (typeof descObj.tarif === 'string' ? descObj.tarif : typedDesc.tarif) || '';
        const daya = (typeof descObj.daya === 'string' ? descObj.daya : typedDesc.daya) || '';
        if (tarif || daya) {
          updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
        }

        if (detail?.meter_awal && detail?.meter_akhir) {
          updatePayload.stand_meter = `${detail.meter_awal} - ${detail.meter_akhir}`;
        } else if (typedDesc.stand_meter) {
          updatePayload.stand_meter = String(typedDesc.stand_meter);
        } else if (typeof descObj.stand_meter === 'string') {
          updatePayload.stand_meter = descObj.stand_meter;
        }

        if (isPostpaid) {
          if (typeof descObj.raw_tagihan === 'number') {
            updatePayload.raw_tagihan = descObj.raw_tagihan;
          } else if (eventData?.price) {
            updatePayload.raw_tagihan = eventData.price;
          }
        }
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id);

    if (updateErr) {
      console.error('🔥 [RECONCILIATION] Gagal update order status Sukses:', updateErr);
      return { success: false, status: 500, error: 'Failed to update order status' };
    }

    // Side effects executed only AFTER successful DB update
    await reportToTelegram(
      `✅ <b>SUKSES!</b> (${normalizedProvider})\n🆔 Inv: <code>${cleanOrderId}</code>\n📦 SN: <code>${sn}</code>`
    );

    const targetContactSuccess = order.user_contact || order.email;
    if (targetContactSuccess && targetContactSuccess.includes('@')) {
      sendReceiptAsync({
        orderId: order.order_id,
        productName: order.product_name,
        status: 'Berhasil',
        paymentMethod: order.payment_method,
        totalAmount: order.total_amount,
        userContact: targetContactSuccess,
      });
    }

    return { success: true, status: 200 };
  }

  // 5. REKONSILIASI STATUS: PENDING
  if (resolution.normalizedStatus === 'PENDING') {
    const sn = resolution.serialNumber;
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (sn && sn !== 'NO-SN') {
      updatePayload.sn = sn;
    }

    await supabaseAdmin.from('orders').update(updatePayload).eq('id', order.id);
    await reportToTelegram(
      `⏳ <b>PENDING!</b> (${normalizedProvider})\n🆔 Inv: <code>${cleanOrderId}</code>\n📦 SN: <code>${sn || 'NO-SN'}</code>`
    );

    return { success: true, status: 200 };
  }

  // 6. REKONSILIASI STATUS: FAILED (TERMINAL FAILURE)
  if (resolution.normalizedStatus === 'FAILED') {
    if (order.status === 'Gagal') {
      return { success: true, status: 200, message: 'Order already marked as failed' };
    }

    if (order.status !== 'Diproses') {
      return {
        success: true,
        status: 200,
        message: `Order status is ${order.status}, ignoring failure event`,
      };
    }

    const failureReason = resolution.message || `Ditolak oleh Vendor (${normalizedProvider})`;

    // Atomic refund primitive: executes status transition, balance refund, and balance_logs atomically
    const { data: refundSuccess, error: rpcError } = await supabaseAdmin.rpc(
      'refund_failed_order_atomic',
      {
        p_order_id: order.id,
        p_reason: failureReason,
      }
    );

    if (rpcError) {
      console.error('🔥 [RECONCILIATION] refund_failed_order_atomic RPC Error:', rpcError);
      return { success: false, status: 500, error: 'Failed to process failure refund' };
    }

    if (refundSuccess === true) {
      let currentAttempt = 1;
      const matchId = order.api_ref_id?.match(/-R(\d+)$/);
      if (matchId) currentAttempt = parseInt(matchId[1], 10);
      const retryText = currentAttempt > 1 ? `\n🔄 ATTEMPT: ${currentAttempt}x` : '';

      const nominalTransfer = (order.price || 0) + (order.used_balance || 0);
      const userStatus = order.user_id
        ? 'MEMBER (Koin Kembali)'
        : 'GUEST (Butuh Refund Manual)';

      await reportToTelegram(
        `❌ <b>TRANSAKSI GAGAL!</b> 😭 (${normalizedProvider})${retryText}\n\n📦 Produk: ${order.product_name}\n💰 Nominal: Rp ${nominalTransfer.toLocaleString('id-ID')}\n⚠️ Alasan: ${failureReason}\n👤 User: ${userStatus}\n🆔 Inv: <code>${cleanOrderId}</code>\n🔄 Status: DIPROSES ➡️ GAGAL`
      );

      const targetContactFail = order.user_contact || order.email;
      if (targetContactFail && targetContactFail.includes('@')) {
        sendReceiptAsync({
          orderId: order.order_id,
          productName: order.product_name,
          status: 'Gagal',
          paymentMethod: order.payment_method,
          totalAmount: order.total_amount,
          userContact: targetContactFail,
          reason: failureReason,
        });
      }
    } else {
      console.log(
        `⚠️ [RECONCILIATION] Order ${order.order_id} failure refund returned false (already resolved or ineligible).`
      );
    }

    return { success: true, status: 200 };
  }

  return { success: true, status: 200 };
}

/**
 * Webhook-specific wrapper maintaining backward compatibility with HTTP route handlers.
 */
export async function reconcileWebhookEvent(
  providerCode: string,
  webhookResult: GenericWebhookResult
): Promise<NextResponse> {
  const res = await reconcileOrderResolution(
    providerCode,
    webhookResult.orderId,
    webhookResult.rawRefId,
    {
      normalizedStatus: webhookResult.normalizedStatus,
      providerReference: webhookResult.providerReference,
      serialNumber: webhookResult.serialNumber,
      message: webhookResult.message,
      metadata: webhookResult.metadata,
      rawPayload: webhookResult.rawPayload,
    }
  );

  if (!res.success) {
    return NextResponse.json({ error: res.error || 'Reconciliation failed' }, { status: res.status });
  }

  return NextResponse.json({ success: true, ...(res.message ? { message: res.message } : {}) });
}
