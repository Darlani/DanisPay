import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const INTEGER_RUPIAH = /Rp\s*((?:[1-9]\d{0,2}(?:\.\d{3})+)|(?:[1-9]\d*))(?=$|\s|[)\]!?;:])/gi;
const BIGINT_MAX = BigInt("9223372036854775807");

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
  }).catch(() => undefined);
}

function parseReceivedAmount(content: string): bigint | null {
  const matches = [...content.matchAll(INTEGER_RUPIAH)];
  const currencyTokenCount = content.match(/Rp/gi)?.length ?? 0;
  if (currencyTokenCount !== 1 || matches.length !== 1) return null;

  const normalized = matches[0][1].replace(/\./g, "");
  try {
    const amount = BigInt(normalized);
    return amount > BigInt(0) && amount <= BIGINT_MAX ? amount : null;
  } catch {
    return null;
  }
}

function detectBrand(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes("qris")) return "qris";
  if (lower.includes("gopay") || lower.includes("gojek")) return "gopay";
  if (lower.includes("dana")) return "dana";
  if (lower.includes("ovo")) return "ovo";
  return "unknown";
}

export async function POST(request: Request) {
  let body: { secret?: unknown; content?: unknown; isNotifyOnly?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  if (
    typeof body.secret !== "string" ||
    !process.env.MACRODROID_SECRET ||
    body.secret !== process.env.MACRODROID_SECRET
  ) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  if (body.isNotifyOnly === true) {
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json({ error: "Konten notifikasi tidak valid." }, { status: 400 });
    }
    await sendTelegram(body.content);
    return NextResponse.json({ success: true, message: "Notifikasi diterima." });
  }

  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "Konten pembayaran tidak valid." }, { status: 400 });
  }

  const amount = parseReceivedAmount(body.content);
  if (amount === null) {
    return NextResponse.json({ error: "Nominal Rupiah harus tunggal dan valid." }, { status: 400 });
  }

  try {
    const total = amount.toString();
    const [orderResult, depositResult] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id")
        .eq("status", "Pending")
        .eq("total_amount", total),
      supabaseAdmin
        .from("deposits")
        .select("id, payment_channel")
        .eq("status", "Pending")
        .eq("total_amount", total),
    ]);

    if (orderResult.error || depositResult.error) {
      throw orderResult.error ?? depositResult.error;
    }

    const matches = [
      ...(orderResult.data ?? []).map((order) => ({ kind: "order" as const, id: order.id })),
      ...(depositResult.data ?? []).map((deposit) => ({
        kind: "deposit" as const,
        id: deposit.id,
        paymentChannel: deposit.payment_channel,
      })),
    ];

    if (matches.length === 0) {
      return NextResponse.json({ error: "Pembayaran Pending tidak ditemukan." }, { status: 404 });
    }

    if (matches.length > 1) {
      return NextResponse.json({ error: "Nominal pembayaran ambigu." }, { status: 409 });
    }

    const match = matches[0];
    const sourceBrand = detectBrand(body.content);

    if (match.kind === "order") {
      const { data: claim, error: claimError } = await supabaseAdmin.rpc(
        "claim_order_transition_atomic",
        {
          p_order_id: match.id,
          p_expected_status: "Pending",
          p_target_status: "Diproses",
          p_transition_kind: "payment_accepted",
          p_source: "macrodroid",
        },
      );

      if (claimError) throw claimError;
      const result = Array.isArray(claim) ? claim[0] : claim;
      if (!result?.claimed) {
        return NextResponse.json({ error: "Order sudah tidak dapat diklaim." }, { status: 409 });
      }

      // Fulfillment is deliberately gated until every provider writer adopts
      // the same conditional transition protocol.
      return NextResponse.json({
        success: true,
        resource: "order",
        status: "Diproses",
        sourceBrand,
        fulfillment: "pending_hardening",
      });
    }

    if (!["qris", "dana", "gopay", "ovo"].includes(match.paymentChannel ?? "")) {
      return NextResponse.json(
        { error: "Deposit metode manual tidak dapat disetujui otomatis." },
        { status: 409 },
      );
    }

    const { data: approved, error: approvalError } = await supabaseAdmin.rpc(
      "approve_deposit_from_machine_atomic",
      {
        p_deposit_id: match.id,
        p_received_total_amount: total,
        p_source: "macrodroid",
      },
    );

    if (approvalError) throw approvalError;
    if (approved !== true) {
      return NextResponse.json({ error: "Deposit sudah tidak dapat disetujui." }, { status: 409 });
    }

    return NextResponse.json({ success: true, resource: "deposit", sourceBrand });
  } catch {
    return NextResponse.json({ error: "Gagal memproses pembayaran." }, { status: 500 });
  }
}
