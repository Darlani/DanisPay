"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  ChevronLeft,
  ChevronDown,
  CircleUserRound,
  ShieldCheck,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import LogoutDoorButton from "@/components/UI/logout-door-button";
import ThemeToggle from "@/components/UI/theme-toggle";
import SandboxSessionControl from "@/components/sandbox/SandboxSessionControl";

type SidebarProps = {
  userName: string;
  memberType: "Reguler" | "Special" | "Gold" | string;
  balance: number;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  isSidebarExpanded?: boolean;
  setIsSidebarExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
};

type SubMenuItem = {
  id: string;
  label: string;
  icon: typeof CircleUserRound;
};

type MenuItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  subItems?: SubMenuItem[];
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
        subItems: [
          {
            id: "settings-profile",
            label: "Profil",
            icon: CircleUserRound,
          },
          {
            id: "settings-security",
            label: "Keamanan",
            icon: ShieldCheck,
          },
          {
            id: "settings-notifications",
            label: "Notifikasi",
            icon: Bell,
          },
        ],
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
  isSidebarExpanded,
  setIsSidebarExpanded,
}: SidebarProps) {
  void balance;
  void userName;

  const [internalIsOpen, setInternalIsOpen] = useState(true);

  const isOpen =
    isSidebarExpanded !== undefined ? isSidebarExpanded : internalIsOpen;
  const setIsOpen = setIsSidebarExpanded || setInternalIsOpen;

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const desktopSidebarWidth = isOpen
    ? "md:w-[clamp(230px,17vw,260px)]"
    : "md:w-[76px]";

  const desktopSpacerWidth = isOpen
    ? "md:w-[clamp(230px,17vw,260px)]"
    : "md:w-[76px]";

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Tier 1: Mobile (< 768px)
      // Tutup drawer mobile jika viewport meluas ke tablet/desktop
      if (width >= 768) {
        setIsMobileOpen(false);
      }

      // Tier 2: Tablet (768px s/d 884px) -> Default Navigation Rail (76px) agar konten luas
      if (width >= 768 && width <= 884) {
        setInternalIsOpen(false);
      } else if (width > 884) {
        setInternalIsOpen(true);
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

  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    return activeMenu.startsWith("settings") ? ["settings"] : [];
  });

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  const handleMenuClick = (menuId: string, hasSubItems = false) => {
    if (hasSubItems) {
      // Toggle expansion without changing activeMenu or navigating workspace
      setExpandedMenus((prev) =>
        prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
      );
      if (!isOpen) {
        setIsOpen(true);
      }
      return;
    }

    setActiveMenu(menuId);

    // Di layar mobile, tutup drawer setelah memilih menu.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.clear();
    window.location.href = "/";
  };

  useEffect(() => {
    const handleOpenSidebar = () => {
      setIsMobileOpen(true);
    };

    window.addEventListener("open-user-sidebar", handleOpenSidebar);
    return () => {
      window.removeEventListener("open-user-sidebar", handleOpenSidebar);
    };
  }, []);

  return (
    <>
      {/* ============================================================ */}
      {/* DESKTOP SPACER (>= 768px)                                    */}
      {/* ============================================================ */}

      <div
        aria-hidden="true"
        className={[
          "hidden shrink-0 transition-[width] duration-300 ease-out md:block",
          desktopSpacerWidth,
        ].join(" ")}
      />

      {/* ============================================================ */}
      {/* MOBILE OVERLAY (< 768px)                                      */}
      {/* ============================================================ */}

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          onClick={closeMobile}
          className="fixed inset-0 z-60 bg-slate-950/30 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* ============================================================ */}
      {/* SIDEBAR                                                       */}
      {/* ============================================================ */}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-70 flex flex-col",
          "border-r border-slate-200 bg-white",
          "shadow-[8px_0_28px_rgba(15,23,42,0.045)]",
          "transition-[width,transform] duration-300 ease-out",
          "w-[clamp(170px,48vw,205px)]",
          desktopSidebarWidth,
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* ========================================================== */}
        {/* HEADER / BRAND                                              */}
        {/* ========================================================== */}

        <div
          className={[
            "relative flex shrink-0 border-b border-slate-100",
            isOpen
              ? "items-center justify-between px-3.5 py-3.5 md:px-4 md:py-4"
              : "items-center justify-center px-2 py-4",
          ].join(" ")}
        >
          {isOpen ? (
            <Link
              href="/"
              title="Kembali ke Beranda"
              className="group flex items-center min-w-0 px-0.5 rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Image
                src="/images/DaPay.svg"
                alt="DaPay"
                width={1269}
                height={313}
                priority
                className="h-6 md:h-7.5 w-auto"
              />
            </Link>
          ) : (
            <Link
              href="/"
              title="Kembali ke Beranda"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[11px] font-black italic text-blue-700 transition hover:bg-blue-100 hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              DP
            </Link>
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
            className="absolute -right-3 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:inline-flex"
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
            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* ========================================================== */}
        {/* NAVIGATION (75% Dynamic Height on Mobile)                   */}
        {/* ========================================================== */}

        <nav
          className="custom-scrollbar flex-1 overflow-y-auto px-2.5 py-2.5 md:px-3 md:py-4"
          aria-label="Navigasi member"
        >
          {MENU_GROUPS.map((group) => (
            <section
              key={group.label}
              className="mb-2.5 md:mb-5 last:mb-0"
            >
              {isOpen && (
                <p className="mb-1 md:mb-2 px-2 text-[7.5px] md:text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5 md:space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                  const isExpanded =
                    expandedMenus.includes(item.id) ||
                    (hasSubItems && activeMenu.startsWith(item.id));
                  const isChildActive = Boolean(
                    item.subItems && item.subItems.some((sub) => activeMenu === sub.id)
                  );
                  const isActive = activeMenu === item.id || isChildActive;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      {hasSubItems ? (
                        <button
                          type="button"
                          title={!isOpen ? item.label : undefined}
                          aria-current={isActive ? "page" : undefined}
                          aria-expanded={isExpanded}
                          onClick={() => handleMenuClick(item.id, true)}
                          className={[
                            "group flex w-full items-center rounded-lg md:rounded-xl text-left transition-all duration-200 cursor-pointer",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset",

                            isOpen
                              ? "gap-2 md:gap-3 px-2 py-1.5 md:px-3 md:py-2.5"
                              : "justify-center px-2 py-3",

                            isActive
                              ? "border border-blue-100 bg-blue-50 text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.06)] font-bold"
                              : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                          ].join(" ")}
                        >
                          <Icon
                            size={16}
                            strokeWidth={isActive ? 2.2 : 1.9}
                            className={[
                              "shrink-0 transition-colors md:h-4.5 md:w-4.5",
                              isActive
                                ? "text-blue-600"
                                : "text-slate-500 group-hover:text-slate-700",
                            ].join(" ")}
                          />

                          {isOpen && (
                            <div className="flex flex-1 items-center justify-between min-w-0">
                              <span className="truncate text-[11px] md:text-[12px] font-semibold tracking-tight">
                                {item.label}
                              </span>
                              <ChevronDown
                                size={12}
                                className={`text-slate-400 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180 text-blue-600" : ""
                                }`}
                              />
                            </div>
                          )}
                        </button>
                      ) : (
                        <Link
                          href={item.id === "overview" ? "/user" : `/user?tab=${item.id}`}
                          scroll={false}
                          title={!isOpen ? item.label : undefined}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => {
                            if (typeof window !== "undefined" && window.innerWidth < 768) {
                              closeMobile();
                            }
                          }}
                          className={[
                            "group flex w-full items-center rounded-lg md:rounded-xl text-left transition-all duration-200 cursor-pointer",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset",

                            isOpen
                              ? "gap-2 md:gap-3 px-2 py-1.5 md:px-3 md:py-2.5"
                              : "justify-center px-2 py-3",

                            isActive
                              ? "border border-blue-100 bg-blue-50 text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.06)] font-bold"
                              : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                          ].join(" ")}
                        >
                          <Icon
                            size={16}
                            strokeWidth={isActive ? 2.2 : 1.9}
                            className={[
                              "shrink-0 transition-colors md:h-4.5 md:w-4.5",
                              isActive
                                ? "text-blue-600"
                                : "text-slate-500 group-hover:text-slate-700",
                            ].join(" ")}
                          />

                          {isOpen && (
                            <div className="flex flex-1 items-center justify-between min-w-0">
                              <span className="truncate text-[11px] md:text-[12px] font-semibold tracking-tight">
                                {item.label}
                              </span>
                            </div>
                          )}
                        </Link>
                      )}

                      {/* SUB MENU ACCORDION (PROFILE, SECURITY, NOTIFICATIONS) */}
                      {isOpen && hasSubItems && isExpanded && (
                        <div className="ml-3 sm:ml-4 pl-2.5 sm:pl-3 border-l-2 border-blue-100 space-y-0.5 py-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          {item.subItems?.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = activeMenu === sub.id;

                            return (
                              <Link
                                key={sub.id}
                                href={`/user?tab=${sub.id}`}
                                scroll={false}
                                aria-current={isSubActive ? "page" : undefined}
                                onClick={() => {
                                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                                    closeMobile();
                                  }
                                }}
                                className={`flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                                  isSubActive
                                    ? "bg-blue-100/70 text-blue-800 font-bold shadow-2xs"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
                                }`}
                              >
                                <SubIcon
                                  size={13}
                                  strokeWidth={isSubActive ? 2.2 : 1.8}
                                  className={
                                    isSubActive
                                      ? "text-blue-600 shrink-0"
                                      : "text-slate-400 shrink-0 group-hover:text-slate-600"
                                  }
                                />
                                <span className="truncate text-[10.5px] md:text-[11px]">
                                  {sub.label}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        {/* ========================================================== */}
        {/* BOTTOM AREA (Compact Spacing on Mobile)                     */}
        {/* ========================================================== */}

        <div className="shrink-0 border-t border-slate-100 px-2.5 py-2.5 md:px-3 md:py-3">
          {isOpen ? (
            <>
              {/* UPGRADE */}
              {memberType !== "Special" && memberType !== "Gold" && (
                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick("upgrade")
                  }
                  className="mb-2 md:mb-3 w-full rounded-xl md:rounded-2xl border border-indigo-100 bg-linear-to-br from-violet-500 via-indigo-500 to-blue-600 p-2.5 md:p-3.5 text-left shadow-[0_6px_18px_rgba(79,70,229,0.12)] transition hover:shadow-[0_10px_24px_rgba(79,70,229,0.18)]"
                >
                  <div className="flex items-center gap-2 md:gap-2.5">
                    <div className="flex h-6.5 w-6.5 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-lg md:rounded-xl bg-white/15 text-white">
                      <Crown size={13} className="md:h-3.75 md:w-3.75" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[7.5px] md:text-[8px] font-semibold uppercase tracking-[0.15em] text-indigo-100">
                        Upgrade ke
                      </p>

                      <h3 className="truncate text-[10.5px] md:text-[12px] font-black leading-none text-white">
                        Special Member
                      </h3>
                    </div>
                  </div>

                  <div className="hidden md:block mt-3 space-y-1">
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

                  <div className="mt-1.5 md:mt-3 flex h-6.5 md:h-8 w-full items-center justify-center gap-1 rounded-lg md:rounded-xl bg-white px-2 md:px-3 text-[8.5px] md:text-[9px] font-black text-indigo-700">
                    Upgrade Sekarang
                    <span aria-hidden="true">→</span>
                  </div>
                </button>
              )}

              {/* SANDBOX TESTER WIDGET */}
              <div className="mb-2">
                <SandboxSessionControl variant="sidebar" />
              </div>

              {/* THEME TOGGLE */}
              <div className="mb-1.5 md:mb-2.5">
                <ThemeToggle showLabel />
              </div>

              {/* LOGOUT */}
              <LogoutDoorButton onLogout={handleLogout} />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="mb-1">
                <SandboxSessionControl variant="navbar" />
              </div>

              {memberType !== "Special" && memberType !== "Gold" && (
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

              <ThemeToggle isCollapsed />

              <LogoutDoorButton onLogout={handleLogout} isCollapsed />
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