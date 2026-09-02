import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = typeof body?.code === "string" ? body.code : "";
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { valid: false, message: "Kode referral tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Query profiles using service role to bypass RLS safely
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("referral_code")
      .eq("referral_code", code)
      .maybeSingle();

    if (error) {
      console.error("[validate-referral] Database error:", error.message);
      return NextResponse.json(
        { valid: false, message: "Terjadi kesalahan saat memvalidasi kode referral." },
        { status: 500 }
      );
    }

    if (!profile?.referral_code) {
      return NextResponse.json(
        { valid: false, message: "Kode referral tidak valid atau tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { valid: true, referral_code: profile.referral_code },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[validate-referral] Request parsing error:", errorMsg);
    return NextResponse.json(
      { valid: false, message: "Format request tidak valid." },
      { status: 400 }
    );
  }
}
