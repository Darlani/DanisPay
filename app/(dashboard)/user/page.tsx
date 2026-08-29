"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Copy,
  CreditCard,
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
import UserSidebar from "./components/UserSidebar";
import UserBottomNav from "./components/UserBottomNav";

import OrdersViewUser from "./orders/OrdersViewUser";
import WalletViewUser from "./wallet/WalletViewUser";
import DepositViewUser from "./deposit/DepositViewUser";
import WithdrawViewUser from "./withdraw/WithdrawViewUser";
import AffiliateViewUser from "./affiliate/AffiliateViewUser";
import SettingsViewUser from "./settings/SettingsViewUser";
import HelpViewUser from "./help/HelpViewUser";

import { supabase } from "@/utils/supabaseClient";
import MaintenancePage from "@/utils/MaintenancePage";

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
  amount: number | string;
  type: string;
  description?: string | null;
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

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */

export default function UserDashboard() {
  /* ---------------------------------------------------------------- */
  /* NAVIGATION                                                       */
  /* ---------------------------------------------------------------- */

  const [activeMenu, setActiveMenu] =
    useState<string>("overview");

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
  }>({
    email: "",
    name: "",
    refCode: "",
    balance: 0,
    coinBalance: 0,
    avatarUrl: null,
  });

  const [memberType, setMemberType] = useState<
    "Reguler" | "Special" | "Gold" | string
  >("Reguler");

  const [orders, setOrders] = useState<
    DashboardOrder[]
  >([]);

  const [deposits, setDeposits] = useState<
    DashboardDeposit[]
  >([]);

  const [withdrawals, setWithdrawals] = useState<
    DashboardWithdrawal[]
  >([]);

  const [balanceLogs, setBalanceLogs] = useState<
    DashboardBalanceLog[]
  >([]);

  const [referrals, setReferrals] = useState<
    DashboardReferral[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [isMaintenance, setIsMaintenance] =
    useState(false);

  const [currentDomain, setCurrentDomain] =
    useState("");

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      // Tier 2: Tablet (768px s/d 884px) -> Default Navigation Rail (76px) agar konten luas
      if (width >= 768 && width <= 884) {
        return false;
      }
    }
    // Tier 3: Desktop (> 884px) -> Default Terbuka Penuh
    return true;
  });

  /* ---------------------------------------------------------------- */
  /* UPGRADE                                                          */
  /* ---------------------------------------------------------------- */

  const [showUpgradeModal, setShowUpgradeModal] =
    useState(false);

  const [isUpgrading, setIsUpgrading] =
    useState(false);

  /* ================================================================= */
  /* CALCULATIONS                                                     */
  /* ================================================================= */




  const totalReferralCommission = useMemo(() => {
    return balanceLogs
      .filter(
        (log) =>
          Number(log.amount) > 0 &&
          ["Referral", "Commission"].includes(
            String(log.type),
          ),
      )
      .reduce(
        (sum, log) =>
          sum + Number(log.amount),
        0,
      );
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
      .reduce(
        (sum, log) =>
          sum + Number(log.amount),
        0,
      );
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
          normalizeStatus(withdrawal.status) ===
          "Berhasil",
      )
      .reduce(
        (sum, withdrawal) =>
          sum +
          Number(withdrawal.amount || 0),
        0,
      );
  }, [withdrawals]);

  const totalDeposit = useMemo(() => {
    return deposits
      .filter(
        (deposit) =>
          normalizeStatus(deposit.status) ===
          "Berhasil",
      )
      .reduce(
        (sum, deposit) =>
          sum + Number(deposit.amount || 0),
        0,
      );
  }, [deposits]);

  const pendingWithdrawAmount =
    useMemo(() => {
      return withdrawals
        .filter(
          (withdrawal) =>
            normalizeStatus(
              withdrawal.status,
            ) === "Pending",
        )
        .reduce(
          (sum, withdrawal) =>
            sum +
            Number(
              withdrawal.held_amount ||
                withdrawal.amount ||
                0,
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

  /* ================================================================= */
  /* FETCH DASHBOARD                                                  */
  /* ================================================================= */

  const fetchDashboardData = useCallback(
    async (initialLoad = false) => {
      if (initialLoad) {
        setLoading(true);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          localStorage.clear();
          window.location.href = "/login";
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
          },
        );

        if (response.status === 401) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        const result =
          (await response.json()) as DashboardResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Gagal memuat dashboard.",
          );
        }

        const data = result.data;
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
            Number(profile?.balance || 0),
          coinBalance:
            Number(profile?.coin_balance || 0),
          avatarUrl:
            avatarUrl ||
            previous.avatarUrl ||
            null,
        }));

        setMemberType(
          profile?.member_type || "Reguler",
        );

        setOrders(
          Array.isArray(data?.orders)
            ? data.orders
            : [],
        );

        setDeposits(
          Array.isArray(data?.deposits)
            ? data.deposits
            : [],
        );

        setWithdrawals(
          Array.isArray(data?.withdrawals)
            ? data.withdrawals
            : [],
        );

        setBalanceLogs(
          Array.isArray(data?.balanceLogs)
            ? data.balanceLogs
            : [],
        );

        setReferrals(
          Array.isArray(data?.referrals)
            ? data.referrals
            : [],
        );
      } catch (error) {
        console.error(
          "UserDashboard:",
          error,
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ================================================================= */
  /* INITIALIZATION                                                   */
  /* ================================================================= */

  useEffect(() => {
    const userEmail =
      localStorage.getItem("userEmail");

    const isUser =
      localStorage.getItem("isUser");

    if (isUser !== "true" || !userEmail) {
      window.location.href = "/login";
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
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "Maintenance check:",
          error,
        );
      }
    };

    void checkMaintenance();

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
          setUserData((previous) => ({
            ...previous,
            balance:
              Number(payload.new?.balance || 0),
          }));

          void fetchDashboardData();
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
          void fetchDashboardData();
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
          void fetchDashboardData();
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
          void fetchDashboardData();
        },
      )
      .subscribe();

    void fetchDashboardData(true);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

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
      setShowUpgradeModal(true);
      return;
    }

    setActiveMenu(menu);
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
              "Terjadi kesalahan sistem.",
          );
        }

        alert(
          "SELAMAT! Anda sekarang adalah SPECIAL MEMBER.",
        );

        setMemberType("Special");

        setShowUpgradeModal(false);

        await fetchDashboardData();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Gagal proses upgrade.",
        );
      } finally {
        setIsUpgrading(false);
      }
    };

  /* ================================================================= */
  /* REFERRAL                                                         */
  /* ================================================================= */

  const referralLink =
    currentDomain && userData.refCode
      ? `${currentDomain}/ref/${userData.refCode}`
      : "";

  const copyReferralLink =
    async () => {
      if (!referralLink) {
        alert(
          "Link referral belum tersedia.",
        );
        return;
      }

      try {
        await navigator.clipboard.writeText(
          referralLink,
        );

        alert(
          "Link referral berhasil disalin.",
        );
      } catch {
        alert(
          "Gagal menyalin link referral.",
        );
      }
    };

  /* ================================================================= */
  /* MAINTENANCE                                                      */
  /* ================================================================= */

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  /* ================================================================= */
  /* LOADING                                                           */
  /* ================================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Loader2
            size={22}
            className="animate-spin text-blue-600"
          />
        </div>
      </div>
    );
  }

  /* ================================================================= */
  /* ORDERS                                                            */
  /* ================================================================= */

  if (activeMenu === "orders") {
    return (
      <DashboardShell
        activeMenu="orders"
        userName={userData.name || "Member DaPay"}
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
        avatarUrl={userData.avatarUrl}
        onRefresh={() => void fetchDashboardData(false)}
      >
        <OrdersViewUser
          initialOrders={orders}
          isSidebarExpanded={isSidebarExpanded}
        />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* WALLET                                                            */
  /* ================================================================= */

  if (activeMenu === "wallet") {
    return (
      <DashboardShell
        activeMenu="wallet"
        userName={userData.name || "Member DaPay"}
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
        avatarUrl={userData.avatarUrl}
        onRefresh={() => void fetchDashboardData(false)}
      >
        <WalletViewUser
          initialBalance={Number(userData.balance || 0)}
          initialCoinBalance={Number(userData.coinBalance || 0)}
          initialLogs={balanceLogs}
          isSidebarExpanded={isSidebarExpanded}
        />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* DEPOSIT                                                           */
  /* ================================================================= */

  if (activeMenu === "deposit") {
    return (
      <DashboardShell
        activeMenu="deposit"
        userName={userData.name || "Member DaPay"}
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
        avatarUrl={userData.avatarUrl}
        onRefresh={() => void fetchDashboardData(false)}
      >
        <DepositViewUser />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* WITHDRAW                                                          */
  /* ================================================================= */

  if (activeMenu === "withdraw" || activeMenu === "withdrawal") {
    return (
      <DashboardShell
        activeMenu="withdraw"
        userName={userData.name || "Member DaPay"}
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
        avatarUrl={userData.avatarUrl}
        onRefresh={() => void fetchDashboardData(false)}
      >
        <WithdrawViewUser />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* AFFILIATE                                                         */
  /* ================================================================= */

  if (activeMenu === "affiliate") {
    return (
      <DashboardShell
        activeMenu="affiliate"
        userName={userData.name || "Member DaPay"}
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
        avatarUrl={userData.avatarUrl}
        onRefresh={() => void fetchDashboardData(false)}
      >
        <AffiliateViewUser />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* SETTINGS                                                          */
  /* ================================================================= */

  if (activeMenu === "settings") {
    return (
      <DashboardShell
        activeMenu="settings"
        userName={userData.name || "Member DaPay"}
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
        avatarUrl={userData.avatarUrl}
        onRefresh={() => void fetchDashboardData(false)}
      >
        <SettingsViewUser />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* HELP                                                              */
  /* ================================================================= */

  if (activeMenu === "help") {
    return (
      <DashboardShell
        activeMenu="help"
        userName={userData.name || "Member DaPay"}
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
        avatarUrl={userData.avatarUrl}
        onRefresh={() => void fetchDashboardData(false)}
      >
        <HelpViewUser />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* MAIN DASHBOARD                                                    */
  /* ================================================================= */

  const coinBalance = userData.coinBalance;

  return (
    <DashboardShell
      activeMenu="overview"
      userName={userData.name || "Member DaPay"}
      memberType={memberType}
      balance={Number(userData.balance)}
      setActiveMenu={handleMenuNavigation}
      isSidebarExpanded={isSidebarExpanded}
      setIsSidebarExpanded={setIsSidebarExpanded}
      avatarUrl={userData.avatarUrl}
      onRefresh={() => void fetchDashboardData(false)}
    >
      {/* ============================================================ */}
      {/* DASHBOARD CONTENT                                            */}
      {/* ============================================================ */}

      <main className="min-w-0">
        {/* ======================================================== */}
        {/* SALDO + KOIN                                             */}
        {/* ======================================================== */}

        <section className="mb-5 sm:mb-6 grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3.5 md:grid-cols-2 md:gap-4 lg:gap-5 xl:gap-6 items-stretch">
          {/* ====================================================== */}
          {/* SALDO DAYAP (Modern Glassmorphism Multi-Device)       */}
          {/* ====================================================== */}

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
                      Saldo DaPay
                    </h2>
                    <p className="hidden md:block text-[10px] lg:text-[11px] font-medium text-blue-200/80 leading-tight">
                      Aset Utama (Likuid)
                    </p>
                  </div>
                </div>

                <span className={`hidden ${!isSidebarExpanded ? "md:inline-flex" : "lg:inline-flex"} items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-2 xs:px-2.5 py-0.5 text-[9px] md:text-[9.5px] font-bold text-emerald-200 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-emerald-300/20 whitespace-nowrap`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" aria-hidden="true" />
                  Bisa Ditarik
                </span>
              </div>

              {/* Nominal Area */}
              <div className="my-2 xs:my-2.5 md:my-4 lg:my-5 xl:my-6">
                <p className="text-[8.5px] xs:text-[9.5px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-[0.18em] text-blue-200/70">
                  Saldo Tersedia
                </p>
                <p className="mt-0.5 md:mt-1 truncate text-[13px] xs:text-[15px] sm:text-[17px] md:text-[clamp(15px,1.9vw,22px)] lg:text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)] leading-none">
                  {formatRupiah(userData.balance)}
                </p>
              </div>

              {/* Actions */}
              <div>
                <div className={`grid grid-cols-1 ${!isSidebarExpanded ? "md:grid-cols-2" : "lg:grid-cols-2"} gap-1 xs:gap-1.5 md:gap-2 lg:gap-2.5 w-full`}>
                  <button
                    type="button"
                    onClick={() => handleMenuNavigation("deposit")}
                    className="inline-flex w-full h-6.5 xs:h-7.5 sm:h-8.5 md:h-9 lg:h-10 xl:h-10.5 items-center justify-center gap-1 xs:gap-1.5 md:gap-1.5 rounded-md xs:rounded-lg md:rounded-xl bg-white px-1.5 xs:px-2 md:px-2.5 lg:px-4 text-[10px] xs:text-[11px] md:text-xs font-bold text-blue-900 shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all duration-200 hover:bg-blue-50 hover:shadow-[0_6px_20px_rgba(255,255,255,0.25)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <PlusCircle size={11} className="xs:h-3 xs:w-3 md:h-3.5 md:w-3.5 shrink-0" />
                    <span className="truncate">Isi Saldo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuNavigation("withdraw")}
                    className="inline-flex w-full h-6.5 xs:h-7.5 sm:h-8.5 md:h-9 lg:h-10 xl:h-10.5 items-center justify-center gap-1 xs:gap-1.5 md:gap-1.5 rounded-md xs:rounded-lg md:rounded-xl border border-white/30 bg-white/15 px-1.5 xs:px-2 md:px-2.5 lg:px-4 text-[10px] xs:text-[11px] md:text-xs font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:border-white/45 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <ArrowUpRight size={11} className="xs:h-3 xs:w-3 md:h-3.5 md:w-3.5 shrink-0" />
                    <span className="truncate">Tarik Saldo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* KOIN DAPAY (Modern Glassmorphism Multi-Device)        */}
          {/* ====================================================== */}

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
                      Koin DaPay
                    </h2>
                    <p className="hidden md:block text-[10px] font-semibold text-purple-600 leading-tight">
                      Reward & Cashback
                    </p>
                  </div>
                </div>

                <span className={`hidden ${!isSidebarExpanded ? "md:inline-flex" : "lg:inline-flex"} items-center gap-1.5 rounded-full border border-purple-200/90 bg-white/70 px-2 xs:px-2.5 py-0.5 text-[9px] md:text-[9.5px] font-black uppercase tracking-[0.14em] text-purple-700 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 whitespace-nowrap`}>
                  <span className="text-[10px] xs:text-[11px] text-purple-600 leading-none" aria-hidden="true">✦</span>
                  Reward
                </span>
              </div>

              {/* Nominal Area */}
              <div className="my-2 xs:my-2.5 md:my-4 lg:my-5 xl:my-6">
                <p className="text-[8.5px] xs:text-[9.5px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-[0.18em] text-purple-900/60">
                  Total Reward Koin
                </p>
                <div className="mt-0.5 md:mt-1 flex items-baseline gap-1 md:gap-1.5">
                  <span className="truncate text-[13px] xs:text-[15px] sm:text-[17px] md:text-[clamp(16px,2vw,24px)] lg:text-3xl xl:text-4xl font-black tracking-tight text-slate-950 leading-none">
                    {coinBalance.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] xs:text-[11px] sm:text-[13px] md:text-sm lg:text-lg font-black tracking-tight text-violet-700">
                    KOIN
                  </span>
                </div>
              </div>

              {/* Informational Callout */}
              <div>
                <div className="flex items-center gap-1.5 xs:gap-2 md:gap-2.5 rounded-md xs:rounded-lg md:rounded-xl border border-purple-200/60 bg-white/75 p-1.5 xs:p-2 md:p-2.5 lg:p-3 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 w-full max-w-md">
                  <div className="flex h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-sm xs:rounded-md md:rounded-lg border border-purple-200/80 bg-purple-100/70 text-purple-700 shadow-2xs backdrop-blur-xs" aria-hidden="true">
                    <Gift size={11} className="xs:h-3 xs:w-3 md:h-4 md:w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] xs:text-[10.5px] sm:text-[12px] md:text-xs font-bold text-slate-900 leading-tight">
                      Gunakan Koin DaPay saat checkout
                    </p>
                    <p className="hidden md:block mt-0.5 text-[10px] lg:text-xs text-slate-500 leading-tight">
                      untuk potongan harga langsung.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* KPI SUMMARY                                              */}
        {/* ======================================================== */}

        <section className="mb-5 sm:mb-6 grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3.5 md:grid-cols-2 md:gap-3.5 lg:grid-cols-4 lg:gap-4 xl:gap-5">
          <KpiCard
            icon={<ArrowUpRight size={17} />}
            label="Komisi Referral"
            value={formatRupiah(totalReferralCommission)}
            note="Masuk ke Saldo DaPay"
            tone="purple"
            sparkline={referralSparkline}
          />

          <KpiCard
            icon={<ArrowUpRight size={17} />}
            label="Total Penarikan"
            value={formatRupiah(totalWithdrawn)}
            note={
              pendingWithdrawAmount > 0
                ? `Pending ${formatRupiah(pendingWithdrawAmount)}`
                : "Penarikan berhasil"
            }
            tone="emerald"
            sparkline={withdrawalSparkline}
          />

          <KpiCard
            icon={<CreditCard size={17} />}
            label="Total Deposit"
            value={formatRupiah(totalDeposit)}
            note="Deposit berhasil"
            tone="blue"
            sparkline={depositSparkline}
          />

          <KpiCard
            icon={<ShoppingBag size={17} />}
            label="Total Transaksi"
            value={orders.length.toLocaleString("id-ID")}
            note="Total pesanan"
            tone="amber"
            sparkline={ordersSparkline}
          />
        </section>

        {/* ======================================================== */}
        {/* OPERATIONAL SECTION: TRANSAKSI & STATISTIK AFILIASI      */}
        {/* ======================================================== */}

        <section className="mb-6 grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch w-full min-w-0">
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
                    Transaksi Terbaru
                  </h2>
                  <p className="hidden xs:block text-[10px] font-medium text-slate-400 truncate">
                    Aktivitas pesanan digital terkini
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleMenuNavigation("orders")}
                className="inline-flex shrink-0 items-center gap-0.5 text-[10px] xs:text-[11px] font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span>Lihat Semua →</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex flex-1 flex-col pt-1 min-w-0">
              {orders.length === 0 ? (
                <EmptyDashboard text="Belum ada transaksi pesanan tercatat." />
              ) : (
                <>
                  {/* Desktop / Tablet Modern Data Table (md+ on Navigation Rail / 2xl+ when Expanded) */}
                  <div className={`hidden h-full flex-1 overflow-x-auto ${!isSidebarExpanded ? "md:block" : "2xl:block"}`}>
                    <table className="h-full w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="pb-2.5 pl-1 pr-3 font-bold">Produk & Layanan</th>
                          <th className="px-3 pb-2.5 font-bold">ID Pesanan</th>
                          <th className="px-3 pb-2.5 font-bold">Waktu</th>
                          <th className="px-3 pb-2.5 font-bold text-center">Status</th>
                          <th className="pb-2.5 pl-3 pr-1 font-bold text-right">Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {orders.slice(0, 5).map((order) => {
                          const status = normalizeStatus(order.status);
                          const style = getStatusClasses(status);
                          const orderRef = order.order_id || order.id;
                          const productImg = getProductImage(order.product_name);

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
                                        alt={order.product_name || "Produk"}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-900">
                                      {order.product_name || "Produk Digital"}
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
                    {orders.slice(0, 5).map((order) => {
                      const status = normalizeStatus(order.status);
                      const style = getStatusClasses(status);
                      const orderRef = order.order_id || order.id;
                      const productImg = getProductImage(order.product_name);

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
                                  alt={order.product_name || "Produk"}
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
                                {order.product_name || "Produk Digital"}
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
                      Statistik Afiliasi
                    </h2>
                    <p className="hidden xs:block text-[10px] font-medium text-slate-400 truncate">
                      Performa mitra & pendapatan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleMenuNavigation("affiliate")}
                  className="inline-flex shrink-0 items-center text-[10px] xs:text-[11px] font-bold text-purple-600 transition hover:text-purple-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <span>Lihat Detail →</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 xs:p-2.5 min-w-0">
                  <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    Total Mitra
                  </p>
                  <p className="mt-0.5 text-xs xs:text-sm sm:text-base font-black text-slate-950 truncate">
                    {referrals.length} <span className="text-[9px] xs:text-[10px] font-semibold text-slate-500">Orang</span>
                  </p>
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50/80 p-2 xs:p-2.5 min-w-0">
                  <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-purple-700 truncate">
                    Komisi Referral
                  </p>
                  <p className="mt-0.5 truncate text-xs xs:text-sm sm:text-base font-black text-purple-900">
                    {formatRupiah(totalReferralCommission)}
                  </p>
                </div>
              </div>

              {/* Progress Referral Bulan Ini */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2 xs:p-2.5 min-w-0">
                <div className="flex items-center justify-between gap-1 text-[9.5px] xs:text-[10px]">
                  <span className="font-bold text-slate-700 truncate">
                    Progress: {monthlyReferrals.length}/25 Mitra
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
                    Komisi Bulan Ini
                  </p>
                </div>

                <p className="mt-1 truncate text-xs xs:text-sm sm:text-base font-black text-purple-950">
                  {formatRupiah(monthlyReferralCommission)}
                </p>

                <p className="mt-0.5 text-[9px] xs:text-[10px] leading-tight text-slate-500">
                  Otomatis masuk ke <strong className="font-bold text-slate-700">Saldo DaPay</strong> dari transaksi mitra.
                </p>
              </div>
            </div>

            {/* Referral Link & Copy Container */}
            <div className="mt-2.5 xs:mt-3 border-t border-slate-100 pt-2 xs:pt-2.5 min-w-0">
              <p className="mb-1 text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Tautan Referral Anda
              </p>
              <div className="flex items-center gap-1 xs:gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 p-1 shadow-2xs min-w-0">
                <code className="min-w-0 flex-1 truncate px-1.5 xs:px-2 font-mono text-[9px] xs:text-[10px] font-semibold text-slate-700">
                  {referralLink || "Link belum tersedia"}
                </code>

                <button
                  type="button"
                  onClick={copyReferralLink}
                  disabled={!referralLink}
                  className="inline-flex h-6.5 xs:h-7 shrink-0 items-center justify-center gap-1 rounded-lg bg-purple-600 px-2 xs:px-2.5 text-[10px] xs:text-[11px] font-bold text-white transition hover:bg-purple-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                >
                  <Copy size={10} className="xs:h-2.5 xs:w-2.5" />
                  <span>Salin</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* MODAL UPGRADE                                                */}
      {/* ============================================================ */}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              disabled={isUpgrading}
              className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 disabled:opacity-50"
              aria-label="Tutup upgrade"
            >
              <X size={18} />
            </button>

            <div className="pr-10">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
                Membership
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Upgrade ke Special Member
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dapatkan benefit member yang lebih tinggi sesuai program DaPay.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-600">
                Biaya Upgrade
              </p>

              <p className="mt-2 text-3xl font-black text-slate-950">
                Rp50.000
              </p>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <BenefitRow>Cashback lebih besar</BenefitRow>
              <BenefitRow>Komisi referral lebih tinggi</BenefitRow>
              <BenefitRow>Promo eksklusif</BenefitRow>
              <BenefitRow>Layanan prioritas</BenefitRow>
            </div>

            <button
              type="button"
              onClick={handleUpgradeMember}
              disabled={isUpgrading}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpgrading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                "Upgrade Sekarang"
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              disabled={isUpgrading}
              className="mt-3 w-full py-2 text-xs font-bold text-slate-400"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

/* ================================================================== */
/* DASHBOARD SHELL                                                    */
/* ================================================================== */

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 19) return "Selamat sore";
  return "Selamat malam";
}

function DashboardShell({
  children,
  activeMenu,
  userName,
  memberType,
  balance,
  setActiveMenu,
  isSidebarExpanded,
  setIsSidebarExpanded,
  avatarUrl,
  onRefresh,
}: {
  children: React.ReactNode;
  activeMenu: string;
  userName: string;
  memberType: "Reguler" | "Special" | "Gold" | string;
  balance: number;
  setActiveMenu: (menu: string) => void;
  isSidebarExpanded?: boolean;
  setIsSidebarExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
  avatarUrl?: string | null;
  onRefresh?: () => void;
}) {
  const bottomNavActive =
    activeMenu === "overview"
      ? "overview"
      : activeMenu === "orders"
        ? "orders"
        : activeMenu === "wallet"
          ? "wallet"
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

  const greeting = getTimeGreeting();

  const PAGE_META: Record<string, { title: string; subtitle: string }> = {
    orders: {
      title: "Riwayat Transaksi",
      subtitle: "Semua transaksi digital yang pernah dilakukan.",
    },
    wallet: {
      title: "Riwayat Saldo DaPay",
      subtitle: "Mutasi saldo masuk, keluar, cashback, dan referral.",
    },
    deposit: {
      title: "Isi Saldo DaPay",
      subtitle: "Pilih metode pembayaran untuk top up saldo.",
    },
    withdraw: {
      title: "Tarik Saldo DaPay",
      subtitle: "Tarik saldo ke rekening atau e-wallet terdaftar.",
    },
    withdrawal: {
      title: "Tarik Saldo DaPay",
      subtitle: "Tarik saldo ke rekening atau e-wallet terdaftar.",
    },
    affiliate: {
      title: "Program Afiliasi DaPay",
      subtitle: "Kelola mitra, komisi referral, dan tautan referral.",
    },
    settings: {
      title: "Pengaturan Akun",
      subtitle: "Profil, keamanan, autentikasi, dan preferensi akun.",
    },
    help: {
      title: "Pusat Bantuan",
      subtitle: "FAQ, tiket bantuan, dan hubungi tim DaPay.",
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
        />

        <main className="min-w-0 flex-1 px-2.5 xs:px-4 pb-28 pt-3 sm:pt-4 sm:px-6 md:pb-8 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-330">

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
                  aria-label="Buka navigasi sidebar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50"
                >
                  <Menu size={18} strokeWidth={2} />
                </button>

                {/* 2. NOTIFICATION BELL WITH BADGE */}
                <button
                  type="button"
                  onClick={() => setActiveMenu("settings")}
                  title="Pusat Notifikasi"
                  aria-label="Pusat Notifikasi (3 Notifikasi Baru)"
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50"
                >
                  <Bell size={16} className="text-slate-700" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-red-500 text-[8.5px] font-black text-white ring-2 ring-white shadow-xs">
                    3
                  </span>
                </button>

                {/* 3. USER PROFILE PILL */}
                <button
                  type="button"
                  onClick={() => setActiveMenu("settings")}
                  title={`Profil: ${userName} (${displayMemberType})`}
                  aria-label="Profil Pengguna"
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
                </button>

                {/* 4. REFRESH BUTTON */}
                <button
                  type="button"
                  onClick={onRefresh}
                  title="Muat ulang data"
                  aria-label="Muat ulang data"
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
                      </h1>
                      <p className="mt-0.5 text-[9.5px] xs:text-[10.5px] font-medium text-slate-400 truncate">
                        Ringkasan saldo, transaksi, koin & aktivitas akun.
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
                        Ringkasan saldo, transaksi, koin, dan aktivitas akun.
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
                  <button
                    type="button"
                    onClick={() => setActiveMenu("settings")}
                    title="Pusat Notifikasi"
                    aria-label="Pusat Notifikasi (3 Notifikasi Baru)"
                    className="relative flex h-8 w-8 md:h-8.5 md:w-8.5 lg:h-9.5 lg:w-9.5 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition-all duration-200 hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 cursor-pointer"
                  >
                    <Bell size={15} className="text-slate-700" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-red-500 text-[8.5px] font-black text-white ring-2 ring-white shadow-xs">
                      3
                    </span>
                  </button>

                  {/* 2. USER AVATAR PILL */}
                  <button
                    type="button"
                    onClick={() => setActiveMenu("settings")}
                    title={`Profil: ${userName} (${displayMemberType})`}
                    aria-label="Profil Pengguna"
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
                  </button>

                  {/* 3. REFRESH BUTTON */}
                  <button
                    type="button"
                    onClick={onRefresh}
                    title="Muat ulang data"
                    aria-label="Muat ulang data"
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
        onNavigate={setActiveMenu}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: "purple" | "emerald" | "blue" | "amber";
  sparkline?: { linePath: string; areaPath: string };
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
        <p className="truncate text-[13px] xs:text-[15px] sm:text-lg md:text-base lg:text-xl xl:text-2xl font-black tracking-tight text-slate-950 leading-none">
          {value}
        </p>

        <p className={`mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-semibold ${classes.note}`}>
          {note}
        </p>
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
