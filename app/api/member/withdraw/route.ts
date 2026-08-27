import { NextResponse } from "next/server";
import { authenticateRequest } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const SIGNED_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/;
const BIGINT_MAX = BigInt("9223372036854775807");

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function parseTrustedSetting(value: number | null, fallback: bigint) {
  if (value === null) {
    return fallback;
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    return null;
  }

  return BigInt(value);
}

function mapRpcError(message: string) {
  switch (message) {
    case "WITHDRAWAL_INVALID_USER":
    case "WITHDRAWAL_INVALID_INPUT":
    case "WITHDRAWAL_AMOUNT_OVERFLOW":
      return badRequest("Data penarikan tidak valid.");
    case "WITHDRAWAL_PROFILE_NOT_FOUND":
      return NextResponse.json({ error: "Profil pengguna tidak ditemukan." }, { status: 404 });
    case "WITHDRAWAL_PROFILE_INVALID":
      return NextResponse.json({ error: "Saldo pengguna tidak dapat diproses." }, { status: 409 });
    case "WITHDRAWAL_INSUFFICIENT_BALANCE":
      return NextResponse.json({ error: "Saldo tidak cukup." }, { status: 409 });
    case "WITHDRAWAL_PENDING_EXISTS":
      return NextResponse.json(
        { error: "Anda masih memiliki penarikan yang sedang diproses." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { error: "Gagal memproses penarikan." },
        { status: 500 },
      );
  }
}

export async function POST(request: Request) {
  const authentication = await authenticateRequest(request);

  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.message },
      { status: authentication.status },
    );
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

  const { amount, bankName, accountNumber, accountName } = body as Record<string, unknown>;

  if (typeof amount !== "string" || !SIGNED_INTEGER_PATTERN.test(amount)) {
    return badRequest("Nominal penarikan harus berupa bilangan bulat positif.");
  }

  let parsedAmount: bigint;

  try {
    parsedAmount = BigInt(amount);
  } catch {
    return badRequest("Nominal penarikan tidak valid.");
  }

  if (parsedAmount <= BigInt(0) || parsedAmount > BIGINT_MAX) {
    return badRequest("Nominal penarikan tidak valid.");
  }

  if (
    typeof bankName !== "string"
    || typeof accountNumber !== "string"
    || typeof accountName !== "string"
  ) {
    return badRequest("Data rekening tidak valid.");
  }

  const trimmedBankName = bankName.trim();
  const trimmedAccountNumber = accountNumber.trim();
  const trimmedAccountName = accountName.trim();

  if (!trimmedBankName || !trimmedAccountNumber || !trimmedAccountName) {
    return badRequest("Data rekening wajib diisi.");
  }

  try {
    const { data: maintenance, error: maintenanceError } = await supabaseAdmin
      .from("store_settings")
      .select("is_maintenance")
      .single();

    if (maintenanceError) {
      return NextResponse.json(
        { error: "Gagal memuat pengaturan sistem." },
        { status: 500 },
      );
    }

    if (maintenance?.is_maintenance) {
      return NextResponse.json(
        { error: "Sistem sedang pemeliharaan. Penarikan dihentikan sementara." },
        { status: 503 },
      );
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("store_settings")
      .select("withdraw_fee, withdraw_min")
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Gagal memuat pengaturan sistem." },
        { status: 500 },
      );
    }

    const adminFee = parseTrustedSetting(settings.withdraw_fee, BigInt(0));
    const minimumWithdrawal = parseTrustedSetting(settings.withdraw_min, BigInt(10000));

    if (adminFee === null || minimumWithdrawal === null) {
      return NextResponse.json(
        { error: "Pengaturan penarikan tidak valid." },
        { status: 500 },
      );
    }

    if (parsedAmount < minimumWithdrawal) {
      return badRequest(`Minimal penarikan adalah Rp${minimumWithdrawal.toString()}.`);
    }

    const { data: withdrawalId, error } = await supabaseAdmin.rpc(
      "create_withdrawal_atomic",
      {
        p_user_id: authentication.user.id,
        p_amount: amount,
        p_bank_name: trimmedBankName,
        p_account_number: trimmedAccountNumber,
        p_account_name: trimmedAccountName,
        p_admin_fee: adminFee.toString(),
      },
    );

    if (error) {
      return mapRpcError(error.message);
    }

    if (typeof withdrawalId !== "string") {
      return NextResponse.json({ error: "Gagal memproses penarikan." }, { status: 500 });
    }

    return NextResponse.json({ success: true, withdrawalId });
  } catch {
    return NextResponse.json({ error: "Gagal memproses penarikan." }, { status: 500 });
  }
}
