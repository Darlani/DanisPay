import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function isPositiveInteger(value: unknown) {
  return (
    (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === "string" && /^(?:[1-9][0-9]*)$/.test(value))
  );
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const expiry = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: candidates, error } = await supabaseAdmin
      .from("orders")
      .select("id, used_balance, total_amount")
      .eq("status", "Pending")
      .lt("created_at", expiry);

    if (error) {
      throw error;
    }

    let cleanedCount = 0;

    for (const candidate of candidates ?? []) {
      const isMixed =
        isPositiveInteger(candidate.used_balance) && isPositiveInteger(candidate.total_amount);

      if (isMixed) {
        const { data: refunded, error: refundError } = await supabaseAdmin.rpc(
          "refund_expired_mixed_order_atomic",
          { p_order_id: candidate.id },
        );

        if (refundError) {
          throw refundError;
        }

        // false is a normal no-op when another resolver/cleanup already won.
        if (refunded === true) {
          cleanedCount += 1;
        }
        continue;
      }

      // External-only expiry has no wallet principal to refund. Conditional
      // update makes the candidate query non-authoritative and race-safe.
      const { data: expiredOrder, error: expireError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "Gagal",
          updated_at: new Date().toISOString(),
          notes: "Batal Otomatis: Batas waktu pembayaran habis (Tidak ada dana masuk dalam 2 jam).",
        })
        .eq("id", candidate.id)
        .eq("status", "Pending")
        .select("id")
        .maybeSingle();

      if (expireError) {
        throw expireError;
      }

      if (expiredOrder) {
        cleanedCount += 1;
      }
    }

    return NextResponse.json({ success: true, cleaned_count: cleanedCount });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal membersihkan order kedaluwarsa." }, { status: 500 });
  }
}
