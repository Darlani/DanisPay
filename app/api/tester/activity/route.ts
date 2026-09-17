import { NextResponse } from 'next/server';
import {
  requireSandboxCustomerAccess,
  hasActiveSandboxSessionCookie,
  touchSandboxActivity,
} from '@/lib/auth/tester';
import {
  parseAnonymousId,
  parseAttributionCookie,
  recordSandboxFunnelEvent,
} from '@/lib/analytics/sandbox-telemetry';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIVITY_ACTIONS = new Set<string>([
  'catalog_view',
  'margin_view',
  'order_review',
]);

const ACTION_EVENT_MAP = {
  catalog_view: 'sandbox_catalog_view',
  margin_view: 'sandbox_margin_view',
  order_review: 'sandbox_order_review',
} as const;

// 5-Minute In-Memory Activity Debounce per (userId + action)
// Avoids event flooding while preserving distinct meaningful days (evaluated in Asia/Jakarta)
const ACTIVITY_DEBOUNCE_MS = 5 * 60 * 1000;
const actionDebounceMap = new Map<string, number>();

function shouldRecordAction(userId: string, action: string): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const lastRecorded = actionDebounceMap.get(key);

  // Lazy map cleanup when large
  if (actionDebounceMap.size > 2000) {
    for (const [k, ts] of actionDebounceMap.entries()) {
      if (now - ts > ACTIVITY_DEBOUNCE_MS) {
        actionDebounceMap.delete(k);
      }
    }
  }

  if (!lastRecorded) {
    actionDebounceMap.set(key, now);
    return true;
  }

  // Check 5-minute throttle
  if (now - lastRecorded >= ACTIVITY_DEBOUNCE_MS) {
    actionDebounceMap.set(key, now);
    return true;
  }

  // Distinct day rollover check in Asia/Jakarta (WIB)
  const lastDate = new Date(lastRecorded).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jakarta',
  });
  const currDate = new Date(now).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jakarta',
  });
  if (lastDate !== currDate) {
    actionDebounceMap.set(key, now);
    return true;
  }

  return false;
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate customer & verify ACTIVE Sandbox access (rejects Admin/Manager)
    const authorization = await requireSandboxCustomerAccess(req);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: 'Akses Sandbox tidak aktif atau tidak sah.', code: authorization.code },
        { status: authorization.status },
      );
    }

    // 2. Verify active Sandbox session cookie
    if (!hasActiveSandboxSessionCookie(req)) {
      return NextResponse.json(
        { error: 'Sesi mode Sandbox tidak aktif.', code: 'SANDBOX_SESSION_REQUIRED' },
        { status: 403 },
      );
    }

    // 3. Parse and sanitize payload: strictly reject client-supplied identity
    let body: Record<string, unknown> = {};
    try {
      const rawText = await req.text();
      if (rawText.trim().length > 0) {
        body = JSON.parse(rawText);
      }
    } catch {
      return NextResponse.json(
        { error: 'Format JSON tidak valid.', code: 'INVALID_JSON' },
        { status: 400 },
      );
    }

    if (
      'userId' in body ||
      'user_id' in body ||
      'email' in body ||
      'timestamp' in body
    ) {
      return NextResponse.json(
        { error: 'Permintaan tidak boleh memuat identitas atau timestamp.', code: 'FORBIDDEN_PAYLOAD_FIELDS' },
        { status: 400 },
      );
    }

    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    if (!ALLOWED_ACTIVITY_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: 'Aksi aktivitas tidak valid.', code: 'INVALID_ACTIVITY_ACTION' },
        { status: 400 },
      );
    }

    // 4. Touch activity server-side with verified user identity (5-min DB-side throttle)
    const result = await touchSandboxActivity(authorization.userId);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: 'Gagal mencatat aktivitas Sandbox.', code: 'ACTIVITY_TOUCH_FAILED' },
        { status: 500 },
      );
    }

    // 5. Persistent Funnel Telemetry Logging (Meaningful Activity)
    if (shouldRecordAction(authorization.userId, action)) {
      try {
        const cookieHeader = req.headers.get('cookie') || '';
        const anonymousId = parseAnonymousId(getCookieValue(cookieHeader, 'dapay_anon_id'));
        const parsedAttr = parseAttributionCookie(cookieHeader);

        // Extract and sanitize action-specific metadata
        let cleanMeta: Record<string, unknown> | null = null;
        if (action === 'catalog_view') {
          const category =
            typeof body.category === 'string'
              ? body.category.trim().slice(0, 32)
              : null;
          if (category) cleanMeta = { category };
        } else if (action === 'margin_view') {
          const sku =
            typeof body.sku === 'string'
              ? body.sku.trim().slice(0, 64)
              : null;
          const category =
            typeof body.category === 'string'
              ? body.category.trim().slice(0, 32)
              : null;
          if (sku || category) {
            cleanMeta = {};
            if (sku) cleanMeta.sku = sku;
            if (category) cleanMeta.category = category;
          }
        }
        // For order_review: strictly null (never store order or financial details)

        const eventName = ACTION_EVENT_MAP[action as keyof typeof ACTION_EVENT_MAP];

        await recordSandboxFunnelEvent({
          userId: authorization.userId,
          anonymousId,
          eventName,
          source: parsedAttr?.src || 'direct',
          medium: parsedAttr?.med || 'none',
          campaign: parsedAttr?.camp || 'none',
          metadata: cleanMeta,
        });
      } catch {
        // Telemetry persistence failure must never fail the activity touch endpoint
      }
    }

    // 6. Minimal deterministic response (touched is true if updated, false if throttled/no-op)
    return NextResponse.json({
      success: true,
      action,
      touched: result.touched,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal.';
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
