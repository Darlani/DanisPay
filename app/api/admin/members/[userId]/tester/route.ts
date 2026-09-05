import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import { ensureSandboxWallet } from "@/lib/auth/tester";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status }
    );
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID diperlukan." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const newTesterStatus = Boolean(body.is_tester);

    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ is_tester: newTesterStatus })
      .eq("id", userId)
      .select("id, email, full_name, is_tester, role")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Inisialisasi dompet virtual jika belum ada (dijalankan di background agar respon cepat)
    if (newTesterStatus) {
      void ensureSandboxWallet(userId);
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile,
      message: newTesterStatus
        ? "Akun berhasil diangkat sebagai Authorized Tester (Sandbox Access Granted)."
        : "Hak akses Authorized Tester dinonaktifkan."
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

