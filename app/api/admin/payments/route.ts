import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

function isAuthorized(req: Request) {
  const cookie = req.headers.get("cookie") || "";

  return (
    cookie.includes("isAdmin=true") ||
    cookie.toLowerCase().includes("userrole=manager")
  );
}

function toNullableNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function normalizePayment(payment: any) {
  if (!payment) return null;

  return {
    ...payment,
    id: String(payment.id),
  };
}

function parseDatabaseId(value: string | null) {
  if (!value) {
    return { error: "ID diperlukan." } as const;
  }

  // payment_accounts.id adalah bigint.
  if (!/^\d+$/.test(value)) {
    return { error: "ID pembayaran tidak valid." } as const;
  }

  const numericId = Number(value);

  if (!Number.isSafeInteger(numericId)) {
    return { error: "ID pembayaran tidak valid." } as const;
  }

  return { id: numericId } as const;
}

// GET: Ambil semua data pembayaran
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Akses ditolak." },
      { status: 403 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("payment_accounts")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map(normalizePayment)
    );
  } catch (error: any) {
    console.error("PAYMENT GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Gagal mengambil data pembayaran.",
      },
      { status: 500 }
    );
  }
}

// POST: Tambah metode pembayaran baru
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Akses ditolak." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    // Jangan pernah meneruskan id dari frontend.
    // PostgreSQL/Supabase membuat bigint id secara otomatis.
    const name = String(body?.name ?? "").trim();
    const methodKey = String(body?.method_key ?? "").trim();
    const accountName = String(body?.account_name ?? "-").trim();
    const accountNo = String(body?.account_no ?? "-").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Nama metode pembayaran wajib diisi." },
        { status: 400 }
      );
    }

    if (!methodKey) {
      return NextResponse.json(
        { error: "Method key wajib diisi." },
        { status: 400 }
      );
    }

    const payload = {
      name,
      method_key: methodKey,
      account_name: accountName || "-",
      account_no: accountNo || "-",
      logo_url:
        body?.logo_url === "" || body?.logo_url == null
          ? null
          : String(body.logo_url).trim(),
      min_price: toNullableNumber(body?.min_price),
      start_hour: toNullableNumber(body?.start_hour),
      end_hour: toNullableNumber(body?.end_hour),
      is_maintenance:
        body?.is_maintenance === undefined
          ? true
          : Boolean(body.is_maintenance),
      is_qr:
        body?.is_qr === undefined
          ? false
          : Boolean(body.is_qr),
    };

    if (
      payload.start_hour !== null &&
      (payload.start_hour < 0 || payload.start_hour > 23)
    ) {
      return NextResponse.json(
        { error: "Jam mulai harus antara 0 sampai 23." },
        { status: 400 }
      );
    }

    if (
      payload.end_hour !== null &&
      (payload.end_hour < 0 || payload.end_hour > 23)
    ) {
      return NextResponse.json(
        { error: "Jam selesai harus antara 0 sampai 23." },
        { status: 400 }
      );
    }

    if (
      payload.min_price !== null &&
      payload.min_price < 0
    ) {
      return NextResponse.json(
        { error: "Minimal pembayaran tidak boleh negatif." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("payment_accounts")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: normalizePayment(data),
    });
  } catch (error: any) {
    console.error("PAYMENT POST ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Gagal menambah metode pembayaran.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Update data pembayaran
export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Akses ditolak." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id: rawId, ...updates } = body;

    const parsed = parseDatabaseId(
      rawId === undefined || rawId === null
        ? null
        : String(rawId)
    );

    if ("error" in parsed) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "Tidak ada data yang diubah." },
        { status: 400 }
      );
    }

    // Hanya izinkan field yang memang boleh diubah dari frontend.
    const allowedFields = new Set([
      "name",
      "method_key",
      "account_name",
      "account_no",
      "logo_url",
      "min_price",
      "start_hour",
      "end_hour",
      "is_qr",
      "is_maintenance",
    ]);

    const safeUpdates: Record<string, unknown> = {};

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.has(field)) {
        safeUpdates[field] = value;
      }
    }

    if (!Object.keys(safeUpdates).length) {
      return NextResponse.json(
        { error: "Tidak ada field yang diizinkan untuk diubah." },
        { status: 400 }
      );
    }

    for (const field of ["start_hour", "end_hour", "min_price"]) {
      if (Object.prototype.hasOwnProperty.call(safeUpdates, field)) {
        safeUpdates[field] = toNullableNumber(safeUpdates[field]);
      }
    }

    if (
      safeUpdates.start_hour !== undefined &&
      safeUpdates.start_hour !== null &&
      (Number(safeUpdates.start_hour) < 0 ||
        Number(safeUpdates.start_hour) > 23)
    ) {
      return NextResponse.json(
        { error: "Jam mulai harus antara 0 sampai 23." },
        { status: 400 }
      );
    }

    if (
      safeUpdates.end_hour !== undefined &&
      safeUpdates.end_hour !== null &&
      (Number(safeUpdates.end_hour) < 0 ||
        Number(safeUpdates.end_hour) > 23)
    ) {
      return NextResponse.json(
        { error: "Jam selesai harus antara 0 sampai 23." },
        { status: 400 }
      );
    }

    if (
      safeUpdates.min_price !== undefined &&
      safeUpdates.min_price !== null &&
      Number(safeUpdates.min_price) < 0
    ) {
      return NextResponse.json(
        { error: "Minimal pembayaran tidak boleh negatif." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("payment_accounts")
      .update(safeUpdates)
      .eq("id", parsed.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: normalizePayment(data),
    });
  } catch (error: any) {
    console.error("PAYMENT PATCH ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Gagal mengubah metode pembayaran.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Hapus metode pembayaran
export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Akses ditolak." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = parseDatabaseId(searchParams.get("id"));

    if ("error" in parsed) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("payment_accounts")
      .delete()
      .eq("id", parsed.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PAYMENT DELETE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Gagal menghapus metode pembayaran.",
      },
      { status: 500 }
    );
  }
}
