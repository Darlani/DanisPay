import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NON_NEGATIVE_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/;
const BIGINT_MAX = BigInt("9223372036854775807");

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function mapRpcError(message: string) {
  switch (message) {
    case "WITHDRAWAL_INVALID_INPUT":
    case "WITHDRAWAL_INVALID_FEE":
    case "WITHDRAWAL_INVALID_DATA":
    case "WITHDRAWAL_FEE_OVERFLOW":
      return badRequest("Data persetujuan penarikan tidak valid.");
    case "WITHDRAWAL_ACTOR_NOT_FOUND":
    case "WITHDRAWAL_ACCESS_DENIED":
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk menyetujui penarikan." },
        { status: 403 },
      );
    case "WITHDRAWAL_NOT_FOUND":
    case "WITHDRAWAL_PROFILE_NOT_FOUND":
      return NextResponse.json(
        { error: "Data penarikan atau pengguna tidak ditemukan." },
        { status: 404 },
      );
    case "WITHDRAWAL_ALREADY_PROCESSED":
    case "WITHDRAWAL_FEE_EXCEEDS_HELD":
    case "WITHDRAWAL_PROFILE_INVALID":
    case "WITHDRAWAL_BALANCE_OVERFLOW":
      return NextResponse.json(
        { error: "Penarikan tidak dapat diproses dalam status saat ini." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { error: "Gagal menyetujui penarikan." },
        { status: 500 },
      );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ withdrawalId: string }> },
) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const { withdrawalId } = await params;

  if (!UUID_PATTERN.test(withdrawalId)) {
    return badRequest("ID penarikan tidak valid.");
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

  const { finalFee } = body as Record<string, unknown>;

  if (typeof finalFee !== "string" || !NON_NEGATIVE_INTEGER_PATTERN.test(finalFee)) {
    return badRequest("Biaya admin harus berupa bilangan bulat tidak negatif.");
  }

  let parsedFinalFee: bigint;

  try {
    parsedFinalFee = BigInt(finalFee);
  } catch {
    return badRequest("Biaya admin tidak valid.");
  }

  if (parsedFinalFee > BIGINT_MAX) {
    return badRequest("Biaya admin berada di luar batas yang didukung.");
  }

  try {
    const { error } = await supabaseAdmin.rpc("approve_withdraw_v5", {
      p_withdrawal_id: withdrawalId,
      // PostgREST can cast this strict decimal string to bigint. Passing a
      // JavaScript bigint would make JSON serialization fail.
      p_final_fee: finalFee,
      p_actor_user_id: authorization.user.id,
    });

    if (error) {
      return mapRpcError(error.message);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyetujui penarikan." },
      { status: 500 },
    );
  }
}
