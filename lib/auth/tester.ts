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

export function hasActiveSandboxSessionCookie(req: Request): boolean {
  const cookieHeader = req.headers.get('cookie') || '';
  return cookieHeader
    .split(';')
    .some((c) => c.trim().startsWith(`${SANDBOX_SESSION_COOKIE}=active`));
}

export type TouchSandboxActivityResult =
  | { ok: true; touched: boolean }
  | { ok: false; error: string };

/**
 * Touches meaningful sandbox activity for an active tester.
 * Enforces DB-side 5-minute debounce and ACTIVE-only guard via atomic RPC.
 * Distinguishes between legitimate throttle ({ ok: true, touched: false })
 * and actual database/RPC error ({ ok: false, error: ... }).
 */
export async function touchSandboxActivity(userId: string): Promise<TouchSandboxActivityResult> {
  try {
    if (!userId) return { ok: false, error: 'User ID is required' };
    const { data, error } = await supabaseAdmin.rpc('touch_sandbox_activity', {
      p_user_id: userId,
    });
    if (error) {
      console.error('⚠️ [SANDBOX_ACTIVITY] Failed to touch activity for user:', userId, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, touched: Boolean(data) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown activity touch error';
    console.error('⚠️ [SANDBOX_ACTIVITY] Error touching activity for user:', userId, err);
    return { ok: false, error: message };
  }
}

/**
 * Atomically locks a single active sandbox user due to inactivity.
 * Enforces single-user isolation: strictly updates user_id = userId AND state = 'ACTIVE'.
 * Preserves wallet, sandbox_orders, profiles.is_tester, and reactivation records.
 * Returns true if the user was locked (or already locked), false if update failed.
 */
export async function lockSingleUserForInactivity(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    const { error } = await supabaseAdmin
      .from('sandbox_access')
      .update({
        state: 'LOCKED',
        changed_by: null,
        changed_at: new Date().toISOString(),
        reason: 'Auto-lock: 7 hari tanpa aktivitas bermakna',
      })
      .eq('user_id', userId)
      .eq('state', 'ACTIVE');

    if (error) {
      console.error('❌ [SANDBOX_LAZY_AUTOLOCK] Error locking user:', userId, error.message);
      return false;
    }
    return true;
  } catch (err: unknown) {
    console.error('❌ [SANDBOX_LAZY_AUTOLOCK] Exception locking user:', userId, err);
    return false;
  }
}

/**
 * Auto-locks active sandbox users who have been inactive for >= 7 days.
 * Calls atomic service-role-only RPC auto_lock_inactive_sandbox_users().
 */
export async function autoLockInactiveSandboxUsers(): Promise<{
  lockedCount: number;
  lockedUserIds: string[];
}> {
  try {
    const { data, error } = await supabaseAdmin.rpc('auto_lock_inactive_sandbox_users');
    if (error) {
      console.error('❌ [SANDBOX_AUTOLOCK] Error executing auto-lock sweep:', error.message);
      throw new Error(`Auto-lock failed: ${error.message}`);
    }
    const rows = Array.isArray(data) ? data : [];
    const lockedUserIds = rows.map((r: { user_id: string }) => r.user_id).filter(Boolean);
    return {
      lockedCount: lockedUserIds.length,
      lockedUserIds,
    };
  } catch (err: unknown) {
    console.error('❌ [SANDBOX_AUTOLOCK] Error during auto-lock execution:', err);
    throw err;
  }
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
