"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { supabase, clearSupabaseLocalAuth } from "@/utils/supabaseClient";
import LogoutDoorButton from "@/components/UI/logout-door-button";
import ThemeToggle from "@/components/UI/theme-toggle";
import SandboxSessionControl from "@/components/sandbox/SandboxSessionControl";
import { useI18n } from "@/lib/i18n/context";
import { localizeHref } from "@/lib/i18n/config";

type SidebarProps = {
  userName: string;
  memberType: "Reguler" | "Special" | "Gold" | string;
  balance: number;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  isSidebarExpanded?: boolean;
  setIsSidebarExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
  isSandboxMode?: boolean;
  isInitialLoading?: boolean;
};

type SubMenuItem = {
  id: string;
  labelKey: string;
  label?: string;
  icon: typeof CircleUserRound;
};

type MenuItem = {
  id: string;
  labelKey: string;
  label?: string;
  icon: typeof LayoutDashboard;
  subItems?: SubMenuItem[];
  disabledInSandbox?: boolean;
  badge?: string;
};

type MenuGroup = {
  labelKey: string;
  label?: string;
  items: MenuItem[];
};

const MENU_GROUPS_CONFIG: MenuGroup[] = [
  {
    labelKey: "dashboard.nav.overviewGroup",
    items: [
      {
        id: "overview",
        labelKey: "dashboard.nav.dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    labelKey: "dashboard.nav.transactionsGroup",
    items: [
      {
        id: "orders",
        labelKey: "dashboard.nav.orders",
        icon: ShoppingBag,
      },
      {
        id: "wallet",
        labelKey: "dashboard.nav.wallet",
        icon: WalletCards,
      },
    ],
  },
  {
    labelKey: "dashboard.nav.balanceGroup",
    items: [
      {
        id: "deposit",
        labelKey: "dashboard.nav.deposit",
        icon: ArrowDownToLine,
      },
      {
        id: "withdraw",
        labelKey: "dashboard.nav.withdraw",
        icon: ArrowUpFromLine,
      },
    ],
  },
  {
    labelKey: "dashboard.nav.programGroup",
    items: [
      {
        id: "affiliate",
        labelKey: "dashboard.nav.affiliate",
        icon: UsersRound,
      },
    ],
  },
  {
    labelKey: "dashboard.nav.systemGroup",
    items: [
      {
        id: "settings",
        labelKey: "dashboard.nav.settings",
        icon: Settings,
        subItems: [
          {
            id: "settings-profile",
            labelKey: "dashboard.nav.profile",
            icon: CircleUserRound,
          },
          {
            id: "settings-security",
            labelKey: "dashboard.nav.security",
            icon: ShieldCheck,
          },
          {
            id: "settings-notifications",
            labelKey: "dashboard.nav.notifications",
            icon: Bell,
          },
        ],
      },
      {
        id: "help",
        labelKey: "dashboard.nav.help",
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
  isSandboxMode = false,
  isInitialLoading = false,
}: SidebarProps) {
  void balance;
  void userName;

  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSwitchLocale = () => {
    const nextLocale = locale === "id" ? "en" : "id";
    if (typeof document !== "undefined") {
      document.cookie = `dapay_locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const currentPath = pathname || "/user";
    const targetPath = localizeHref(currentPath, nextLocale);
    const qs = searchParams.toString();
    const searchStr = qs ? `?${qs}` : "";
    router.push(`${targetPath}${searchStr}`, { scroll: false });
  };

  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dapay_user_sidebar_expanded");
      if (saved !== null) return saved === "true";
      return window.innerWidth > 884;
    }
    return true;
  });

  const isOpen =
    isSidebarExpanded !== undefined ? isSidebarExpanded : internalIsOpen;

  const setIsOpen = useCallback(
    (valOrUpdater: React.SetStateAction<boolean>) => {
      const nextVal =
        typeof valOrUpdater === "function"
          ? (valOrUpdater as (prev: boolean) => boolean)(isOpen)
          : valOrUpdater;
      if (setIsSidebarExpanded) {
        setIsSidebarExpanded(nextVal);
      } else {
        setInternalIsOpen(nextVal);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("dapay_user_sidebar_expanded", String(nextVal));
      }
    },
    [isOpen, setIsSidebarExpanded]
  );

  const toggleDesktopSidebar = () => {
    setFlyoutState(null);
    setIsOpen(!isOpen);
  };

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
        const saved = typeof window !== "undefined" ? localStorage.getItem("dapay_user_sidebar_expanded") : null;
        if (saved !== null) {
          setInternalIsOpen(saved === "true");
        } else {
          setInternalIsOpen(true);
        }
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

  const menuGroups = useMemo(() => {
    return MENU_GROUPS_CONFIG.map((group) => {
      const groupLabel = t(group.labelKey);

      if (group.labelKey === "dashboard.nav.overviewGroup") {
        const items: MenuItem[] = group.items.map((item) => ({
          ...item,
          label: t(item.labelKey),
        }));
        if (isSandboxMode) {
          items.push({
            id: "catalog",
            labelKey: "dashboard.nav.catalog",
            label: t("dashboard.nav.catalog"),
            icon: ShoppingBag,
          });
        }
        return { ...group, label: groupLabel, items };
      }

      if (group.labelKey === "dashboard.nav.balanceGroup") {
        const items: MenuItem[] = group.items.map((item) => {
          const itemLabel = t(item.labelKey);
          if (isSandboxMode && (item.id === "deposit" || item.id === "withdraw")) {
            return {
              ...item,
              label: itemLabel,
              disabledInSandbox: true,
              badge: t("dashboard.nav.badgePrimary"),
            };
          }
          return {
            ...item,
            label: itemLabel,
          };
        });
        return { ...group, label: groupLabel, items };
      }

      if (group.labelKey === "dashboard.nav.programGroup") {
        const items: MenuItem[] = group.items.map((item) => {
          const itemLabel = t(item.labelKey);
          if (isSandboxMode && item.id === "affiliate") {
            return {
              ...item,
              label: itemLabel,
              disabledInSandbox: true,
              badge: t("dashboard.nav.badgePrimary"),
            };
          }
          return {
            ...item,
            label: itemLabel,
          };
        });
        return { ...group, label: groupLabel, items };
      }

      const items: MenuItem[] = group.items.map((item) => ({
        ...item,
        label: t(item.labelKey),
        subItems: item.subItems?.map((sub) => ({
          ...sub,
          label: t(sub.labelKey),
        })),
      }));

      return { ...group, label: groupLabel, items };
    });
  }, [isSandboxMode, t]);

  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    return activeMenu.startsWith("settings") ? ["settings"] : [];
  });

  const [prevActiveMenu, setPrevActiveMenu] = useState(activeMenu);
  if (activeMenu !== prevActiveMenu) {
    setPrevActiveMenu(activeMenu);
    if (activeMenu.startsWith("settings") && !prevActiveMenu.startsWith("settings")) {
      if (!expandedMenus.includes("settings")) {
        setExpandedMenus((prev) => [...prev, "settings"]);
      }
    }
  }

  const [flyoutState, setFlyoutState] = useState<{
    menuId: string;
    top: number;
    left: number;
    item: MenuItem;
  } | null>(null);

  useEffect(() => {
    const handleCloseFlyout = () => {
      setFlyoutState(null);
    };
    window.addEventListener("resize", handleCloseFlyout);
    window.addEventListener("scroll", handleCloseFlyout, true);
    return () => {
      window.removeEventListener("resize", handleCloseFlyout);
      window.removeEventListener("scroll", handleCloseFlyout, true);
    };
  }, []);

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  const handleSubItemMenuToggle = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: MenuItem
  ) => {
    if (isOpen) {
      setExpandedMenus((prev) =>
        prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
      );
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setFlyoutState((prev) =>
        prev?.menuId === item.id
          ? null
          : {
              menuId: item.id,
              top: Math.max(12, Math.min(rect.top, window.innerHeight - 200)),
              left: rect.right + 12,
              item,
            }
      );
    }
  };

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);

    // Di layar mobile, tutup drawer setelah memilih menu.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    await clearSupabaseLocalAuth();
    window.location.href = localizeHref("/", locale);
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
          aria-label={t("dashboard.nav.closeNavigation")}
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
          "border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]",
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
            "relative flex shrink-0 border-b border-slate-100 dark:border-slate-800/80",
            isOpen
              ? "items-center justify-between px-3.5 py-3.5 md:px-4 md:py-4"
              : "items-center justify-center px-2 py-4",
          ].join(" ")}
        >
          {isOpen ? (
            <Link
              href={localizeHref("/", locale)}
              title={t("common.backToHome")}
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
              href={localizeHref("/", locale)}
              title={t("common.backToHome")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 dark:border-slate-700 bg-blue-50 dark:bg-slate-800 text-[11px] font-black italic text-blue-700 dark:text-blue-400 transition hover:bg-blue-100 dark:hover:bg-slate-700 hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              DP
            </Link>
          )}

          {/* DESKTOP COLLAPSE */}
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            aria-label={
              isOpen
                ? t("dashboard.nav.toggleSidebarOpen")
                : t("dashboard.nav.toggleSidebarClose")
            }
            className="absolute -right-3 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:inline-flex"
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
            aria-label={t("dashboard.nav.closeNavigation")}
            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* ========================================================== */}
        {/* NAVIGATION (75% Dynamic Height on Mobile)                   */}
        {/* ========================================================== */}

        <nav
          className="custom-scrollbar flex-1 overflow-y-auto px-2.5 py-2.5 md:px-3 md:py-4"
          aria-label={t("dashboard.nav.memberNav")}
        >
          {menuGroups.map((group) => (
            <section
              key={group.labelKey}
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
                  const isExpanded = expandedMenus.includes(item.id);
                  const isChildActive = Boolean(
                    item.subItems && item.subItems.some((sub) => activeMenu === sub.id)
                  );
                  const isActive = activeMenu === item.id || isChildActive;

                  const isFlyoutActive = !isOpen && flyoutState?.menuId === item.id;
                  const isCurrentOrFlyoutActive = isActive || isFlyoutActive;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      {hasSubItems ? (
                        <button
                          type="button"
                          title={!isOpen ? item.label : undefined}
                          aria-current={isActive ? "page" : undefined}
                          aria-expanded={isOpen ? isExpanded : isFlyoutActive}
                          aria-haspopup={!isOpen ? "menu" : undefined}
                          onClick={(e) => handleSubItemMenuToggle(e, item)}
                          className={[
                            "group flex w-full items-center rounded-lg md:rounded-xl text-left transition-all duration-200 cursor-pointer",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset",

                            isOpen
                              ? "gap-2 md:gap-3 px-2 py-1.5 md:px-3 md:py-2.5"
                              : "justify-center px-2 py-2 md:py-2.5",

                            isCurrentOrFlyoutActive
                              ? "border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 shadow-[0_2px_8px_rgba(37,99,235,0.06)] font-bold"
                              : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-950 dark:hover:text-slate-200",
                          ].join(" ")}
                        >
                          <Icon
                            size={16}
                            strokeWidth={isCurrentOrFlyoutActive ? 2.2 : 1.9}
                            className={[
                              "shrink-0 transition-colors md:h-4.5 md:w-4.5",
                              isCurrentOrFlyoutActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200",
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
                                  isExpanded ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                                }`}
                              />
                            </div>
                          )}
                        </button>
                      ) : item.disabledInSandbox ? (
                        <div
                          title={t("dashboard.nav.liveOnlyTitle", { label: item.label || "" })}
                          aria-disabled="true"
                          className={[
                            "group flex w-full items-center rounded-lg md:rounded-xl text-left cursor-not-allowed opacity-40 select-none",
                            isOpen
                              ? "gap-2 md:gap-3 px-2 py-1.5 md:px-3 md:py-2.5"
                              : "justify-center px-2 py-2 md:py-2.5",
                            "border border-transparent text-slate-400 dark:text-slate-600 bg-slate-50/40 dark:bg-slate-800/20",
                          ].join(" ")}
                        >
                          <Icon
                            size={16}
                            strokeWidth={1.8}
                            className="shrink-0 text-slate-400 dark:text-slate-600 md:h-4.5 md:w-4.5"
                          />

                          {isOpen && (
                            <div className="flex flex-1 items-center justify-between min-w-0">
                              <span className="truncate text-[11px] md:text-[12px] font-medium text-slate-400 dark:text-slate-500">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="inline-flex items-center rounded-md bg-slate-200/80 dark:bg-slate-700/80 px-1.5 py-0.5 text-[8.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={item.id === "overview" ? localizeHref("/user", locale) : `${localizeHref("/user", locale)}?tab=${item.id}`}
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
                              : "justify-center px-2 py-2 md:py-2.5",

                            isActive
                              ? "border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 shadow-[0_2px_8px_rgba(37,99,235,0.06)] font-bold"
                              : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-950 dark:hover:text-slate-200",
                          ].join(" ")}
                        >
                          <Icon
                            size={16}
                            strokeWidth={isActive ? 2.2 : 1.9}
                            className={[
                              "shrink-0 transition-colors md:h-4.5 md:w-4.5",
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200",
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
                        <div className="ml-3 sm:ml-4 pl-2.5 sm:pl-3 border-l-2 border-blue-100 dark:border-blue-900/50 space-y-0.5 py-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          {item.subItems?.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = activeMenu === sub.id;

                            return (
                              <Link
                                key={sub.id}
                                href={`${localizeHref("/user", locale)}?tab=${sub.id}`}
                                scroll={false}
                                aria-current={isSubActive ? "page" : undefined}
                                onClick={() => {
                                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                                    closeMobile();
                                  }
                                }}
                                className={`flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                                  isSubActive
                                    ? "bg-blue-100/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold shadow-2xs"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                                }`}
                              >
                                <SubIcon
                                  size={13}
                                  strokeWidth={isSubActive ? 2.2 : 1.8}
                                  className={
                                    isSubActive
                                      ? "text-blue-600 dark:text-blue-400 shrink-0"
                                      : "text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-300"
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

          {/* ========================================================== */}
          {/* PROMOTIONAL & STATUS CARDS (Inside Scrollable Stream)      */}
          {/* ========================================================== */}
          <div className={`mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 ${isOpen ? "space-y-2.5" : "space-y-2 flex flex-col items-center"}`}>
            {/* UPGRADE BANNER */}
            {!isInitialLoading && memberType !== "Special" && memberType !== "Gold" && !isSandboxMode && (
              isOpen ? (
                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick("upgrade")
                  }
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-amber-200/90 dark:border-amber-500/30 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-500/15 dark:via-orange-500/15 dark:to-amber-500/15 p-2.5 text-left transition hover:bg-amber-500/15 dark:hover:bg-amber-500/20 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-2xs">
                      <Crown size={14} className="fill-yellow-200 text-yellow-100" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-black text-slate-900 dark:text-white leading-tight truncate">
                        Special Member
                      </p>
                      <p className="text-[8.5px] font-bold text-amber-700 dark:text-amber-400 leading-tight">
                        {t("dashboard.upgradeModal.upgradeHeaderBadge")}
                      </p>
                    </div>
                  </div>
                  <span className="flex h-5 items-center rounded-full bg-amber-500 px-2 text-[9px] font-black text-white shadow-2xs shrink-0">
                    Upgrade →
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick("upgrade")
                  }
                  title={t("dashboard.nav.upgradeToSpecial")}
                  aria-label={t("dashboard.nav.upgradeToSpecial")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-sm transition hover:scale-[1.03] cursor-pointer"
                >
                  <Crown size={15} className="fill-yellow-200 text-yellow-100" />
                </button>
              )
            )}

            {/* SANDBOX TESTER TRIGGER */}
            <div className="w-full flex justify-center">
              <SandboxSessionControl variant={isOpen ? "sidebar" : "rail"} />
            </div>
          </div>
        </nav>

        {/* ========================================================== */}
        {/* BOTTOM UTILITY (Pinned Slim Footer - ~80px)                */}
        {/* ========================================================== */}

        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] px-2.5 py-2.5 md:px-3 md:py-3">
          {isOpen ? (
            <>
              {/* THEME TOGGLE + LANGUAGE SWITCHER */}
              <div className="mb-2 flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <ThemeToggle showLabel />
                </div>
                <button
                  type="button"
                  onClick={handleSwitchLocale}
                  title={locale === "id" ? t("language.switchToEnglish") : t("language.switchToIndonesian")}
                  aria-label={locale === "id" ? t("language.switchToEnglish") : t("language.switchToIndonesian")}
                  className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 px-2.5 text-[11px] font-black text-slate-700 dark:text-slate-200 shadow-2xs transition hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                >
                  {locale === "id" ? (
                    <svg className="w-4 h-2.5 rounded-xs shrink-0 overflow-hidden shadow-2xs border border-slate-300/60" viewBox="0 0 3 2" aria-hidden="true">
                      <rect width="3" height="1" fill="#e70011" />
                      <rect width="3" height="1" y="1" fill="#ffffff" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-2.5 rounded-xs shrink-0 overflow-hidden shadow-2xs border border-slate-300/60" viewBox="0 0 60 30" aria-hidden="true">
                      <clipPath id="uk-flag-clip-user-sidebar-expanded">
                        <path d="M0,0 v30 h60 v-30 z"/>
                      </clipPath>
                      <g clipPath="url(#uk-flag-clip-user-sidebar-expanded)">
                        <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-flag-clip-user-sidebar-expanded)" stroke="#C8102E" strokeWidth="4"/>
                        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                      </g>
                    </svg>
                  )}
                  <span>{locale === "id" ? "ID" : "EN"}</span>
                </button>
              </div>

              {/* LOGOUT */}
              <LogoutDoorButton onLogout={handleLogout} />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {/* THEME TOGGLE + LANGUAGE SWITCHER (CONSISTENT ORDER) */}
              <div className="flex flex-col items-center gap-1.5">
                <ThemeToggle isCollapsed />
                <button
                  type="button"
                  onClick={handleSwitchLocale}
                  title={locale === "id" ? t("language.switchToEnglish") : t("language.switchToIndonesian")}
                  aria-label={locale === "id" ? t("language.switchToEnglish") : t("language.switchToIndonesian")}
                  className="flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 shadow-2xs transition hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                >
                  {locale === "id" ? (
                    <svg className="w-4 h-2.5 rounded-xs shrink-0 overflow-hidden shadow-2xs border border-slate-300/60" viewBox="0 0 3 2" aria-hidden="true">
                      <rect width="3" height="1" fill="#e70011" />
                      <rect width="3" height="1" y="1" fill="#ffffff" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-2.5 rounded-xs shrink-0 overflow-hidden shadow-2xs border border-slate-300/60" viewBox="0 0 60 30" aria-hidden="true">
                      <clipPath id="uk-flag-clip-user-sidebar-collapsed">
                        <path d="M0,0 v30 h60 v-30 z"/>
                      </clipPath>
                      <g clipPath="url(#uk-flag-clip-user-sidebar-collapsed)">
                        <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-flag-clip-user-sidebar-collapsed)" stroke="#C8102E" strokeWidth="4"/>
                        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                      </g>
                    </svg>
                  )}
                  <span className="text-[8.5px] font-black leading-none text-slate-700 dark:text-slate-200">
                    {locale === "id" ? "ID" : "EN"}
                  </span>
                </button>
              </div>

              {/* LOGOUT */}
              <LogoutDoorButton onLogout={handleLogout} isCollapsed />
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* FLOATING SUB-MENU POPOVER (For Collapsed Navigation Rail)    */}
      {/* ============================================================ */}
      {flyoutState && !isOpen && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-80"
            onClick={() => setFlyoutState(null)}
            aria-hidden="true"
          />

          {/* Floating Flyout Card */}
          <div
            style={{
              top: `${flyoutState.top}px`,
              left: `${flyoutState.left}px`,
            }}
            className="fixed z-90 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md p-2 shadow-2xl shadow-slate-950/15 dark:shadow-black/60 animate-in fade-in zoom-in-95 duration-150"
            role="menu"
            aria-label={flyoutState.item.label || t("dashboard.nav.settings")}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                {flyoutState.item.label || t("dashboard.nav.settings")}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                Menu
              </span>
            </div>

            {/* Sub-menu Items */}
            <div className="space-y-0.5">
              {flyoutState.item.subItems?.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = activeMenu === sub.id;

                return (
                  <Link
                    key={sub.id}
                    href={`${localizeHref("/user", locale)}?tab=${sub.id}`}
                    scroll={false}
                    role="menuitem"
                    aria-current={isSubActive ? "page" : undefined}
                    onClick={() => {
                      setFlyoutState(null);
                      if (typeof window !== "undefined" && window.innerWidth < 768) {
                        closeMobile();
                      }
                    }}
                    className={`flex w-full items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isSubActive
                        ? "bg-blue-100/80 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-bold shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isSubActive
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <SubIcon size={14} strokeWidth={isSubActive ? 2.2 : 1.9} />
                    </div>

                    <span className="truncate text-[11.5px]">
                      {sub.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
