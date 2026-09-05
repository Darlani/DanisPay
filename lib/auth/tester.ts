import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const SANDBOX_SESSION_COOKIE = 'dapay_sandbox_session';

export interface OrderEnvironmentResolution {
  isSandbox: boolean;
  reason: 
    | 'GLOBAL_STORE_SANDBOX'
    | 'AUTHORIZED_TESTER_SANDBOX'
    | 'LIVE_DEFAULT'
    | 'UNAUTHORIZED_FORCED_LIVE'
    | 'SYSTEM_FALLBACK_LIVE';
}

/**
 * Resolves whether an incoming transaction order should be treated as LIVE or SANDBOX.
 * 
 * Rules:
 * 1. If global store_settings.is_live_mode is FALSE -> All orders are forced to SANDBOX.
 * 2. If store_settings.is_live_mode is TRUE:
 *    - Check for active sandbox session cookie ('dapay_sandbox_session' = 'active').
 *    - If no cookie -> LIVE.
 *    - If cookie exists, verify user authority in DB:
 *      * profiles.is_tester MUST be true.
 *      * If verified -> SANDBOX.
 *      * If unverified or non-tester -> LIVE (prevents cookie tampering).
 */
export async function resolveOrderEnvironment(
  req?: Request,
  userId?: string | null
): Promise<OrderEnvironmentResolution> {
  try {
    // 1. Check Global Store Mode
    const { data: storeSettings } = await supabaseAdmin
      .from('store_settings')
      .select('is_live_mode')
      .limit(1)
      .single();

    const isGlobalLive = storeSettings?.is_live_mode ?? true;

    if (!isGlobalLive) {
      return { isSandbox: true, reason: 'GLOBAL_STORE_SANDBOX' };
    }

    // 2. If store is LIVE, check if request contains an active sandbox session
    if (!req) {
      return { isSandbox: false, reason: 'LIVE_DEFAULT' };
    }

    const cookieHeader = req.headers.get('cookie') || '';
    const hasSandboxCookie = cookieHeader
      .split(';')
      .some(c => c.trim().startsWith(`${SANDBOX_SESSION_COOKIE}=active`));

    if (!hasSandboxCookie) {
      return { isSandbox: false, reason: 'LIVE_DEFAULT' };
    }

    // 3. Cookie exists -> Verify user authority in database
    if (!userId) {
      // Unauthenticated user attempting to claim sandbox session -> Rejected to LIVE
      return { isSandbox: false, reason: 'UNAUTHORIZED_FORCED_LIVE' };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_tester, role')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_tester === true) {
      return { isSandbox: true, reason: 'AUTHORIZED_TESTER_SANDBOX' };
    }

    // Account does not have is_tester privilege
    return { isSandbox: false, reason: 'UNAUTHORIZED_FORCED_LIVE' };
  } catch (err) {
    console.error('❌ [RESOLVE_ENV] Error resolving order environment:', err);
    // Fail-safe to LIVE
    return { isSandbox: false, reason: 'SYSTEM_FALLBACK_LIVE' };
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
    const { data: created, error: insertErr } = await supabaseAdmin
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
  } catch (err: any) {
    return { balance: 0, error: err.message };
  }
}

