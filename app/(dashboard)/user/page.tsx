"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Crown,
  FlaskConical,
  Gift,
  History,
  Loader2,
  Menu,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import DaPayCoin from "@/components/dapay/DaPayCoin";
import SandboxCatalogView from "@/components/sandbox/SandboxCatalogView";
import {
  fetchTesterSessionDeduplicated,
  getCachedSandboxSession,
  setCachedSandboxSession,
  broadcastSandboxSync,
  type SandboxSessionData,
  type SandboxQuotaData,
} from "@/components/sandbox/SandboxSessionControl";
import UserSidebar from "./components/UserSidebar";
import UserBottomNav from "./components/UserBottomNav";

import OrdersViewUser from "./orders/OrdersViewUser";
import WalletViewUser from "./wallet/WalletViewUser";
import DepositViewUser from "./deposit/DepositViewUser";
import WithdrawViewUser from "./withdraw/WithdrawViewUser";
import AffiliateViewUser from "./affiliate/AffiliateViewUser";
import SettingsViewUser from "./settings/SettingsViewUser";
import HelpViewUser from "./help/HelpViewUser";

import { supabase, clearSupabaseLocalAuth } from "@/utils/supabaseClient";
import MaintenancePage from "@/utils/MaintenancePage";
import { useI18n } from "@/lib/i18n/context";
import { localizeHref } from "@/lib/i18n/config";

/* ================================================================== */
/* TYPES                                                              */
/* ================================================================== */

type DashboardOrder = {
  id: string;
  order_id?: string | null;
  product_name?: string | null;
  item_label?: string | null;
  price?: number | string | null;
  total_amount?: number | string | null;
  status?: string | null;
  category?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
  customer_no?: string | null;
  is_sandbox?: boolean | null;
};

type DashboardDeposit = {
  id: string;
  amount?: number | string | null;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type DashboardWithdrawal = {
  id: string;
  amount?: number | string | null;
  held_amount?: number | string | null;
  admin_fee?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

type DashboardBalanceLog = {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  amount: number | string;
  type: string;
  description?: string | null;
  initial_balance?: number | string | null;
  final_balance?: number | string | null;
  created_at?: string | null;
};

type DashboardReferral = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  created_at?: string | null;
};

type DashboardProfile = {
  full_name?: string | null;
  email?: string | null;
  referral_code?: string | null;
  balance?: number | string | null;
  coin_balance?: number | string | null;
  member_type?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  image?: string | null;
};

type DashboardData = {
  profile?: DashboardProfile;
  orders?: DashboardOrder[];
  deposits?: DashboardDeposit[];
  withdrawals?: DashboardWithdrawal[];
  balanceLogs?: DashboardBalanceLog[];
  referrals?: DashboardReferral[];
};

type DashboardResponse = {
  success?: boolean;
  data?: DashboardData;
  error?: string;
};

/* ================================================================== */
/* HELPERS                                                            */
/* ================================================================== */

function formatRupiah(value: unknown) {
  return `Rp ${Number(
    value || 0,
  ).toLocaleString("id-ID")}`;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(value?: string | null) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "success" ||
    status === "successful" ||
    status === "berhasil" ||
    status === "selesai"
  ) {
    return "Berhasil";
  }

  if (
    status === "diproses" ||
    status === "processing" ||
    status === "process"
  ) {
    return "Diproses";
  }

  if (
    status === "failed" ||
    status === "gagal" ||
    status === "rejected" ||
    status === "reject"
  ) {
    return "Gagal";
  }

  return "Pending";
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Berhasil":
      return {
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };

    case "Diproses":
      return {
        badge:
          "border-blue-200 bg-blue-50 text-blue-700",
        dot: "bg-blue-500",
      };

    case "Gagal":
      return {
        badge:
          "border-rose-200 bg-rose-50 text-rose-700",
        dot: "bg-rose-500",
      };

    default:
      return {
        badge:
          "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
  }
}

function getProductImage(name?: string | null): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();

  // Mobile Legends
  if (lower.includes("mobile legend") || lower.includes("mlbb") || lower.includes("diamond ml")) {
    return "/images/mlbb-1.jpg";
  }
  // Free Fire
  if (lower.includes("free fire") || lower.includes("ff max") || lower.includes("ff global") || lower === "ff" || lower.startsWith("ff ")) {
    return "/images/ff-1.jpg";
  }
  // PUBG
  if (lower.includes("pubg")) {
    return "/images/pubg-1.jpg";
  }
  // Genshin Impact
  if (lower.includes("genshin")) {
    return "/images/genshin.jpg";
  }
  // Honkai Star Rail
  if (lower.includes("honkai") || lower.includes("hsr")) {
    return "/images/hsr.jpg";
  }
  // Valorant
  if (lower.includes("valorant")) {
    return "/images/valorant-1.jpg";
  }
  // Roblox
  if (lower.includes("roblox") || lower.includes("robux")) {
    return "/images/roblox.jpg";
  }
  // Honor of Kings
  if (lower.includes("honor of kings") || lower.includes("hok")) {
    return "/images/hok-1.jpg";
  }
  // Call of Duty
  if (lower.includes("call of duty") || lower.includes("codm") || lower.includes("cod mobile")) {
    return "/images/codm-1.jpg";
  }
  // Brawl Stars
  if (lower.includes("brawl star")) {
    return "/images/brawl-stars.jpg";
  }
  // Minecraft
  if (lower.includes("minecraft")) {
    return "/images/minecraft.jpg";
  }
  // Point Blank
  if (lower.includes("point blank") || lower.includes(" pb ") || lower.startsWith("pb ") || lower === "pb") {
    return "/images/pb.jpg";
  }
  // League of Legends / Wild Rift
  if (lower.includes("league of legend") || lower.includes("wild rift") || lower.includes(" lol ") || lower.startsWith("lol ") || lower === "lol") {
    return "/images/lol.jpg";
  }
  // Steam
  if (lower.includes("steam")) {
    return "/images/steam.jpg";
  }
  // Google Play
  if (lower.includes("google play") || lower.includes("googleplay")) {
    return "/images/google-play.jpg";
  }
  // PlayStation / PSN
  if (lower.includes("playstation") || lower.includes("psn")) {
    return "/images/psn-1.jpg";
  }
  // Xbox / PC Game Pass
  if (lower.includes("game pass")) {
    return "/images/pc-game-pass.jpg";
  }
  if (lower.includes("xbox")) {
    return "/images/xbox.jpg";
  }
  // Garena
  if (lower.includes("garena") || lower.includes("undawn")) {
    return "/images/garena.jpg";
  }
  // Razer
  if (lower.includes("razer")) {
    return "/images/razer-1.jpg";
  }
  // Pokemon
  if (lower.includes("pokemon")) {
    return "/images/pokemon-go.jpg";
  }
  // Fate Grand Order
  if (lower.includes("fate") || lower.includes("fgo")) {
    return "/images/fgo.jpg";
  }
  // Fortnite
  if (lower.includes("fortnite")) {
    return "/images/fortnite.jpg";
  }
  // EA / FIFA / FC
  if (lower.includes("fifa") || lower.includes("ea sports") || lower.includes("fc mobile") || lower === "ea" || lower.startsWith("ea ")) {
    return "/images/ea.jpg";
  }
  // Whiteout Survival
  if (lower.includes("whiteout")) {
    return "/images/whiteout-1.jpg";
  }
  // Monopoly Go
  if (lower.includes("monopoly")) {
    return "/images/monopoly.jpg";
  }
  // Candy Crush
  if (lower.includes("candy crush")) {
    return "/images/candy-crush-1.jpg";
  }
  // Coin Master
  if (lower.includes("coin master")) {
    return "/images/coin-master.jpg";
  }
  // Royal Match
  if (lower.includes("royal match")) {
    return "/images/royal-match.jpg";
  }
  // AU2 Mobile
  if (lower.includes("au2")) {
    return "/images/au2.jpg";
  }
  // Entertainment & Apps
  if (lower.includes("netflix")) {
    return "/images/netflix-1.jpg";
  }
  if (lower.includes("spotify")) {
    return "/images/spotify.jpg";
  }
  if (lower.includes("canva")) {
    return "/images/canva.jpg";
  }
  if (lower.includes("capcut")) {
    return "/images/capcut.jpg";
  }
  if (lower.includes("discord")) {
    return "/images/discord.jpg";
  }
  if (lower.includes("telegram")) {
    return "/images/telegram.jpg";
  }
  if (lower.includes("tiktok")) {
    return "/images/tiktok.jpg";
  }
  if (lower.includes("vidio")) {
    return "/images/vidio.jpg";
  }
  if (lower.includes("webtoon")) {
    return "/images/webtoon.jpg";
  }
  if (lower.includes("youku")) {
    return "/images/youku.jpg";
  }
  if (lower.includes("ometv") || lower.includes("ome tv")) {
    return "/images/ometv.jpg";
  }
  if (lower.includes("apple") || lower.includes("itunes")) {
    return "/images/apple.jpg";
  }
  if (lower.includes("amazon")) {
    return "/images/amazon.jpg";
  }
  if (lower.includes("mcafee")) {
    return "/images/mcafee.jpg";
  }
  if (lower.includes("exitlag")) {
    return "/images/exitlag.jpg";
  }
  if (lower.includes("turbo vpn") || lower.includes("vpn")) {
    return "/images/turbo-vpn.jpg";
  }
  // Utilities & Telco
  if (lower.includes("tagihan listrik") || lower.includes("pln pasca")) {
    return "/images/tagihan-listrik-1.jpg";
  }
  if (lower.includes("token listrik") || lower.includes("token pln") || lower.includes("pln") || lower.includes("listrik")) {
    return "/images/token-listrik-1.jpg";
  }
  if (lower.includes("telkomsel") || lower.includes("simpati") || lower.includes("kartu as")) {
    return "/images/telkomsel-1.jpg";
  }
  if (lower.includes("indosat") || lower.includes("im3") || lower.includes("ooredoo")) {
    return "/images/indosat-1.jpg";
  }
  if (lower.includes("axis")) {
    return "/images/axis.jpg";
  }
  if (lower.includes("xl")) {
    return "/images/xl.jpg";
  }
  if (lower.includes("tri") || lower.includes("three") || lower.includes("3 tri")) {
    return "/images/tri.jpg";
  }
  if (lower.includes("smartfren")) {
    return "/images/smartfren.jpg";
  }
  if (lower.includes("by.u") || lower.includes("byu")) {
    return "/images/byU.webp";
  }
  // Travel & E-Commerce
  if (lower.includes("shopee")) {
    return "/images/shopee.jpg";
  }
  if (lower.includes("lazada")) {
    return "/images/lazada.jpg";
  }
  if (lower.includes("zalora")) {
    return "/images/zalora-1.jpg";
  }
  if (lower.includes("maxim")) {
    return "/images/maxim-2.jpg";
  }
  if (lower.includes("linkaja")) {
    return "/images/linkaja.jpg";
  }
  if (lower.includes("pesawat") || lower.includes("flight")) {
    return "/images/flight.jpg";
  }
  if (lower.includes("kereta") || lower.includes("train") || lower.includes("kai")) {
    return "/images/train.jpg";
  }
  if (lower.includes("hotel")) {
    return "/images/hotel.jpg";
  }
  if (lower.includes("niagahoster")) {
    return "/images/niagahoster.jpg";
  }
  if (lower.includes("domain")) {
    return "/images/domain-shop.jpg";
  }
  if (lower.includes("vps")) {
    return "/images/vps-gaming-1.jpg";
  }

  return null;
}

function generateCumulativeMonthlyPoints<T extends { created_at?: string | null }>(
  items: T[],
  valueExtractor?: (item: T) => number
): number[] {
  const days = 30;
  const now = new Date();
  const dailyTotals = new Array(days).fill(0);

  items.forEach((item) => {
    if (!item.created_at) return;
    const itemDate = new Date(item.created_at);
    if (isNaN(itemDate.getTime())) return;

    const diffTime = now.getTime() - itemDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < days) {
      const dayIndex = days - 1 - diffDays;
      const val = valueExtractor ? valueExtractor(item) : 0;
      dailyTotals[dayIndex] += Math.max(0, val);
    }
  });

  const cumulative: number[] = [];
  let running = 0;
  for (let i = 0; i < days; i++) {
    running += dailyTotals[i];
    cumulative.push(running);
  }

  return cumulative;
}

function buildSvgSparkline(
  points: number[],
  width = 96,
  height = 36,
  padding = 4
): { linePath: string; areaPath: string } {
  if (!points || points.length === 0) {
    const defaultLine = `M ${padding} ${height - padding} L ${width - padding} ${height - padding}`;
    const defaultArea = `M ${padding} ${height - padding} L ${width - padding} ${height - padding} L ${width - padding} ${height} L ${padding} ${height} Z`;
    return { linePath: defaultLine, areaPath: defaultArea };
  }

  const minVal = 0;
  const maxVal = Math.max(...points, 1);

  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;

  const coords = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1)) * availableWidth;
    const normalized = Math.min(Math.max((val - minVal) / (maxVal - minVal), 0), 1);
    const y = height - padding - normalized * availableHeight;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = Number((p1.x + (p2.x - p0.x) / 6).toFixed(1));
    const cp1y = Number((p1.y + (p2.y - p0.y) / 6).toFixed(1));
    const cp2x = Number((p2.x - (p3.x - p1.x) / 6).toFixed(1));
    const cp2y = Number((p2.y - (p3.y - p1.y) / 6).toFixed(1));

    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const lastCoord = coords[coords.length - 1];
  const firstCoord = coords[0];
  const areaPath = `${linePath} L ${lastCoord.x} ${height} L ${firstCoord.x} ${height} Z`;

  return { linePath, areaPath };
}

