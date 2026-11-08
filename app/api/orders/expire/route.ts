import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const order_id = typeof body?.order_id === "string" ? body.order_id.trim() : "";

    if (!order_id) {
      return NextResponse.json({ error: "Order ID tidak valid." }, { status: 400 });
    }

    // 1. Cek di tabel orders (LIVE)
    const { data: liveOrder } = await supabaseAdmin
      .from("orders")
      .select("id, order_id, status, created_at, used_balance, total_amount")
      .eq("order_id", order_id)
      .maybeSingle();

    let targetOrder = liveOrder ? { ...liveOrder, is_sandbox: false } : null;

    if (!targetOrder) {
      // 2. Cek di tabel sandbox_orders jika bukan LIVE
      const { data: sandboxOrder } = await supabaseAdmin
        .from("sandbox_orders")
        .select("id, order_id, status, created_at, used_balance, total_amount")
        .eq("order_id", order_id)
        .maybeSingle();

      if (sandboxOrder) {
        targetOrder = { ...sandboxOrder, is_sandbox: true };
      }
    }

    if (!targetOrder) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (targetOrder.status !== "Pending") {
      return NextResponse.json({
        success: true,
        status: targetOrder.status,
        already_resolved: true,
      });
    }

    // Validasi waktu kedaluwarsa di sisi server (dengan toleransi drift jam 10 detik)
    const createdAtTs = new Date(targetOrder.created_at).getTime();
    const expiryTs = createdAtTs + 2 * 60 * 60 * 1000 - 10000;

    if (Date.now() < expiryTs) {
      return NextResponse.json(
        { error: "Batas waktu pembayaran belum berakhir." },
        { status: 400 }
      );
    }

    const table = targetOrder.is_sandbox ? "sandbox_orders" : "orders";
    const isMixed =
      Boolean(targetOrder.used_balance) &&
      Number(targetOrder.used_balance) > 0 &&
      Boolean(targetOrder.total_amount) &&
      Number(targetOrder.total_amount) > 0;

    if (!targetOrder.is_sandbox && isMixed && targetOrder.id) {
      await supabaseAdmin.rpc("refund_expired_mixed_order_atomic", {
        p_order_id: targetOrder.id,
      });
    } else {
      await supabaseAdmin
        .from(table)
        .update({
          status: "Gagal",
          updated_at: new Date().toISOString(),
          notes: "Batal Otomatis: Batas waktu pembayaran 2 jam telah habis.",
        })
        .eq("order_id", order_id)
        .eq("status", "Pending");
    }

    return NextResponse.json({ success: true, status: "Gagal" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses kedaluwarsa pesanan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
