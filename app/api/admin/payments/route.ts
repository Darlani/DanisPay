import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabaseClient";

// GET: Ambil semua data pembayaran
export async function GET() {
  try {
    const { data, error } = await supabase.from("payment_accounts").select("*").order("id", { ascending: true });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Tambah bank baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data, error } = await supabase.from("payment_accounts").insert([body]).select();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update data (Edit nama, status, harga, dll)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const { data, error } = await supabase.from("payment_accounts").update(updates).eq("id", id).select();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus bank
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const { error } = await supabase.from("payment_accounts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}