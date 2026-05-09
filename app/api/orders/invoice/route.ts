import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: "Invoice wajib diisi!" }, { status: 400 });
    }

    // Gunakan Kunci Master untuk menembus RLS dan ambil data komplit
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("order_id, status, payment_method, created_at, total_amount, sku, category, user_id, sn, qris_string, customer_no, item_label, user_contact, customer_name, desc, used_balance, stand_meter, segment_power, raw_tagihan, unique_code, product_name, price")
      .eq("order_id", order_id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Invoice tidak ditemukan!" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memproses permintaan." }, { status: 500 });
  }
}