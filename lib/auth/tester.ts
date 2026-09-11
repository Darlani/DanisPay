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

/**
 * Records a new Sandbox session if within daily session quota.
 * Atomic RPC under sandbox_access FOR UPDATE lock.
 */
export async function recordSandboxSessionIfAllowed(userId: string): Promise<{
  ok: boolean;
  allowed: boolean;
  code?: string;
  message?: string;
  usedToday?: number;
  dailyLimit?: number;
}> {
  try {
    const { dailySessionLimit } = (await import('@/lib/sandbox/quota-config')).getSandboxQuotaConfig();
    const { data, error } = await supabaseAdmin.rpc('record_sandbox_session_if_allowed', {
      p_user_id: userId,
      p_daily_limit: dailySessionLimit,
    });

    if (error) {
      console.error('❌ [SANDBOX_SESSION_QUOTA] RPC error:', error.message);
      return { ok: false, allowed: false, message: error.message };
    }

    const res = (data as Record<string, unknown>) || {};
    return {
      ok: Boolean(res.success),
      allowed: Boolean(res.allowed),
      code: typeof res.code === 'string' ? res.code : undefined,
      message: typeof res.message === 'string' ? res.message : undefined,
      usedToday: typeof res.used_today === 'number' ? res.used_today : undefined,
      dailyLimit: typeof res.daily_limit === 'number' ? res.daily_limit : dailySessionLimit,
    };
  } catch (err: unknown) {
    console.error('❌ [SANDBOX_SESSION_QUOTA] Exception:', err);
    return { ok: false, allowed: false, message: err instanceof Error ? err.message : 'Unknown session quota error' };
  }
}

/**
 * Atomically checks simulation quota (daily calendar day and rolling 1 hour)
 * and inserts a pending Sandbox order in a single ACID transaction.
 * Strict TOCTOU protection under sandbox_access FOR UPDATE lock.
 */
export async function createSandboxOrderGuarded(
  userId: string,
  orderData: Record<string, unknown>,
): Promise<{
  ok: boolean;
  allowed: boolean;
  code?: string;
  message?: string;
  orderId?: string;
  id?: string;
  dailyUsed?: number;
  dailyLimit?: number;
  hourlyUsed?: number;
  hourlyLimit?: number;
}> {
  try {
    const { dailySimulationLimit, hourlySimulationBurstLimit } = (await import('@/lib/sandbox/quota-config')).getSandboxQuotaConfig();
    const { data, error } = await supabaseAdmin.rpc('create_sandbox_order_guarded', {
      p_user_id: userId,
      p_order_data: orderData,
      p_daily_limit: dailySimulationLimit,
      p_hourly_limit: hourlySimulationBurstLimit,
    });

    if (error) {
      console.error('❌ [SANDBOX_SIMULATION_QUOTA] RPC error:', error.message);
      return { ok: false, allowed: false, message: error.message };
    }

    const res = (data as Record<string, unknown>) || {};
    return {
      ok: Boolean(res.success),
      allowed: Boolean(res.allowed),
      code: typeof res.code === 'string' ? res.code : undefined,
      message: typeof res.message === 'string' ? res.message : undefined,
      orderId: typeof res.order_id === 'string' ? res.order_id : undefined,
      id: typeof res.id === 'string' ? res.id : undefined,
      dailyUsed: typeof res.daily_used === 'number' ? res.daily_used : undefined,
      dailyLimit: typeof res.daily_limit === 'number' ? res.daily_limit : dailySimulationLimit,
      hourlyUsed: typeof res.hourly_used === 'number' ? res.hourly_used : undefined,
      hourlyLimit: typeof res.hourly_limit === 'number' ? res.hourly_limit : hourlySimulationBurstLimit,
    };
  } catch (err: unknown) {
    console.error('❌ [SANDBOX_SIMULATION_QUOTA] Exception:', err);
    return { ok: false, allowed: false, message: err instanceof Error ? err.message : 'Unknown simulation quota error' };
  }
}

/**
 * Fetches current user quota usage (read-only, no mutation, no lock).
 */
export async function getSandboxQuotaUsage(userId: string): Promise<{
  sessionsToday: number;
  dailySessionLimit: number;
  simulationsToday: number;
  dailySimulationLimit: number;
  simulationsHourly: number;
  hourlySimulationBurstLimit: number;
  isSessionQuotaExhausted: boolean;
  isSimulationQuotaExhausted: boolean;
}> {
  const { dailySessionLimit, dailySimulationLimit, hourlySimulationBurstLimit } = (await import('@/lib/sandbox/quota-config')).getSandboxQuotaConfig();
  try {
    const { data, error } = await supabaseAdmin.rpc('get_sandbox_quota_usage', {
      p_user_id: userId,
    });

    if (error) {
      return {
        sessionsToday: 0,
        dailySessionLimit,
        simulationsToday: 0,
        dailySimulationLimit,
        simulationsHourly: 0,
        hourlySimulationBurstLimit,
        isSessionQuotaExhausted: false,
        isSimulationQuotaExhausted: false,
      };
    }

    const res = (data as Record<string, unknown>) || {};
    const sessionsToday = Number(res.sessions_today || 0);
    const simulationsToday = Number(res.simulations_today || 0);
    const simulationsHourly = Number(res.simulations_hourly || 0);

    return {
      sessionsToday,
      dailySessionLimit,
      simulationsToday,
      dailySimulationLimit,
      simulationsHourly,
      hourlySimulationBurstLimit,
      isSessionQuotaExhausted: sessionsToday >= dailySessionLimit,
      isSimulationQuotaExhausted: simulationsToday >= dailySimulationLimit || simulationsHourly >= hourlySimulationBurstLimit,
    };
  } catch {
    return {
      sessionsToday: 0,
      dailySessionLimit,
      simulationsToday: 0,
      dailySimulationLimit,
      simulationsHourly: 0,
      hourlySimulationBurstLimit,
      isSessionQuotaExhausted: false,
      isSimulationQuotaExhausted: false,
    };
  }
}
