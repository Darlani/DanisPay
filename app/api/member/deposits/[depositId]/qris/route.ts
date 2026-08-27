import { NextResponse } from "next/server";
import { generateQrisWithFallback } from "@/lib/qris/qris-generator";
import type { QrisProvider } from "@/lib/qris/qris-config";
import { authenticateRequest } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QRIS_METHOD_KEY = "qris";
const QRIS_PROVIDERS = new Set<QrisProvider>([
  "dana_dynamic",
  "dana_static",
  "gopay_static",
]);

function parseSafeDepositAmount(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) {
      return null;
    }

    return value;
  }

  if (typeof value !== "string" || !/^(?:[1-9][0-9]*)$/.test(value)) {
    return null;
  }

  const amount = BigInt(value);

  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }

  return Number(amount);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ depositId: string }> },
) {
  const authentication = await authenticateRequest(request);

  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.message },
      { status: authentication.status },
    );
  }

  const { depositId } = await context.params;

  if (!UUID_PATTERN.test(depositId)) {
    return NextResponse.json({ error: "ID deposit tidak valid." }, { status: 400 });
  }

  try {
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from("deposits")
      .select("id, payment_channel, status, total_amount")
      .eq("id", depositId)
      .eq("user_id", authentication.user.id)
      .maybeSingle();

    if (depositError) {
      return NextResponse.json(
        { error: "Gagal memuat deposit." },
        { status: 500 },
      );
    }

    if (!deposit) {
      return NextResponse.json({ error: "Deposit tidak ditemukan." }, { status: 404 });
    }

    if (deposit.status !== "Pending") {
      return NextResponse.json(
        { error: "QRIS hanya tersedia untuk deposit yang sedang diproses." },
        { status: 409 },
      );
    }

    const { data: qrisMethod, error: methodError } = await supabaseAdmin
      .from("payment_accounts")
      .select("is_qr")
      .eq("method_key", QRIS_METHOD_KEY)
      .maybeSingle();

    if (methodError || !qrisMethod || qrisMethod.is_qr !== true) {
      return NextResponse.json(
        { error: "Konfigurasi QRIS tidak tersedia." },
        { status: 409 },
      );
    }

    if (deposit.payment_channel !== QRIS_METHOD_KEY) {
      return NextResponse.json(
        { error: "Deposit ini bukan deposit QRIS." },
        { status: 409 },
      );
    }

    // Legacy deposits were created before total_amount existed and cannot be
    // turned into a QRIS request safely because their exact payable total is
    // unknown.
    if (deposit.total_amount === null || deposit.total_amount === undefined) {
      return NextResponse.json(
        { error: "Deposit lama tidak memiliki nominal pembayaran unik." },
        { status: 409 },
      );
    }

    // The existing QRIS generator accepts Number. Reject instead of rounding
    // any bigint value outside the exact-safe JavaScript integer range.
    const amount = parseSafeDepositAmount(deposit.total_amount);

    if (amount === null) {
      return NextResponse.json(
        { error: "Nominal deposit tidak dapat diproses oleh QRIS." },
        { status: 409 },
      );
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("qris_settings")
      .select("active_provider")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Konfigurasi QRIS tidak tersedia." },
        { status: 500 },
      );
    }

    if (!QRIS_PROVIDERS.has(settings.active_provider as QrisProvider)) {
      return NextResponse.json(
        { error: "Konfigurasi QRIS tidak valid." },
        { status: 500 },
      );
    }

    const generated = generateQrisWithFallback(
      settings.active_provider as QrisProvider,
      amount,
    );

    return NextResponse.json({
      success: true,
      depositId: deposit.id,
      amount: amount.toString(),
      qrisString: generated.qrisString,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat QRIS deposit." },
      { status: 500 },
    );
  }
}
