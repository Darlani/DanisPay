import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { SANDBOX_SESSION_COOKIE, ensureSandboxWallet, lockSingleUserForInactivity } from '@/lib/auth/tester';

export const dynamic = 'force-dynamic';

async function verifyToken(token: string): Promise<{ id: string; email?: string } | null> {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email };
}

async function getAuthenticatedUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (token) {
    return verifyToken(token);
  }

  // Fallback to cookie-based auth
  const cookieStore = req.headers.get('cookie') || '';

  // 1. Check sb-access-token cookie (used by DaPay)
  const sbAccessTokenMatch = cookieStore.match(/sb-access-token=([^;]+)/i);
  if (sbAccessTokenMatch?.[1]) {
    try {
      const raw = decodeURIComponent(sbAccessTokenMatch[1]).trim();
      return verifyToken(raw);
    } catch {
      // ignore
    }
  }

  // 2. Check sb-*-auth-token cookie (Supabase standard)
  const tokenMatch = cookieStore.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i);
  if (tokenMatch && tokenMatch[1]) {
    try {
      const decoded = decodeURIComponent(tokenMatch[1]);
      let parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && parsed[0]) parsed = parsed[0];
      const rawToken = typeof parsed === 'string' ? parsed : parsed?.access_token;
      if (rawToken) {
        return verifyToken(rawToken);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * GET /api/tester/session
 * Returns current tester history, Sandbox access state, session state, and balance.
 */
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const hasAuthCredential = Boolean(
      req.headers.get('authorization')?.trim()
      || /(?:^|;)\s*sb-access-token=/.test(cookieHeader)
      || /(?:^|;)\s*sb-[a-z0-9]+-auth-token=/.test(cookieHeader),
    );
    const user = await getAuthenticatedUser(req);
    if (!user) {
      if (hasAuthCredential) return NextResponse.json({ error: 'Autentikasi tidak valid.' }, { status: 401 });
      return NextResponse.json({ authenticated: false, isTester: false, sandboxAccessState: null, isSandboxActive: false, sandboxBalance: 0 });
    }

    const hasSandboxCookie = cookieHeader.split(';').some((cookie) => cookie.trim().startsWith(`${SANDBOX_SESSION_COOKIE}=active`));
    const [profileRes, accessRes, walletRes, requestRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('is_tester, role').eq('id', user.id).maybeSingle(),
      supabaseAdmin.from('sandbox_access').select('state, last_meaningful_activity_at, changed_at').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('sandbox_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('sandbox_reactivation_requests').select('state').eq('user_id', user.id).eq('state', 'PENDING').maybeSingle(),
    ]);
    if (profileRes.error || accessRes.error || walletRes.error || requestRes.error) return NextResponse.json({ error: 'Tidak dapat memverifikasi status Sandbox.' }, { status: 503 });

    const role = (profileRes.data?.role || '').trim().toLowerCase();
    const isStaff = role === 'admin' || role === 'manager';
    let accessState = isStaff ? null : (accessRes.data?.state ?? null);
    let isOverdue = false;

    // Lazy auto-lock evaluation: check 7-day inactivity baseline for ACTIVE customers
    // NEVER refreshes activity timestamp; NEVER treats session polling as meaningful activity
    if (!isStaff && accessState === 'ACTIVE' && accessRes.data?.changed_at) {
      const changedAt = new Date(accessRes.data.changed_at).getTime();
      const lastActivityAt = accessRes.data.last_meaningful_activity_at
        ? new Date(accessRes.data.last_meaningful_activity_at).getTime()
        : null;
      const baseline = lastActivityAt ? Math.max(lastActivityAt, changedAt) : changedAt;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      if (Date.now() - baseline >= sevenDaysMs) {
        await lockSingleUserForInactivity(user.id);
        accessState = 'LOCKED';
        isOverdue = true;
      }
    }

    const hasActiveAccess = accessState === 'ACTIVE';
    const isSandboxActive = hasActiveAccess && hasSandboxCookie && !isOverdue;
    let sandboxBalance = hasActiveAccess ? Number(walletRes.data?.balance || 0) : 0;
    if (hasActiveAccess && !walletRes.data) sandboxBalance = (await ensureSandboxWallet(user.id)).balance;

    const response = NextResponse.json({
      authenticated: true,
      userId: user.id,
      isTester: !isStaff && profileRes.data?.is_tester === true,
      sandboxAccessState: accessState,
      sandboxReactivationState: requestRes.data?.state ?? null,
      isSandboxActive,
      sandboxBalance,
    });

    // If overdue, clear dapay_sandbox_session cookie immediately
    if (isOverdue && hasSandboxCookie) {
      response.cookies.set(SANDBOX_SESSION_COOKIE, '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/tester/session
 * Enables Sandbox session only for a verified customer with ACTIVE access.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });

    const [profileRes, accessRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabaseAdmin.from('sandbox_access').select('state, last_meaningful_activity_at, changed_at').eq('user_id', user.id).maybeSingle(),
    ]);
    if (profileRes.error || accessRes.error || !profileRes.data) return NextResponse.json({ error: 'Tidak dapat memverifikasi akses Sandbox.' }, { status: 503 });

    const role = (profileRes.data.role || '').trim().toLowerCase();
    if (role === 'admin' || role === 'manager') return NextResponse.json({ error: 'Akses Ditolak: Akun Admin/Manager menggunakan Sandbox Test Center.' }, { status: 403 });

    let accessState = accessRes.data?.state ?? null;
    if (accessState === 'ACTIVE' && accessRes.data?.changed_at) {
      const changedAt = new Date(accessRes.data.changed_at).getTime();
      const lastActivityAt = accessRes.data.last_meaningful_activity_at
        ? new Date(accessRes.data.last_meaningful_activity_at).getTime()
        : null;
      const baseline = lastActivityAt ? Math.max(lastActivityAt, changedAt) : changedAt;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      if (Date.now() - baseline >= sevenDaysMs) {
        await lockSingleUserForInactivity(user.id);
        accessState = 'LOCKED';
      }
    }

    if (accessState !== 'ACTIVE') return NextResponse.json({ error: 'Akses Sandbox tidak aktif.', code: 'SANDBOX_ACCESS_NOT_ACTIVE' }, { status: 403 });

    const walletRes = await ensureSandboxWallet(user.id);
    const response = NextResponse.json({ success: true, message: 'Mode Sandbox aktif untuk sesi ini (berlaku 1 jam).', sandboxBalance: walletRes.balance, sandboxAccessState: 'ACTIVE' });
    response.cookies.set(SANDBOX_SESSION_COOKIE, 'active', { httpOnly: true, path: '/', maxAge: 3600, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
/**
 * DELETE /api/tester/session
 * Instant Disarm: Deactivates Sandbox Session and returns immediately to LIVE.
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Mode Sandbox dinonaktifkan. Anda kembali ke Mode LIVE.'
  });

  response.cookies.set(SANDBOX_SESSION_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  return response;
}
