import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Gift,
  HelpCircle,
  Package,
  RefreshCw,
  ShoppingBag,
  Sliders,
  Zap,
} from "lucide-react";

export type AssetType = "balance" | "coin";
export type FlowType = "income" | "expense" | "neutral";

export interface BalanceLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  amount?: number | string | null;
  type?: string | null;
  description?: string | null;
  initial_balance?: number | string | null;
  final_balance?: number | string | null;
  created_at?: string | null;
  asset_type?: AssetType | null;
  coin_amount?: number | string | null;
  initial_coin_balance?: number | string | null;
  final_coin_balance?: number | string | null;
}

export interface WalletEntry {
  log: BalanceLog;
  asset: AssetType;
  amount: number;
  description: string;
  type: string;
  flow: FlowType;
  createdAt: string;
}

export interface WalletSummary {
  balance: number;
  coinBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalCoinIncome: number;
  totalCoinExpense: number;
  totalCount: number;
}

export interface WalletFilters {
  search: string;
  asset: "Semua" | "Saldo" | "Koin";
  type: string;
  flow: "Semua" | "Masuk" | "Keluar";
  date: string;
  page: number;
  limit: number;
}

export interface DashboardResponse {
  success?: boolean;
  data?: {
    profile?: {
      balance?: number | string | null;
      coin_balance?: number | string | null;
      coinBalance?: number | string | null;
    };
    balanceLogs?: BalanceLog[];
  };
  error?: string;
}

/* ================================================================== */
/* NUMERIC & FORMATTING HELPERS                                       */
/* ================================================================== */

export function toNumber(value: unknown): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatRupiah(value: unknown): string {
  const amount = toNumber(value);
  return `Rp ${Math.abs(amount).toLocaleString("id-ID")}`;
}

export function formatSignedRupiah(value: unknown): string {
  const amount = toNumber(value);
  if (amount > 0) {
    return `+Rp ${amount.toLocaleString("id-ID")}`;
  }
  if (amount < 0) {
    return `-Rp ${Math.abs(amount).toLocaleString("id-ID")}`;
  }
  return "Rp 0";
}

export function formatCoins(value: unknown): string {
  const amount = toNumber(value);
  return `${Math.abs(amount).toLocaleString("id-ID")} Koin`;
}

