import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(request: Request) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  // Only super admin is allowed to run cleanup
  if (authorization.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang berwenang membersihkan fixture Sandbox." },
      { status: 403 },
    );
  }

  try {
    // Clean from dedicated sandbox_orders table
    const { data: deletedOrders, error: delErr } = await supabaseAdmin
      .from("sandbox_orders")
      .delete()
      .like("sku", "TEST-%")
      .select("id, order_id, sku");

    if (delErr) {
      return NextResponse.json(
        { error: `Gagal membersihkan fixture: ${delErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedOrders?.length || 0,
      deletedOrders: deletedOrders || [],
      message: `Berhasil menghapus ${deletedOrders?.length || 0} order uji sandbox sementara.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal cleanup error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

