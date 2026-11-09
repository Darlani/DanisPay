import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return NextResponse.json(
        { error: "Invoice wajib diisi!" },
        { status: 400 }
      );
    }

    const { data: liveData, error: liveError } = await supabaseAdmin
      .from("orders")
      .select(
        "order_id, status, product_name, item_label, customer_no, price, total_amount, created_at, updated_at, sn, notes, payment_method, category"
      )
      .eq("order_id", order_id)
      .maybeSingle();

    let data = liveData;
    let fetchError = liveError;

    if (!data) {
      const { data: sbData, error: sbError } = await supabaseAdmin
        .from("sandbox_orders")
        .select(
          "order_id, status, product_name, item_label, customer_no, price, total_amount, created_at, updated_at, sn, notes, payment_method, category"
        )
        .eq("order_id", order_id)
        .maybeSingle();

      if (sbData) {
        data = sbData;
        fetchError = null;
      } else if (sbError) {
        fetchError = sbError;
      }
    }

    if (fetchError || !data) {
      return NextResponse.json(
        { error: "Nomor invoice tidak ditemukan. Pastikan format nomor invoice sudah benar." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (err: unknown) {
    console.error("🔥 TRACK FATAL:", err);

    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}