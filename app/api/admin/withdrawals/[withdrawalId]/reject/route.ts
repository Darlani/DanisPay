import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapRpcError(message: string) {
  switch (message) {
    case "WITHDRAWAL_INVALID_INPUT":
    case "WITHDRAWAL_INVALID_DATA":
      return NextResponse.json(
        { error: "Data penarikan tidak valid." },
        { status: 400 },
      );
    case "WITHDRAWAL_ACTOR_NOT_FOUND":
    case "WITHDRAWAL_ACCESS_DENIED":
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk menolak penarikan." },
        { status: 403 },
      );
    case "WITHDRAWAL_NOT_FOUND":
    case "WITHDRAWAL_PROFILE_NOT_FOUND":
      return NextResponse.json(
        { error: "Data penarikan atau pengguna tidak ditemukan." },
        { status: 404 },
      );
    case "WITHDRAWAL_ALREADY_PROCESSED":
    case "WITHDRAWAL_PROFILE_INVALID":
    case "WITHDRAWAL_BALANCE_OVERFLOW":
      return NextResponse.json(
        { error: "Penarikan tidak dapat diproses dalam status saat ini." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { error: "Gagal menolak penarikan." },
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
    return NextResponse.json(
      { error: "ID penarikan tidak valid." },
      { status: 400 },
    );
  }

  try {
    const { error } = await supabaseAdmin.rpc("reject_withdraw_v5", {
      p_withdrawal_id: withdrawalId,
      p_actor_user_id: authorization.user.id,
    });

    if (error) {
      return mapRpcError(error.message);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menolak penarikan." },
      { status: 500 },
    );
  }
}
