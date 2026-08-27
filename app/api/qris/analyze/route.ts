import { NextResponse } from "next/server";

import { analyzeQRIS } from "@/utils/qris/analyzer";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const staticQRIS =
      typeof body.staticQRIS ===
      "string"
        ? body.staticQRIS
        : "";

    const dynamicQRIS =
      typeof body.dynamicQRIS ===
      "string"
        ? body.dynamicQRIS
        : "";

    if (!staticQRIS) {
      return NextResponse.json(
        {
          success: false,
          error:
            "staticQRIS wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!dynamicQRIS) {
      return NextResponse.json(
        {
          success: false,
          error:
            "dynamicQRIS wajib diisi.",
        },
        { status: 400 }
      );
    }

    const result =
      analyzeQRIS(
        staticQRIS,
        dynamicQRIS
      );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "QRIS ANALYZER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menganalisis QRIS.",
      },
      { status: 500 }
    );
  }
}