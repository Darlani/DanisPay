export type QrisProvider =
  | "dana_dynamic"
  | "dana_static"
  | "gopay_static";

/**
 * Provider QRIS yang saat ini tersedia.
 *
 * ROADMAP:
 *
 * DANA Dynamic
 *      ↓
 * DANA Static
 *      ↓
 * GoPay Static
 *
 * Nanti dapat ditambahkan:
 * BNI Dynamic / Static
 * BSI Dynamic / Static
 */
export const QRIS_PROVIDERS = {
  dana_dynamic: {
    name: "DANA Dynamic",
    type: "dynamic",
    description:
      "QRIS utama dengan nominal otomatis.",
  },

  dana_static: {
    name: "DANA Static",
    type: "static",
    description:
      "Fallback pertama apabila DANA Dynamic bermasalah.",
  },

  gopay_static: {
    name: "GoPay Static",
    type: "static",
    description:
      "Fallback kedua / backup.",
  },
} as const;

/**
 * Urutan fallback utama DaPay.
 *
 * DANA Dynamic
 * → DANA Static
 * → GoPay Static
 */
export const QRIS_FALLBACK_ORDER: QrisProvider[] = [
  "dana_dynamic",
  "dana_static",
  "gopay_static",
];

/**
 * Fallback chain berdasarkan provider aktif.
 *
 * Jika admin memilih:
 *
 * DANA Dynamic
 * → DANA Static
 * → GoPay Static
 *
 * Jika admin memilih:
 *
 * DANA Static
 * → GoPay Static
 *
 * Jika admin memilih:
 *
 * GoPay Static
 * → tidak ada fallback berikutnya.
 */
export const QRIS_FALLBACK_CHAIN: Record<
  QrisProvider,
  QrisProvider[]
> = {
  dana_dynamic: [
    "dana_dynamic",
    "dana_static",
    "gopay_static",
  ],

  dana_static: [
    "dana_static",
    "gopay_static",
  ],

  gopay_static: [
    "gopay_static",
  ],
};

/**
 * Ambil QRIS static berdasarkan provider.
 */
export function getStaticQris(
  provider: QrisProvider
): string {
  switch (provider) {
    case "dana_static":
      return (
        process.env.QRIS_DANA_STATIC || ""
      );

    case "gopay_static":
      return (
        process.env.QRIS_GOPAY_STATIC || ""
      );

    default:
      return "";
  }
}

/**
 * Cek apakah provider static memiliki QRIS.
 */
export function hasStaticQris(
  provider: QrisProvider
): boolean {
  return Boolean(
    getStaticQris(provider)
  );
}

/**
 * Cek apakah provider memiliki konfigurasi
 * yang diperlukan untuk bekerja.
 *
 * DANA Dynamic menggunakan QRIS DANA static
 * sebagai base untuk generator.
 */
export function isQrisProviderConfigured(
  provider: QrisProvider
): boolean {
  switch (provider) {
    case "dana_dynamic":
      return Boolean(
        process.env.QRIS_DANA_STATIC
      );

    case "dana_static":
      return Boolean(
        process.env.QRIS_DANA_STATIC
      );

    case "gopay_static":
      return Boolean(
        process.env.QRIS_GOPAY_STATIC
      );

    default:
      return false;
  }
}