import { NextResponse } from 'next/server';
import { autoLockInactiveSandboxUsers } from '@/lib/auth/tester';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Akses Ditolak!' }, { status: 401 });
  }

  try {
    const result = await autoLockInactiveSandboxUsers();
    return NextResponse.json({
      success: true,
      lockedCount: result.lockedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menjalankan auto-lock cron.';
    console.error('❌ [CRON_SANDBOX_AUTOLOCK] Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
