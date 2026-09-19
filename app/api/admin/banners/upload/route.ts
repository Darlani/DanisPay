import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const ALLOWED_MIME_PREFIXES = ["image/"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "File gambar banner tidak ditemukan." },
        { status: 400 }
      );
    }

    // Ekstrak ekstensi dari file name
    const rawFileName = file.name || "";
    const nameParts = rawFileName.split(".");
    const ext = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : "";

    // Validasi tipe file (periksa MIME type atau ekstensi)
    const isMimeImage = file.type && ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
    const isExtImage = ALLOWED_EXTENSIONS.has(ext);

    if (!isMimeImage && !isExtImage) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Harap upload gambar (JPG, PNG, WEBP, GIF)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file melebihi batas maksimum 10 MB." },
        { status: 400 }
      );
    }

    const fileExt = isExtImage ? ext : "webp";
    const contentType = file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = `promotions/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("banners")
      .upload(safeName, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[API_ADMIN_BANNERS_UPLOAD] Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Gagal mengunggah ke storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("banners")
      .getPublicUrl(safeName);

    return NextResponse.json({
      ok: true,
      publicUrl: publicUrlData.publicUrl,
      fileName: safeName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API_ADMIN_BANNERS_UPLOAD] Exception:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

