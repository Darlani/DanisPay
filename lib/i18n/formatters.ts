import type { Locale } from "./config";

/**
 * Centralized, locale-aware currency formatter for Indonesian Rupiah (IDR).
 * Strictly presentation-only: does not alter stored values or financial calculations.
 *
 * Example outputs:
 * - ID: "Rp 150.000"
 * - EN: "Rp 150,000"
 */
export function formatRupiah(amount: number | string | bigint, locale: Locale = "id"): string {
  const num = typeof amount === "bigint" ? Number(amount) : Number(amount) || 0;
  const localeTag = locale === "en" ? "en-US" : "id-ID";
  const formatted = num.toLocaleString(localeTag);
  return `Rp ${formatted}`;
}
