import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const { userId } = await context.params;
  if (!UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: "ID member tidak valid." }, { status: 400 });
  }

  try {
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      throw targetError;
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
    }

    if (["manager", "admin"].includes(targetProfile.role?.toLowerCase() ?? "")) {
      return NextResponse.json(
        { error: "Data login hanya tersedia untuk member." },
        { status: 403 },
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      targetProfile.id,
    );

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Data login tidak tersedia." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      last_sign_in_at: authData.user.last_sign_in_at ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Data login tidak tersedia." },
      { status: 500 },
    );
  }
}
