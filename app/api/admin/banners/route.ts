import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

// GET: Ambil semua banner untuk admin
export async function GET(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("banners")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("[API_ADMIN_BANNERS_GET] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API_ADMIN_BANNERS_GET] Exception:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST: Simpan (insert / update) data banner
export async function POST(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      id,
      src,
      alt,
      promo,
      href,
      category,
      description,
      promo_code,
      cashback,
      is_active,
    } = body;

    if (!src || typeof src !== "string" || !src.trim()) {
      return NextResponse.json(
        { error: "URL gambar banner (src) wajib diisi." },
        { status: 400 }
      );
    }

    const payload = {
      src: src.trim(),
      alt: alt?.trim() || "DaPay Banner",
      promo: promo?.trim() || null,
      href: href?.trim() || null,
      category: category?.trim() || "game",
      description: description?.trim() || null,
      promo_code: promo_code?.trim() || null,
      cashback: cashback?.trim() || null,
      is_active: is_active !== false,
    };

    let result;

    if (id !== null && id !== undefined && id !== "") {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId)) {
        return NextResponse.json(
          { error: "ID banner tidak valid." },
          { status: 400 }
        );
      }

      result = await supabaseAdmin
        .from("banners")
        .update(payload)
        .eq("id", numericId)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from("banners")
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) {
      console.error("[API_ADMIN_BANNERS_POST] Database error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      banner: result.data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API_ADMIN_BANNERS_POST] Exception:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE: Hapus banner
export async function DELETE(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { error: "Parameter ID diperlukan." },
        { status: 400 }
      );
    }

    const numericId = Number(idParam);
    if (!Number.isSafeInteger(numericId)) {
      return NextResponse.json(
        { error: "ID banner tidak valid." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("banners")
      .delete()
      .eq("id", numericId);

    if (error) {
      console.error("[API_ADMIN_BANNERS_DELETE] Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: numericId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API_ADMIN_BANNERS_DELETE] Exception:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

