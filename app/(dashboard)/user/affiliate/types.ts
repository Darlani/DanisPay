/* ================================================================== */
/* TYPES & INTERFACES                                                */
/* ================================================================== */

export interface Referral {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  created_at?: string | null;
}

export interface BalanceLog {
  id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  type?: string | null;
  amount?: number | string | null;
  description?: string | null;
  initial_balance?: number | string | null;
  final_balance?: number | string | null;
  created_at?: string | null;
  asset_type?: "balance" | "coin" | null;
}

export interface Profile {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  referral_code?: string | null;
  balance?: number | string | null;
  coin_balance?: number | string | null;
  member_type?: string | null;
}

export interface CommissionEntry {
  log: BalanceLog;
  amount: number;
}

export interface AffiliateSummary {
  totalCommission: number;
  monthlyCommission: number;
  totalReferralCount: number;
  memberType: string;
}

export type MemberSortOption = "all" | "newest" | "oldest" | "name_asc" | "name_desc";

export interface MemberFilterOption {
  value: MemberSortOption;
  label: string;
}

export const MEMBER_FILTER_OPTIONS: MemberFilterOption[] = [
  { value: "all", label: "Semua Member" },
  { value: "newest", label: "Terbaru Bergabung" },
  { value: "oldest", label: "Terlama Bergabung" },
  { value: "name_asc", label: "Nama (A - Z)" },
  { value: "name_desc", label: "Nama (Z - A)" },
];

export interface AffiliateFilters {
  search: string;
  date: string;
  sortBy: MemberSortOption;
  page: number;
}

export const PAGE_SIZE = 10;

/* ================================================================== */
/* HELPER FUNCTIONS                                                   */
/* ================================================================== */

export function toNumber(value: unknown): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatRupiah(value: unknown): string {
  return `Rp ${toNumber(value).toLocaleString("id-ID")}`;
}

export function formatDate(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function formatDateTime(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export function formatDateOnly(isoString: string): string {
  if (!isoString) return "";
  const parts = isoString.split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return isoString;
}

export function normalizeType(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

/**
 * Mask email address for downline privacy (e.g. ar***@domain.com)
 */
export function maskEmail(email?: string | null): string {
  if (!email) return "-";

  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0] || "*"}***@${domain}`;
  }

  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Get uppercase first initial from name for avatar display
 */
export function getInitial(name?: string | null): string {
  return String(name || "M").trim().charAt(0).toUpperCase() || "M";
}

/**
 * Extract authoritative referral commission logs from balance_logs
 * Note: Referral commissions are positive balance additions categorized as 'referral' or 'commission'.
 */
export function getReferralCommissionLogs(logs: BalanceLog[]): CommissionEntry[] {
  return logs
    .filter((log) => {
      const type = normalizeType(log.type);
      const amount = toNumber(log.amount);
      const isReferralType = ["referral", "commission"].includes(type);
      const isPositive = amount > 0;
      const assetValid = !log.asset_type || log.asset_type === "balance";

      return isReferralType && isPositive && assetValid;
    })
    .map((log) => ({
      log,
      amount: toNumber(log.amount),
    }));
}

