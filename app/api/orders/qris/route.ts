import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/utils/supabaseAdmin";

import {
  generateQrisWithFallback,
} from "@/lib/qris/qris-generator";

import {
  QrisProvider,
} from "@/lib/qris/qris-config";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const orderId =
      typeof body.orderId === "string"
        ? body.orderId.trim()
        : "";

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID missing",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * 1. AMBIL ORDER
     * =====================================================
     */

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select(
        "order_id, total_amount, status, qris_string, created_at"
      )
      .eq(
        "order_id",
        orderId
      )
      .single();

    if (
      orderError ||
      !order
    ) {
      console.error(
        "ORDER NOT FOUND:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * 2. HANYA ORDER PENDING
     * =====================================================
     */

    if (
      order.status !== "Pending"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order is not pending",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * 3. EXPIRED 2 JAM
     * =====================================================
     */

    const createdAt =
      new Date(
        order.created_at
      ).getTime();

    const now =
      Date.now();

    const twoHours =
      2 *
      60 *
      60 *
      1000;

    if (
      !Number.isFinite(
        createdAt
      ) ||
      now - createdAt >
        twoHours
    ) {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "Gagal",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "order_id",
          orderId
        );

      return NextResponse.json(
        {
          success: false,
          error:
            "Order sudah kadaluarsa (2 jam).",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * 4. JIKA QR SUDAH ADA
     *
     * PENTING:
     *
     * QR order lama JANGAN berubah
     * ketika admin melakukan switch provider.
     *
     * Contoh:
     *
     * Order A dibuat saat DANA Dynamic
     * Admin switch ke GoPay Static
     *
     * Order A tetap menggunakan QR DANA.
     *
     * Order B yang baru akan menggunakan GoPay.
     * =====================================================
     */

    if (
      order.qris_string
    ) {
      return NextResponse.json({
        success: true,
        qrisString:
          order.qris_string,
        cached: true,
      });
    }

    /*
     * =====================================================
     * 5. AMBIL PROVIDER AKTIF
     * =====================================================
     */

    const {
      data: settings,
      error: settingsError,
    } = await supabaseAdmin
      .from("qris_settings")
      .select(
        "id, active_provider, updated_at"
      )
      .eq("id", 1)
      .maybeSingle();

    if (
      settingsError
    ) {
      console.error(
        "QRIS SETTINGS ERROR:",
        settingsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gagal membaca konfigurasi QRIS.",
        },
        { status: 500 }
      );
    }

    const provider =
      (
        settings?.active_provider ||
        "dana_dynamic"
      ) as QrisProvider;

    /*
     * =====================================================
     * 6. NOMINAL
     * =====================================================
     */

    const nominalAmount =
      Math.floor(
        Number(
          order.total_amount
        )
      );

    if (
      !Number.isFinite(
        nominalAmount
      ) ||
      nominalAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nominal order tidak valid.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * 7. GENERATE QR
     * =====================================================
     */

    const generated =
      generateQrisWithFallback(
        provider,
        nominalAmount
      );

    /*
     * =====================================================
     * 8. SIMPAN QR KE ORDER
     * =====================================================
     */

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        qris_string:
          generated.qrisString,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "order_id",
        orderId
      );

    if (
      updateError
    ) {
      console.error(
        "GAGAL SIMPAN QRIS:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gagal menyimpan QRIS.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * 9. RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      provider:
        generated.provider,

      type:
        generated.type,

      amount:
        generated.amount,

      qrisString:
        generated.qrisString,

      cached: false,
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
      { status: 500 }
    );
  }
}