import { NextResponse } from 'next/server';
import {
  requireSandboxCustomerAccess,
  hasActiveSandboxSessionCookie,
  touchSandboxActivity,
} from '@/lib/auth/tester';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIVITY_ACTIONS = new Set<string>([
  'catalog_view',
  'margin_view',
  'order_review',
]);

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

    // 5. Minimal deterministic response (touched is true if updated, false if throttled/no-op)
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
