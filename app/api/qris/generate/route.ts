import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  generateQris,
} from "@/lib/qris/qris-generator";

import {
  QrisProvider,
  QRIS_PROVIDERS,
} from "@/lib/qris/qris-config";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const provider =
      typeof body.provider === "string"
        ? body.provider
            .toLowerCase()
            .trim()
        : "";

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : Number(body.amount);

    /**
     * ==========================================
     * VALIDASI PROVIDER
     * ==========================================
     */

    const allowedProviders =
      Object.keys(
        QRIS_PROVIDERS
      ) as QrisProvider[];

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

    /**
     * ==========================================
     * VALIDASI NOMINAL
     * ==========================================
     */

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "amount harus berupa angka lebih dari 0.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * ==========================================
     * GENERATE
     * ==========================================
     */

    const result =
      generateQris(
        provider as QrisProvider,
        amount
      );

    return NextResponse.json({
      success: true,

      provider:
        result.provider,

      type:
        result.type,

      amount:
        result.amount,

      qrisString:
        result.qrisString,

      fallbackUsed:
        false,
    });

  } catch (error) {
    console.error(
      "QRIS GENERATOR ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat QRIS.",
      },
      {
        status: 500,
      }
    );
  }
}