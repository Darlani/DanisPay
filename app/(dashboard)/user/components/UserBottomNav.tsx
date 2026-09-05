"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Wallet,
  ShoppingBag,
  CreditCard,
  Users,
} from "lucide-react";

type BottomNavItem = {
  key:
    | "overview"
    | "orders"
    | "wallet"
    | "deposit"
    | "affiliate";
  icon: typeof LayoutDashboard;
  label: string;
};

const items: BottomNavItem[] = [
  {
    key: "overview",
    icon: LayoutDashboard,
    label: "Home",
  },
  {
    key: "orders",
    icon: ShoppingBag,
    label: "Order",
  },
  {
    key: "wallet",
    icon: Wallet,
    label: "Saldo",
  },
  {
    key: "deposit",
    icon: CreditCard,
    label: "Deposit",
  },
  {
    key: "affiliate",
    icon: Users,
    label: "Referral",
  },
];

type UserBottomNavProps = {
  active?: string;
};

export default function UserBottomNav({
  active = "overview",
}: UserBottomNavProps) {
  return (
    <nav
      className="fixed bottom-2.5 xs:bottom-3 left-2.5 xs:left-3 right-2.5 xs:right-3 z-50 flex rounded-2xl xs:rounded-3xl border border-slate-200/90 bg-white/95 p-1.5 xs:p-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-md md:hidden sm:left-4 sm:right-4"
      aria-label="Navigasi member"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected =
          item.key === active;

        return (
          <Link
            key={item.key}
            href={item.key === "overview" ? "/user" : `/user?tab=${item.key}`}
            scroll={false}
            aria-current={
              selected
                ? "page"
                : undefined
            }
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
              strokeWidth={
                selected ? 2.3 : 1.9
              }
              className="shrink-0 xs:h-[19px] xs:w-[19px]"
            />

            <span
              className={[
                "truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold leading-tight",
                selected
                  ? "text-blue-700 font-bold"
                  : "text-slate-500",
              ].join(" ")}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}