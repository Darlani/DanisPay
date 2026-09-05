import { NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/utils/serverAuth';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

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
 * GET /api/admin/providers
 * Retrieves provider registry operational metadata for admin/manager.
 * Exposes server configuration state via `is_configured` boolean while keeping all secrets server-side.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { data: providers, error } = await supabaseAdmin
      .from('providers')
      .select(`
        code,
        name,
        description,
        is_enabled,
        is_catalog_enabled,
        is_execution_enabled,
        is_maintenance,
        is_storefront_visible,
        health_status,
        balance,
        last_sync_at,
        last_sync_status,
        last_error,
        created_at,
        updated_at
      `)
      .order('code', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const sanitizedProviders = (providers || []).map((provider) => ({
      code: provider.code,
      name: provider.name,
      description: provider.description,
      is_enabled: provider.is_enabled,
      is_catalog_enabled: provider.is_catalog_enabled,
      is_execution_enabled: provider.is_execution_enabled,
      is_maintenance: provider.is_maintenance,
      is_storefront_visible: typeof provider.is_storefront_visible === 'boolean' ? provider.is_storefront_visible : true,
      health_status: provider.health_status,
      balance: Number(provider.balance) || 0,
      last_sync_at: provider.last_sync_at,
      last_sync_status: provider.last_sync_status,
      last_error: provider.last_error,
      is_configured: isProviderConfigured(provider.code),
      created_at: provider.created_at,
      updated_at: provider.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedProviders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