export function formatSignedCoins(value: unknown): string {
  const amount = toNumber(value);
  if (amount > 0) {
    return `+${amount.toLocaleString("id-ID")} Koin`;
  }
  if (amount < 0) {
    return `-${Math.abs(amount).toLocaleString("id-ID")} Koin`;
  }
  return "0 Koin";
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

export function formatDateShort(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function normalizeType(type?: string | null): string {
  return String(type || "").trim().toLowerCase();
}

/* ================================================================== */
/* AGENTS.MD COMPLIANT TYPE MAPPING & DIRECTION RULES                 */
/* ================================================================== */

export function mapTypeLabel(type?: string | null): string {
  if (!type) return "Lainnya";
  const raw = type.trim();
  const normalized = raw.toLowerCase();

  switch (normalized) {
    case "deposit":
      return "Deposit";
    case "payment":
    case "pembayaran":
    case "purchase":
    case "order":
      return "Payment";
    case "withdraw":
    case "penarikan":
      return "Withdraw";
    case "refund":
      return "Refund";
    case "cashback":
      return "Cashback";
    case "referral":
    case "komisi":
      return "Referral";
    case "bonus":
    case "reward":
      return "Bonus";
    case "adminadjustment":
    case "admin_adjustment":
    case "adjustment":
      return "Admin Adjustment";
    case "upgrade":
      return "Upgrade";
    case "other":
    case "lainnya":
      return "Lainnya";
    default:
      // Unknown legacy types remain visible and nicely formatted
      return raw;
  }
}

export function detectAsset(log: BalanceLog): AssetType {
  if (log.asset_type) {
    return log.asset_type;
  }

  const type = normalizeType(log.type);
  if (["cashback", "bonus", "reward"].includes(type)) {
    return "coin";
  }

  return "balance";
}

/**
 * Direction is determined strictly from amount sign (AGENTS.md policy):
 * - amount > 0 -> income ("Masuk")
 * - amount < 0 -> expense ("Keluar")
 * - amount == 0 -> neutral ("Netral")
 */
export function detectFlow(amount: number): FlowType {
  if (amount > 0) return "income";
  if (amount < 0) return "expense";
  return "neutral";
}

export function flowLabel(flow: FlowType): "Masuk" | "Keluar" | "Netral" {
  if (flow === "income") return "Masuk";
  if (flow === "expense") return "Keluar";
  return "Netral";
}

/* ================================================================== */
/* ENTRY METADATA & STYLING HELPER                                    */
/* ================================================================== */

export interface EntryMeta {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  badgeClass: string;
  dotClass: string;
}

export function getEntryMeta(entry: WalletEntry): EntryMeta {
  const norm = normalizeType(entry.type);
  const displayLabel = mapTypeLabel(entry.type);

  if (entry.asset === "coin") {
    if (norm === "cashback") {
      return {
        label: "Cashback",
        icon: ShoppingBag,
        iconClass: "bg-purple-100/80 text-purple-700 border-purple-200/80",
        badgeClass: "border-purple-200/90 bg-purple-50 text-purple-800",
        dotClass: "bg-purple-500",
      };
    }
    if (norm === "reward" || norm === "bonus") {
      return {
        label: displayLabel,
        icon: Gift,
        iconClass: "bg-amber-100/80 text-amber-700 border-amber-200/80",
        badgeClass: "border-amber-200/90 bg-amber-50 text-amber-800",
        dotClass: "bg-amber-500",
      };
    }
    if (norm === "refund") {
      return {
        label: "Refund Koin",
        icon: RefreshCw,
        iconClass: "bg-blue-100/80 text-blue-700 border-blue-200/80",
        badgeClass: "border-blue-200/90 bg-blue-50 text-blue-800",
        dotClass: "bg-blue-500",
      };
    }
    return {
      label: displayLabel,
      icon: Coins,
      iconClass: "bg-violet-100/80 text-violet-700 border-violet-200/80",
      badgeClass: "border-violet-200/90 bg-violet-50 text-violet-800",
      dotClass: "bg-violet-500",
    };
  }

  // Balance Assets
  if (norm === "deposit") {
    return {
      label: "Deposit",
      icon: ArrowDownLeft,
      iconClass: "bg-emerald-100/80 text-emerald-700 border-emerald-200/80",
      badgeClass: "border-emerald-200/90 bg-emerald-50 text-emerald-800",
      dotClass: "bg-emerald-500",
    };
  }

  if (norm === "withdraw" || norm === "penarikan") {
    return {
      label: "Penarikan",
      icon: ArrowUpRight,
      iconClass: "bg-rose-100/80 text-rose-700 border-rose-200/80",
      badgeClass: "border-rose-200/90 bg-rose-50 text-rose-800",
      dotClass: "bg-rose-500",
    };
  }

  if (norm === "payment" || norm === "purchase" || norm === "order" || norm === "pembayaran") {
    return {
      label: "Pembayaran",
      icon: Package,
      iconClass: "bg-blue-100/80 text-blue-700 border-blue-200/80",
      badgeClass: "border-blue-200/90 bg-blue-50 text-blue-800",
      dotClass: "bg-blue-500",
    };
  }

  if (norm === "refund") {
    return {
      label: "Refund",
      icon: RefreshCw,
      iconClass: "bg-sky-100/80 text-sky-700 border-sky-200/80",
      badgeClass: "border-sky-200/90 bg-sky-50 text-sky-800",
      dotClass: "bg-sky-500",
    };
  }

  if (norm === "referral" || norm === "komisi") {
    return {
      label: "Referral",
      icon: Gift,
      iconClass: "bg-teal-100/80 text-teal-700 border-teal-200/80",
      badgeClass: "border-teal-200/90 bg-teal-50 text-teal-800",
      dotClass: "bg-teal-500",
    };
  }

  if (norm === "bonus") {
    return {
      label: "Bonus",
      icon: Zap,
      iconClass: "bg-amber-100/80 text-amber-700 border-amber-200/80",
      badgeClass: "border-amber-200/90 bg-amber-50 text-amber-800",
      dotClass: "bg-amber-500",
    };
  }

  if (norm === "adminadjustment" || norm === "admin_adjustment" || norm === "adjustment") {
    return {
      label: "Admin Adjustment",
      icon: Sliders,
      iconClass: "bg-indigo-100/80 text-indigo-700 border-indigo-200/80",
      badgeClass: "border-indigo-200/90 bg-indigo-50 text-indigo-800",
      dotClass: "bg-indigo-500",
    };
  }

  if (norm === "upgrade") {
    return {
      label: "Upgrade",
      icon: Zap,
      iconClass: "bg-violet-100/80 text-violet-700 border-violet-200/80",
      badgeClass: "border-violet-200/90 bg-violet-50 text-violet-800",
      dotClass: "bg-violet-500",
    };
  }

  if (entry.flow === "expense") {
    return {
      label: displayLabel,
      icon: ArrowUpRight,
      iconClass: "bg-rose-100/80 text-rose-700 border-rose-200/80",
      badgeClass: "border-rose-200/90 bg-rose-50 text-rose-800",
      dotClass: "bg-rose-500",
    };
  }

  if (entry.flow === "income") {
    return {
      label: displayLabel,
      icon: ArrowDownLeft,
      iconClass: "bg-emerald-100/80 text-emerald-700 border-emerald-200/80",
      badgeClass: "border-emerald-200/90 bg-emerald-50 text-emerald-800",
      dotClass: "bg-emerald-500",
    };
  }

  return {
    label: displayLabel,
    icon: HelpCircle,
    iconClass: "bg-slate-100 text-slate-600 border-slate-200",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    dotClass: "bg-slate-400",
  };
}
