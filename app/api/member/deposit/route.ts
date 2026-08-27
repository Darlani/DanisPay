import { NextResponse } from "next/server";
import { isDepositPaymentAvailableNow } from "@/lib/deposits/payment-availability";
import { authenticateRequest } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const POSITIVE_INTEGER_PATTERN = /^(?:[1-9][0-9]*)$/;
const BIGINT_MAX = BigInt("9223372036854775807");
const DEFAULT_DEPOSIT_MINIMUM = BigInt(10000);
const DEPOSIT_METHOD_KEYS = new Set([
  "qris",
  "dana",
  "gopay",
  "ovo",
  "bni_manual",
  "bsi_manual",
]);

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function parseTrustedDepositMinimum(value: number | null) {
  // Preserve the legacy fallback when the setting is absent or zero, but never
  // convert an unsafe JavaScript number into an authoritative bigint value.
  if (value === null || value === 0) {
    return DEFAULT_DEPOSIT_MINIMUM;
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    return null;
  }

  return BigInt(value);
}

function parseMethodMinimum(value: number | null) {
  if (value === null || value === 0) {
    return BigInt(0);
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    return null;
  }

  return BigInt(value);
}

function normalizeAdminContact(value: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits || null;
}

export async function POST(request: Request) {
  const authentication = await authenticateRequest(request);

  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.message },
      { status: authentication.status },
    );
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", authentication.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Gagal memuat profil pengguna." },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 404 },
      );
    }

    if (typeof profile.email !== "string" || !profile.email.trim()) {
      return NextResponse.json(
        { error: "Profil pengguna tidak valid." },
        { status: 409 },
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

    const bodyRecord = body as Record<string, unknown>;
    const bodyKeys = Object.keys(bodyRecord);

    if (
      bodyKeys.some(
        (key) => key !== "amount" && key !== "paymentMethodKey",
      )
    ) {
      return badRequest("Body request mengandung field yang tidak diizinkan.");
    }

    const { amount, paymentMethodKey } = bodyRecord;

    if (typeof amount !== "string" || !POSITIVE_INTEGER_PATTERN.test(amount)) {
      return badRequest("Nominal deposit harus berupa bilangan bulat positif.");
    }

    let parsedAmount: bigint;

    try {
      parsedAmount = BigInt(amount);
    } catch {
      return badRequest("Nominal deposit tidak valid.");
    }

    if (parsedAmount <= BigInt(0) || parsedAmount > BIGINT_MAX) {
      return badRequest("Nominal deposit tidak valid.");
    }

    if (
      typeof paymentMethodKey !== "string" ||
      !/^[a-z][a-z0-9_]*$/.test(paymentMethodKey) ||
      !DEPOSIT_METHOD_KEYS.has(paymentMethodKey)
    ) {
      return badRequest("Metode pembayaran deposit tidak valid.");
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("store_settings")
      .select("is_maintenance, deposit_min, admin_contact")
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Gagal memuat pengaturan sistem." },
        { status: 500 },
      );
    }

    if (settings.is_maintenance) {
      return NextResponse.json(
        { error: "Sistem sedang pemeliharaan. Deposit dihentikan sementara." },
        { status: 503 },
      );
    }

    const minimumDeposit = parseTrustedDepositMinimum(settings.deposit_min);

    if (minimumDeposit === null) {
      return NextResponse.json(
        { error: "Pengaturan deposit tidak valid." },
        { status: 500 },
      );
    }

    if (parsedAmount < minimumDeposit) {
      return badRequest(`Minimal deposit adalah Rp${minimumDeposit.toString()}.`);
    }

    const { data: paymentMethod, error: paymentMethodError } =
      await supabaseAdmin
        .from("payment_accounts")
        .select(
          "method_key, name, account_name, account_no, logo_url, is_qr, is_maintenance, min_price, start_hour, end_hour",
        )
        .eq("method_key", paymentMethodKey)
        .maybeSingle();

    if (paymentMethodError) {
      return NextResponse.json(
        { error: "Gagal memuat metode pembayaran deposit." },
        { status: 500 },
      );
    }

    if (!paymentMethod) {
      return badRequest("Metode pembayaran deposit tidak tersedia.");
    }

    if (paymentMethodKey === "qris" && paymentMethod.is_qr !== true) {
      return NextResponse.json(
        { error: "Konfigurasi QRIS tidak valid." },
        { status: 409 },
      );
    }

    if (paymentMethod.is_maintenance === true) {
      return NextResponse.json(
        { error: "Metode pembayaran sedang dalam pemeliharaan." },
        { status: 409 },
      );
    }

    if (
      !isDepositPaymentAvailableNow(
        paymentMethod.start_hour,
        paymentMethod.end_hour,
      )
    ) {
      return NextResponse.json(
        { error: "Metode pembayaran tidak tersedia pada jam ini." },
        { status: 409 },
      );
    }

    const methodMinimum = parseMethodMinimum(paymentMethod.min_price);

    if (methodMinimum === null) {
      return NextResponse.json(
        { error: "Pengaturan metode pembayaran tidak valid." },
        { status: 500 },
      );
    }

    const effectiveMinimum =
      methodMinimum > minimumDeposit ? methodMinimum : minimumDeposit;

    if (parsedAmount < effectiveMinimum) {
      return badRequest(
        `Minimal deposit melalui metode ini adalah Rp${effectiveMinimum.toString()}.`,
      );
    }

    // Friendly pre-check only. The partial unique index is the final race-safe
    // enforcement when concurrent requests both observe no Pending row.
    const { data: existingDeposit, error: pendingCheckError } = await supabaseAdmin
      .from("deposits")
      .select("id")
      .eq("user_email", profile.email)
      .eq("status", "Pending")
      .maybeSingle();

    if (pendingCheckError) {
      return NextResponse.json(
        { error: "Gagal memeriksa permintaan deposit yang sedang diproses." },
        { status: 500 },
      );
    }

    if (existingDeposit) {
      return NextResponse.json(
        { error: "Anda masih memiliki permintaan deposit yang sedang diproses." },
        { status: 409 },
      );
    }

    const { data: deposit, error: depositError } = await supabaseAdmin.rpc(
      "create_deposit_with_unique_amount_atomic",
      {
        p_user_id: authentication.user.id,
        // PostgREST can cast this strict decimal string to bigint. Passing a
        // JavaScript bigint would make JSON serialization fail.
        p_amount: amount,
        p_payment_channel: paymentMethod.method_key,
      },
    );

    if (depositError) {
      if (depositError.message.includes("DEPOSIT_PENDING_EXISTS")) {
        return NextResponse.json(
          { error: "Anda masih memiliki permintaan deposit yang sedang diproses." },
          { status: 409 },
        );
      }

      if (depositError.message.includes("DEPOSIT_UNIQUE_CODE_UNAVAILABLE")) {
        return NextResponse.json(
          { error: "Nominal pembayaran unik sedang penuh. Silakan coba lagi." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "Gagal membuat permintaan deposit." },
        { status: 500 },
      );
    }

    const createdDeposit = Array.isArray(deposit) ? deposit[0] : deposit;

    if (
      !createdDeposit ||
      typeof createdDeposit.deposit_id !== "string" ||
      !Number.isSafeInteger(createdDeposit.unique_code) ||
      createdDeposit.unique_code < 1 ||
      (typeof createdDeposit.total_amount !== "string" &&
        typeof createdDeposit.total_amount !== "number")
    ) {
      return NextResponse.json(
        { error: "Respons pembuatan deposit tidak lengkap." },
        { status: 500 },
      );
    }

    const totalAmount = String(createdDeposit.total_amount);

    if (!POSITIVE_INTEGER_PATTERN.test(totalAmount)) {
      return NextResponse.json(
        { error: "Respons pembuatan deposit tidak valid." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Permintaan deposit berhasil dibuat.",
      depositId: createdDeposit.deposit_id,
      amount,
      uniqueCode: createdDeposit.unique_code,
      totalAmount,
      payment: {
        methodKey: paymentMethod.method_key,
        name: paymentMethod.name,
        accountName: paymentMethod.account_name,
        accountNo: paymentMethod.account_no,
        logoUrl: paymentMethod.logo_url,
        isQr: paymentMethod.is_qr === true,
      },
      adminContact: normalizeAdminContact(settings.admin_contact),
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses permintaan deposit." },
      { status: 500 },
    );
  }
}
