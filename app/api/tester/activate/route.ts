import { NextResponse } from 'next/server';
import { authenticateRequest, isManagementRole } from '@/utils/serverAuth';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { SANDBOX_SESSION_COOKIE, ensureSandboxWallet } from '@/lib/auth/tester';
import {
  parseAnonymousId,
  parseAttributionCookie,
  recordSandboxFunnelEvent,
} from '@/lib/analytics/sandbox-telemetry';

export const dynamic = 'force-dynamic';

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

async function recordEligibilityEvaluation(
  userId: string,
  result: 'pass' | 'fail',
  category: string,
  cookieHeader: string,
) {
  try {
    const anonymousId = parseAnonymousId(getCookieValue(cookieHeader, 'dapay_anon_id'));
    const parsedAttr = parseAttributionCookie(cookieHeader);
    await recordSandboxFunnelEvent({
      userId,
      anonymousId,
      eventName: 'sandbox_eligibility_evaluated',
      source: parsedAttr?.src || 'direct',
      medium: parsedAttr?.med || 'none',
      campaign: parsedAttr?.camp || 'none',
      metadata: {
        result,
        category,
      },
    });
  } catch {
    // Telemetry failure must never disrupt activation flow
  }
}

async function recordActivationSuccess(
  userId: string,
  cookieHeader: string,
) {
  try {
    const anonymousId = parseAnonymousId(getCookieValue(cookieHeader, 'dapay_anon_id'));
    const parsedAttr = parseAttributionCookie(cookieHeader);
    await recordSandboxFunnelEvent({
      userId,
      anonymousId,
      eventName: 'sandbox_activation_success',
      source: parsedAttr?.src || 'direct',
      medium: parsedAttr?.med || 'none',
      campaign: parsedAttr?.camp || 'none',
      metadata: {
        result: 'pass',
      },
    });
  } catch {
    // Telemetry failure must never disrupt activation flow
  }
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';

  // 1. Validate request payload: empty or {} only; reject client-supplied identity fields
  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawBody);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        return NextResponse.json(
          { error: 'Format permintaan tidak valid.', code: 'INVALID_REQUEST' },
          { status: 400 },
        );
      }
      if ('userId' in parsed || 'user_id' in parsed || 'id' in parsed || 'email' in parsed) {
        return NextResponse.json(
          { error: 'Permintaan tidak boleh memuat data identitas pengguna.', code: 'FORBIDDEN_PAYLOAD_FIELDS' },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Format JSON tidak valid.', code: 'INVALID_JSON' },
        { status: 400 },
      );
    }
  }

  // 2. Authenticate user via Supabase Bearer token
  const authentication = await authenticateRequest(request);
  if (!authentication.ok) {
    return NextResponse.json(
      { error: 'Autentikasi diperlukan.', code: 'UNAUTHENTICATED' },
      { status: 401 },
    );
  }

  const user = authentication.user;

  // 3. Load authoritative profile using verified user.id
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, lockout_until')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await recordEligibilityEvaluation(user.id, 'fail', 'other', cookieHeader);
    return NextResponse.json(
      { error: 'Profil pengguna tidak ditemukan.', code: 'USER_NOT_FOUND' },
      { status: 404 },
    );
  }

  // 4. Reject management persona (admin/manager must use Admin Test Center)
  if (isManagementRole(profile.role)) {
    await recordEligibilityEvaluation(user.id, 'fail', 'management_persona', cookieHeader);
    return NextResponse.json(
      { error: 'Akun Admin/Manager tidak dapat mengakses Sandbox Pelanggan.', code: 'MANAGEMENT_PERSONA_NOT_ELIGIBLE' },
      { status: 403 },
    );
  }

  // 5. Reject active account ban
  const isBanned = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());
  if (isBanned) {
    await recordEligibilityEvaluation(user.id, 'fail', 'blocked', cookieHeader);
    return NextResponse.json(
      { error: 'Akun Anda sedang ditangguhkan atau diblokir.', code: 'ACCOUNT_BLOCKED' },
      { status: 403 },
    );
  }

  // 6. Reject active profile lockout
  const isLockedOut = Boolean(profile.lockout_until && new Date(profile.lockout_until).getTime() > Date.now());
  if (isLockedOut) {
    await recordEligibilityEvaluation(user.id, 'fail', 'blocked', cookieHeader);
    return NextResponse.json(
      { error: 'Akun Anda sedang ditangguhkan atau diblokir.', code: 'ACCOUNT_BLOCKED' },
      { status: 403 },
    );
  }

  // 7. Require verified email
  const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (!isEmailVerified) {
    await recordEligibilityEvaluation(user.id, 'fail', 'email_unverified', cookieHeader);
    return NextResponse.json(
      { error: 'Email belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu.', code: 'EMAIL_NOT_VERIFIED' },
      { status: 403 },
    );
  }

  // 8. Atomic database activation (NONE -> ACTIVE, idempotent for ACTIVE, rejects LOCKED/REVOKED)
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('activate_sandbox_self_service', {
    p_user_id: user.id,
  });

  if (rpcError) {
    if (rpcError.message.includes('SANDBOX_ACTIVATION_ACCESS_LOCKED_OR_REVOKED')) {
      await recordEligibilityEvaluation(user.id, 'fail', 'blocked', cookieHeader);
      return NextResponse.json(
        {
          error: 'Akses Sandbox terkunci atau telah dicabut. Silakan ajukan permohonan melalui menu Bantuan.',
          code: 'SANDBOX_ACCESS_LOCKED_OR_REVOKED',
        },
        { status: 403 },
      );
    }

    if (rpcError.message.includes('MANAGEMENT_PERSONA_NOT_ELIGIBLE')) {
      await recordEligibilityEvaluation(user.id, 'fail', 'management_persona', cookieHeader);
      return NextResponse.json(
        { error: 'Akun Admin/Manager tidak dapat mengakses Sandbox Pelanggan.', code: 'MANAGEMENT_PERSONA_NOT_ELIGIBLE' },
        { status: 403 },
      );
    }

    await recordEligibilityEvaluation(user.id, 'fail', 'other', cookieHeader);
    return NextResponse.json(
      { error: 'Tidak dapat mengaktifkan Sandbox saat ini.', code: 'ACTIVATION_FAILED' },
      { status: 500 },
    );
  }

  // ponytail: in-memory / KV rate limiter deferred to subsequent anti-abuse layer. Add when rate-limit infra approved.
  const alreadyActive = (rpcData as { no_op?: boolean } | null)?.no_op === true;

  // Record eligibility pass
  await recordEligibilityEvaluation(
    user.id,
    'pass',
    alreadyActive ? 'already_active' : 'eligible',
    cookieHeader,
  );

  // 9. Record activation success ONLY if this was a fresh activation (not already active)
  if (!alreadyActive) {
    await recordActivationSuccess(user.id, cookieHeader);
  }

  // 10. Bootstrap virtual sandbox wallet (idempotent 1,000,000 grant)
  await ensureSandboxWallet(user.id);

  // 11. Set canonical sandbox session cookie (1 hour)
  const response = NextResponse.json({
    success: true,
    accessState: 'ACTIVE',
    isSandboxActive: true,
    alreadyActive,
  });

  response.cookies.set(SANDBOX_SESSION_COOKIE, 'active', {
    httpOnly: true,
    path: '/',
    maxAge: 3600,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
