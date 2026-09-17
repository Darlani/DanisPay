export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  requireSandboxCustomerAccess,
  hasActiveSandboxSessionCookie,
} from '@/lib/auth/tester';
import { getDynamicSandboxCatalog } from '@/lib/sandbox/dynamic-catalog-service';

/**
 * GET /api/tester/catalog
 *
 * Authenticated read-only endpoint returning the hierarchical dynamic Sandbox catalog.
 *
 * Security:
 * - Requires active tester customer authorization (rejects management accounts and inactive sandbox state).
 * - Requires active Sandbox session cookie.
 * - Zero provider credentials or supplier internal secrets exposed.
 * - Zero provider API calls.
 */
export async function GET(req: Request) {
  try {
    // 1. Authenticate customer & verify ACTIVE Sandbox access
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

    // 3. Check for bypassCache query parameter
    const url = new URL(req.url);
    const bypassCache = url.searchParams.get('refresh') === 'true';

    // 4. Resolve hierarchical dynamic catalog directly from public.product_unified_view
    const catalogResponse = await getDynamicSandboxCatalog({ bypassCache });

    return NextResponse.json(catalogResponse, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    console.error('🔥 [API/TESTER/CATALOG] Unhandled error:', message);
    return NextResponse.json(
      { error: 'Gagal memuat katalog simulasi Sandbox.', code: 'CATALOG_ERROR' },
      { status: 500 },
    );
  }
}
