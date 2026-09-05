import {
  NextResponse,
} from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";

import {
  createClient,
} from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  try {
    const {
      data,
      error,
    } = await supabase
      .from("qris_settings")
      .select(
        "id, active_provider, updated_at"
      )
      .limit(1)
      .single();

    if (error) {
      throw error;
    }

    const { data: history, error: historyError } = await supabase
      .from("activity_logs")
      .select("id, created_at, details")
      .eq("action", "QRIS PROVIDER CHANGE")
      .order("created_at", { ascending: false })
      .limit(20);

    if (historyError) {
      console.error("GET QRIS HISTORY ERROR:", historyError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        history: history || [],
      },
    });

  } catch (error) {

    console.error(
      "GET QRIS SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: Request
) {
  const auth = await requireAdminOrManager(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  try {

    const body =
      await request.json();

    const provider =
      typeof body.provider === "string"
        ? body.provider
            .toLowerCase()
            .trim()
        : "";

    const allowedProviders = [
    "dana_dynamic",
    "dana_static",
    "gopay_static",
    ] as const;

    type QrisProvider =
    (typeof allowedProviders)[number];

    if (
    !allowedProviders.includes(
        provider as QrisProvider
    )
    ) {
    return NextResponse.json(
        {
        success: false,
        error:
            "Provider QRIS tidak valid.",
        allowedProviders,
        },
        {
        status: 400,
        }
    );
    }

    /*
     * Pastikan QRIS tersedia
     */

    if (
      provider === "dana_static" &&
      !process.env.QRIS_DANA_STATIC
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "QRIS DANA Static belum tersedia.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      provider === "gopay_static" &&
      !process.env.QRIS_GOPAY_STATIC
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "QRIS GoPay Static belum tersedia.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Ambil provider sebelumnya untuk riwayat perubahan.
     */
    const { data: currentSettings, error: currentSettingsError } = await supabase
      .from("qris_settings")
      .select("active_provider")
      .eq("id", 1)
      .single();

    if (currentSettingsError) {
      throw currentSettingsError;
    }

    const previousProvider = currentSettings?.active_provider || "-";

    /*
     * Update database
     */

    const {
      data,
      error,
    } = await supabase
      .from("qris_settings")
      .update({
        active_provider:
          provider,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      throw error;
    }

    try {
      await supabase.from("activity_logs").insert([{
        action: "QRIS PROVIDER CHANGE",
        details: `Provider QRIS diubah dari ${previousProvider} ke ${provider}.`,
        created_at: new Date().toISOString(),
      }]);
    } catch (logError) {
      // Gagal mencatat history tidak boleh menggagalkan pergantian provider.
      console.error("Gagal mencatat riwayat QRIS:", logError);
    }

    return NextResponse.json({
      success: true,

      message:
        "Provider QRIS berhasil diganti.",

      data,
    });

  } catch (error) {

    console.error(
      "UPDATE QRIS SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}