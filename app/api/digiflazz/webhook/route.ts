import { NextResponse } from 'next/server';
import { DigiflazzAdapter } from '@/lib/providers/adapters/digiflazz.adapter';
import { reconcileWebhookEvent } from '@/lib/providers/reconciliation.service';

export const dynamic = 'force-dynamic';

const digiflazzAdapter = new DigiflazzAdapter();

/**
 * Digiflazz Webhook Ingress (Backward-Compatibility Wrapper).
 * URL: POST /api/digiflazz/webhook
 *
 * Preserves 100% production compatibility with existing Digiflazz webhook configurations:
 * 1. Reads raw body text for cryptographic MD5 signature verification.
 * 2. Delegates payload decoding to DigiflazzAdapter.parseWebhook().
 * 3. Dispatches verified result to the unified reconcileWebhookEvent service.
 *
 * Replaces duplicated reconciliation logic while maintaining exact endpoint contract.
 */
export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || 'Unknown IP';
    console.log(`📡 [DIGIFLAZZ CALLBACK] Incoming request from: ${clientIp}`);

    // 1. Read exact raw body text for signature validation
    const rawBody = await req.text();

    // 2. Delegate protocol & signature to DigiflazzAdapter
    const parseResult = await digiflazzAdapter.parseWebhook(req.headers, rawBody);

    if (!parseResult.isValid) {
      console.error(`❌ Webhook Digiflazz ditolak: ${parseResult.message}`);
      const status = parseResult.message?.toLowerCase().includes('missing') ? 401 : 403;
      return NextResponse.json({ error: parseResult.message }, { status });
    }

    // 3. Delegate to centralized reconciliation service
    return await reconcileWebhookEvent('DIGIFLAZZ', parseResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    console.error('🔥 Webhook Fatal Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
