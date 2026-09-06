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

    let effectiveTargetProfile: { role?: string | null; is_tester?: boolean | null; tester_since?: string | null } | null = null;
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("role, is_tester, tester_since")
      .eq("id", userId)
      .maybeSingle();

    if (targetErr || !targetProfile) {
      const { data: fallbackTarget } = await supabaseAdmin
        .from("profiles")
        .select("role, is_tester")
        .eq("id", userId)
        .single();
      effectiveTargetProfile = fallbackTarget;
    } else {
      effectiveTargetProfile = targetProfile;
    }

    if (newTesterStatus && (effectiveTargetProfile?.role === "admin" || effectiveTargetProfile?.role === "manager")) {
      return NextResponse.json(
        { error: "Akun Team (Admin/Manager) tidak dapat dijadikan Customer Tester. Tester persona hanya berlaku untuk Member." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      is_tester: newTesterStatus,
      tester_updated_at: nowIso,
    };
    if (newTesterStatus) {
      updatePayload.tester_since = effectiveTargetProfile?.tester_since || nowIso;
    }

    let updatedProfile;
    const { data: extProfile, error: extErr } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id, email, full_name, is_tester, role, tester_since, tester_updated_at")
      .single();

    if (extErr) {
      const { data: baseProfile, error: baseErr } = await supabaseAdmin
        .from("profiles")
        .update({ is_tester: newTesterStatus })
        .eq("id", userId)
        .select("id, email, full_name, is_tester, role")
        .single();

      if (baseErr) {
        return NextResponse.json({ error: baseErr.message }, { status: 500 });
      }
      updatedProfile = baseProfile;
    } else {
      updatedProfile = extProfile;
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

