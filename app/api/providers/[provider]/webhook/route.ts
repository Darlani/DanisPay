import { NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/registry';
import { reconcileWebhookEvent } from '@/lib/providers/reconciliation.service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ provider: string }> | { provider: string };
}

/**
 * Generic Dynamic Provider Webhook Ingress Route.
 * URL: POST /api/providers/[provider]/webhook
 *
 * Responsibilities:
 * 1. Resolves provider code from route params (e.g. DIGIFLAZZ, APIGAMES, UNIPLAY, VIP_RESELLER).
 * 2. Retrieves adapter from ProviderRegistry.
 * 3. Verifies adapter existence and supportsWebhook capability.
 * 4. Reads raw body text directly (CRITICAL for cryptographic signature validity).
 * 5. Delegates protocol decoding & signature validation to adapter.parseWebhook().
 * 6. Dispatches validated result to centralized reconcileWebhookEvent service.
 *
 * Boundary Guarantees:
 * - Zero hardcoded vendor wire protocols or MD5/HMAC hashing.
 * - Zero direct database mutation or refund logic in the router.
 * - Does NOT reject webhooks solely on is_execution_enabled (permits in-flight reconciliations).
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawCode = resolvedParams?.provider;

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { error: 'Invalid provider parameter' },
        { status: 400 }
      );
    }

    const providerCode = rawCode.trim().toUpperCase();

    // 1. Resolve adapter from registry
    const adapter = providerRegistry.get(providerCode);
    if (!adapter) {
      console.warn(`[WEBHOOK-ROUTER] Unknown or unregistered provider: ${providerCode}`);
      return NextResponse.json(
        { error: `Provider '${providerCode}' is not registered.` },
        { status: 404 }
      );
    }

    // 2. Capability verification
    if (!adapter.capabilities.supportsWebhook || typeof adapter.parseWebhook !== 'function') {
      console.warn(`[WEBHOOK-ROUTER] Provider '${providerCode}' does not support webhook callbacks.`);
      return NextResponse.json(
        { error: `Provider '${providerCode}' does not support webhook integration.` },
        { status: 400 }
      );
    }

    // 3. Exact raw body reading before any JSON parsing
    const rawBody = await req.text();

    // 4. Delegate signature and event verification to provider adapter
    const parseResult = await adapter.parseWebhook(req.headers, rawBody);

    if (!parseResult.isValid) {
      console.error(`❌ [WEBHOOK-ROUTER] Webhook for ${providerCode} rejected: ${parseResult.message}`);
      const status = parseResult.message?.toLowerCase().includes('missing') ? 401 : 403;
      return NextResponse.json({ error: parseResult.message || 'Unauthorized webhook signature' }, { status });
    }

    // 5. Delegate generic reconciliation
    return await reconcileWebhookEvent(providerCode, parseResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('🔥 [WEBHOOK-ROUTER] Fatal Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

