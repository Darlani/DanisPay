import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status }
    );
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID diperlukan." }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null) as { is_tester?: unknown } | null;
    if (typeof body?.is_tester !== "boolean") {
      return NextResponse.json({ error: "Status tester tidak valid." }, { status: 400 });
    }

    const { data: transition, error: transitionError } = await supabaseAdmin.rpc("set_tester_persona_atomic", {
      p_user_id: userId,
      p_is_tester: body.is_tester,
      p_actor_user_id: authorization.user.id,
    });

    if (transitionError) {
      return NextResponse.json({ error: transitionError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        is_tester: transition?.is_tester,
        tester_since: transition?.tester_since,
        tester_updated_at: transition?.tester_updated_at,
      },
      access_state: transition?.access_state,
      message: body.is_tester
        ? "Akun berhasil diangkat sebagai Authorized Tester (Sandbox Access Granted)."
        : "Hak akses Authorized Tester dinonaktifkan.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

