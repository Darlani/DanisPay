"use client";

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
  onNavigate?: (menu: string) => void;
};

export default function UserBottomNav({
  active = "overview",
  onNavigate,
}: UserBottomNavProps) {
  const handleNavigate = (
    menu: string,
  ) => {
    onNavigate?.(menu);
  };

  return (
    <nav
      className="fixed bottom-3 left-3 right-3 z-50 flex rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-md xl:hidden sm:left-4 sm:right-4"
      aria-label="Navigasi member"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected =
          item.key === active;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() =>
              handleNavigate(item.key)
            }
            aria-current={
              selected
                ? "page"
                : undefined
            }
            className={[
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              selected
                ? "bg-blue-50 text-blue-600"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
            ].join(" ")}
          >
            <Icon
              size={19}
              strokeWidth={
                selected ? 2.3 : 1.9
              }
            />

            <span
              className={[
                "text-[9px] font-semibold",
                selected
                  ? "text-blue-700"
                  : "text-slate-500",
              ].join(" ")}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}