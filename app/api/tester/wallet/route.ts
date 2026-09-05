import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { ensureSandboxWallet } from '@/lib/auth/tester';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) return user;
  }

  const cookieStore = req.headers.get('cookie') || '';

  const sbAccessTokenMatch = cookieStore.match(/sb-access-token=([^;]+)/i);
  if (sbAccessTokenMatch?.[1]) {
    try {
      const raw = decodeURIComponent(sbAccessTokenMatch[1]).trim();
      const { data: { user } } = await supabaseAdmin.auth.getUser(raw);
      if (user) return user;
    } catch {
      // ignore
    }
  }

  const tokenMatch = cookieStore.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i);
  if (tokenMatch && tokenMatch[1]) {
    try {
      const decoded = decodeURIComponent(tokenMatch[1]);
      let parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && parsed[0]) parsed = parsed[0];
      const rawToken = typeof parsed === 'string' ? parsed : parsed?.access_token;
      if (rawToken) {
        const { data: { user } } = await supabaseAdmin.auth.getUser(rawToken);
        if (user) return user;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * GET /api/tester/wallet
 * Returns current sandbox wallet balance and latest mutation history from sandbox_balance_logs.
 * Restricted to Authorized Testers (profiles.is_tester = true or admin).
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_tester, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_tester !== true && profile?.role !== 'admin' && profile?.role !== 'manager') {
      return NextResponse.json(
        { error: 'Akses Ditolak: Fitur ini hanya untuk Authorized Tester.' },
        { status: 403 }
      );
    }

    // Ensure wallet exists
    const walletRes = await ensureSandboxWallet(user.id);

    // Fetch latest 50 logs from sandbox_balance_logs
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('sandbox_balance_logs')
      .select('id, created_at, type, description, amount, initial_balance, final_balance')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsErr) {
      return NextResponse.json({ error: logsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      balance: walletRes.balance,
      logs: logs || []
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