const VALID_USER_TABS: Record<string, string> = {
  overview: "overview",
  catalog: "catalog",
  orders: "orders",
  wallet: "wallet",
  deposit: "deposit",
  withdraw: "withdraw",
  withdrawal: "withdraw",
  affiliate: "affiliate",
  settings: "settings-profile",
  "settings-profile": "settings-profile",
  "settings-security": "settings-security",
  "settings-notifications": "settings-notifications",
  help: "help",
};

let cachedUserDashboardData: DashboardData | null = null;

function UserDashboardContent() {
  /* ---------------------------------------------------------------- */
  /* NAVIGATION (URL IS SOURCE OF TRUTH)                              */
  /* ---------------------------------------------------------------- */

  const { t, locale } = useI18n();
  const localeRef = useRef(locale);
  const tRef = useRef(t);
  useEffect(() => {
    localeRef.current = locale;
    tRef.current = t;
  }, [locale, t]);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get("tab")?.toLowerCase().trim();
  const pathSubSegment = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/^\/(?:en\/)?user\/([^/?#]+)/i);
    return match ? match[1].toLowerCase().trim() : null;
  }, [pathname]);
  const activeMenu =
    (rawTab && VALID_USER_TABS[rawTab]) ||
    (pathSubSegment && VALID_USER_TABS[pathSubSegment]) ||
    "overview";

  /* ---------------------------------------------------------------- */
  /* USER DATA                                                        */
  /* ---------------------------------------------------------------- */

  const [userData, setUserData] = useState<{
    email: string;
    name: string;
    refCode: string;
    balance: number;
    coinBalance: number;
    avatarUrl?: string | null;
  }>(() => {
    const p = cachedUserDashboardData?.profile;
    const avatarUrl = p?.avatar_url || p?.photo_url || p?.image || null;
    return {
      email: p?.email || "",
      name: p?.full_name || "",
      refCode: p?.referral_code || "",
      balance: Number(p?.balance || 0),
      coinBalance: Number(p?.coin_balance || 0),
      avatarUrl,
    };
  });

  const [memberType, setMemberType] = useState<
    "Reguler" | "Special" | "Gold" | string
  >(() => {
    return cachedUserDashboardData?.profile?.member_type || "Reguler";
  });

  const [orders, setOrders] = useState<
    DashboardOrder[]
  >(() => {
    return Array.isArray(cachedUserDashboardData?.orders)
      ? cachedUserDashboardData!.orders!
      : [];
  });

  const [deposits, setDeposits] = useState<
    DashboardDeposit[]
  >(() => {
    return Array.isArray(cachedUserDashboardData?.deposits)
      ? cachedUserDashboardData!.deposits!
      : [];
  });

  const [withdrawals, setWithdrawals] = useState<
    DashboardWithdrawal[]
  >(() => {
    return Array.isArray(cachedUserDashboardData?.withdrawals)
      ? cachedUserDashboardData!.withdrawals!
      : [];
  });

  const [balanceLogs, setBalanceLogs] = useState<
    DashboardBalanceLog[]
  >(() => {
    return Array.isArray(cachedUserDashboardData?.balanceLogs)
      ? cachedUserDashboardData!.balanceLogs!
      : [];
  });

  const [referrals, setReferrals] = useState<
    DashboardReferral[]
  >(() => {
    return Array.isArray(cachedUserDashboardData?.referrals)
      ? cachedUserDashboardData!.referrals!
      : [];
  });

  const [isInitialLoading, setIsInitialLoading] = useState(() => !cachedUserDashboardData);
  const [isMaintenance, setIsMaintenance] =
    useState(false);

  const [currentDomain, setCurrentDomain] =
    useState("");

  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dapay_user_sidebar_expanded");
      if (saved !== null) {
        return saved === "true";
      }
      return window.innerWidth > 884;
    }
    return true;
  });

  const handleSetSidebarExpanded = useCallback((valOrUpdater: React.SetStateAction<boolean>) => {
    setIsSidebarExpanded((prev) => {
      const nextVal = typeof valOrUpdater === "function" ? valOrUpdater(prev) : valOrUpdater;
      if (typeof window !== "undefined") {
        localStorage.setItem("dapay_user_sidebar_expanded", String(nextVal));
      }
      return nextVal;
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /* SANDBOX WORKSPACE MODE                                           */
  /* ---------------------------------------------------------------- */

  const [sandboxSession, setSandboxSession] = useState<SandboxSessionData | null>(null);
  const [isSandboxInitialized, setIsSandboxInitialized] = useState(false);

  const syncSandboxSession = useCallback(async (force = false) => {
    const session = await fetchTesterSessionDeduplicated(force);
    setSandboxSession(session);
    return session;
  }, []);

  const [sandboxOrders, setSandboxOrders] = useState<DashboardOrder[]>([]);
  const isFetchingSandboxOrdersRef = useRef(false);

  const fetchSandboxOrders = useCallback(async () => {
    if (isFetchingSandboxOrdersRef.current) return;
    try {
      isFetchingSandboxOrdersRef.current = true;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = "Bearer " + session.access_token;
      }
      const res = await fetch("/api/tester/orders?limit=10", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.orders)) {
          setSandboxOrders(json.data.orders);
        }
      }
    } catch {
      // ignore
    } finally {
      isFetchingSandboxOrdersRef.current = false;
    }
  }, []);

  useEffect(() => {
    const cached = getCachedSandboxSession();
    if (cached) {
      setSandboxSession(cached);
      setIsSandboxInitialized(true);
    }
    void syncSandboxSession(true).finally(() => {
      setIsSandboxInitialized(true);
    });
    const handleSync = () => {
      void syncSandboxSession(true);
      void fetchSandboxOrders();
    };
    window.addEventListener("sandboxSessionChanged", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("sandboxSessionChanged", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [syncSandboxSession, fetchSandboxOrders]);

  const isSandboxMode = Boolean(
    sandboxSession?.sandboxAccessState === "ACTIVE" && sandboxSession?.isSandboxActive
  );

  const isSandboxModeRef = useRef(isSandboxMode);
  useEffect(() => {
    isSandboxModeRef.current = isSandboxMode;
  }, [isSandboxMode]);

  useEffect(() => {
    if (isSandboxMode && activeMenu === "overview") {
      void fetchSandboxOrders();
    }
  }, [isSandboxMode, activeMenu, fetchSandboxOrders]);

  /* ---------------------------------------------------------------- */
  /* SANDBOX MEANINGFUL ACTIVITY DISPATCHER                           */
  /* ---------------------------------------------------------------- */

  const lastActivitySignalRef = useRef<Record<string, number>>({});

  const emitSandboxActivity = useCallback(
    (action: "catalog_view" | "margin_view" | "order_review") => {
      if (!isSandboxMode) return;

      const now = Date.now();
      const lastSent = lastActivitySignalRef.current[action] || 0;
      // 30-second client-side cooldown to reduce duplicate requests
      if (now - lastSent < 30_000) return;
      lastActivitySignalRef.current[action] = now;

      // Fire-and-forget: never block UX or navigation
      (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (session?.access_token) {
            headers["Authorization"] = "Bearer " + session.access_token;
          }
          await fetch("/api/tester/activity", {
            method: "POST",
            headers,
            body: JSON.stringify({ action }),
          });
        } catch {
          // Silently ignore network failures; server throttle remains authoritative
        }
      })();
    },
    [isSandboxMode]
  );

  // Track explicit user tab switching in Sandbox mode
  // Does NOT fire on generic mount/render because prevSandboxMenuRef initializes to activeMenu
  const prevSandboxMenuRef = useRef<string>(activeMenu);
  useEffect(() => {
    if (isSandboxMode && activeMenu !== prevSandboxMenuRef.current) {
      if (activeMenu === "catalog") {
        emitSandboxActivity("catalog_view");
      } else if (activeMenu === "orders") {
        emitSandboxActivity("order_review");
      }
    }
    prevSandboxMenuRef.current = activeMenu;
  }, [activeMenu, isSandboxMode, emitSandboxActivity]);


  const handleExitSandbox = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = "Bearer " + session.access_token;
      }
      await fetch("/api/tester/session", { method: "DELETE", headers });
      const nextData: SandboxSessionData | null = sandboxSession
        ? { ...sandboxSession, isSandboxActive: false }
        : null;
      setCachedSandboxSession(nextData);
      if (nextData) broadcastSandboxSync(nextData);
      window.dispatchEvent(new Event("sandboxSessionChanged"));
      if (activeMenu === "catalog") {
        router.push(localizeHref("/user", locale), { scroll: false });
      }
    } catch {
      // ignore
    }
  };

  // Redirect to overview if non-sandbox user visits catalog tab (only after sandbox session check initializes)
  useEffect(() => {
    if (isSandboxInitialized && !isSandboxMode && activeMenu === "catalog") {
      router.replace(localizeHref("/user", locale), { scroll: false });
    }
  }, [isSandboxInitialized, isSandboxMode, activeMenu, router, locale]);

  const handleResetSandbox = async () => {
    if (!confirm(t("sandbox.session.confirmReset"))) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = "Bearer " + session.access_token;
      }
      const res = await fetch("/api/tester/wallet/reset", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetAmount: 1000000 }),
      });
      if (res.ok) {
        const updated = await res.json();
        const nextData: SandboxSessionData | null = sandboxSession
          ? { ...sandboxSession, sandboxBalance: updated.balance || 1000000 }
          : null;
        setCachedSandboxSession(nextData);
        if (nextData) broadcastSandboxSync(nextData);
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }
    } catch {
      // ignore
    }
  };

  /* ---------------------------------------------------------------- */
  /* UPGRADE                                                          */
  /* ---------------------------------------------------------------- */

  const [showUpgradeModal, setShowUpgradeModal] =
    useState(false);

  const [isUpgrading, setIsUpgrading] =
    useState(false);

  /* ================================================================= */
  /* FETCH DASHBOARD (WITH IN-FLIGHT REQUEST COALESCING & MODE GUARD)  */
  /* ================================================================= */

  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const dashboardRequestIdRef = useRef(0);

  const fetchDashboardData = useCallback(
    async (initialLoad = false, options?: { profileOnly?: boolean }) => {
      // If a dashboard request is already in-flight, reuse the same promise to prevent duplicate network calls
      if (inFlightPromiseRef.current) {
        return inFlightPromiseRef.current;
      }

      if (initialLoad) {
        setIsInitialLoading(true);
      }

      const currentRequestId = ++dashboardRequestIdRef.current;
      const requestIsSandbox = isSandboxModeRef.current;
      const profileOnly = options?.profileOnly ?? requestIsSandbox;

      const task = (async () => {
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError || !session?.access_token) {
            await clearSupabaseLocalAuth();
            window.location.href = localizeHref("/login", localeRef.current);
            return;
          }

          const response = await fetch(
            "/api/user/dashboard",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                profileOnly,
              }),
            },
          );

          if (response.status === 401) {
            await clearSupabaseLocalAuth();
            window.location.href = localizeHref("/login", localeRef.current);
            return;
          }

          const result =
            (await response.json()) as DashboardResponse;

          if (!response.ok || !result.success) {
            throw new Error(
              result.error ||
                tRef.current("dashboard.overview.errLoadDashboard"),
            );
          }

          // Stale response guard: drop if request ID changed or workspace mode flipped in-flight
          if (
            currentRequestId !== dashboardRequestIdRef.current ||
            requestIsSandbox !== isSandboxModeRef.current
          ) {
            return;
          }

          const data = result.data;
          const inSandbox = isSandboxModeRef.current;

          if (data && !inSandbox) {
            cachedUserDashboardData = data;
          }

          const profile = data?.profile;

          const avatarUrl =
            profile?.avatar_url ||
            profile?.photo_url ||
            profile?.image ||
            null;

          setUserData((previous) => ({
            email:
              profile?.email ||
              previous.email ||
              "",
            name:
              profile?.full_name ||
              previous.name ||
              "",
            refCode:
              profile?.referral_code ||
              previous.refCode ||
              "",
            balance:
              inSandbox ? 0 : Number(profile?.balance || 0),
            coinBalance:
              inSandbox ? 0 : Number(profile?.coin_balance || 0),
            avatarUrl:
              avatarUrl ||
              previous.avatarUrl ||
              null,
          }));

          const currentMemberType = profile?.member_type || "Reguler";
          setMemberType(currentMemberType);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("dapay_user_member_type", currentMemberType);
            } catch {
              // ignore
            }
          }

          if (inSandbox) {
            setOrders([]);
            setDeposits([]);
            setWithdrawals([]);
            setBalanceLogs([]);
            setReferrals([]);
          } else {
            setOrders(
              Array.isArray(data?.orders) ? data.orders : [],
            );
            setDeposits(
              Array.isArray(data?.deposits) ? data.deposits : [],
            );
            setWithdrawals(
              Array.isArray(data?.withdrawals) ? data.withdrawals : [],
            );
            setBalanceLogs(
              Array.isArray(data?.balanceLogs) ? data.balanceLogs : [],
            );
            setReferrals(
              Array.isArray(data?.referrals) ? data.referrals : [],
            );
          }
        } catch (error) {
          console.error(
            "UserDashboard:",
            error,
          );
        } finally {
          setIsInitialLoading(false);
          inFlightPromiseRef.current = null;
        }
      })();

      inFlightPromiseRef.current = task;
      return task;
    },
    [],
  );

  /* ================================================================= */
  /* INITIAL AUTH & MAINTENANCE CHECK                                 */
  /* ================================================================= */

  useEffect(() => {
    const userEmail =
      localStorage.getItem("userEmail");

    const isUser =
      localStorage.getItem("isUser");

    if (isUser !== "true" || !userEmail) {
      window.location.href = localizeHref("/login", localeRef.current);
      return;
    }

    setCurrentDomain(
      window.location.origin,
    );

    setUserData((previous) => ({
      ...previous,
      email: userEmail,
    }));

    const checkMaintenance = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("is_maintenance")
          .single();

        if (data?.is_maintenance) {
          setIsMaintenance(true);
          setIsInitialLoading(false);
        }
      } catch (error) {
        console.error(
          "Maintenance check:",
          error,
        );
      }
    };

    void checkMaintenance();
  }, []);

  /* ================================================================= */
  /* WORKSPACE DATA FETCHING & SWITCHING LIFECYCLE                     */
  /* ================================================================= */

  const prevWorkspaceModeRef = useRef<boolean | null>(null);

  useEffect(() => {
    // SANGAT PENTING: Jangan fetch sebelum workspace state ter-resolusi
    if (!isSandboxInitialized) {
      return;
    }

    const modeChanged = prevWorkspaceModeRef.current !== isSandboxMode;
    prevWorkspaceModeRef.current = isSandboxMode;

    if (modeChanged) {
      // Invalidate in-flight requests from previous mode to prevent stale overwrite
      dashboardRequestIdRef.current++;
      inFlightPromiseRef.current = null;

      if (isSandboxMode) {
        // Purge LIVE state immediately when entering Sandbox
        setOrders([]);
        setDeposits([]);
        setWithdrawals([]);
        setBalanceLogs([]);
        setReferrals([]);
        // Fetch only profile for Sandbox workspace
        void fetchDashboardData(true, { profileOnly: true });
        void fetchSandboxOrders();
      } else {
        // Purge sandbox orders when entering LIVE and fetch full LIVE data
        setSandboxOrders([]);
        void fetchDashboardData(!cachedUserDashboardData);
      }
      return;
    }

    // Initial mount after workspace state is resolved
    if (isSandboxMode) {
      void fetchDashboardData(true, { profileOnly: true });
    } else {
      void fetchDashboardData(!cachedUserDashboardData);
    }
  }, [isSandboxInitialized, isSandboxMode, fetchDashboardData, fetchSandboxOrders]);

  /* ================================================================= */
  /* LIVE REALTIME SUBSCRIPTION LIFECYCLE                              */
  /* ================================================================= */

  useEffect(() => {
    // SANGAT PENTING: Jangan subscribe realtime finansial LIVE saat Sandbox aktif
    // atau sebelum workspace state ter-resolusi
    if (!isSandboxInitialized || isSandboxMode) {
      return;
    }

    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) return;

    const channel = supabase
      .channel("user-dashboard-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `email=eq.${userEmail}`,
        },
        (payload) => {
          if (isSandboxModeRef.current) return;
          setUserData((previous) => ({
            ...previous,
            balance:
              Number(payload.new?.balance || 0),
          }));

          void fetchDashboardData(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "balance_logs",
          filter: `user_email=eq.${userEmail}`,
        },
        () => {
          if (!isSandboxModeRef.current) void fetchDashboardData(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deposits",
          filter: `user_email=eq.${userEmail}`,
        },
        () => {
          if (!isSandboxModeRef.current) void fetchDashboardData(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawals",
          filter: `user_email=eq.${userEmail}`,
        },
        () => {
          if (!isSandboxModeRef.current) void fetchDashboardData(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isSandboxInitialized, isSandboxMode, fetchDashboardData]);

  const handleRefreshDashboard = useCallback(() => {
    if (isSandboxMode) {
      void syncSandboxSession(true);
      void fetchSandboxOrders();
      void fetchDashboardData(false, { profileOnly: true });
      return;
    }
    void fetchDashboardData(false);
  }, [isSandboxMode, syncSandboxSession, fetchSandboxOrders, fetchDashboardData]);

  const handleRefreshOrders = useCallback(() => {
    if (isSandboxMode) {
      emitSandboxActivity("order_review");
      return;
    }
    void fetchDashboardData(false);
  }, [isSandboxMode, emitSandboxActivity, fetchDashboardData]);

  /* ================================================================= */
  /* RESPONSIVE SIDEBAR EXPANSION                                      */
  /* ================================================================= */

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Tier 2: Tablet (768px s/d 884px) -> Default Navigation Rail (76px) agar konten luas
      if (width >= 768 && width <= 884) {
        setIsSidebarExpanded(false);
      } else if (width > 884) {
        const saved = typeof window !== "undefined" ? localStorage.getItem("dapay_user_sidebar_expanded") : null;
        if (saved !== null) {
          setIsSidebarExpanded(saved === "true");
        } else {
          setIsSidebarExpanded(true);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  /* ================================================================= */
  /* AUTO-POPUP PROMO FOR REGULAR MEMBERS (ONCE PER SESSION)          */
  /* ================================================================= */
  useEffect(() => {
    if (isInitialLoading || isSandboxMode) return;
    if (memberType === "Special" || memberType === "Gold") return;

    try {
      const hasSeenPromo = sessionStorage.getItem(
        "dapay_special_member_promo_seen",
      );
      if (!hasSeenPromo) {
        setShowUpgradeModal(true);
        sessionStorage.setItem(
          "dapay_special_member_promo_seen",
          "true",
        );
      }
    } catch {
      // Ignore storage errors in restricted iframe/private mode
    }
  }, [isInitialLoading, isSandboxMode, memberType]);

  /* ================================================================= */
  /* NAVIGATION HANDLER                                               */
  /* ================================================================= */

  const handleMenuNavigation = (
    menu: string,
  ) => {
    /*
     * Upgrade bukan halaman.
     * Tombol Upgrade pada sidebar membuka modal.
     */
    if (menu === "upgrade") {
      if (isSandboxMode) {
        return;
      }
      setShowUpgradeModal(true);
      return;
    }

    const targetUrl =
      menu === "overview"
        ? localizeHref("/user", locale)
        : `${localizeHref("/user", locale)}?tab=${menu}`;
    router.push(targetUrl, { scroll: false });
  };

  /* ================================================================= */
  /* UPGRADE                                                          */
  /* ================================================================= */

  const handleUpgradeMember =
    async () => {
      setIsUpgrading(true);

      try {
        const response = await fetch(
          "/api/member/upgrade",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: userData.email,
            }),
          },
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              t("dashboard.upgradeModal.errorAlert"),
          );
        }

        alert(
          t("dashboard.upgradeModal.successAlert"),
        );

        setMemberType("Special");
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("dapay_user_member_type", "Special");
          } catch {
            // ignore
          }
        }

        setShowUpgradeModal(false);

        await fetchDashboardData();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : t("dashboard.upgradeModal.errorAlert"),
        );
      } finally {
        setIsUpgrading(false);
      }
    };

  /* ================================================================= */
  /* MAINTENANCE                                                      */
  /* ================================================================= */

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  /* ================================================================= */
  /* SETTINGS SECTION RESOLVER                                         */
  /* ================================================================= */

  const settingsSection: "profile" | "security" | "notifications" =
    activeMenu === "settings-security"
      ? "security"
      : activeMenu === "settings-notifications"
        ? "notifications"
        : "profile";

  /* ================================================================= */
  /* PERSISTENT DASHBOARD SHELL                                        */
  /* ================================================================= */

  return (
    <DashboardShell
      isSandboxMode={isSandboxMode}
      onExitSandbox={handleExitSandbox}
      activeMenu={activeMenu}
      userName={userData.name || "Member DaPay"}
      memberType={memberType}
      balance={isSandboxMode ? (sandboxSession?.sandboxBalance ?? 1000000) : Number(userData.balance)}
      setActiveMenu={handleMenuNavigation}
      isSidebarExpanded={isSidebarExpanded}
      setIsSidebarExpanded={handleSetSidebarExpanded}
      avatarUrl={userData.avatarUrl}
      onRefresh={handleRefreshDashboard}
      onOpenUpgrade={() => setShowUpgradeModal(true)}
      isInitialLoading={isInitialLoading}
    >
      {activeMenu === "overview" && (
        <OverviewContent
          userData={userData}
          orders={orders}
          deposits={deposits}
          withdrawals={withdrawals}
          balanceLogs={balanceLogs}
          referrals={referrals}
          isSidebarExpanded={isSidebarExpanded}
          currentDomain={currentDomain}
          isInitialLoading={!isSandboxInitialized || isInitialLoading}
          isSandboxMode={isSandboxMode}
          sandboxBalance={sandboxSession?.sandboxBalance ?? 1000000}
          sandboxCoinBalance={sandboxSession?.sandboxCoinBalance ?? 0}
          onResetSandbox={handleResetSandbox}
          sandboxOrders={sandboxOrders}
          sandboxQuota={sandboxSession?.quota}
        />
      )}

      {activeMenu === "catalog" && isSandboxMode && (
        <SandboxCatalogView
          isSidebarExpanded={isSidebarExpanded}
          onMarginView={() => emitSandboxActivity("margin_view")}
          isSimulationQuotaExhausted={Boolean(sandboxSession?.quota?.isSimulationQuotaExhausted)}
        />
      )}

      {activeMenu === "orders" && (
        <OrdersViewUser
          initialOrders={isSandboxInitialized && !isSandboxMode ? orders : []}
          isSidebarExpanded={isSidebarExpanded}
          onRefresh={handleRefreshOrders}
          isSandboxMode={isSandboxMode}
          isWorkspaceResolved={isSandboxInitialized}
        />
      )}

      {activeMenu === "wallet" && (
        <WalletViewUser
          initialBalance={isSandboxMode ? 0 : Number(userData.balance || 0)}
          initialCoinBalance={isSandboxMode ? 0 : Number(userData.coinBalance || 0)}
          initialLogs={isSandboxMode ? [] : balanceLogs}
          isSidebarExpanded={isSidebarExpanded}
          onRefresh={handleRefreshDashboard}
          isSandboxMode={isSandboxMode}
        />
      )}

      {activeMenu === "deposit" && (
        isSandboxMode ? (
          <SandboxFinancialNotice
            type="deposit"
            onGoToCatalog={() => handleMenuNavigation("catalog")}
            onExitSandbox={handleExitSandbox}
          />
        ) : (
          <DepositViewUser
            initialBalance={Number(userData.balance || 0)}
            initialCoinBalance={Number(userData.coinBalance || 0)}
            initialDeposits={deposits}
            isSidebarExpanded={isSidebarExpanded}
            onRefresh={handleRefreshDashboard}
          />
        )
      )}

      {(activeMenu === "withdraw" || activeMenu === "withdrawal") && (
        isSandboxMode ? (
          <SandboxFinancialNotice
            type="withdraw"
            onGoToCatalog={() => handleMenuNavigation("catalog")}
            onExitSandbox={handleExitSandbox}
          />
        ) : (
          <WithdrawViewUser
            initialBalance={Number(userData.balance || 0)}
            initialCoinBalance={Number(userData.coinBalance || 0)}
            initialWithdrawals={withdrawals}
            isSidebarExpanded={isSidebarExpanded}
            onRefresh={handleRefreshDashboard}
          />
        )
      )}

      {activeMenu === "affiliate" && (
        isSandboxMode ? (
          <SandboxFinancialNotice
            type="affiliate"
            onGoToCatalog={() => handleMenuNavigation("catalog")}
            onExitSandbox={handleExitSandbox}
          />
        ) : (
          <AffiliateViewUser
            initialProfile={{
              full_name: userData.name,
              email: userData.email,
              referral_code: userData.refCode,
              balance: userData.balance,
              member_type: memberType,
              coin_balance: userData.coinBalance,
            }}
            initialReferrals={referrals}
            initialBalanceLogs={balanceLogs}
            isSidebarExpanded={isSidebarExpanded}
            onRefresh={handleRefreshDashboard}
          />
        )
      )}

      {(activeMenu === "settings" || activeMenu.startsWith("settings-")) && (
        <SettingsViewUser
          initialProfile={{
            full_name: userData.name,
            email: userData.email,
            referral_code: userData.refCode,
            balance: userData.balance,
            coin_balance: userData.coinBalance,
            member_type: memberType,
            avatar_url: userData.avatarUrl,
          }}
          activeSection={settingsSection}
          onSectionChange={(sec) => handleMenuNavigation(`settings-${sec}`)}
          isSidebarExpanded={isSidebarExpanded}
          onRefresh={handleRefreshDashboard}
        />
      )}

      {activeMenu === "help" && <HelpViewUser />}

      {/* ============================================================ */}
      {/* MODAL UPGRADE (GLOBAL PERSISTENT FOR ALL TABS)                */}
      {/* ============================================================ */}

      {showUpgradeModal && !isSandboxMode && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-amber-200/80 bg-linear-to-b from-white via-amber-50/25 to-white p-6 shadow-2xl sm:p-7">
            {/* Ambient decorative glow */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-linear-to-br from-amber-400/20 via-orange-400/15 to-transparent blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-linear-to-tr from-violet-500/10 via-indigo-400/10 to-transparent blur-2xl" />

            {/* Close button X */}
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              disabled={isUpgrading}
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer z-10"
              aria-label={t("dashboard.upgradeModal.closeAria")}
            >
              <X size={18} />
            </button>

            {/* Top Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 shadow-2xs">
                <Crown size={12} className="text-amber-600 fill-amber-500" />
                {t("dashboard.upgradeModal.badgePromo")}
              </span>
            </div>

            <div className="pr-6">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 leading-tight">
                {t("dashboard.upgradeModal.title")}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-600 font-medium">
                {t("dashboard.upgradeModal.desc")}
              </p>
            </div>

            {/* Price Box */}
            <div className="mt-4.5 rounded-2xl border border-amber-200/90 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 p-4 text-center ring-1 ring-amber-300/30">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-amber-700">
                {t("dashboard.upgradeModal.cost")}
              </p>

              <div className="mt-1 flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-black tracking-tight text-slate-950 font-mono">
                  Rp50.000
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  / {t("dashboard.upgradeModal.oneTimePayment")}
                </span>
              </div>
            </div>

            {/* Benefits List */}
            <div className="mt-3.5 space-y-2 rounded-2xl border border-slate-100 bg-white/80 p-3.5 shadow-2xs">
              <BenefitRow>{t("dashboard.nav.cashbackBigger")}</BenefitRow>
              <BenefitRow>{t("dashboard.nav.commissionHigher")}</BenefitRow>
              <BenefitRow>{t("dashboard.nav.exclusivePromo")}</BenefitRow>
              <BenefitRow>{t("dashboard.nav.priorityService")}</BenefitRow>
            </div>

            {/* Main Action Buttons */}
            <button
              type="button"
              onClick={handleUpgradeMember}
              disabled={isUpgrading}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-sm font-black text-white shadow-md shadow-amber-500/25 transition hover:brightness-110 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isUpgrading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("dashboard.upgradeModal.processing")}
                </>
              ) : (
                <>
                  <Crown size={16} className="fill-yellow-200 text-yellow-100" />
                  <span>{t("dashboard.upgradeModal.upgradeCta")}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              disabled={isUpgrading}
              className="mt-2.5 w-full py-1.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              {t("dashboard.upgradeModal.laterButton")}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

/* ================================================================== */
/* OVERVIEW CONTENT (ISOLATED CALCULATIONS & LAYOUT)                  */
/* ================================================================== */

function OverviewContent({
  userData,
  orders,
  deposits,
  withdrawals,
  balanceLogs,
  referrals,
  isSidebarExpanded,
  currentDomain,
  isInitialLoading = false,
  isSandboxMode = false,
  sandboxBalance = 1000000,
  sandboxCoinBalance = 0,
  onResetSandbox,
  sandboxOrders = [],
  sandboxQuota = null,
}: {
  userData: {
    email: string;
    name: string;
    refCode: string;
    balance: number;
    coinBalance: number;
    avatarUrl?: string | null;
  };
  orders: DashboardOrder[];
  deposits: DashboardDeposit[];
  withdrawals: DashboardWithdrawal[];
  balanceLogs: DashboardBalanceLog[];
  referrals: DashboardReferral[];
  isSidebarExpanded?: boolean;
  currentDomain: string;
  isInitialLoading?: boolean;
  isSandboxMode?: boolean;
  sandboxBalance?: number;
  sandboxCoinBalance?: number;
  onResetSandbox?: () => void;
  sandboxOrders?: DashboardOrder[];
  sandboxQuota?: SandboxQuotaData | null;
}) {
  const { t, locale } = useI18n();

  // Sandbox Calculations (Strictly isolated from LIVE data)
  const remainingSimulations = useMemo(() => {
    if (!sandboxQuota) return 20;
    return Math.max(0, (sandboxQuota.dailySimulationLimit || 20) - (sandboxQuota.simulationsToday || 0));
  }, [sandboxQuota]);

  const dailySimulationLimit = sandboxQuota?.dailySimulationLimit || 20;

  const successfulSandboxOrdersCount = useMemo(() => {
    return sandboxOrders.filter((o) => normalizeStatus(o.status) === "Berhasil").length;
  }, [sandboxOrders]);

  const totalSimulatedValue = useMemo(() => {
    return sandboxOrders
      .filter((o) => normalizeStatus(o.status) === "Berhasil")
      .reduce((sum, o) => sum + Number(o.total_amount ?? o.price ?? 0), 0);
  }, [sandboxOrders]);

  const sandboxOrdersSparkline = useMemo(() => {
    const points = generateCumulativeMonthlyPoints(sandboxOrders, () => 1);
    return buildSvgSparkline(points);
  }, [sandboxOrders]);

  const displayOrders = isSandboxMode ? sandboxOrders : orders;

  const totalReferralCommission = useMemo(() => {
    return balanceLogs
      .filter(
        (log) =>
          Number(log.amount) > 0 &&
          ["Referral", "Commission"].includes(String(log.type)),
      )
      .reduce((sum, log) => sum + Number(log.amount), 0);
  }, [balanceLogs]);

  const monthlyReferralCommission = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return balanceLogs
      .filter((log) => {
        if (!log.created_at) return false;
        const d = new Date(log.created_at);
        const isThisMonth =
          !isNaN(d.getTime()) &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear;

        return (
          isThisMonth &&
          Number(log.amount) > 0 &&
          ["Referral", "Commission"].includes(String(log.type))
        );
      })
      .reduce((sum, log) => sum + Number(log.amount), 0);
  }, [balanceLogs]);

  const monthlyReferrals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return referrals.filter((r) => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    });
  }, [referrals]);

  const totalWithdrawn = useMemo(() => {
    return withdrawals
      .filter(
        (withdrawal) =>
          normalizeStatus(withdrawal.status) === "Berhasil",
      )
      .reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);
  }, [withdrawals]);

  const totalDeposit = useMemo(() => {
    return deposits
      .filter(
        (deposit) =>
          normalizeStatus(deposit.status) === "Berhasil",
      )
      .reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
  }, [deposits]);

  const pendingWithdrawAmount = useMemo(() => {
    return withdrawals
      .filter(
        (withdrawal) =>
          normalizeStatus(withdrawal.status) === "Pending",
      )
      .reduce(
        (sum, withdrawal) =>
          sum +
          Number(
            withdrawal.held_amount || withdrawal.amount || 0,
          ),
        0,
      );
  }, [withdrawals]);

  const referralSparkline = useMemo(() => {
    const referralLogs = balanceLogs.filter(
      (log) =>
        Number(log.amount) > 0 &&
        ["Referral", "Commission"].includes(String(log.type)),
    );
    const points = generateCumulativeMonthlyPoints(
      referralLogs,
      (item) => Number(item.amount || 0),
    );
    return buildSvgSparkline(points);
  }, [balanceLogs]);

  const withdrawalSparkline = useMemo(() => {
    const successfulWithdrawals = withdrawals.filter(
      (w) => normalizeStatus(w.status) === "Berhasil",
    );
    const points = generateCumulativeMonthlyPoints(
      successfulWithdrawals,
      (item) => Number(item.amount || 0),
    );
    return buildSvgSparkline(points);
  }, [withdrawals]);

  const depositSparkline = useMemo(() => {
    const successfulDeposits = deposits.filter(
      (d) => normalizeStatus(d.status) === "Berhasil",
    );
    const points = generateCumulativeMonthlyPoints(
      successfulDeposits,
      (item) => Number(item.amount || 0),
    );
    return buildSvgSparkline(points);
  }, [deposits]);

  const ordersSparkline = useMemo(() => {
    const points = generateCumulativeMonthlyPoints(
      orders,
      () => 1,
    );
    return buildSvgSparkline(points);
  }, [orders]);

  const referralLink =
    currentDomain && userData.refCode
      ? `${currentDomain}/ref/${userData.refCode}`
      : "";

  const copyReferralLink = async () => {
    if (!referralLink) {
      alert(t("dashboard.overview.alertLinkNotAvailable"));
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      alert(t("dashboard.overview.alertLinkCopied"));
    } catch {
      alert(t("dashboard.overview.alertLinkCopyFailed"));
    }
  };

  const coinBalance = userData.coinBalance;

  return (
    <main className="min-w-0">
      {/* ======================================================== */}
      {/* SALDO + KOIN                                             */}
      {/* ======================================================== */}

      <section className="mb-5 sm:mb-6 grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3.5 md:grid-cols-2 md:gap-4 lg:gap-5 xl:gap-6 items-stretch">
        {/* ====================================================== */}
        {/* SALDO DAYAP (Modern Glassmorphism Multi-Device)       */}
        {/* ====================================================== */}
        {isSandboxMode ? (
          <div className="group relative flex h-full min-h-40 xs:min-h-[170px] sm:min-h-47.5 md:min-h-60 lg:min-h-68 xl:min-h-75 flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl xl:rounded-[28px] border border-amber-400/40 bg-linear-to-br from-[#78350f]/90 via-[#92400e]/85 to-[#b45309]/90 p-2.5 xs:p-3 sm:p-4.5 md:p-5 lg:p-6 xl:p-7 text-white shadow-[0_16px_40px_rgba(180,83,9,0.22)] backdrop-blur-2xl ring-1 ring-inset ring-white/20 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(180,83,9,0.32)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-linear-to-br from-amber-400/25 via-orange-400/20 to-yellow-500/20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-52 w-52 rounded-full bg-amber-500/25 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 text-white/5 opacity-50 md:opacity-100 transition-transform duration-700 group-hover:scale-105" aria-hidden="true">
              <FlaskConical size={160} strokeWidth={1} />
            </div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-1 xs:gap-1.5 md:gap-3">
                <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 min-w-0">
                  <div className="flex h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:h-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-lg xs:rounded-xl md:rounded-2xl border border-white/25 bg-white/15 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(0,0,0,0.15)] backdrop-blur-md">
                    <FlaskConical size={14} className="xs:h-4 xs:w-4 md:h-4.5 md:w-4.5 text-amber-300" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[12px] xs:text-[13px] sm:text-[15px] md:text-sm lg:text-base font-bold tracking-tight text-white leading-tight truncate">
                      {t("dashboard.overview.sandboxBalanceTitle")}
                    </h2>
                    <p className="hidden md:block text-[10px] lg:text-[11px] font-medium text-amber-200/80 leading-tight">
                      {t("dashboard.overview.sandboxBalanceSubtitle")}
                    </p>
                  </div>
                </div>
                <span className={"hidden " + (!isSidebarExpanded ? "md:inline-flex" : "lg:inline-flex") + " items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/20 px-2 xs:px-2.5 py-0.5 text-[9px] md:text-[9.5px] font-black uppercase tracking-[0.14em] text-amber-200 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-amber-300/20 whitespace-nowrap"}>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" aria-hidden="true" />
                  {t("dashboard.overview.sandboxActive")}
                </span>
              </div>
              <div className="my-2 xs:my-2.5 md:my-4 lg:my-5 xl:my-6">
                <div className="flex items-center justify-between">
                  <p className="text-[8.5px] xs:text-[9.5px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-[0.18em] text-amber-200/70">
                    {t("dashboard.overview.sandboxAvailable")}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-amber-100 backdrop-blur-xs">
                    <DaPayCoin size={11} />
                    {t("dashboard.overview.sandboxCoins", { count: sandboxCoinBalance.toLocaleString("id-ID") })}
                  </span>
                </div>
                <p className="mt-0.5 md:mt-1 truncate text-[13px] xs:text-[15px] sm:text-[17px] md:text-[clamp(15px,1.9vw,22px)] lg:text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)] leading-none font-mono">
                  {formatRupiah(sandboxBalance)}
                </p>
              </div>
              <div>
                <div className={"grid grid-cols-1 " + (!isSidebarExpanded ? "md:grid-cols-2" : "lg:grid-cols-2") + " gap-1 xs:gap-1.5 md:gap-2 lg:gap-2.5 w-full"}>
                  <Link
                    href={`${localizeHref("/user", locale)}?tab=wallet`}
                    scroll={false}
                    className="inline-flex w-full h-6.5 xs:h-7.5 sm:h-8.5 md:h-9 lg:h-10 xl:h-10.5 items-center justify-center gap-1 xs:gap-1.5 md:gap-1.5 rounded-md xs:rounded-lg md:rounded-xl bg-white px-1.5 xs:px-2 md:px-2.5 lg:px-4 text-[10px] xs:text-[11px] md:text-xs font-bold text-amber-950 shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all duration-200 hover:bg-amber-50 active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <History size={11} className="xs:h-3 xs:w-3 md:h-3.5 md:w-3.5 shrink-0 text-amber-800" />
                    <span className="truncate">{t("dashboard.overview.sandboxMutation")}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={onResetSandbox}
                    className="inline-flex w-full h-6.5 xs:h-7.5 sm:h-8.5 md:h-9 lg:h-10 xl:h-10.5 items-center justify-center gap-1 xs:gap-1.5 md:gap-1.5 rounded-md xs:rounded-lg md:rounded-xl border border-white/30 bg-white/15 px-1.5 xs:px-2 md:px-2.5 lg:px-4 text-[10px] xs:text-[11px] md:text-xs font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:border-white/45 active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw size={11} className="xs:h-3 xs:w-3 md:h-3.5 md:w-3.5 shrink-0" />
                    <span className="truncate">{t("dashboard.overview.resetMillion")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (

        <div className="group relative flex h-full min-h-40 xs:min-h-[170px] sm:min-h-47.5 md:min-h-60 lg:min-h-68 xl:min-h-75 flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl xl:rounded-[28px] border border-blue-400/30 bg-linear-to-br from-[#1e3a8a]/90 via-[#1d4ed8]/85 to-[#312e81]/90 p-2.5 xs:p-3 sm:p-4.5 md:p-5 lg:p-6 xl:p-7 text-white shadow-[0_16px_40px_rgba(30,58,138,0.22)] backdrop-blur-2xl ring-1 ring-inset ring-white/20 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(30,58,138,0.32)]">
          {/* Top Specular Glare / Light Rim */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" aria-hidden="true" />

          {/* Ambient Multi-Color Glass Glow Orbs */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-linear-to-br from-cyan-400/25 via-blue-400/20 to-indigo-500/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-52 w-52 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden="true" />

          {/* Ambient Frosted Watermark */}
          <div className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 text-white/5 opacity-50 md:opacity-100 transition-transform duration-700 group-hover:scale-105" aria-hidden="true">
            <Wallet size={160} strokeWidth={1} />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between">
            {/* Header Card */}
            <div className="flex items-start justify-between gap-1 xs:gap-1.5 md:gap-3">
              <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 min-w-0">
                <div className="flex h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:w-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-lg xs:rounded-xl md:rounded-2xl border border-white/25 bg-white/15 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(0,0,0,0.15)] backdrop-blur-md">
                  <Wallet size={14} className="xs:h-4 xs:w-4 md:h-4.5 md:w-4.5" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[12px] xs:text-[13px] sm:text-[15px] md:text-sm lg:text-base font-bold tracking-tight text-white leading-tight truncate">
                    {t("dashboard.overview.liveBalanceTitle")}
                  </h2>
                  <p className="hidden md:block text-[10px] lg:text-[11px] font-medium text-blue-200/80 leading-tight">
                    {t("dashboard.overview.liveBalanceSubtitle")}
                  </p>
                </div>
              </div>

              <span className={`hidden ${!isSidebarExpanded ? "md:inline-flex" : "lg:inline-flex"} items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-2 xs:px-2.5 py-0.5 text-[9px] md:text-[9.5px] font-bold text-emerald-200 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-emerald-300/20 whitespace-nowrap`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" aria-hidden="true" />
                {t("dashboard.overview.withdrawable")}
              </span>
            </div>

            {/* Nominal Area */}
            <div className="my-2 xs:my-2.5 md:my-4 lg:my-5 xl:my-6">
              <p className="text-[8.5px] xs:text-[9.5px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-[0.18em] text-blue-200/70">
                {t("dashboard.overview.liveBalanceAvailable")}
              </p>
              {isInitialLoading ? (
                <div className="h-6 xs:h-7 sm:h-8 md:h-9 lg:h-10 w-32 xs:w-40 sm:w-48 md:w-56 rounded-xl bg-white/20 animate-pulse my-1" />
              ) : (
                <p className="mt-0.5 md:mt-1 truncate text-[13px] xs:text-[15px] sm:text-[17px] md:text-[clamp(15px,1.9vw,22px)] lg:text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)] leading-none">
                  {formatRupiah(userData.balance)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div>
              <div className={`grid grid-cols-1 ${!isSidebarExpanded ? "md:grid-cols-2" : "lg:grid-cols-2"} gap-1 xs:gap-1.5 md:gap-2 lg:gap-2.5 w-full`}>
                <Link
                  href={`${localizeHref("/user", locale)}?tab=deposit`}
                  scroll={false}
                  className="inline-flex w-full h-6.5 xs:h-7.5 sm:h-8.5 md:h-9 lg:h-10 xl:h-10.5 items-center justify-center gap-1 xs:gap-1.5 md:gap-1.5 rounded-md xs:rounded-lg md:rounded-xl bg-white px-1.5 xs:px-2 md:px-2.5 lg:px-4 text-[10px] xs:text-[11px] md:text-xs font-bold text-blue-900 shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all duration-200 hover:bg-blue-50 hover:shadow-[0_6px_20px_rgba(255,255,255,0.25)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <PlusCircle size={11} className="xs:h-3 xs:w-3 md:h-3.5 md:w-3.5 shrink-0" />
                  <span className="truncate">{t("dashboard.overview.topUpCta")}</span>
                </Link>

                <Link
                  href={`${localizeHref("/user", locale)}?tab=withdraw`}
                  scroll={false}
                  className="inline-flex w-full h-6.5 xs:h-7.5 sm:h-8.5 md:h-9 lg:h-10 xl:h-10.5 items-center justify-center gap-1 xs:gap-1.5 md:gap-1.5 rounded-md xs:rounded-lg md:rounded-xl border border-white/30 bg-white/15 px-1.5 xs:px-2 md:px-2.5 lg:px-4 text-[10px] xs:text-[11px] md:text-xs font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:border-white/45 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <ArrowUpRight size={11} className="xs:h-3 xs:w-3 md:h-3.5 md:w-3.5 shrink-0" />
                  <span className="truncate">{t("dashboard.overview.withdrawCta")}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ====================================================== */}
        {/* TOP CARD 2: KOIN DAPAY (LIVE) / STATUS KUOTA (SANDBOX) */}
        {/* ====================================================== */}
        {isSandboxMode ? (
          <div className="group relative flex h-full min-h-40 xs:min-h-[170px] sm:min-h-47.5 md:min-h-60 lg:min-h-68 xl:min-h-75 flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl xl:rounded-[28px] border border-amber-300/60 bg-linear-to-br from-white/95 via-amber-50/70 to-orange-100/60 p-2.5 xs:p-3 sm:p-4.5 md:p-5 lg:p-6 xl:p-7 shadow-[0_16px_40px_rgba(245,158,11,0.10)] backdrop-blur-2xl ring-1 ring-inset ring-white/80 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(245,158,11,0.16)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white to-transparent" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-linear-to-tr from-amber-400/20 via-orange-300/25 to-yellow-300/15 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" aria-hidden="true" />

            <div className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 text-amber-500/10 opacity-70 transition-transform duration-700 group-hover:scale-105" aria-hidden="true">
              <Clock size={160} strokeWidth={1} />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
              {/* Header Card */}
              <div className="flex items-start justify-between gap-1 xs:gap-1.5 md:gap-3">
                <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 min-w-0">
                  <div className="flex h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:w-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-lg xs:rounded-xl md:rounded-2xl border border-amber-200/80 bg-linear-to-tr from-amber-200/70 via-white/80 to-orange-200/50 text-amber-700 shadow-[0_6px_20px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
                    <Clock size={14} className="xs:h-4 xs:w-4 md:h-4.5 md:w-4.5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[12px] xs:text-[13px] sm:text-[15px] md:text-sm lg:text-base font-black tracking-tight text-slate-900 leading-tight truncate">
                      {t("dashboard.overview.quotaTitle")}
                    </h2>
                    <p className="hidden md:block text-[10px] font-semibold text-amber-700 leading-tight">
                      {t("dashboard.overview.quotaSubtitle")}
                    </p>
                  </div>
                </div>

                <span className={`hidden ${!isSidebarExpanded ? "md:inline-flex" : "lg:inline-flex"} items-center gap-1.5 rounded-full border border-amber-200/90 bg-white/70 px-2 xs:px-2.5 py-0.5 text-[9px] md:text-[9.5px] font-black uppercase tracking-[0.14em] text-amber-800 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 whitespace-nowrap`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
                  {t("dashboard.overview.quotaActive")}
                </span>
              </div>

              {/* Nominal Area */}
              <div className="my-2 xs:my-2.5 md:my-4 lg:my-5 xl:my-6">
                <p className="text-[8.5px] xs:text-[9.5px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-[0.18em] text-amber-900/70">
                  {t("dashboard.overview.remainingQuotaToday")}
                </p>
                <div className="mt-0.5 md:mt-1 flex items-baseline gap-1 md:gap-1.5">
                  <span className="truncate text-[13px] xs:text-[15px] sm:text-[17px] md:text-[clamp(16px,2vw,24px)] lg:text-3xl xl:text-4xl font-black tracking-tight text-slate-950 leading-none">
                    {remainingSimulations}
                  </span>
                  <span className="text-[10px] xs:text-[11px] sm:text-[13px] md:text-sm lg:text-lg font-black tracking-tight text-amber-700">
                    {t("dashboard.overview.quotaLimitFormat", { limit: dailySimulationLimit })}
                  </span>
                </div>
              </div>

              {/* Informational Callout */}
              <div>
                <div className="flex items-center gap-1.5 xs:gap-2 md:gap-2.5 rounded-md xs:rounded-lg md:rounded-xl border border-amber-200/70 bg-white/75 p-1.5 xs:p-2 md:p-2.5 lg:p-3 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 w-full max-w-md">
                  <div className="flex h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-sm xs:rounded-md md:rounded-lg border border-amber-200/80 bg-amber-100/70 text-amber-700 shadow-2xs" aria-hidden="true">
                    <FlaskConical size={11} className="xs:h-3 xs:w-3 md:h-4 md:w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] xs:text-[10.5px] sm:text-[12px] md:text-xs font-bold text-slate-900 leading-tight truncate">
                      {t("dashboard.overview.quotaCalloutTitle", { coins: sandboxCoinBalance.toLocaleString("id-ID") })}
                    </p>
                    <p className="hidden md:block mt-0.5 text-[10px] lg:text-xs text-slate-500 leading-tight">
                      {t("dashboard.overview.quotaCalloutDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="group relative flex h-full min-h-40 xs:min-h-[170px] sm:min-h-47.5 md:min-h-60 lg:min-h-68 xl:min-h-75 flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl xl:rounded-[28px] border border-purple-200/75 bg-linear-to-br from-white/90 via-purple-50/70 to-violet-100/60 p-2.5 xs:p-3 sm:p-4.5 md:p-5 lg:p-6 xl:p-7 shadow-[0_16px_40px_rgba(139,92,246,0.10)] backdrop-blur-2xl ring-1 ring-inset ring-white/80 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(139,92,246,0.16)]">
            {/* Top Specular Glare / Light Rim */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white to-transparent" aria-hidden="true" />

            {/* Ambient Multi-Color Glass Glow Orbs */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-linear-to-tr from-violet-400/25 via-purple-300/30 to-pink-300/20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-52 w-52 rounded-full bg-purple-300/25 blur-3xl" aria-hidden="true" />

            {/* Layered Decorative 3D Coins Artwork */}
            <div
              className="pointer-events-none absolute -right-6 xs:-right-8 top-1/2 -translate-y-1/2 opacity-[0.14] sm:opacity-[0.18] transition-transform duration-700 group-hover:scale-105"
              style={{ perspective: "1000px" }}
              aria-hidden="true"
            >
              <div
                style={{
                  transform: "rotateY(-18deg) rotateX(10deg) rotateZ(-10deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <DaPayCoin size={155} showShadow={false} showText={true} />
              </div>
            </div>

            <div
              className="pointer-events-none absolute right-1 -bottom-3 sm:-bottom-4 opacity-[0.16] sm:opacity-[0.20] transition-transform duration-700 group-hover:scale-105"
              style={{ perspective: "1000px" }}
              aria-hidden="true"
            >
              <div
                style={{
                  transform: "rotateY(-12deg) rotateX(6deg) rotateZ(6deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <DaPayCoin size={95} showShadow={false} showText={true} />
              </div>
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
              {/* Header Card */}
              <div className="flex items-start justify-between gap-1 xs:gap-1.5 md:gap-3">
                <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 min-w-0">
                  {/* Hero Coin Brand Asset with Glowing Aura Halo */}
                  <div
                    className="relative flex shrink-0 items-center justify-center rounded-full p-0.5 xs:p-1 md:p-1.5 lg:p-2 bg-linear-to-tr from-violet-200/70 via-white/80 to-purple-200/50 border border-white/80 shadow-[0_6px_20px_rgba(139,92,246,0.22),inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md"
                    style={{ perspective: "800px" }}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        transform: "rotateY(-10deg) rotateX(6deg) rotateZ(-2deg)",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <div className="md:hidden">
                        <DaPayCoin size={22} showShadow={true} showText={true} />
                      </div>
                      <div className="hidden md:block">
                        <DaPayCoin size={34} showShadow={true} showText={true} />
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-[12px] xs:text-[13px] sm:text-[15px] md:text-sm lg:text-base font-black tracking-tight text-slate-900 leading-tight truncate">
                      {t("dashboard.overview.coinsTitle")}
                    </h2>
                    <p className="hidden md:block text-[10px] font-semibold text-purple-600 leading-tight">
                      {t("dashboard.overview.coinsSubtitle")}
                    </p>
                  </div>
                </div>

                <span className={`hidden ${!isSidebarExpanded ? "md:inline-flex" : "lg:inline-flex"} items-center gap-1.5 rounded-full border border-purple-200/90 bg-white/70 px-2 xs:px-2.5 py-0.5 text-[9px] md:text-[9.5px] font-black uppercase tracking-[0.14em] text-purple-700 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 whitespace-nowrap`}>
                  <span className="text-[10px] xs:text-[11px] text-purple-600 leading-none" aria-hidden="true">✦</span>
                  {t("dashboard.overview.rewardPill")}
                </span>
              </div>

              {/* Nominal Area */}
              <div className="my-2 xs:my-2.5 md:my-4 lg:my-5 xl:my-6">
                <p className="text-[8.5px] xs:text-[9.5px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-[0.18em] text-purple-900/60">
                  {t("dashboard.overview.totalCoins")}
                </p>
                {isInitialLoading ? (
                  <div className="h-6 xs:h-7 sm:h-8 md:h-9 lg:h-10 w-28 xs:w-36 sm:w-44 md:w-48 rounded-xl bg-purple-200/50 animate-pulse my-1" />
                ) : (
                  <div className="mt-0.5 md:mt-1 flex items-baseline gap-1 md:gap-1.5">
                    <span className="truncate text-[13px] xs:text-[15px] sm:text-[17px] md:text-[clamp(16px,2vw,24px)] lg:text-3xl xl:text-4xl font-black tracking-tight text-slate-950 leading-none">
                      {coinBalance.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] xs:text-[11px] sm:text-[13px] md:text-sm lg:text-lg font-black tracking-tight text-violet-700">
                      {t("dashboard.overview.coinsUnit")}
                    </span>
                  </div>
                )}
              </div>

              {/* Informational Callout */}
              <div>
                <div className="flex items-center gap-1.5 xs:gap-2 md:gap-2.5 rounded-md xs:rounded-lg md:rounded-xl border border-purple-200/60 bg-white/75 p-1.5 xs:p-2 md:p-2.5 lg:p-3 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 w-full max-w-md">
                  <div className="flex h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-sm xs:rounded-md md:rounded-lg border border-purple-200/80 bg-purple-100/70 text-purple-700 shadow-2xs backdrop-blur-xs" aria-hidden="true">
                    <Gift size={11} className="xs:h-3 xs:w-3 md:h-4 md:w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] xs:text-[10.5px] sm:text-[12px] md:text-xs font-bold text-slate-900 leading-tight">
                      {t("dashboard.overview.coinsCalloutTitle")}
                    </p>
                    <p className="hidden md:block mt-0.5 text-[10px] lg:text-xs text-slate-500 leading-tight">
                      {t("dashboard.overview.coinsCalloutDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* KPI SUMMARY                                              */}
      {/* ======================================================== */}

      {isSandboxMode ? (
        <section className="mb-5 sm:mb-6 grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3.5 md:grid-cols-2 md:gap-3.5 lg:grid-cols-4 lg:gap-4 xl:gap-5">
          <KpiCard
            icon={<ShoppingBag size={17} />}
            label={t("dashboard.kpi.totalSimulations")}
            value={sandboxOrders.length.toLocaleString("id-ID")}
            note={t("dashboard.kpi.simulatedOrders")}
            tone="amber"
            sparkline={sandboxOrdersSparkline}
            isLoading={isInitialLoading}
          />

          <KpiCard
            icon={<CheckCircle2 size={17} />}
            label={t("dashboard.kpi.successfulSimulations")}
            value={successfulSandboxOrdersCount.toLocaleString("id-ID")}
            note={
              sandboxOrders.length > 0
                ? t("dashboard.kpi.successRate", { percent: Math.round((successfulSandboxOrdersCount / sandboxOrders.length) * 100) })
                : t("dashboard.kpi.simulationSuccessful")
            }
            tone="emerald"
            sparkline={sandboxOrdersSparkline}
            isLoading={isInitialLoading}
          />

          <KpiCard
            icon={<Clock size={17} />}
            label={t("dashboard.kpi.remainingQuota")}
            value={`${remainingSimulations}`}
            note={t("dashboard.kpi.fromLimit", { limit: dailySimulationLimit })}
            tone="purple"
            isLoading={isInitialLoading}
          />

          <KpiCard
            icon={<Wallet size={17} />}
            label={t("dashboard.kpi.simulatedTransactionValue")}
            value={formatRupiah(totalSimulatedValue)}
            note={t("dashboard.kpi.virtualTransactionValue")}
            tone="blue"
            isLoading={isInitialLoading}
          />
        </section>
      ) : (
        <section className="mb-5 sm:mb-6 grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3.5 md:grid-cols-2 md:gap-3.5 lg:grid-cols-4 lg:gap-4 xl:gap-5">
          <KpiCard
            icon={<ArrowUpRight size={17} />}
            label={t("dashboard.kpi.referralCommission")}
            value={formatRupiah(totalReferralCommission)}
            note={t("dashboard.kpi.creditedToBalance")}
            tone="purple"
            sparkline={referralSparkline}
            isLoading={isInitialLoading}
          />

          <KpiCard
            icon={<ArrowUpRight size={17} />}
            label={t("dashboard.kpi.totalWithdrawals")}
            value={formatRupiah(totalWithdrawn)}
            note={
              pendingWithdrawAmount > 0
                ? t("dashboard.kpi.pendingAmount", { amount: formatRupiah(pendingWithdrawAmount) })
                : t("dashboard.kpi.withdrawalSuccessful")
            }
            tone="emerald"
            sparkline={withdrawalSparkline}
            isLoading={isInitialLoading}
          />

          <KpiCard
            icon={<CreditCard size={17} />}
            label={t("dashboard.kpi.totalDeposits")}
            value={formatRupiah(totalDeposit)}
            note={t("dashboard.kpi.depositSuccessful")}
            tone="blue"
            sparkline={depositSparkline}
            isLoading={isInitialLoading}
          />

          <KpiCard
            icon={<ShoppingBag size={17} />}
            label={t("dashboard.kpi.totalTransactions")}
            value={orders.length.toLocaleString("id-ID")}
            note={t("dashboard.kpi.totalOrders")}
            tone="amber"
            sparkline={ordersSparkline}
            isLoading={isInitialLoading}
          />
        </section>
      )}

      {/* ======================================================== */}
      {/* OPERATIONAL SECTION: TRANSAKSI & STATISTIK AFILIASI      */}
      {/* ======================================================== */}

      <section className={`mb-6 grid gap-4 sm:gap-6 ${isSandboxMode ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]"} lg:items-stretch w-full min-w-0`}>
        {/* ====================================================== */}
        {/* TRANSAKSI TERBARU (~70%)                               */}
        {/* ====================================================== */}

        <div className="flex h-full flex-col rounded-2xl xs:rounded-3xl md:rounded-3xl border border-slate-200/80 bg-white p-3 xs:p-4 sm:p-5 shadow-2xs w-full min-w-0">
          {/* Section Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 pb-2.5 xs:pb-3">
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
              <div className="flex h-6.5 w-6.5 xs:h-7 xs:w-7 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-blue-600">
                <History size={13} className="xs:h-3.5 xs:w-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] xs:text-xs font-black text-slate-900 sm:text-sm truncate">
                  {isSandboxMode ? t("dashboard.overview.recentOrdersSimTitle") : t("dashboard.overview.recentOrdersTitle")}
                </h2>
                <p className="hidden xs:block text-[10px] font-medium text-slate-400 truncate">
                  {isSandboxMode ? t("dashboard.overview.recentOrdersSimSubtitle") : t("dashboard.overview.recentOrdersSubtitle")}
                </p>
              </div>
            </div>

            <Link
              href={`${localizeHref("/user", locale)}?tab=orders`}
              scroll={false}
              className="inline-flex shrink-0 items-center gap-0.5 text-[10px] xs:text-[11px] font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span>{t("dashboard.overview.viewAllOrders")}</span>
            </Link>
          </div>

          {/* Content Area */}
          <div className="flex flex-1 flex-col pt-1 min-w-0">
            {isInitialLoading ? (
              <div className="space-y-2 py-2">
                <div className="h-11 w-full rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-11 w-full rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-11 w-full rounded-xl bg-slate-100 animate-pulse" />
              </div>
            ) : displayOrders.length === 0 ? (
              isSandboxMode ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-8 text-center">
                  <FlaskConical size={28} className="text-amber-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    {t("dashboard.overview.emptySimOrdersTitle")}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                    {t("dashboard.overview.emptySimOrdersDesc")}
                  </p>
                  <Link
                    href={`${localizeHref("/user", locale)}?tab=catalog`}
                    scroll={false}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <span>{t("dashboard.overview.startSimCatalog")}</span>
                  </Link>
                </div>
              ) : (
                <EmptyDashboard text={t("dashboard.overview.emptyOrders")} />
              )
            ) : (
              <>
                {/* Desktop / Tablet Modern Data Table (md+ on Navigation Rail / 2xl+ when Expanded) */}
                <div className={`hidden h-full flex-1 overflow-x-auto ${!isSidebarExpanded ? "md:block" : "2xl:block"}`}>
                  <table className="h-full w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-2.5 pl-1 pr-3 font-bold">{t("dashboard.overview.colProduct")}</th>
                        <th className="px-3 pb-2.5 font-bold">{t("dashboard.overview.colOrderId")}</th>
                        <th className="px-3 pb-2.5 font-bold">{t("dashboard.overview.colTime")}</th>
                        <th className="px-3 pb-2.5 font-bold text-center">{t("dashboard.overview.colStatus")}</th>
                        <th className="pb-2.5 pl-3 pr-1 font-bold text-right">{t("dashboard.overview.colPrice")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {displayOrders.slice(0, 5).map((order) => {
                        const status = normalizeStatus(order.status);
                        const style = getStatusClasses(status);
                        const orderRef = order.order_id || order.id;
                        const productImg = getProductImage(order.product_name);
                        const defaultProductName = t("dashboard.overview.digitalProduct");

                        return (
                          <tr
                            key={order.id}
                            className="group transition hover:bg-slate-50/70"
                          >
                            {/* Produk */}
                            <td className="py-2.5 pl-1 pr-3 align-middle">
                              <div className="flex items-center gap-2">
                                {productImg && (
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                    <img
                                      src={productImg}
                                      alt={order.product_name || defaultProductName}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-900">
                                    {order.product_name || defaultProductName}
                                  </p>
                                  {order.item_label && (
                                    <p className="truncate text-[10px] text-slate-400">
                                      {order.item_label}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* ID Pesanan */}
                            <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                                #{orderRef.slice(-8)}
                              </span>
                            </td>

                            {/* Waktu */}
                            <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-500 align-middle">
                              {formatDate(order.created_at)}
                            </td>

                            {/* Status */}
                            <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${style.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                                {status}
                              </span>
                            </td>

                            {/* Harga */}
                            <td className="whitespace-nowrap py-2.5 pl-3 pr-1 text-right text-xs font-black text-slate-950 align-middle">
                              {formatRupiah(order.total_amount ?? order.price)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile, Tablet & Desktop Activity Feed (Matches Mockup) */}
                <div className={`divide-y divide-slate-100 ${!isSidebarExpanded ? "md:hidden" : "2xl:hidden"}`}>
                  {displayOrders.slice(0, 5).map((order) => {
                    const status = normalizeStatus(order.status);
                    const style = getStatusClasses(status);
                    const orderRef = order.order_id || order.id;
                    const productImg = getProductImage(order.product_name);
                    const defaultProductName = t("dashboard.overview.digitalProduct");

                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1 min-w-0"
                      >
                        {/* Left: Product Image & Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {productImg ? (
                            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-2xs">
                              <img
                                src={productImg}
                                alt={order.product_name || defaultProductName}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                              <ShoppingBag size={18} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                              {order.product_name || defaultProductName}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-semibold truncate">
                              <span className="font-mono text-slate-500 font-bold">
                                #{orderRef.slice(-8)}
                              </span>
                              <span aria-hidden="true">•</span>
                              <span className="truncate">{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Price & Status Pill Badge (Stacked) */}
                        <div className="shrink-0 text-right flex flex-col items-end gap-1">
                          <p className="text-xs sm:text-sm font-black text-slate-950 leading-tight">
                            {formatRupiah(order.total_amount ?? order.price)}
                          </p>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${style.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>


        {/* ====================================================== */}
        {/* STATISTIK AFILIASI (~30%)                              */}
        {/* ====================================================== */}

        {!isSandboxMode && (
          <div className="flex h-full flex-col justify-between rounded-2xl xs:rounded-3xl md:rounded-3xl border border-slate-200/80 bg-white p-3 xs:p-4 sm:p-5 shadow-2xs w-full min-w-0">
            <div className="space-y-2.5 xs:space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 xs:pb-3">
                <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                  <div className="flex h-6.5 w-6.5 xs:h-7 xs:w-7 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-600">
                    <Gift size={13} className="xs:h-3.5 xs:w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[11px] xs:text-xs font-black text-slate-900 sm:text-sm truncate">
                      {t("dashboard.overview.affiliateStatsTitle")}
                    </h2>
                    <p className="hidden xs:block text-[10px] font-medium text-slate-400 truncate">
                      {t("dashboard.overview.affiliateStatsSubtitle")}
                    </p>
                  </div>
                </div>

                <Link
                  href={`${localizeHref("/user", locale)}?tab=affiliate`}
                  scroll={false}
                  className="inline-flex shrink-0 items-center text-[10px] xs:text-[11px] font-bold text-purple-600 transition hover:text-purple-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <span>{t("dashboard.overview.viewDetail")}</span>
                </Link>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 xs:p-2.5 min-w-0">
                  <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    {t("dashboard.overview.totalPartners")}
                  </p>
                  {isInitialLoading ? (
                    <div className="h-4.5 xs:h-5 sm:h-6 w-14 xs:w-16 rounded bg-slate-200/70 animate-pulse mt-0.5" />
                  ) : (
                    <p className="mt-0.5 text-xs xs:text-sm sm:text-base font-black text-slate-950 truncate">
                      {referrals.length} <span className="text-[9px] xs:text-[10px] font-semibold text-slate-500">{t("dashboard.overview.peopleUnit")}</span>
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50/80 p-2 xs:p-2.5 min-w-0">
                  <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-purple-700 truncate">
                    {t("dashboard.kpi.referralCommission")}
                  </p>
                  {isInitialLoading ? (
                    <div className="h-4.5 xs:h-5 sm:h-6 w-18 xs:w-20 rounded bg-purple-200/60 animate-pulse mt-0.5" />
                  ) : (
                    <p className="mt-0.5 truncate text-xs xs:text-sm sm:text-base font-black text-purple-900">
                      {formatRupiah(totalReferralCommission)}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Referral Bulan Ini */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2 xs:p-2.5 min-w-0">
                <div className="flex items-center justify-between gap-1 text-[9.5px] xs:text-[10px]">
                  <span className="font-bold text-slate-700 truncate">
                    {t("dashboard.overview.referralProgress", { count: monthlyReferrals.length })}
                  </span>
                  <span className="shrink-0 rounded-md bg-purple-100/80 px-1.5 py-0.2 font-mono text-[8.5px] xs:text-[9px] font-black text-purple-700">
                    {Math.min(Math.round((monthlyReferrals.length / 25) * 100), 100)}%
                  </span>
                </div>

                {/* Compact Rounded Progress Bar */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-purple-100/70 p-0.5">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        Math.round((monthlyReferrals.length / 25) * 100),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Monthly Commission Insight */}
              <div className="rounded-xl border border-purple-100/90 bg-linear-to-br from-purple-50/70 via-white to-violet-50/40 p-2 xs:p-2.5 shadow-2xs min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-4.5 w-4.5 xs:h-5 xs:w-5 shrink-0 items-center justify-center rounded-md border border-purple-100 bg-purple-100 text-purple-700">
                    <Wallet size={10} className="xs:h-2.5 xs:w-2.5" />
                  </div>
                  <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-purple-900 truncate">
                    {t("dashboard.overview.monthlyCommission")}
                  </p>
                </div>

                {isInitialLoading ? (
                  <div className="h-5 xs:h-6 w-24 xs:w-28 rounded bg-purple-200/50 animate-pulse mt-1" />
                ) : (
                  <p className="mt-1 truncate text-xs xs:text-sm sm:text-base font-black text-purple-950">
                    {formatRupiah(monthlyReferralCommission)}
                  </p>
                )}

                <p className="mt-0.5 text-[9px] xs:text-[10px] leading-tight text-slate-500">
                  {t("dashboard.overview.monthlyCommissionNote")}
                </p>
              </div>
            </div>

            {/* Referral Link & Copy Container */}
            <div className="mt-2.5 xs:mt-3 border-t border-slate-100 pt-2 xs:pt-2.5 min-w-0">
              <p className="mb-1 text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {t("dashboard.overview.yourReferralLink")}
              </p>
              <div className="flex items-center gap-1 xs:gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 p-1 shadow-2xs min-w-0">
                <code className="min-w-0 flex-1 truncate px-1.5 xs:px-2 font-mono text-[9px] xs:text-[10px] font-semibold text-slate-700">
                  {referralLink || t("dashboard.overview.linkNotAvailable")}
                </code>

                <button
                  type="button"
                  onClick={copyReferralLink}
                  disabled={!referralLink}
                  className="inline-flex h-6.5 xs:h-7 shrink-0 items-center justify-center gap-1 rounded-lg bg-purple-600 px-2 xs:px-2.5 text-[10px] xs:text-[11px] font-bold text-white transition hover:bg-purple-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                >
                  <Copy size={10} className="xs:h-2.5 xs:w-2.5" />
                  <span>{t("dashboard.overview.copyLink")}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* ================================================================== */
/* SANDBOX FINANCIAL NOTICE                                           */
/* ================================================================== */

function SandboxFinancialNotice({
  type,
  onGoToCatalog,
  onExitSandbox,
}: {
  type: "deposit" | "withdraw" | "affiliate";
  onGoToCatalog: () => void;
  onExitSandbox?: () => void;
}) {
  const { t } = useI18n();
  const isDeposit = type === "deposit";
  const isAffiliate = type === "affiliate";

  const title = isAffiliate
    ? t("dashboard.sandboxNotice.affiliateTitle")
    : t("dashboard.sandboxNotice.liveOnlyTitle");

  const description = isAffiliate
    ? t("dashboard.sandboxNotice.affiliateDesc")
    : isDeposit
      ? t("dashboard.sandboxNotice.depositDesc")
      : t("dashboard.sandboxNotice.withdrawDesc");

  const secondaryNote = isAffiliate
    ? t("dashboard.sandboxNotice.affiliateNote")
    : isDeposit
      ? t("dashboard.sandboxNotice.depositNote")
      : t("dashboard.sandboxNotice.withdrawNote");

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl md:rounded-[28px] border border-amber-300/70 bg-linear-to-b from-amber-50/70 via-white to-amber-50/30 p-8 sm:p-12 text-center shadow-xs backdrop-blur-md">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner border border-amber-200 mb-4">
        <FlaskConical size={32} />
      </div>
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-200/70 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950">
        <FlaskConical size={11} className="text-amber-700" />
        {t("dashboard.sandbox.topBanner")}
      </span>
      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
        {description}
      </p>
      <p className="mt-1 text-[11px] text-amber-800 font-semibold max-w-md">
        {secondaryNote}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onGoToCatalog}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-5 text-xs font-bold text-white shadow-xs transition hover:from-amber-600 hover:to-orange-600 active:scale-95 cursor-pointer"
        >
          <ShoppingBag size={15} />
          <span>{t("dashboard.sandboxNotice.goToCatalog")}</span>
        </button>
        {onExitSandbox && (
          <button
            type="button"
            onClick={onExitSandbox}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 cursor-pointer"
          >
            <span>{t("dashboard.sandboxNotice.backToLive")}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* DASHBOARD SHELL                                                    */
/* ================================================================== */

function getTimeGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return t("dashboard.overview.morning");
  if (hour >= 11 && hour < 15) return t("dashboard.overview.afternoon");
  if (hour >= 15 && hour < 19) return t("dashboard.overview.evening");
  return t("dashboard.overview.night");
}

function DashboardShell({
  children,
  isSandboxMode = false,
  onExitSandbox,
  activeMenu,
  userName,
  memberType,
  balance,
  setActiveMenu,
  isSidebarExpanded,
  setIsSidebarExpanded,
  avatarUrl,
  onRefresh,
  onOpenUpgrade,
  isInitialLoading = false,
}: {
  children: React.ReactNode;
  isSandboxMode?: boolean;
  onExitSandbox?: () => void;
  activeMenu: string;
  userName: string;
  memberType: "Reguler" | "Special" | "Gold" | string;
  balance: number;
  setActiveMenu: (menu: string) => void;
  isSidebarExpanded?: boolean;
  setIsSidebarExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
  avatarUrl?: string | null;
  onRefresh?: () => void;
  onOpenUpgrade?: () => void;
  isInitialLoading?: boolean;
}) {
  const { t, locale } = useI18n();
  const bottomNavActive =
    activeMenu === "overview"
      ? "overview"
      : activeMenu === "orders"
        ? "orders"
        : activeMenu === "wallet"
          ? "wallet"
          : activeMenu === "catalog"
            ? "catalog"
            : activeMenu === "deposit"
              ? "deposit"
              : activeMenu === "affiliate"
                ? "affiliate"
                : "overview";

  const firstName =
    userName.trim().split(/\s+/)[0] || "Member";

  const displayMemberType =
    memberType === "Special"
      ? "Special Member"
      : memberType === "Gold"
        ? "Gold Member"
        : "Regular Member";

  const greeting = getTimeGreeting(t);

  const PAGE_META: Record<string, { title: string; subtitle: string }> = {
    catalog: {
      title: t("dashboard.meta.catalogTitle"),
      subtitle: t("dashboard.meta.catalogSubtitle"),
    },
    orders: {
      title: isSandboxMode ? t("dashboard.meta.ordersTitleSim") : t("dashboard.meta.ordersTitle"),
      subtitle: isSandboxMode
        ? t("dashboard.meta.ordersSubtitleSim")
        : t("dashboard.meta.ordersSubtitle"),
    },
    wallet: {
      title: t("dashboard.meta.walletTitle"),
      subtitle: t("dashboard.meta.walletSubtitle"),
    },
    deposit: {
      title: isSandboxMode ? t("dashboard.meta.depositTitleLiveOnly") : t("dashboard.meta.depositTitle"),
      subtitle: isSandboxMode
        ? t("dashboard.meta.depositSubtitleLiveOnly")
        : t("dashboard.meta.depositSubtitle"),
    },
    withdraw: {
      title: isSandboxMode ? t("dashboard.meta.withdrawTitleLiveOnly") : t("dashboard.meta.withdrawTitle"),
      subtitle: isSandboxMode
        ? t("dashboard.meta.withdrawSubtitleLiveOnly")
        : t("dashboard.meta.withdrawSubtitle"),
    },
    withdrawal: {
      title: isSandboxMode ? t("dashboard.meta.withdrawTitleLiveOnly") : t("dashboard.meta.withdrawTitle"),
      subtitle: isSandboxMode
        ? t("dashboard.meta.withdrawSubtitleLiveOnly")
        : t("dashboard.meta.withdrawSubtitle"),
    },
    affiliate: {
      title: isSandboxMode ? t("dashboard.meta.affiliateTitleLiveOnly") : t("dashboard.meta.affiliateTitle"),
      subtitle: isSandboxMode
        ? t("dashboard.meta.affiliateSubtitleLiveOnly")
        : t("dashboard.meta.affiliateSubtitle"),
    },
    settings: {
      title: t("dashboard.meta.settingsTitle"),
      subtitle: t("dashboard.meta.settingsSubtitle"),
    },
    "settings-profile": {
      title: t("dashboard.meta.profileTitle"),
      subtitle: t("dashboard.meta.profileSubtitle"),
    },
    "settings-security": {
      title: t("dashboard.meta.securityTitle"),
      subtitle: t("dashboard.meta.securitySubtitle"),
    },
    "settings-notifications": {
      title: t("dashboard.meta.notificationsTitle"),
      subtitle: t("dashboard.meta.notificationsSubtitle"),
    },
    help: {
      title: t("dashboard.meta.helpTitle"),
      subtitle: t("dashboard.meta.helpSubtitle"),
    },
  };

  const pageTitle = PAGE_META[activeMenu]?.title ?? activeMenu;
  const pageSubtitle = PAGE_META[activeMenu]?.subtitle ?? "";

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 select-none cursor-default">
      <div className="mx-auto flex min-h-screen w-full max-w-450">
        <UserSidebar
          userName={userName}
          memberType={memberType}
          balance={balance}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          isSidebarExpanded={isSidebarExpanded}
          setIsSidebarExpanded={setIsSidebarExpanded}
          isSandboxMode={isSandboxMode}
          isInitialLoading={isInitialLoading}
        />

        <main className="min-w-0 flex-1 px-2.5 xs:px-4 pb-28 pt-3 sm:pt-4 sm:px-6 md:pb-8 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-330">

            {/* ====================================================== */}
            {/* PRIMARY PAGE-LEVEL SANDBOX BANNER                      */}
            {/* ====================================================== */}
            {isSandboxMode && (
              <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2.5 rounded-xl sm:rounded-2xl border border-amber-300/80 bg-linear-to-r from-amber-50 via-orange-50/70 to-amber-100/70 p-2.5 sm:px-4 sm:py-3 text-xs shadow-2xs backdrop-blur-md animate-in fade-in duration-200">
                <div className="flex items-center gap-2 xs:gap-2.5 min-w-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-950 border border-amber-300 shrink-0">
                    <FlaskConical size={11} className="text-amber-700" />
                    {t("dashboard.sandbox.badge")}
                  </span>
                  <p className="truncate text-[11px] font-semibold text-amber-900 hidden sm:inline">
                    {t("dashboard.sandbox.bannerDesc")}
                  </p>
                </div>
                {onExitSandbox && (
                  <button
                    type="button"
                    onClick={onExitSandbox}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/80 bg-linear-to-r from-amber-500 to-orange-500 px-2.5 xs:px-3 py-1.5 text-[10.5px] font-bold text-white shadow-2xs hover:from-amber-600 hover:to-orange-600 active:scale-95 transition cursor-pointer shrink-0"
                  >
                    <span>{t("dashboard.sandbox.backToLive")}</span>
                  </button>
                )}
              </div>
            )}

            {/* ====================================================== */}
            {/* MOBILE HEADER (< 768px) — ALL WORKSPACES               */}
            {/* ====================================================== */}

            <div className="block md:hidden mb-4">
              {/* MOBILE TOP BAR */}
              <div className="mb-2.5 flex items-center justify-between gap-1.5 xs:gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 xs:p-2 shadow-xs backdrop-blur-md">
                {/* 1. HAMBURGER MENU BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("open-user-sidebar"));
                  }}
                  aria-label={t("dashboard.nav.openSidebar")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50"
                >
                  <Menu size={18} strokeWidth={2} />
                </button>

                {/* 2. NOTIFICATION BELL WITH BADGE */}
                <Link
                  href={`${localizeHref("/user", locale)}?tab=settings-notifications`}
                  scroll={false}
                  title={t("dashboard.overview.notificationCenter")}
                  aria-label={t("dashboard.overview.notificationCenterAria", { count: 3 })}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50"
                >
                  <Bell size={16} className="text-slate-700" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-red-500 text-[8.5px] font-black text-white ring-2 ring-white shadow-xs">
                    3
                  </span>
                </Link>

                {/* UPGRADE BUTTON FOR MOBILE (TITIK UTAMA) */}
                {!isInitialLoading && memberType !== "Special" && memberType !== "Gold" && !isSandboxMode && onOpenUpgrade && (
                  <button
                    type="button"
                    onClick={onOpenUpgrade}
                    className="flex h-9 items-center gap-1 rounded-full border border-amber-300/90 bg-linear-to-r from-amber-500 to-orange-500 px-2.5 text-[10.5px] font-black text-white shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
                    title={t("dashboard.upgradeModal.upgradeHeaderBtn")}
                  >
                    <Crown size={12} className="text-yellow-100 fill-yellow-200" />
                    <span>Upgrade</span>
                  </button>
                )}

                {/* 3. USER PROFILE PILL */}
                <Link
                  href={`${localizeHref("/user", locale)}?tab=settings-profile`}
                  scroll={false}
                  title={t("dashboard.overview.profileTitle", { name: userName, memberType: displayMemberType })}
                  aria-label={t("dashboard.nav.profileAria")}
                  className="group flex flex-1 min-w-0 items-center justify-between gap-1.5 rounded-full border border-slate-200/80 bg-white py-1 pl-1 pr-2.5 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 text-white font-black text-[11px] shadow-xs ring-1 ring-white">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={firstName}
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        firstName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="text-left min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 leading-none">
                        {firstName}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium text-slate-400 leading-none truncate">
                        {displayMemberType}
                      </p>
                    </div>
                  </div>

                  <ChevronDown size={13} className="text-slate-400 shrink-0" />
                </Link>

                {/* 4. REFRESH BUTTON */}
                <button
                  type="button"
                  onClick={onRefresh}
                  title={t("dashboard.overview.refreshData")}
                  aria-label={t("dashboard.overview.refreshData")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* MOBILE PAGE TITLE CARD */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 xs:p-3 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
                {activeMenu === "overview" ? (
                  <div className="relative flex h-10 w-10 xs:h-11 xs:w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-100/90 via-orange-50 to-amber-200/60 border border-amber-200/80 shadow-2xs text-lg xs:text-xl">
                    <span className="select-none">👋</span>
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  {activeMenu === "overview" ? (
                    <>
                      <h1 className="text-sm xs:text-base font-black tracking-tight text-slate-950 leading-tight truncate">
                        <span className="text-slate-600 font-bold">{greeting}, </span>
                        <span className="text-slate-950 font-black">{firstName}!</span>
                        {isSandboxMode && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-amber-800 border border-amber-300 shrink-0">
                            <FlaskConical size={10} className="text-amber-600" />
                            SANDBOX
                          </span>
                        )}
                      </h1>
                      <p className="mt-0.5 text-[9.5px] xs:text-[10.5px] font-medium text-slate-400 truncate">
                        {t("dashboard.overview.subtitleMobile")}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-sm xs:text-base font-black tracking-tight text-slate-950 leading-tight truncate">
                        {pageTitle}
                      </h1>
                      <p className="mt-0.5 text-[9.5px] xs:text-[10.5px] font-medium text-slate-400 truncate">
                        {pageSubtitle}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ====================================================== */}
            {/* TABLET & DESKTOP HEADER (>= 768px) — ALL WORKSPACES    */}
            {/* ====================================================== */}

            <section className="hidden md:block mb-4 sm:mb-5 rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/80 p-2.5 sm:p-3 md:px-4 md:py-3 lg:px-5 lg:py-3.5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
              <div className="flex items-center justify-between gap-2 md:gap-3 lg:gap-4 min-w-0">
                {/* LEFT: TITLE */}
                <div className="min-w-0 flex-1">
                  {activeMenu === "overview" ? (
                    <>
                      <h1 className="text-sm xs:text-base md:text-[clamp(16px,1.8vw,20px)] lg:text-2xl font-black tracking-tight text-slate-900 leading-tight truncate">
                        {greeting}, {firstName} 👋
                      </h1>
                      <p className={`hidden ${!isSidebarExpanded ? "md:block" : "lg:block"} mt-0.5 text-[clamp(12px,1.35vw,14.5px)] lg:text-xs text-slate-500 font-medium leading-snug truncate`}>
                        {t("dashboard.overview.subtitle")}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-sm xs:text-base md:text-[clamp(16px,1.8vw,20px)] lg:text-2xl font-black tracking-tight text-slate-900 leading-tight truncate">
                        {pageTitle}
                      </h1>
                      <p className={`hidden ${!isSidebarExpanded ? "md:block" : "lg:block"} mt-0.5 text-[clamp(12px,1.35vw,14.5px)] lg:text-xs text-slate-500 font-medium leading-snug truncate`}>
                        {pageSubtitle}
                      </p>
                    </>
                  )}
                </div>

                {/* RIGHT CONTROLS */}
                <div className="flex items-center gap-1.5 md:gap-2 lg:gap-2.5 shrink-0 ml-auto">
                  {/* 1. NOTIFICATION BELL */}
                  <Link
                    href={`${localizeHref("/user", locale)}?tab=settings-notifications`}
                    scroll={false}
                    title={t("dashboard.overview.notificationCenter")}
                    aria-label={t("dashboard.overview.notificationCenterAria", { count: 3 })}
                    className="relative flex h-8 w-8 md:h-8.5 md:w-8.5 lg:h-9.5 lg:w-9.5 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition-all duration-200 hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 cursor-pointer"
                  >
                    <Bell size={15} className="text-slate-700" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-red-500 text-[8.5px] font-black text-white ring-2 ring-white shadow-xs">
                      3
                    </span>
                  </Link>

                  {/* 2. USER AVATAR PILL */}
                  <Link
                    href={`${localizeHref("/user", locale)}?tab=settings-profile`}
                    scroll={false}
                    title={t("dashboard.overview.profileTitle", { name: userName, memberType: displayMemberType })}
                    aria-label={t("dashboard.nav.profileAria")}
                    className="group flex items-center gap-1.5 md:gap-2 rounded-full border border-slate-200/80 bg-white py-1 pl-1 pr-2.5 md:pr-3 lg:pr-4 shadow-2xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 cursor-pointer min-w-0 max-w-31.25 md:max-w-38.75 lg:max-w-46.25"
                  >
                    <div className="flex h-6.5 w-6.5 md:h-7 md:w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 text-white font-black text-[10px] md:text-[11px] lg:text-xs shadow-xs ring-1 ring-white">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={firstName}
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        firstName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="text-left min-w-0 flex-1 pr-0.5">
                      <p className="truncate text-[11px] md:text-xs lg:text-sm font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                        {firstName}
                      </p>
                      <p className="mt-0.5 text-[8.5px] md:text-[9.5px] lg:text-[10.5px] font-semibold text-slate-500 leading-none truncate">
                        {displayMemberType}
                      </p>
                    </div>

                    <ChevronDown size={13} className="text-slate-400 transition-transform duration-200 group-hover:translate-y-0.5 shrink-0" />
                  </Link>

                  {/* 3. REFRESH BUTTON */}
                  <button
                    type="button"
                    onClick={onRefresh}
                    title={t("dashboard.overview.refreshData")}
                    aria-label={t("dashboard.overview.refreshData")}
                    className="flex h-8 w-8 md:h-8.5 md:w-8.5 lg:h-9.5 lg:w-9.5 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>
            </section>

            {children}
          </div>
        </main>
      </div>

      <UserBottomNav
        active={bottomNavActive}
        isSandboxMode={isSandboxMode}
      />
    </div>
  );
}

/* ================================================================== */
/* KPI CARD                                                           */
/* ================================================================== */

function KpiCard({
  icon,
  label,
  value,
  note,
  tone,
  sparkline,
  isLoading = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: "purple" | "emerald" | "blue" | "amber";
  sparkline?: { linePath: string; areaPath: string };
  isLoading?: boolean;
}) {
  const classes = {
    purple: {
      icon: "bg-purple-50 text-purple-600 border border-purple-100/80",
      note: "text-purple-700",
      sparkleStroke: "#9333ea",
      sparkleFill: "#c084fc",
      gradId: "kpi-grad-purple",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600 border border-emerald-100/80",
      note: "text-emerald-700",
      sparkleStroke: "#059669",
      sparkleFill: "#34d399",
      gradId: "kpi-grad-emerald",
    },
    blue: {
      icon: "bg-blue-50 text-blue-600 border border-blue-100/80",
      note: "text-blue-700",
      sparkleStroke: "#2563eb",
      sparkleFill: "#60a5fa",
      gradId: "kpi-grad-blue",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600 border border-amber-100/80",
      note: "text-amber-700",
      sparkleStroke: "#d97706",
      sparkleFill: "#fbbf24",
      gradId: "kpi-grad-amber",
    },
  }[tone];

  const linePath =
    sparkline?.linePath ||
    "M 4 32 L 92 32";
  const areaPath =
    sparkline?.areaPath ||
    "M 4 32 L 92 32 L 92 36 L 4 36 Z";

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl border border-slate-200/80 bg-white p-2.5 xs:p-3 sm:p-4.5 shadow-2xs transition hover:shadow-xs min-h-24 xs:min-h-[105px] sm:min-h-30">
      {/* Background Real 30-Day Cumulative Sparkline Chart */}
      <svg
        viewBox="0 0 96 36"
        className="pointer-events-none absolute bottom-0.5 right-1.5 h-8 xs:h-9 sm:h-10 w-16 xs:w-20 sm:w-24 opacity-[0.14]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={classes.gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={classes.sparkleFill} stopOpacity="0.8" />
            <stop offset="100%" stopColor={classes.sparkleFill} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d={linePath}
          stroke={classes.sparkleStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={areaPath}
          fill={`url(#${classes.gradId})`}
        />
      </svg>

      <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2 sm:gap-3">
        <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <div className={`flex h-6.5 w-6.5 xs:h-7 xs:w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg xs:rounded-xl ${classes.icon}`}>
          {icon}
        </div>
      </div>

      <div className="relative z-10 mt-1.5 xs:mt-2 sm:mt-3">
        {isLoading ? (
          <>
            <div className="h-4.5 xs:h-5 sm:h-6 w-20 xs:w-28 rounded-lg bg-slate-100 animate-pulse my-0.5" />
            <div className="h-2.5 xs:h-3 w-14 xs:w-18 rounded bg-slate-100 animate-pulse mt-1" />
          </>
        ) : (
          <>
            <p className="truncate text-[13px] xs:text-[15px] sm:text-lg md:text-base lg:text-xl xl:text-2xl font-black tracking-tight text-slate-950 leading-none">
              {value}
            </p>

            <p className={`mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-semibold ${classes.note}`}>
              {note}
            </p>
          </>
        )}
      </div>
    </div>
  );
}


/* ================================================================== */
/* EMPTY DASHBOARD                                                    */
/* ================================================================== */

function EmptyDashboard({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8">
      <p className="text-xs font-medium text-slate-400">
        {text}
      </p>
    </div>
  );
}

/* ================================================================== */
/* BENEFIT ROW                                                        */
/* ================================================================== */

function BenefitRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={12} />
      </span>

      <span>{children}</span>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Loader2
              size={22}
              className="animate-spin text-blue-600"
            />
          </div>
        </div>
      }
    >
      <UserDashboardContent />
    </Suspense>
  );
}
