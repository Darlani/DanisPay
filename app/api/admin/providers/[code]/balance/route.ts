import { NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/utils/serverAuth';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { providerRegistry } from '@/lib/providers/registry';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ code: string }> | { code: string };
}

/**
 * Sanitizes error messages to ensure no sensitive credentials or environment keys leak.
 */
function sanitizeErrorMessage(rawMsg: string): string {
  return rawMsg
    .replace(/(api[_-]?key|secret|token|password|sign)[^,\s]*/gi, '[REDACTED]')
    .slice(0, 300);
}

/**
 * POST /api/admin/providers/[code]/balance
 * Fetches the current upstream vendor operational balance and persists it to public.providers.
 * Strictly restricted to role 'admin'.
 */
export async function POST(req: Request, { params }: RouteParams) {
  let resolvedCode = '';

  try {
    // 1. Authenticate & Enforce RBAC (Admin/Manager)
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }

    // 2. Resolve and normalize provider code
    const resolvedParams = await Promise.resolve(params);
    resolvedCode = String(resolvedParams.code || '').trim().toUpperCase();

    if (!resolvedCode) {
      return NextResponse.json(
        { success: false, error: 'Provider code path parameter is required.' },
        { status: 400 }
      );
    }

    // 3. Load provider record from database
    const { data: currentProvider, error: loadError } = await supabaseAdmin
      .from('providers')
      .select('code, name, balance, is_enabled, is_configured:code')
      .eq('code', resolvedCode)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        { success: false, code: resolvedCode, error: `Database error: ${loadError.message}` },
        { status: 500 }
      );
    }

    if (!currentProvider) {
      return NextResponse.json(
        { success: false, code: resolvedCode, error: `Provider "${resolvedCode}" is not registered in the system.` },
        { status: 404 }
      );
    }

    // 4. Resolve adapter from providerRegistry
    const adapter = providerRegistry.get(resolvedCode);
    if (!adapter) {
      return NextResponse.json(
        { success: false, code: resolvedCode, error: `Provider adapter for "${resolvedCode}" is not implemented in codebase.` },
        { status: 404 }
      );
    }

    // 5. Verify balance capability
    if (!adapter.capabilities.supportsBalance || typeof adapter.getBalance !== 'function') {
      return NextResponse.json(
        { success: false, code: resolvedCode, error: `Provider "${resolvedCode}" does not support balance queries.` },
        { status: 400 }
      );
    }

    // 6. Validate configuration/readiness
    const isConfigured = typeof adapter.isConfigured === 'function' ? adapter.isConfigured() : true;
    if (!isConfigured) {
      return NextResponse.json(
        { success: false, code: resolvedCode, error: `Provider "${resolvedCode}" is not configured with required server credentials.` },
        { status: 400 }
      );
    }

    // 7. Call adapter.getBalance()
    let balance: number;
    try {
      balance = await adapter.getBalance();
    } catch (adapterErr: unknown) {
      const rawMsg = adapterErr instanceof Error ? adapterErr.message : 'Upstream balance query failed.';
      const sanitized = sanitizeErrorMessage(rawMsg);
      const now = new Date().toISOString();

      // On failure: preserve previous balance, update telemetry only
      await supabaseAdmin
        .from('providers')
        .update({
          last_sync_at: now,
          last_sync_status: 'FAILED',
          last_error: sanitized,
          updated_at: now,
        })
        .eq('code', resolvedCode);

      return NextResponse.json(
        {
          success: false,
          code: resolvedCode,
          error: sanitized,
        },
        { status: 502 }
      );
    }

    // 8. Validate returned balance is a valid finite number
    if (typeof balance !== 'number' || !Number.isFinite(balance) || Number.isNaN(balance)) {
      const sanitized = 'Provider adapter returned an invalid non-numeric balance value.';
      const now = new Date().toISOString();

      await supabaseAdmin
        .from('providers')
        .update({
          last_sync_at: now,
          last_sync_status: 'FAILED',
          last_error: sanitized,
          updated_at: now,
        })
        .eq('code', resolvedCode);

      return NextResponse.json(
        {
          success: false,
          code: resolvedCode,
          error: sanitized,
        },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();

    // 9. Persist to public.providers
    const { error: updateError } = await supabaseAdmin
      .from('providers')
      .update({
        balance,
        last_sync_at: now,
        last_sync_status: 'SUCCESS',
        last_error: null,
        updated_at: now,
      })
      .eq('code', resolvedCode);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          code: resolvedCode,
          error: `Failed to persist balance in database: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    // 10. DIGIFLAZZ Dual-Write for backward compatibility
    if (resolvedCode === 'DIGIFLAZZ') {
      try {
        const storeId = process.env.STORE_ID;
        if (storeId) {
          await supabaseAdmin
            .from('store_settings')
            .update({ balance_digiflazz: balance })
            .eq('id', storeId);
        } else {
          const { data: settingRow } = await supabaseAdmin
            .from('store_settings')
            .select('id')
            .limit(1)
            .maybeSingle();
          if (settingRow?.id) {
            await supabaseAdmin
              .from('store_settings')
              .update({ balance_digiflazz: balance })
              .eq('id', settingRow.id);
          }
        }
      } catch (compatErr) {
        console.error('DIGIFLAZZ store_settings dual-write warning:', compatErr);
        // Do not fail the request if canonical update succeeded
      }
    }

    // 11. Return sanitized response
    return NextResponse.json({
      success: true,
      code: resolvedCode,
      balance,
      last_sync_at: now,
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Internal server error';
    const sanitized = sanitizeErrorMessage(rawMsg);

    return NextResponse.json(
      {
        success: false,
        code: resolvedCode || undefined,
        error: sanitized,
      },
      { status: 500 }
    );
  }
}

