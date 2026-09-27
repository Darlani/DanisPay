"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Wallet,
  ShoppingBag,
  CreditCard,
  Users,
  History,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { localizeHref } from "@/lib/i18n/config";

type BottomNavKey =
  | "overview"
  | "orders"
  | "wallet"
  | "deposit"
  | "catalog"
  | "affiliate";

type BottomNavItem = {
  key: BottomNavKey;
  icon: typeof LayoutDashboard;
  labelKey: string;
};

const LIVE_ITEMS: BottomNavItem[] = [
  {
    key: "overview",
    icon: LayoutDashboard,
    labelKey: "dashboard.nav.home",
  },
  {
    key: "orders",
    icon: ShoppingBag,
    labelKey: "dashboard.nav.order",
  },
  {
    key: "wallet",
    icon: Wallet,
    labelKey: "dashboard.nav.saldo",
  },
  {
    key: "deposit",
    icon: CreditCard,
    labelKey: "dashboard.nav.deposit",
  },
  {
    key: "affiliate",
    icon: Users,
    labelKey: "dashboard.nav.referral",
  },
];

const SANDBOX_ITEMS: BottomNavItem[] = [
  {
    key: "overview",
    icon: LayoutDashboard,
    labelKey: "dashboard.nav.home",
  },
  {
    key: "catalog",
    icon: ShoppingBag,
    labelKey: "dashboard.nav.catalog",
  },
  {
    key: "orders",
    icon: History,
    labelKey: "dashboard.nav.simulasi",
  },
  {
    key: "wallet",
    icon: Wallet,
    labelKey: "dashboard.nav.saldo",
  },
];

type UserBottomNavProps = {
  active?: string;
  isSandboxMode?: boolean;
};

export default function UserBottomNav({
  active = "overview",
  isSandboxMode = false,
}: UserBottomNavProps) {
  const { t, locale } = useI18n();
  const navItems = isSandboxMode ? SANDBOX_ITEMS : LIVE_ITEMS;
  const basePath = localizeHref("/user", locale);

  return (
    <nav
      className="fixed bottom-2.5 xs:bottom-3 left-2.5 xs:left-3 right-2.5 xs:right-3 z-50 flex rounded-2xl xs:rounded-3xl border border-slate-200/90 bg-white/95 p-1.5 xs:p-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-md md:hidden sm:left-4 sm:right-4"
      aria-label={t("dashboard.nav.memberNav")}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const selected = item.key === active;
        const label = t(item.labelKey);

        return (
          <Link
            key={item.key}
            href={item.key === "overview" ? basePath : `${basePath}?tab=${item.key}`}
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={[
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 xs:gap-1 rounded-xl px-1 xs:px-2 py-1.5 xs:py-2 transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95",
              selected
                ? "bg-blue-50 text-blue-600 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
            ].join(" ")}
          >
            <Icon
              size={18}
              strokeWidth={selected ? 2.3 : 1.9}
              className="shrink-0 xs:h-[19px] xs:w-[19px]"
            />

            <span
              className={[
                "truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold leading-tight",
                selected ? "text-blue-700 font-bold" : "text-slate-500",
              ].join(" ")}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}