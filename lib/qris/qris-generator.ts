import {
  generateDanaDynamicQR,
} from "@/lib/qris/dana-generator";

import {
  getStaticQris,
  QrisProvider,
  QRIS_FALLBACK_CHAIN,
} from "@/lib/qris/qris-config";

export interface GenerateQrisResult {
  provider: QrisProvider;

  type:
    | "static"
    | "dynamic";

  qrisString: string;

  amount: number;

  /**
   * true apabila provider yang diminta
   * gagal dan sistem menggunakan fallback.
   */
  fallbackUsed?: boolean;

  /**
   * Provider awal yang diminta.
   */
  requestedProvider?: QrisProvider;
}

/**
 * ==================================================
 * GENERATE QRIS BERDASARKAN PROVIDER
 * ==================================================
 *
 * Fungsi ini TIDAK melakukan fallback.
 *
 * Fallback ditangani oleh:
 * generateQrisWithFallback()
 */
export function generateQris(
  provider: QrisProvider,
  amount: number
): GenerateQrisResult {
  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Nominal QRIS tidak valid."
    );
  }

  const normalizedAmount =
    Math.floor(amount);

  /**
   * ================================================
   * DANA DYNAMIC
   * ================================================
   */
  if (
    provider === "dana_dynamic"
  ) {
    const staticQR =
      process.env.QRIS_DANA_STATIC ||
      "";

    if (!staticQR) {
      throw new Error(
        "QRIS_DANA_STATIC belum diisi di environment."
      );
    }

    const result =
      generateDanaDynamicQR(
        staticQR,
        normalizedAmount
      );

    const qrisString =
      result.qr;

    if (!qrisString) {
      throw new Error(
        "Generator DANA Dynamic tidak menghasilkan QRIS."
      );
    }

    if (
      result.crcValid !== true
    ) {
      throw new Error(
        "CRC QRIS DANA Dynamic tidak valid."
      );
    }

    return {
      provider,
      type: "dynamic",
      qrisString,
      amount: normalizedAmount,
      fallbackUsed: false,
      requestedProvider: provider,
    };
  }

  /**
   * ================================================
   * DANA STATIC / GOPAY STATIC
   * ================================================
   */
  const qris =
    getStaticQris(provider);

  if (!qris) {
    throw new Error(
      `QRIS untuk ${provider} belum diisi di environment.`
    );
  }

  return {
    provider,
    type: "static",
    qrisString: qris,
    amount: normalizedAmount,
    fallbackUsed: false,
    requestedProvider: provider,
  };
}

/**
 * ==================================================
 * GENERATE QRIS + AUTOMATIC FALLBACK
 * ==================================================
 *
 * Fallback mengikuti konfigurasi
 * dari qris-config.ts.
 *
 * Contoh:
 *
 * DANA Dynamic
 *     ↓ gagal
 * DANA Static
 *     ↓ gagal
 * GoPay Static
 */
export function generateQrisWithFallback(
  provider: QrisProvider,
  amount: number
): GenerateQrisResult {
  const chain =
    QRIS_FALLBACK_CHAIN[provider];

  if (!chain) {
    throw new Error(
      `Provider QRIS "${provider}" tidak didukung.`
    );
  }

  const errors: string[] = [];

  for (
    let i = 0;
    i < chain.length;
    i++
  ) {
    const currentProvider =
      chain[i];

    try {
      const result =
        generateQris(
          currentProvider,
          amount
        );

      return {
        ...result,

        fallbackUsed:
          currentProvider !==
          provider,

        requestedProvider:
          provider,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      console.error(
        `QRIS PROVIDER ${currentProvider} FAILED:`,
        message
      );

      errors.push(
        `${currentProvider}: ${message}`
      );
    }
  }

  throw new Error(
    `Semua provider QRIS gagal.\n${errors.join("\n")}`
  );
}