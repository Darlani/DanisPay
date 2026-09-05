import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  FlaskConical,
  Globe,
  Grid,
  History as HistoryIcon,
  Landmark,
  LayoutDashboard,
  Package,
  Server,
  Settings,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export type AdminTabId =
  | "Dashboard"
  | "Analytics"
  | "Category"
  | "Products"
  | "AccountDatabase"
  | "Event"
  | "Payment"
  | "Orders"
  | "Deposit"
  | "Withdrawal"
  | "Providers"
  | "Explore"
  | "History"
  | "Settings"
  | "TestCenter";

export interface AdminNavItem {
  id: AdminTabId;
  label: string;
  icon: LucideIcon;
  slug: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_TAB_SLUGS: Record<AdminTabId, string> = {
  Dashboard: "dashboard",
  Analytics: "analytics",
  Category: "category",
  Products: "products",
  AccountDatabase: "account-database",
  Event: "event",
  Payment: "payment",
  Orders: "orders",
  Deposit: "deposit",
  Withdrawal: "withdrawal",
  Providers: "providers",
  Explore: "explore",
  History: "history",
  Settings: "settings",
  TestCenter: "test-center",
};

export const VALID_ADMIN_TABS: Record<string, AdminTabId> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  category: "Category",
  products: "Products",
  "account-database": "AccountDatabase",
  accountdatabase: "AccountDatabase",
  event: "Event",
  payment: "Payment",
  orders: "Orders",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  withdraw: "Withdrawal",
  providers: "Providers",
  explore: "Explore",
  history: "History",
  settings: "Settings",
  "test-center": "TestCenter",
  testcenter: "TestCenter",
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        id: "Dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        slug: "dashboard",
      },
      {
        id: "Analytics",
        label: "Analytics",
        icon: TrendingUp,
        slug: "analytics",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        id: "Category",
        label: "Category",
        icon: Grid,
        slug: "category",
      },
      {
        id: "Products",
        label: "Products",
        icon: Package,
        slug: "products",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        id: "AccountDatabase",
        label: "Account Database",
        icon: Users,
        slug: "account-database",
      },
      {
        id: "Event",
        label: "Event",
        icon: Calendar,
        slug: "event",
      },
      {
        id: "Payment",
        label: "Payment",
        icon: Landmark,
        slug: "payment",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        id: "Orders",
        label: "Orders",
        icon: ShoppingBag,
        slug: "orders",
      },
      {
        id: "Deposit",
        label: "Deposit",
        icon: Wallet,
        slug: "deposit",
      },
      {
        id: "Withdrawal",
        label: "Withdrawal",
        icon: Landmark,
        slug: "withdrawal",
      },
      {
        id: "Providers",
        label: "Providers",
        icon: Server,
        slug: "providers",
      },
    ],
  },
  {
    label: "Data & Audit",
    items: [
      {
        id: "Explore",
        label: "Explore",
        icon: Globe,
        slug: "explore",
      },
      {
        id: "History",
        label: "History",
        icon: HistoryIcon,
        slug: "history",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        id: "Settings",
        label: "Settings",
        icon: Settings,
        slug: "settings",
      },
      {
        id: "TestCenter",
        label: "Test Center",
        icon: FlaskConical,
        slug: "test-center",
      },
    ],
  },
];

export function resolveAdminTab(rawTab?: string | null): AdminTabId {
  const normalized = rawTab?.toLowerCase().trim() || "";
  return VALID_ADMIN_TABS[normalized] || "Dashboard";
}

export function getAdminTabHref(tabId: AdminTabId): string {
  if (tabId === "Dashboard") {
    return "/admin";
  }
  const slug = ADMIN_TAB_SLUGS[tabId] || tabId.toLowerCase();
  return `/admin?tab=${slug}`;
}

export interface AdminPageMetaItem {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

export const ADMIN_PAGE_META: Record<AdminTabId, AdminPageMetaItem> = {
  Dashboard: {
    title: "Dashboard",
    subtitle: "Ringkasan operasional DaPay, antrean yang perlu ditindak, dan aktivitas order terbaru.",
    icon: LayoutDashboard,
  },
  Analytics: {
    title: "Analytics",
    subtitle: "Pantau kondisi bisnis DaPay secara menyeluruh dalam satu tampilan yang mudah dipahami.",
    icon: TrendingUp,
  },
  Category: {
    title: "Kategori Manager",
    subtitle: "Kelola struktur kategori produk dan konfigurasi katalog DaPay.",
    icon: Grid,
  },
  Products: {
    title: "Product Management",
    subtitle: "Katalog dan manajemen produk digital, sinkronisasi provider, dan margin harga.",
    icon: Package,
  },
  AccountDatabase: {
    title: "Account Database",
    subtitle: "Kelola akun staff, member dan wallet DaPay dari satu pusat data.",
    icon: Users,
  },
  Event: {
    title: "Event & Campaign Center",
    subtitle: "Kelola campaign, promo, maintenance, dan agenda operasional sistem.",
    icon: Calendar,
  },
  Payment: {
    title: "Payment Management",
    subtitle: "Kelola metode pembayaran, provider QRIS, dan biaya transaksi.",
    icon: Landmark,
  },
  Orders: {
    title: "Orders",
    subtitle: "Kelola pesanan dan pantau status transaksi order dalam satu workspace.",
    icon: ShoppingBag,
  },
  Deposit: {
    title: "Deposit",
    subtitle: "Kelola deposit member dan pantau status mutasi secara real-time.",
    icon: Wallet,
  },
  Withdrawal: {
    title: "Withdrawal",
    subtitle: "Kelola pengajuan penarikan saldo member dan proses verifikasi pencairan dana.",
    icon: Landmark,
  },
  Providers: {
    title: "Provider Control Center",
    subtitle: "Kendali operasional terpusat, status runtime, dan telemetry seluruh vendor digital goods DaPay.",
    icon: Server,
  },
  Explore: {
    title: "Explore Database",
    subtitle: "Jelajahi dan analisis data operasional DaPay dari berbagai sumber dalam satu workspace.",
    icon: Globe,
  },
  History: {
    title: "Central Audit Hub",
    subtitle: "Riwayat audit komprehensif, mutasi modal provider, user, dan log admin.",
    icon: HistoryIcon,
  },
  Settings: {
    title: "Store Settings",
    subtitle: "Konfigurasi toko, informasi kontak, running text, dan pengaturan umum sistem.",
    icon: Settings,
  },
  TestCenter: {
    title: "Sandbox Test Center",
    subtitle: "Konsol verifikasi QA interaktif, audit isolasi finansial, dan pengujian invariant status DaPay.",
    icon: FlaskConical,
  },
};
