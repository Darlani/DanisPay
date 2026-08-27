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

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "order_id, status, product_name, item_label, customer_no, price, total_amount, created_at, sn, notes"
      )
      .eq("order_id", order_id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Invoice tidak ditemukan, Bos!" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (err: any) {
    console.error("🔥 TRACK FATAL:", err);

    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}