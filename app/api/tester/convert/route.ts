import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/utils/serverAuth';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authentication = await authenticateRequest(request);
  if (!authentication.ok) return NextResponse.json({ error: authentication.message }, { status: authentication.status });

  const { data, error } = await supabaseAdmin.rpc('convert_tester_to_member', {
    p_user_id: authentication.user.id,
    p_actor_type: 'self_service',
    p_actor_user_id: authentication.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}