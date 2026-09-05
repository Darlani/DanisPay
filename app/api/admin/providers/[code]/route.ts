import { NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/utils/serverAuth';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { providerRegistry } from '@/lib/providers/registry';

export const dynamic = 'force-dynamic';

/**
 * Server-only credential presence verification.
 * Checks whether required environment variables exist for each provider without exposing secrets.
 */
function isProviderConfigured(code: string): boolean {
  switch (code) {
    case 'DIGIFLAZZ':
      return Boolean(
        process.env.DIGIFLAZZ_USERNAME?.trim() &&
        process.env.DIGIFLAZZ_API_KEY?.trim()
      );
    case 'APIGAMES':
      return Boolean(
        process.env.APIGAMES_MERCHANT_ID?.trim() &&
        process.env.APIGAMES_SECRET_KEY?.trim()
      );
    case 'UNIPLAY':
      return Boolean(
        process.env.UNIPLAY_API_KEY?.trim()
      );
    case 'VIP_RESELLER':
      return Boolean(
        process.env.VIP_RESELLER_API_KEY?.trim() &&
        process.env.VIP_RESELLER_SIGN_KEY?.trim()
      );
    default:
      return false;
  }
}

/**
 * Checks whether an executable adapter implementation exists in codebase for this provider.
 */
function isProviderAdapterImplemented(code: string): boolean {
  return providerRegistry.has(code);
}

interface PatchProviderParams {
  params: Promise<{ code: string }> | { code: string };
}

/**
 * PATCH /api/admin/providers/[code]
 * Mutates operational settings for a registered provider.
 * Strictly restricted to users with role 'admin'.
 * Enforces business state safety boundaries.
 */
export async function PATCH(req: Request, { params }: PatchProviderParams) {
  try {
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const resolvedParams = await Promise.resolve(params);
    const rawCode = resolvedParams.code;

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid provider code parameter.' },
        { status: 400 }
      );
    }

    const code = rawCode.trim().toUpperCase();

    // Verify provider exists in registry
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('providers')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: fetchErr.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Provider '${code}' does not exist in registry.` },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Check for disallowed mutations
    const disallowedFields = [
      'code',
      'name',
      'balance',
      'health_status',
      'last_sync_at',
      'last_sync_status',
      'last_error',
      'credentials',
      'created_at',
    ];

    for (const field of disallowedFields) {
      if (field in body) {
        return NextResponse.json(
          {
            success: false,
            error: `Field '${field}' is read-only and cannot be mutated by client.`,
          },
          { status: 400 }
        );
      }
    }

    const configured = isProviderConfigured(code);
    const adapterReady = isProviderAdapterImplemented(code);

    const nextIsEnabled = typeof body.is_enabled === 'boolean'
      ? body.is_enabled
      : existing.is_enabled;

    let nextIsCatalogEnabled = typeof body.is_catalog_enabled === 'boolean'
      ? body.is_catalog_enabled
      : existing.is_catalog_enabled;

    let nextIsExecutionEnabled = typeof body.is_execution_enabled === 'boolean'
      ? body.is_execution_enabled
      : existing.is_execution_enabled;

    const nextIsMaintenance = typeof body.is_maintenance === 'boolean'
      ? body.is_maintenance
      : existing.is_maintenance;

    const nextIsStorefrontVisible = typeof body.is_storefront_visible === 'boolean'
      ? body.is_storefront_visible
      : (typeof existing.is_storefront_visible === 'boolean' ? existing.is_storefront_visible : true);

    // RULE 1: If provider is disabled, catalog and execution MUST be false
    if (!nextIsEnabled) {
      nextIsCatalogEnabled = false;
      nextIsExecutionEnabled = false;
    }

    // RULE 2: If catalog is requested enabled, provider MUST be enabled and configured
    if (nextIsCatalogEnabled) {
      if (!nextIsEnabled) {
        return NextResponse.json(
          { success: false, error: 'Cannot enable catalog ingestion on a disabled provider.' },
          { status: 400 }
        );
      }
      if (!configured) {
        return NextResponse.json(
          { success: false, error: `Cannot enable catalog for '${code}': Required server credentials are not configured.` },
          { status: 400 }
        );
      }
    }

    // RULE 3: If execution is requested enabled, provider MUST satisfy all prerequisites
    if (nextIsExecutionEnabled) {
      if (!nextIsEnabled) {
        return NextResponse.json(
          { success: false, error: 'Cannot enable execution on a disabled provider.' },
          { status: 400 }
        );
      }
      if (!configured) {
        return NextResponse.json(
          { success: false, error: `Cannot enable execution for '${code}': Required server credentials are not configured.` },
          { status: 400 }
        );
      }
      if (!adapterReady) {
        return NextResponse.json(
          { success: false, error: `Cannot enable execution for '${code}': Provider adapter is not yet implemented in the codebase.` },
          { status: 400 }
        );
      }
      if (nextIsMaintenance) {
        return NextResponse.json(
          { success: false, error: `Cannot enable execution for '${code}' while provider is in maintenance mode.` },
          { status: 400 }
        );
      }
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('providers')
      .update({
        is_enabled: nextIsEnabled,
        is_catalog_enabled: nextIsCatalogEnabled,
        is_execution_enabled: nextIsExecutionEnabled,
        is_maintenance: nextIsMaintenance,
        is_storefront_visible: nextIsStorefrontVisible,
        updated_at: new Date().toISOString(),
      })
      .eq('code', code)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code: updated.code,
        name: updated.name,
        description: updated.description,
        is_enabled: updated.is_enabled,
        is_catalog_enabled: updated.is_catalog_enabled,
        is_execution_enabled: updated.is_execution_enabled,
        is_maintenance: updated.is_maintenance,
        is_storefront_visible: typeof updated.is_storefront_visible === 'boolean' ? updated.is_storefront_visible : true,
        health_status: updated.health_status,
        balance: Number(updated.balance) || 0,
        last_sync_at: updated.last_sync_at,
        last_sync_status: updated.last_sync_status,
        last_error: updated.last_error,
        is_configured: configured,
        updated_at: updated.updated_at,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
