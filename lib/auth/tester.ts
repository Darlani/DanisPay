import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { authenticateRequest, isManagementRole } from '@/utils/serverAuth';

export const SANDBOX_SESSION_COOKIE = 'dapay_sandbox_session';

export interface SandboxCustomerAuthorization {
  ok: true;
  userId: string;
  accessState: 'ACTIVE';
}

export interface SandboxAuthorizationFailure {
  ok: false;
  status: 401 | 403 | 503;
  code: 'AUTHENTICATION_REQUIRED' | 'SANDBOX_ACCESS_DENIED' | 'SANDBOX_ACCESS_UNAVAILABLE';
}

export type SandboxAuthorizationResult = SandboxCustomerAuthorization | SandboxAuthorizationFailure;

export async function getSandboxAccessState(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('sandbox_access')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new OrderEnvironmentResolutionError('Unable to verify Sandbox access.');
  return data?.state ?? null;
}

export async function requireSandboxCustomerAccess(request: Request): Promise<SandboxAuthorizationResult> {
  const authentication = await authenticateRequest(request);
  if (!authentication.ok) return { ok: false, status: 401, code: 'AUTHENTICATION_REQUIRED' };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authentication.user.id)
    .maybeSingle();
  if (profileError || !profile) return { ok: false, status: 503, code: 'SANDBOX_ACCESS_UNAVAILABLE' };
  if (isManagementRole(profile.role)) return { ok: false, status: 403, code: 'SANDBOX_ACCESS_DENIED' };

  const { data: access, error: accessError } = await supabaseAdmin
    .from('sandbox_access')
    .select('state')
    .eq('user_id', authentication.user.id)
    .maybeSingle();
  if (accessError) return { ok: false, status: 503, code: 'SANDBOX_ACCESS_UNAVAILABLE' };
  if (access?.state !== 'ACTIVE') return { ok: false, status: 403, code: 'SANDBOX_ACCESS_DENIED' };

  return { ok: true, userId: authentication.user.id, accessState: 'ACTIVE' };
}

export interface OrderEnvironmentResolution {
  isSandbox: boolean;
  reason:
    | 'GLOBAL_STORE_SANDBOX'
    | 'AUTHORIZED_TESTER_SANDBOX'
    | 'LIVE_DEFAULT'
    | 'UNAUTHORIZED_FORCED_LIVE'
    | 'MANAGEMENT_PERSONA_NON_CUSTOMER'
    | 'SYSTEM_ERROR';
}

export class OrderEnvironmentResolutionError extends Error {
  constructor(message = 'Unable to resolve order environment.') {
    super(message);
    this.name = 'OrderEnvironmentResolutionError';
  }
}

export async function resolveOrderEnvironment(
  req?: Request,
  userId?: string | null,
): Promise<OrderEnvironmentResolution> {
  try {
    if (!userId) return { isSandbox: false, reason: 'UNAUTHORIZED_FORCED_LIVE' };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (profileError || !profile) throw new OrderEnvironmentResolutionError('Unable to verify user profile.');
    if (isManagementRole(profile.role)) return { isSandbox: false, reason: 'MANAGEMENT_PERSONA_NON_CUSTOMER' };

    const hasActiveSandboxAccess = (await getSandboxAccessState(userId)) === 'ACTIVE';
    const { data: storeSettings, error: storeSettingsError } = await supabaseAdmin
      .from('store_settings')
      .select('is_live_mode')
      .limit(1)
      .single();
    if (storeSettingsError || !storeSettings) throw new OrderEnvironmentResolutionError('Unable to verify store environment.');

    if (storeSettings.is_live_mode === false) {
      return hasActiveSandboxAccess
        ? { isSandbox: true, reason: 'GLOBAL_STORE_SANDBOX' }
        : { isSandbox: false, reason: 'UNAUTHORIZED_FORCED_LIVE' };
    }

    if (!req || !hasActiveSandboxAccess) {
      return { isSandbox: false, reason: hasActiveSandboxAccess ? 'LIVE_DEFAULT' : 'UNAUTHORIZED_FORCED_LIVE' };
    }

    const hasSandboxCookie = (req.headers.get('cookie') || '')
      .split(';')
      .some((cookie) => cookie.trim().startsWith(`${SANDBOX_SESSION_COOKIE}=active`));
    return hasSandboxCookie
      ? { isSandbox: true, reason: 'AUTHORIZED_TESTER_SANDBOX' }
      : { isSandbox: false, reason: 'LIVE_DEFAULT' };
  } catch (error) {
    console.error('❌ [RESOLVE_ENV] Error resolving order environment:', error);
    if (error instanceof OrderEnvironmentResolutionError) throw error;
    throw new OrderEnvironmentResolutionError();
  }
}
/**
 * Ensures a sandbox wallet exists for the specified tester.
 * Automatically initializes with 1,000,000 coins if not present.
 */
export async function ensureSandboxWallet(userId: string): Promise<{ balance: number; error: string | null }> {
  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('sandbox_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      return { balance: 0, error: fetchErr.message };
    }

    if (existing) {
      return { balance: Number(existing.balance), error: null };
    }

    // Initialize with 1,000,000
    const initialBalance = 1000000;
    const { error: insertErr } = await supabaseAdmin
      .from('sandbox_wallets')
      .insert({
        user_id: userId,
        balance: initialBalance
      })
      .select('balance')
      .single();

    if (insertErr) {
      return { balance: 0, error: insertErr.message };
    }

    // Log initial grant
    await supabaseAdmin
      .from('sandbox_balance_logs')
      .insert({
        user_id: userId,
        amount: initialBalance,
        type: 'Bonus',
        description: 'Modal awal koin virtual sandbox',
        initial_balance: 0,
        final_balance: initialBalance
      });

    return { balance: initialBalance, error: null };
  } catch (err: unknown) {
    return { balance: 0, error: err instanceof Error ? err.message : "Unable to initialize Sandbox wallet." };
  }
}
