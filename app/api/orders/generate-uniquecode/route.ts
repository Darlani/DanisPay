import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const POSITIVE_INTEGER = /^(?:[1-9][0-9]*)$/;
const RESERVATION_LIFETIME_MS = 5 * 60 * 1000;

function parseBasePrice(value: unknown): bigint | null {
  if (typeof value !== "string" || !POSITIVE_INTEGER.test(value)) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function normalizeTotal(value: unknown): string | null {
  if (typeof value === "string" && POSITIVE_INTEGER.test(value)) {
    return value;
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
    }

    const bodyRecord = body as Record<string, unknown>;

    if (Object.keys(bodyRecord).some((key) => key !== "basePrice")) {
      return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
    }

    const { basePrice } = bodyRecord;
    const baseAmount = parseBasePrice(basePrice);

    if (baseAmount === null) {
      return NextResponse.json(
        { error: "Nominal pembayaran harus berupa bilangan bulat positif." },
        { status: 400 },
      );
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + RESERVATION_LIFETIME_MS).toISOString();

    const { error: cleanupError } = await supabaseAdmin
      .from("code_reservations")
      .delete()
      .lt("expired_at", now.toISOString());

    if (cleanupError) {
      throw cleanupError;
    }

    const [ordersCount, depositsCount, pendingOrders, pendingDeposits, reservations] =
      await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "Pending"),
        supabaseAdmin
          .from("deposits")
          .select("id", { count: "exact", head: true })
          .eq("status", "Pending"),
        supabaseAdmin.from("orders").select("total_amount").eq("status", "Pending"),
        supabaseAdmin.from("deposits").select("total_amount").eq("status", "Pending"),
        supabaseAdmin.from("code_reservations").select("total_amount"),
      ]);

    const queryError = [
      ordersCount.error,
      depositsCount.error,
      pendingOrders.error,
      pendingDeposits.error,
      reservations.error,
    ].find(Boolean);

    if (queryError) {
      throw queryError;
    }

    const lockedTotals = new Set(
      [
        ...(pendingOrders.data ?? []).map((row) => normalizeTotal(row.total_amount)),
        ...(pendingDeposits.data ?? []).map((row) => normalizeTotal(row.total_amount)),
        ...(reservations.data ?? []).map((row) => normalizeTotal(row.total_amount)),
      ].filter((value): value is string => value !== null),
    );

    const totalPending = (ordersCount.count ?? 0) + (depositsCount.count ?? 0);
    let rangeMax = 100;
    if (totalPending > 350) rangeMax = 999;
    else if (totalPending > 170) rangeMax = 500;
    else if (totalPending > 70) rangeMax = 200;

    const reserve = async (candidate: number) => {
      const totalAmount = (baseAmount + BigInt(candidate)).toString();

      if (lockedTotals.has(totalAmount)) {
        return null;
      }

      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("code_reservations")
        .insert({ total_amount: totalAmount, expired_at: expiry })
        .select("id")
        .single();

      if (reservationError) {
        if (reservationError.code === "23505") {
          return null;
        }
        throw reservationError;
      }

      const [orderCollision, depositCollision] = await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("id")
          .eq("status", "Pending")
          .eq("total_amount", totalAmount)
          .maybeSingle(),
        supabaseAdmin
          .from("deposits")
          .select("id")
          .eq("status", "Pending")
          .eq("total_amount", totalAmount)
          .maybeSingle(),
      ]);

      if (orderCollision.error || depositCollision.error) {
        await supabaseAdmin.from("code_reservations").delete().eq("id", reservation.id);
        throw orderCollision.error ?? depositCollision.error;
      }

      if (orderCollision.data || depositCollision.data) {
        await supabaseAdmin.from("code_reservations").delete().eq("id", reservation.id);
        lockedTotals.add(totalAmount);
        return null;
      }

      return { reservationId: reservation.id, uniqueCode: candidate, totalAmount };
    };

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const candidateRange = attempt === 5 ? 500 : rangeMax;
      const reserved = await reserve(Math.floor(Math.random() * candidateRange) + 1);
      if (reserved) {
        return NextResponse.json({ success: true, ...reserved });
      }
    }

    for (let candidate = 1; candidate <= 2000; candidate += 1) {
      const reserved = await reserve(candidate);
      if (reserved) {
        return NextResponse.json({ success: true, ...reserved });
      }
    }

    return NextResponse.json(
      { error: "Kode unik pembayaran sedang penuh. Silakan coba lagi." },
      { status: 409 },
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal menyiapkan nominal pembayaran unik." },
      { status: 500 },
    );
  }
}
