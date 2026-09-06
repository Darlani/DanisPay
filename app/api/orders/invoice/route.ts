import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: "Invoice wajib diisi!" }, { status: 400 });
    }

    // Gunakan Kunci Master untuk menembus RLS dan ambil data komplit
    const { data: liveData, error: liveError } = await supabaseAdmin
      .from("orders")
      .select("order_id, status, payment_method, created_at, total_amount, sku, category, user_id, sn, qris_string, customer_no, item_label, user_contact, customer_name, desc, used_balance, stand_meter, segment_power, raw_tagihan, unique_code, product_name, price")
      .eq("order_id", order_id)
      .maybeSingle();

    let data: Record<string, unknown> | null = null;
    let fetchError = liveError;

    if (liveData) {
      data = { ...liveData, is_sandbox: false };
    } else {
      // Periksa tabel sandbox_orders jika tidak ditemukan di orders LIVE
      const { data: sandboxData, error: sbError } = await supabaseAdmin
        .from("sandbox_orders")
        .select("order_id, status, payment_method, created_at, total_amount, sku, category, user_id, sn, qris_string, customer_no, item_label, user_contact, customer_name, desc, used_balance, stand_meter, segment_power, raw_tagihan, unique_code, product_name, price")
        .eq("order_id", order_id)
        .maybeSingle();

      if (sandboxData) {
        data = { ...sandboxData, is_sandbox: true };
        fetchError = null;
      } else if (sbError) {
        fetchError = sbError;
      }
    }

    if (fetchError || !data) {
      return NextResponse.json({ error: "Invoice tidak ditemukan!" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses permintaan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}