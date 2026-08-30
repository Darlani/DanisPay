export const PAGE_SIZE = 10;

/* ================================================================== */
/* TYPES                                                              */
/* ================================================================== */

export interface DepositPaymentMethod {
  methodKey: string;
  name: string;
  accountName: string;
  accountNo: string;
  logoUrl: string | null;
  isQr: boolean;
  minPrice: string | null;
}

export interface DepositInstruction {
  depositId: string;
  amount: string;
  uniqueCode: number;
  totalAmount: string;
  payment: Omit<DepositPaymentMethod, "minPrice">;
  adminContact: string | null;
  qrisString: string | null;
}

export interface Deposit {
  id: string;
  deposit_id?: string | null;
  amount?: number | string | null;
  /**
   * CATATAN PENGEMBANG (BACKEND & DATABASE MAPPING):
   * Field `unique_code` pada database (tabel deposits) dan API/RPC backend merepresentasikan
   * digit kode unik verifikasi pembayaran. Pada antarmuka pengguna (frontend UI), nilai ini
   * ditampilkan dengan istilah "Biaya Layanan" untuk kejelasan UX tanpa mengubah skema basis data.
   */
  unique_code?: number | string | null;
  total_amount?: number | string | null;
  payment_method?: string | null;
  payment_channel?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export type DepositStatus =
  | "Pending"
  | "Berhasil"
  | "Gagal"
  | "Dibatalkan"
  | string;

export interface DepositSummary {
  balance: number;
  coinBalance: number;
  successfulAmount: number;
  successfulCount: number;
  pendingAmount: number;
  pendingCount: number;
  totalAmount: number;
  totalCount: number;
}

export interface DepositFilters {
  search: string;
  status: string;
  paymentMethod: string;
  date: string;
  page: number;
  limit: number;
  sort: "newest" | "oldest" | "highest" | "lowest";
}

export interface DashboardResponse {
  success?: boolean;
  data?: {
    profile?: {
      balance?: number | string | null;
      coin_balance?: number | string | null;
      coinBalance?: number | string | null;
      full_name?: string | null;
      email?: string | null;
      member_type?: string | null;
    };
    deposits?: Deposit[];
  };
  error?: string;
}

export interface DepositStatusCounts {
  semua: number;
  pending: number;
  berhasil: number;
  gagal: number;
  dibatalkan: number;
}

export const STATUS_OPTIONS: {
  key: string;
  label: string;
  countKey: keyof DepositStatusCounts;
}[] = [
  { key: "Semua", label: "Semua Status", countKey: "semua" },
  { key: "Pending", label: "Pending", countKey: "pending" },
  { key: "Berhasil", label: "Berhasil", countKey: "berhasil" },
  { key: "Gagal", label: "Gagal", countKey: "gagal" },
  { key: "Dibatalkan", label: "Dibatalkan", countKey: "dibatalkan" },
];

export const SORT_OPTIONS: { value: DepositFilters["sort"]; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "highest", label: "Nominal Tertinggi" },
  { value: "lowest", label: "Nominal Terendah" },
];

export const PRESET_AMOUNTS = [
  10000,
  25000,
  50000,
  100000,
  250000,
  500000,
  1000000,
  2000000,
];

/* ================================================================== */
/* HELPERS & FORMATTERS                                               */
/* ================================================================== */

export function toNumber(value: unknown): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatRupiah(value: unknown): string {
  return `Rp ${toNumber(value).toLocaleString("id-ID")}`;
}

export function formatDepositAmount(amount: string | number): string {
  try {
    return new Intl.NumberFormat("id-ID").format(BigInt(String(amount)));
  } catch {
    return String(amount);
  }
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

export function formatDateOnly(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function normalizeDepositStatus(value?: string | null): DepositStatus {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "success" ||
    status === "successful" ||
    status === "berhasil" ||
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

export function getStatusClasses(status: string) {
  const normalized = normalizeDepositStatus(status);

  switch (normalized) {
    case "Berhasil":
      return {
        badge:
          "border-emerald-200/90 bg-emerald-50/90 text-emerald-700 shadow-2xs",
        dot: "bg-emerald-500",
        label: "Berhasil",
        text: "text-emerald-700",
        bg: "bg-emerald-50",
      };

    case "Gagal":
      return {
        badge: "border-rose-200/90 bg-rose-50/90 text-rose-700 shadow-2xs",
        dot: "bg-rose-500",
        label: "Gagal",
        text: "text-rose-700",
        bg: "bg-rose-50",
      };

    case "Dibatalkan":
      return {
        badge: "border-slate-200 bg-slate-100/90 text-slate-600 shadow-2xs",
        dot: "bg-slate-400",
        label: "Dibatalkan",
        text: "text-slate-600",
        bg: "bg-slate-100",
      };

    default:
      return {
        badge: "border-amber-200/90 bg-amber-50/90 text-amber-700 shadow-2xs",
        dot: "bg-amber-500 animate-pulse",
        label: "Pending",
        text: "text-amber-700",
        bg: "bg-amber-50",
      };
  }
}

export function normalizePaymentName(value?: string | null): string {
  if (!value) return "-";
  const method = value.trim().toLowerCase();

  if (method === "qris") return "QRIS";
  if (method === "dana") return "DANA";
  if (method === "gopay") return "GoPay";
  if (method === "ovo") return "OVO";
  if (method === "shopeepay") return "ShopeePay";
  if (method === "bni_manual" || method === "bni") return "BNI";
  if (method === "bsi_manual" || method === "bsi") return "BSI";
  if (method === "bca_manual" || method === "bca") return "BCA";
  if (method === "bri_manual" || method === "bri") return "BRI";
  if (method === "mandiri_manual" || method === "mandiri") return "Mandiri";

  return value;
}

export function getDepositId(deposit: Deposit): string {
  return deposit.deposit_id || deposit.id || "-";
}

export function displayDepositId(value: string): string {
  if (!value || value === "-") return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function getPaymentMethodLogo(method?: string | null): string | null {
  if (!method) return null;
  const value = method.toLowerCase().trim();

  if (value.includes("dana")) return "/payment/dana.png";
  if (value.includes("gopay") || value.includes("go-pay")) return "/payment/gopay.png";
  if (value.includes("shopee") || value.includes("spay")) return "/payment/shopeepay.png";
  if (value.includes("ovo")) return "/payment/ovo.png";
  if (value.includes("qris")) return "/payment/qris.png";
  if (value.includes("linkaja") || value.includes("link aja")) return "/payment/linkaja.png";
  if (value.includes("bca")) return "/payment/bca.png";
  if (value.includes("bni")) return "/payment/bni.png";
  if (value.includes("bri")) return "/payment/bri.png";
  if (value.includes("mandiri")) return "/payment/mandiri.png";
  if (value.includes("indomaret") || value.includes("indomart")) return "/payment/indomaret.png";
  if (value.includes("alfamart") || value.includes("alfamidi") || value.includes("alfa")) return "/payment/alfamart.png";
  if (value.includes("sakuku")) return "/payment/sakuku.png";
  if (value.includes("isaku") || value.includes("i-saku")) return "/payment/isaku.png";
  if (value.includes("atm")) return "/payment/atm-bersama.png";

  return null;
}
