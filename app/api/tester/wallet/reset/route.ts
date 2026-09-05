import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) return user;
  }

  const cookieStore = req.headers.get('cookie') || '';

  // 1. Check sb-access-token cookie
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

  // 2. Check sb-*-auth-token cookie
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
 * POST /api/tester/wallet/reset
 * Resets or reseeds tester sandbox wallet balance.
 * Non-destructive: Logs the adjustment into sandbox_balance_logs without deleting history.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_tester, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_tester !== true && profile?.role !== 'admin' && profile?.role !== 'manager') {
      return NextResponse.json(
        { error: 'Akses Ditolak: Hanya tester resmi yang dapat mereset dompet sandbox.' },
        { status: 403 }
      );
    }

    let targetUserId = user.id;
    let targetAmount = 1000000; // Default reset target Rp 1.000.000

    try {
      const body = await req.json();
      if (body.targetAmount && typeof body.targetAmount === 'number' && body.targetAmount > 0) {
        targetAmount = body.targetAmount;
      }
      // If admin wishes to reset another tester's wallet
      if (body.targetUserId && profile?.role === 'admin') {
        targetUserId = body.targetUserId;
      }
    } catch {
      // no body, use default
    }

    // 1. Get current balance
    const { data: currentWallet } = await supabaseAdmin
      .from('sandbox_wallets')
      .select('balance')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const oldBalance = Number(currentWallet?.balance || 0);
    const diff = targetAmount - oldBalance;

    // 2. Update sandbox wallet
    const { data: updatedWallet, error: updateErr } = await supabaseAdmin
      .from('sandbox_wallets')
      .upsert({
        user_id: targetUserId,
        balance: targetAmount,
        updated_at: new Date().toISOString()
      })
      .select('balance')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Append adjustment log (non-destructive)
    await supabaseAdmin
      .from('sandbox_balance_logs')
      .insert({
        user_id: targetUserId,
        user_email: user.email,
        amount: diff,
        type: 'AdminAdjustment',
        description: `Penyesuaian/Reset saldo virtual tester ke Rp ${targetAmount.toLocaleString('id-ID')}`,
        initial_balance: oldBalance,
        final_balance: targetAmount
      });

    return NextResponse.json({
      success: true,
      message: `Saldo sandbox berhasil disetel ke Rp ${targetAmount.toLocaleString('id-ID')}`,
      balance: updatedWallet.balance
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

