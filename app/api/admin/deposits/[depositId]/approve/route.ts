import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapRpcError(message: string) {
  switch (message) {
    case "DEPOSIT_INVALID_INPUT":
    case "DEPOSIT_INVALID_DATA":
      return NextResponse.json(
        { error: "Data deposit tidak valid." },
        { status: 400 },
      );
    case "DEPOSIT_ACTOR_NOT_FOUND":
    case "DEPOSIT_ACCESS_DENIED":
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk menyetujui deposit." },
        { status: 403 },
      );
    case "DEPOSIT_NOT_FOUND":
    case "DEPOSIT_PROFILE_NOT_FOUND":
      return NextResponse.json(
        { error: "Data deposit atau pengguna tidak ditemukan." },
        { status: 404 },
      );
    case "DEPOSIT_ALREADY_PROCESSED":
      return NextResponse.json(
        { error: "Deposit ini sudah diproses." },
        { status: 409 },
      );
    case "DEPOSIT_PROFILE_INVALID":
    case "DEPOSIT_BALANCE_OVERFLOW":
      return NextResponse.json(
        { error: "Saldo pengguna tidak dapat diproses." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { error: "Gagal menyetujui deposit." },
        { status: 500 },
      );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ depositId: string }> },
) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const { depositId } = await params;

  if (!UUID_PATTERN.test(depositId)) {
    return NextResponse.json(
      { error: "ID deposit tidak valid." },
      { status: 400 },
    );
  }

  try {
    const { error } = await supabaseAdmin.rpc("approve_deposit_v5", {
      p_deposit_id: depositId,
      p_actor_user_id: authorization.user.id,
    });

    if (error) {
      return mapRpcError(error.message);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyetujui deposit." },
      { status: 500 },
    );
  }
}
