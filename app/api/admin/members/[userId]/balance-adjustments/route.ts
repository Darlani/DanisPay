import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED_INTEGER_PATTERN = /^-?(?:0|[1-9][0-9]*)$/;
const BIGINT_MAX = BigInt("9223372036854775807");
const BIGINT_MIN = BigInt("-9223372036854775808");

type RouteContext = { params: Promise<{ userId: string }> };

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function mapRpcError(message: string) {
  switch (message) {
    case "ADJUSTMENT_INVALID_USER":
    case "ADJUSTMENT_INVALID_DELTA":
    case "ADJUSTMENT_INVALID_REASON":
    case "ADJUSTMENT_BALANCE_OVERFLOW":
      return badRequest("Permintaan penyesuaian saldo tidak valid.");
    case "ADJUSTMENT_TARGET_NOT_FOUND":
      return NextResponse.json({ error: "Target pengguna tidak ditemukan." }, { status: 404 });
    case "ADJUSTMENT_TARGET_BALANCE_INVALID":
      return NextResponse.json({ error: "Saldo target tidak dapat diproses." }, { status: 409 });
    case "ADJUSTMENT_INSUFFICIENT_BALANCE":
      return NextResponse.json({ error: "Penyesuaian akan membuat saldo menjadi negatif." }, { status: 409 });
    case "ADJUSTMENT_ACTOR_NOT_FOUND":
      return NextResponse.json({ error: "Identitas admin tidak dapat diproses." }, { status: 403 });
    default:
      return NextResponse.json(
        { error: "Gagal memproses penyesuaian saldo." },
        { status: 500 },
      );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const { userId: targetUserId } = await context.params;

  if (!UUID_PATTERN.test(targetUserId)) {
    return badRequest("Target pengguna tidak valid.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Body request harus berupa JSON yang valid.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Body request tidak valid.");
  }

  const { delta, reason } = body as Record<string, unknown>;

  if (typeof delta !== "string" || !SIGNED_INTEGER_PATTERN.test(delta)) {
    return badRequest("Nominal penyesuaian harus berupa bilangan bulat.");
  }

  let parsedDelta: bigint;

  try {
    parsedDelta = BigInt(delta);
  } catch {
    return badRequest("Nominal penyesuaian tidak valid.");
  }

  if (parsedDelta === BigInt(0)) {
    return badRequest("Nominal penyesuaian tidak boleh nol.");
  }

  if (parsedDelta > BIGINT_MAX || parsedDelta < BIGINT_MIN) {
    return badRequest("Nominal penyesuaian berada di luar batas yang didukung.");
  }

  if (typeof reason !== "string") {
    return badRequest("Alasan penyesuaian wajib diisi.");
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return badRequest("Alasan penyesuaian wajib diisi.");
  }

  try {
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { error: "Gagal memproses penyesuaian saldo." },
        { status: 500 },
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: "Target pengguna tidak ditemukan." },
        { status: 404 },
      );
    }

    if (["manager", "admin"].includes(targetProfile.role?.toLowerCase() ?? "")) {
      return NextResponse.json(
        { error: "Saldo akun staff tidak dapat disesuaikan." },
        { status: 403 },
      );
    }

    const { data: balanceLogId, error } = await supabaseAdmin.rpc(
      "adjust_profile_balance_atomic",
      {
        p_target_user_id: targetUserId,
        // PostgREST can cast this strict decimal string to bigint. Passing a
        // JavaScript bigint would make JSON serialization fail.
        p_delta: delta,
        p_reason: trimmedReason,
        p_actor_user_id: authorization.user.id,
      },
    );

    if (error) {
      return mapRpcError(error.message);
    }

    if (typeof balanceLogId !== "string") {
      return NextResponse.json(
        { error: "Gagal memproses penyesuaian saldo." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, balanceLogId });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses penyesuaian saldo." },
      { status: 500 },
    );
  }
}
