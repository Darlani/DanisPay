import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import { authenticateRequest } from "@/utils/serverAuth";

export async function POST(req: Request) {
  try {
    const authentication = await authenticateRequest(req);

    if (!authentication.ok) {
      return NextResponse.json(
        { error: authentication.message },
        { status: authentication.status },
      );
    }

    const userId = authentication.user.id;

    const body = await req.json().catch(() => ({}));

    // Strict field whitelist: ONLY full_name can be updated
    if (typeof body.full_name !== "string") {
      return NextResponse.json(
        { error: "Format nama lengkap tidak valid." },
        { status: 400 },
      );
    }

    const sanitizedName = body.full_name.trim();

    if (sanitizedName.length < 2) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter." },
        { status: 400 },
      );
    }

    if (sanitizedName.length > 100) {
      return NextResponse.json(
        { error: "Nama lengkap maksimal 100 karakter." },
        { status: 400 },
      );
    }

    // Execute atomic update for authenticated user
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: sanitizedName })
      .eq("id", userId);

    if (updateError) {
      console.error("Profile update DB error:", updateError);
      return NextResponse.json(
        { error: "Gagal memperbarui profil di basis data." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        full_name: sanitizedName,
      },
    });
  } catch (err: unknown) {
    console.error("Profile update API error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memperbarui profil." },
      { status: 500 },
    );
  }
}

