import { NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/utils/serverAuth';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authorization = await requireAdminOrManager(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  const { data: requests, error: requestsError } = await supabaseAdmin
    .from('sandbox_reactivation_requests')
    .select('id, user_id, state, requested_at')
    .eq('state', 'PENDING')
    .order('requested_at', { ascending: true });

  if (requestsError) return NextResponse.json({ error: 'Gagal memuat permintaan reaktivasi Sandbox.' }, { status: 500 });

  const userIds = [...new Set((requests ?? []).map((item) => item.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [], error: null };

  if (profilesError) return NextResponse.json({ error: 'Gagal memuat identitas pemohon Sandbox.' }, { status: 500 });

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return NextResponse.json({
    requests: (requests ?? []).map((item) => ({
      id: item.id,
      user_id: item.user_id,
      state: item.state,
      requested_at: item.requested_at,
      user: profileById.get(item.user_id) ?? { id: item.user_id, full_name: null, email: null },
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await requireAdminOrManager(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  const body = await request.json().catch(() => null) as { requestId?: unknown; decision?: unknown; rejectionReason?: unknown } | null;
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
  const decision = typeof body?.decision === 'string' ? body.decision.trim().toUpperCase() : '';
  const rejectionReason = typeof body?.rejectionReason === 'string' ? body.rejectionReason.trim() : null;
  if (!requestId || !['APPROVED', 'REJECTED'].includes(decision)) {
    return NextResponse.json({ error: 'Request ID dan keputusan tidak valid.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('decide_sandbox_reactivation', {
    p_request_id: requestId,
    p_decision: decision,
    p_reviewer_id: authorization.user.id,
    p_rejection_reason: rejectionReason,
  });
  if (error) return NextResponse.json({ error: 'Permintaan reaktivasi tidak dapat diproses.' }, { status: 400 });
  return NextResponse.json(data);
}
