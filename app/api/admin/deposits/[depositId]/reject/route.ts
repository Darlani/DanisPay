import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapRpcError(message: string) {
  switch (message) {
    case "DEPOSIT_REJECT_INVALID_INPUT":
      return NextResponse.json({ error: "ID deposit tidak valid." }, { status: 400 });
    case "DEPOSIT_REJECT_ACTOR_NOT_FOUND":
    case "DEPOSIT_REJECT_ACCESS_DENIED":
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk menolak deposit." },
        { status: 403 },
      );
    case "DEPOSIT_REJECT_NOT_FOUND":
      return NextResponse.json({ error: "Data deposit tidak ditemukan." }, { status: 404 });
    default:
      return NextResponse.json({ error: "Gagal menolak deposit." }, { status: 500 });
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
    return NextResponse.json({ error: "ID deposit tidak valid." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("reject_deposit_atomic", {
      p_deposit_id: depositId,
      p_actor_user_id: authorization.user.id,
    });

    if (error) return mapRpcError(error.message);
    if (data !== true) {
      return NextResponse.json({ error: "Deposit ini sudah diproses." }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menolak deposit." }, { status: 500 });
  }
}
