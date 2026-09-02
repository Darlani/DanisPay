export type HelpCategory =
  | "all"
  | "account"
  | "transaction"
  | "balance"
  | "coin"
  | "referral";

export interface FAQItem {
  id: string;
  category: Exclude<HelpCategory, "all">;
  question: string;
  answer: string;
}

export type CategoryCounts = Record<HelpCategory, number>;

export interface CategoryItem {
  id: HelpCategory;
  label: string;
  description: string;
  iconName: "layers" | "user" | "arrow-left-right" | "wallet" | "coins" | "users";
}

export const CATEGORY_DEFINITIONS: CategoryItem[] = [
  {
    id: "all",
    label: "Semua",
    description: "Semua topik pertanyaan",
    iconName: "layers",
  },
  {
    id: "account",
    label: "Akun",
    description: "Login, password & keamanan",
    iconName: "user",
  },
  {
    id: "transaction",
    label: "Transaksi",
    description: "Status pesanan & refund",
    iconName: "arrow-left-right",
  },
  {
    id: "balance",
    label: "Saldo",
    description: "Deposit & penarikan",
    iconName: "wallet",
  },
  {
    id: "coin",
    label: "Koin",
    description: "Cashback & reward",
    iconName: "coins",
  },
  {
    id: "referral",
    label: "Afiliasi",
    description: "Referral & komisi mitra",
    iconName: "users",
  },
];

export function getCategoryBadgeClasses(category: Exclude<HelpCategory, "all">): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
} {
  switch (category) {
    case "account":
      return {
        badgeBg: "bg-blue-50",
        badgeText: "text-blue-700",
        badgeBorder: "border-blue-200/80",
        label: "Akun",
      };
    case "transaction":
      return {
        badgeBg: "bg-emerald-50",
        badgeText: "text-emerald-700",
        badgeBorder: "border-emerald-200/80",
        label: "Transaksi",
      };
    case "balance":
      return {
        badgeBg: "bg-amber-50",
        badgeText: "text-amber-800",
        badgeBorder: "border-amber-200/80",
        label: "Saldo",
      };
    case "coin":
      return {
        badgeBg: "bg-purple-50",
        badgeText: "text-purple-700",
        badgeBorder: "border-purple-200/80",
        label: "Koin",
      };
    case "referral":
      return {
        badgeBg: "bg-indigo-50",
        badgeText: "text-indigo-700",
        badgeBorder: "border-indigo-200/80",
        label: "Afiliasi",
      };
    default:
      return {
        badgeBg: "bg-slate-50",
        badgeText: "text-slate-700",
        badgeBorder: "border-slate-200",
        label: "Umum",
      };
  }
}

