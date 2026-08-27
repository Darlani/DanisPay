import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import {
  generateQris,
} from "@/lib/qris/qris-generator";
import {
  isQrisProviderConfigured,
} from "@/lib/qris/qris-config";
import type { QrisProvider } from "@/lib/qris/qris-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type HealthState =
  | "online"
  | "warning"
  | "error";

type HealthItem = {
  status: HealthState;
  label: string;
  detail: string;
};

function isAuthorized(req: Request) {
  const cookie =
    req.headers.get("cookie") || "";

  return (
    cookie.includes("isAdmin=true") ||
    cookie
      .toLowerCase()
      .includes("userrole=manager")
  );
}

function configuredProvider(
  provider: QrisProvider,
  label: string
): HealthItem {
  try {
    const configured =
      isQrisProviderConfigured(provider);

    return {
      status: configured
        ? "online"
        : "error",

      label: configured
        ? "Tersedia"
        : "Tidak tersedia",

      detail: configured
        ? `${label} terkonfigurasi.`
        : `${label} belum memiliki konfigurasi QRIS.`,
    };
  } catch (error) {
    return {
      status: "error",
      label: "Error",
      detail:
        error instanceof Error
          ? error.message
          : `Gagal memeriksa ${label}.`,
    };
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        success: false,
        error: "Akses ditolak.",
      },
      {
        status: 403,
      }
    );
  }

  const checkedAt =
    new Date().toISOString();

  try {
    /*
     * Cek database secara paralel.
     */
    const [
      paymentDbCheck,
      qrisSettingsCheck,
    ] = await Promise.all([
      supabaseAdmin
        .from("payment_accounts")
        .select("id", {
          count: "exact",
          head: true,
        }),

      supabaseAdmin
        .from("qris_settings")
        .select(
          "id, active_provider, updated_at"
        )
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const databaseHealthy =
      !paymentDbCheck.error &&
      !qrisSettingsCheck.error;

    const activeProvider =
      (qrisSettingsCheck.data
        ?.active_provider ||
        "dana_dynamic") as QrisProvider;

    /*
     * Test generator lokal.
     *
     * Ini tidak mengirim transaksi.
     */
    let qrisGenerator: HealthItem;

    try {
      const generated =
        generateQris(
          "dana_dynamic",
          1000
        );

      const generatedOk =
        Boolean(
          generated?.qrisString
        );

      qrisGenerator = {
        status: generatedOk
          ? "online"
          : "error",

        label: generatedOk
          ? "Online"
          : "Error",

        detail: generatedOk
          ? "Generator DANA Dynamic berhasil diuji."
          : "Generator tidak menghasilkan QRIS.",
      };
    } catch (error) {
      qrisGenerator = {
        status: "error",
        label: "Error",
        detail:
          error instanceof Error
            ? error.message
            : "Generator QRIS gagal diuji.",
      };
    }

    const database: HealthItem = {
      status: databaseHealthy
        ? "online"
        : "error",

      label: databaseHealthy
        ? "Normal"
        : "Error",

      detail: databaseHealthy
        ? "Supabase payment_accounts dan qris_settings merespons normal."
        : paymentDbCheck.error
          ?.message ||
          qrisSettingsCheck.error
            ?.message ||
          "Database tidak dapat diakses.",
    };

    const autoSave: HealthItem = {
      status: databaseHealthy
        ? "online"
        : "error",

      label: databaseHealthy
        ? "Aktif"
        : "Gangguan",

      detail: databaseHealthy
        ? "Endpoint penyimpanan pembayaran bergantung pada database yang sehat."
        : "Auto Save terganggu karena database tidak sehat.",
    };

    return NextResponse.json(
      {
        success: true,
        checked_at: checkedAt,
        active_provider: activeProvider,

        statuses: {
          qris_generator:
            qrisGenerator,

          dana_dynamic:
            configuredProvider(
              "dana_dynamic",
              "DANA Dynamic"
            ),

          dana_static:
            configuredProvider(
              "dana_static",
              "DANA Static"
            ),

          gopay_static:
            configuredProvider(
              "gopay_static",
              "GoPay Static"
            ),

          database,
          auto_save: autoSave,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "SYSTEM HEALTH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        checked_at: checkedAt,

        error:
          error instanceof Error
            ? error.message
            : "Gagal memeriksa kesehatan sistem.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}