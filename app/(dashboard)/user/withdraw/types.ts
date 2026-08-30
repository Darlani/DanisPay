export const PAGE_SIZE = 10;
export const MIN_WITHDRAWAL = 10000;

export interface Withdrawal {
  id: string;
  amount?: number | string | null;
  held_amount?: number | string | null;
  admin_fee?: number | string | null;
  status?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  created_at?: string | null;
}

export interface WithdrawalSummary {
  balance: number;
  coinBalance: number;
  successfulAmount: number;
  successfulCount: number;
  pendingAmount: number;
  pendingHeldAmount: number;
  pendingCount: number;
}

export interface WithdrawalStatusCounts {
  semua: number;
  pending: number;
  berhasil: number;
  gagal: number;
  dibatalkan: number;
}

export interface WithdrawalFilters {
  search: string;
  status: string;
  date: string;
  page: number;
}

export interface BankOption {
  code: string;
  name: string;
  type: "bank" | "ewallet" | "other";
  logoUrl?: string;
}

export const BANK_PRESETS: BankOption[] = [
  { code: "bca", name: "BCA", type: "bank", logoUrl: "/payment/bca.png" },
  { code: "bni", name: "BNI", type: "bank", logoUrl: "/payment/bni.png" },
  { code: "bri", name: "BRI", type: "bank", logoUrl: "/payment/bri.png" },
  { code: "mandiri", name: "Mandiri", type: "bank", logoUrl: "/payment/mandiri.png" },
  { code: "dana", name: "DANA", type: "ewallet", logoUrl: "/payment/dana.png" },
  { code: "gopay", name: "GoPay", type: "ewallet", logoUrl: "/payment/gopay.png" },
  { code: "ovo", name: "OVO", type: "ewallet", logoUrl: "/payment/ovo.png" },
  { code: "shopeepay", name: "ShopeePay", type: "ewallet", logoUrl: "/payment/shopeepay.png" },
  { code: "linkaja", name: "LinkAja", type: "ewallet", logoUrl: "/payment/linkaja.png" },
  { code: "other", name: "Bank Lainnya", type: "other" },
];

export const STATUS_OPTIONS: { label: string; value: string; countKey: keyof WithdrawalStatusCounts }[] = [
  { label: "Semua Status", value: "Semua", countKey: "semua" },
  { label: "Pending", value: "Pending", countKey: "pending" },
  { label: "Berhasil", value: "Berhasil", countKey: "berhasil" },
  { label: "Gagal", value: "Gagal", countKey: "gagal" },
  { label: "Dibatalkan", value: "Dibatalkan", countKey: "dibatalkan" },
];

/* ================================================================== */
/* HELPERS & UTILITIES                                                */
/* ================================================================== */

export function toNumber(value: unknown): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatRupiah(value: unknown): string {
  return `Rp ${toNumber(value).toLocaleString("id-ID")}`;
}

export function formatCoins(value: unknown): string {
  return `${toNumber(value).toLocaleString("id-ID")} Koin`;
}

export function formatDate(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeWithdrawalStatus(value?: string | null): string {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "success" ||
    status === "successful" ||
    status === "berhasil" ||
    status === "approved" ||
    status === "completed" ||
    status === "complete"
  ) {
    return "Berhasil";
  }

  if (
    status === "failed" ||
    status === "gagal" ||
    status === "rejected" ||
    status === "reject"
  ) {
    return "Gagal";
  }

  if (
    status === "cancelled" ||
    status === "canceled" ||
    status === "dibatalkan"
  ) {
    return "Dibatalkan";
  }

  return "Pending";
}

export function getStatusClasses(status: string): { badge: string; dot: string; label: string } {
  switch (status) {
    case "Berhasil":
      return {
        badge: "border-emerald-200/90 bg-emerald-50/90 text-emerald-700 shadow-2xs",
        dot: "bg-emerald-500",
        label: "Berhasil",
      };

    case "Gagal":
      return {
        badge: "border-rose-200/90 bg-rose-50/90 text-rose-700 shadow-2xs",
        dot: "bg-rose-500",
        label: "Gagal",
      };

    case "Dibatalkan":
      return {
        badge: "border-slate-200 bg-slate-100/90 text-slate-600 shadow-2xs",
        dot: "bg-slate-400",
        label: "Dibatalkan",
      };

    case "Pending":
    default:
      return {
        badge: "border-amber-200/90 bg-amber-50/90 text-amber-700 shadow-2xs",
        dot: "bg-amber-500",
        label: "Pending",
      };
  }
}

export function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return "-";
  const value = String(accountNumber).trim();
  if (value.length <= 4) return value;

  return `${value.slice(0, 2)}${"•".repeat(Math.max(3, value.length - 6))}${value.slice(-4)}`;
}

export function normalizeBankName(value?: string | null): string {
  if (!value) return "-";
  const name = value.trim();
  const lower = name.toLowerCase();

  if (lower === "bni") return "Bank BNI";
  if (lower === "bsi") return "Bank BSI";
  if (lower === "bca") return "Bank BCA";
  if (lower === "bri") return "Bank BRI";
  if (lower === "mandiri") return "Bank Mandiri";
  if (lower === "dana") return "DANA";
  if (lower === "gopay") return "GoPay";
  if (lower === "ovo") return "OVO";
  if (lower === "shopeepay") return "ShopeePay";
  if (lower === "linkaja") return "LinkAja";

  return name;
}

export function getBankLogo(bankName?: string | null): string | null {
  if (!bankName) return null;
  const lower = bankName.toLowerCase().trim();

  if (lower.includes("bca")) return "/payment/bca.png";
  if (lower.includes("bni")) return "/payment/bni.png";
  if (lower.includes("bri")) return "/payment/bri.png";
  if (lower.includes("mandiri")) return "/payment/mandiri.png";
  if (lower.includes("dana")) return "/payment/dana.png";
  if (lower.includes("gopay")) return "/payment/gopay.png";
  if (lower.includes("ovo")) return "/payment/ovo.png";
  if (lower.includes("shopeepay") || lower.includes("shopee")) return "/payment/shopeepay.png";
  if (lower.includes("linkaja")) return "/payment/linkaja.png";

  return null;
}

