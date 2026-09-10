import { NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/utils/serverAuth';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const authorization = await requireAdminOrManager(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  const body = await request.json().catch(() => null) as { targetUserId?: unknown; state?: unknown; reason?: unknown } | null;
  const targetUserId = typeof body?.targetUserId === 'string' ? body.targetUserId.trim() : '';
  const state = typeof body?.state === 'string' ? body.state.trim().toUpperCase() : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;
  if (!targetUserId || !['ACTIVE', 'LOCKED', 'REVOKED'].includes(state)) {
    return NextResponse.json({ error: 'Target dan state Sandbox tidak valid.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('set_sandbox_access', {
    p_target_user_id: targetUserId,
    p_state: state,
    p_actor_user_id: authorization.user.id,
    p_reason: reason,
  });
  if (error) return NextResponse.json({ error: 'Status Sandbox tidak dapat diperbarui.' }, { status: 400 });
  return NextResponse.json(data);
}