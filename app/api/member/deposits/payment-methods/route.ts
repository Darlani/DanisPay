import { NextResponse } from "next/server";
import { isDepositPaymentAvailableNow } from "@/lib/deposits/payment-availability";
import { authenticateRequest } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const DEPOSIT_METHOD_KEYS = new Set([
  "qris",
  "dana",
  "gopay",
  "ovo",
  "bni_manual",
  "bsi_manual",
]);

function toMinimumString(value: unknown) {
  if (value === null || value === 0) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return BigInt(value).toString();
}

export async function GET(request: Request) {
  const authentication = await authenticateRequest(request);

  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.message },
      { status: authentication.status },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("payment_accounts")
      .select(
        "method_key, name, account_name, account_no, logo_url, is_qr, is_maintenance, min_price, start_hour, end_hour",
      );

    if (error) {
      return NextResponse.json(
        { error: "Gagal memuat metode deposit." },
        { status: 500 },
      );
    }

    const methods = (data ?? []).flatMap((method) => {
      if (typeof method.method_key !== "string") {
        return [];
      }

      const methodKey = method.method_key.trim().toLowerCase();

      if (
        !methodKey ||
        !DEPOSIT_METHOD_KEYS.has(methodKey) ||
        method.is_maintenance === true ||
        (methodKey === "qris" && method.is_qr !== true) ||
        !isDepositPaymentAvailableNow(method.start_hour, method.end_hour)
      ) {
        return [];
      }

      return [{
        methodKey,
        name: method.name,
        accountName: method.account_name,
        accountNo: method.account_no,
        logoUrl: method.logo_url,
        isQr: method.is_qr === true,
        minPrice: toMinimumString(method.min_price),
      }];
    });

    return NextResponse.json({ success: true, methods });
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat metode deposit." },
      { status: 500 },
    );
  }
}
