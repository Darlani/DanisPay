"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  WalletCards,
  ArrowDownToLine,
  ArrowUpFromLine,
  UsersRound,
  Settings,
  CircleHelp,
  Crown,
  BadgePercent,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";

type SidebarProps = {
  userName: string;
  memberType: "Reguler" | "Special";
  balance: number;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
};

type MenuItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Overview",
    items: [
      {
        id: "overview",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Transactions",
    items: [
      {
        id: "orders",
        label: "Riwayat Transaksi",
        icon: ShoppingBag,
      },
      {
        id: "wallet",
        label: "Riwayat Saldo",
        icon: WalletCards,
      },
    ],
  },
  {
    label: "Balance",
    items: [
      {
        id: "deposit",
        label: "Deposit",
        icon: ArrowDownToLine,
      },
      {
        id: "withdraw",
        label: "Tarik Saldo",
        icon: ArrowUpFromLine,
      },
    ],
  },
  {
    label: "Referral",
    items: [
      {
        id: "affiliate",
        label: "Afiliasi Saya",
        icon: UsersRound,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        id: "settings",
        label: "Pengaturan",
        icon: Settings,
      },
      {
        id: "help",
        label: "Bantuan",
        icon: CircleHelp,
      },
    ],
  },
];

export default function UserSidebar({
  userName,
  memberType,
  balance,
  activeMenu,
  setActiveMenu,
}: SidebarProps) {
  void balance;

  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const firstName =
    userName?.trim()?.split(/\s+/)[0] || "Member";

  const desktopSidebarWidth = isOpen
    ? "xl:w-[clamp(230px,17vw,260px)]"
    : "xl:w-[76px]";

  const desktopSpacerWidth = isOpen
    ? "xl:w-[clamp(230px,17vw,260px)]"
    : "xl:w-[76px]";

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsMobileOpen(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);

    // Di layar mobile, tutup drawer setelah memilih menu.
    if (window.innerWidth < 1280) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* ============================================================ */}
      {/* DESKTOP SPACER                                               */}
      {/* ============================================================ */}

      <div
        aria-hidden="true"
        className={[
          "hidden shrink-0 transition-[width] duration-300 ease-out xl:block",
          desktopSpacerWidth,
        ].join(" ")}
      />

      {/* ============================================================ */}
      {/* MOBILE OVERLAY                                                */}
      {/* ============================================================ */}

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          onClick={closeMobile}
          className="fixed inset-0 z-60 bg-slate-950/30 backdrop-blur-[2px] xl:hidden"
        />
      )}

      {/* ============================================================ */}
      {/* MOBILE OPEN BUTTON                                            */}
      {/* ============================================================ */}

      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Buka navigasi"
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 xl:hidden"
      >
        <Menu size={18} strokeWidth={2} />
      </button>

      {/* ============================================================ */}
      {/* SIDEBAR                                                       */}
      {/* ============================================================ */}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-70 flex flex-col",
          "border-r border-slate-200 bg-white",
          "shadow-[8px_0_28px_rgba(15,23,42,0.045)]",
          "transition-[width,transform] duration-300 ease-out",
          "w-[min(86vw,320px)]",
          desktopSidebarWidth,
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full xl:translate-x-0",
        ].join(" ")}
      >
        {/* ========================================================== */}
        {/* HEADER / BRAND                                              */}
        {/* ========================================================== */}

        <div
          className={[
            "relative flex shrink-0 border-b border-slate-100",
            isOpen
              ? "items-start justify-between px-4 py-5"
              : "items-center justify-center px-2 py-4",
          ].join(" ")}
        >
          {isOpen ? (
            <div className="min-w-0 px-1">
              <p className="text-[9px] font-black uppercase tracking-[0.34em] text-blue-600">
                Danish
              </p>

              <h1 className="mt-0.5 text-[28px] font-black italic leading-none tracking-[-0.06em] text-slate-950">
                -TOPUP
              </h1>

              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

                <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-blue-700">
                  Official Partner
                </span>
              </div>
            </div>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[11px] font-black italic text-blue-700"
              title="DaPay"
            >
              DP
            </div>
          )}

          {/* DESKTOP COLLAPSE */}
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-label={
              isOpen
                ? "Sembunyikan sidebar"
                : "Tampilkan sidebar"
            }
            className="absolute -right-3 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 xl:inline-flex"
          >
            {isOpen ? (
              <ChevronLeft size={14} />
            ) : (
              <Menu size={14} />
            )}
          </button>

          {/* MOBILE CLOSE */}
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Tutup navigasi"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 xl:hidden"
          >
            <X size={17} />
          </button>
        </div>

        {/* ========================================================== */}
        {/* NAVIGATION                                                  */}
        {/* ========================================================== */}

        <nav
          className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4"
          aria-label="Navigasi member"
        >
          {MENU_GROUPS.map((group) => (
            <section
              key={group.label}
              className="mb-5 last:mb-0"
            >
              {isOpen && (
                <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {group.label}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeMenu === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={
                        !isOpen
                          ? item.label
                          : undefined
                      }
                      aria-current={
                        isActive
                          ? "page"
                          : undefined
                      }
                      onClick={() =>
                        handleMenuClick(item.id)
                      }
                      className={[
                        "group flex w-full items-center rounded-xl text-left transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset",

                        isOpen
                          ? "gap-3 px-3 py-2.5"
                          : "justify-center px-2 py-3",

                        isActive
                          ? "border border-blue-100 bg-blue-50 text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.06)]"
                          : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                      ].join(" ")}
                    >
                      <Icon
                        size={18}
                        strokeWidth={
                          isActive ? 2.2 : 1.9
                        }
                        className={[
                          "shrink-0 transition-colors",
                          isActive
                            ? "text-blue-600"
                            : "text-slate-500 group-hover:text-slate-700",
                        ].join(" ")}
                      />

                      {isOpen && (
                        <span className="truncate text-[12px] font-semibold tracking-tight">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        {/* ========================================================== */}
        {/* BOTTOM AREA                                                */}
        {/* ========================================================== */}

        <div className="shrink-0 border-t border-slate-100 px-3 py-3">
          {isOpen ? (
            <>
              {/* UPGRADE */}
              {memberType !== "Special" && (
                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick("upgrade")
                  }
                  className="mb-3 w-full rounded-2xl border border-indigo-100 bg-linear-to-br from-violet-500 via-indigo-500 to-blue-600 p-3.5 text-left shadow-[0_10px_24px_rgba(79,70,229,0.14)] transition hover:shadow-[0_12px_28px_rgba(79,70,229,0.2)]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                      <Crown size={15} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-indigo-100">
                        Upgrade ke
                      </p>

                      <h3 className="mt-0.5 text-[12px] font-black leading-none text-white">
                        Special Member
                      </h3>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <Benefit>
                      Cashback lebih besar
                    </Benefit>

                    <Benefit>
                      Komisi referral lebih tinggi
                    </Benefit>

                    <Benefit>
                      Promo eksklusif
                    </Benefit>

                    <Benefit>
                      Layanan prioritas
                    </Benefit>
                  </div>

                  <div className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-[9px] font-black text-indigo-700">
                    Upgrade Sekarang
                    <span aria-hidden="true">→</span>
                  </div>
                </button>
              )}

              {/* PROFILE */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-500 text-xs font-black text-white">
                    {firstName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-slate-900">
                      {userName || "DaPay User"}
                    </p>

                    <p className="truncate text-[9px] text-slate-400">
                      Member DaPay
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <BadgePercent
                    size={11}
                    className={
                      memberType === "Special"
                        ? "text-amber-500"
                        : "text-blue-500"
                    }
                  />

                  <span
                    className={[
                      "text-[8px] font-bold uppercase tracking-[0.12em]",
                      memberType === "Special"
                        ? "text-amber-600"
                        : "text-blue-600",
                    ].join(" ")}
                  >
                    {memberType === "Special"
                      ? "Special Member"
                      : "Reguler Member"}
                  </span>
                </div>
              </div>

              <div className="mt-3 px-3">
                <p className="text-[8px] font-medium leading-4 text-slate-400">
                  © 2026 Danishtopup
                </p>

                <p className="text-[8px] leading-4 text-slate-300">
                  Official Partner
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {memberType !== "Special" && (
                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick("upgrade")
                  }
                  title="Upgrade ke Special Member"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-blue-600 text-white shadow-sm transition hover:scale-[1.02]"
                >
                  <Crown size={15} />
                </button>
              )}

              <div
                title={userName || "DaPay User"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-500 text-xs font-black text-white"
              >
                {firstName.charAt(0).toUpperCase()}
              </div>

              <div className="my-1 h-px w-8 bg-slate-200" />

              <button
                type="button"
                title="Pengaturan"
                onClick={() =>
                  handleMenuClick("settings")
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
                aria-label="Pengaturan"
              >
                <Settings size={17} />
              </button>

              <button
                type="button"
                title="Bantuan"
                onClick={() =>
                  handleMenuClick("help")
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
                aria-label="Bantuan"
              >
                <CircleHelp size={17} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Benefit({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5 text-[8px] leading-4 text-indigo-50">
      <span className="mt-0.75 shrink-0 text-[7px]">
        ✓
      </span>

      <span>{children}</span>
    </div>
  );
}