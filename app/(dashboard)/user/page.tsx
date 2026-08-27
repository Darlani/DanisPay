"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  History,
  Info,
  Loader2,
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

  const [userData, setUserData] = useState({
    email: "",
    name: "",
    refCode: "",
    balance: 0,
    coinBalance: 0,
  });

  const [memberType, setMemberType] = useState<
    "Reguler" | "Special"
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

        setUserData((previous) => ({
          email:
            profile?.email ||
            previous.email ||
            "",
          name:
            profile?.full_name ||
            "",
          refCode:
            profile?.referral_code ||
            "",
          balance:
            Number(profile?.balance || 0),
          coinBalance:
            Number(profile?.coin_balance || 0),
        }));

        setMemberType(
          profile?.member_type === "Special"
            ? "Special"
            : "Reguler",
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
        userName={
          userData.name || "Member DaPay"
        }
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
      >
        <OrdersViewUser />
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
        userName={
          userData.name || "Member DaPay"
        }
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
      >
        <WalletViewUser />
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
        userName={
          userData.name || "Member DaPay"
        }
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
      >
        <DepositViewUser />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* WITHDRAW                                                          */
  /* ================================================================= */

  if (activeMenu === "withdraw") {
    return (
      <DashboardShell
        activeMenu="withdraw"
        userName={
          userData.name || "Member DaPay"
        }
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
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
        userName={
          userData.name || "Member DaPay"
        }
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
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
        userName={
          userData.name || "Member DaPay"
        }
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
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
        userName={
          userData.name || "Member DaPay"
        }
        memberType={memberType}
        balance={Number(userData.balance)}
        setActiveMenu={handleMenuNavigation}
      >
        <HelpViewUser />
      </DashboardShell>
    );
  }

  /* ================================================================= */
  /* MAIN DASHBOARD                                                    */
  /* ================================================================= */

  const firstName =
    userData.name
      .trim()
      .split(/\s+/)[0] ||
    "Member";

  const coinBalance = userData.coinBalance;

  return (
    <DashboardShell
      activeMenu="overview"
      userName={
        userData.name || "Member DaPay"
      }
      memberType={memberType}
      balance={Number(userData.balance)}
      setActiveMenu={handleMenuNavigation}
    >
      {/* ============================================================ */}
      {/* DASHBOARD CONTENT                                            */}
      {/* ============================================================ */}

      <main className="min-w-0">
        {/* ======================================================== */}
        {/* HEADER                                                   */}
        {/* ======================================================== */}

        <section className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Member Area
                </p>
              </div>

              <h1 className="mt-1.5 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Selamat datang, {firstName} 👋
              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Kelola saldo, transaksi, koin, dan referral Anda di DaPay.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-[10px] font-black text-white shadow-xs">
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {memberType === "Special" ? "Special Member" : "Reguler Member"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void fetchDashboardData(false)}
                title="Muat ulang data dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
              >
                <RefreshCw size={14} className="text-slate-500 transition-transform group-hover:rotate-180" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SALDO + KOIN                                             */}
        {/* ======================================================== */}

        <section className="mb-6 grid gap-5 lg:grid-cols-2">
          {/* ====================================================== */}
          {/* SALDO DAYAP                                             */}
          {/* ====================================================== */}

          <div className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-blue-400/20 bg-linear-to-br from-[#1E40AF] via-[#1D4ED8] to-[#312E81] p-6 text-white shadow-[0_16px_36px_rgba(30,64,175,0.18)] ring-1 ring-inset ring-white/15 sm:p-7">
            {/* Ambient Background Glow & Watermark */}
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 text-white/8" aria-hidden="true">
              <Wallet size={150} strokeWidth={1.1} />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
              {/* Header Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-xs backdrop-blur-md">
                    <Wallet size={19} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-white sm:text-base">
                      Saldo DaPay
                    </h2>
                    <p className="text-[11px] font-medium text-blue-200/80">
                      Aset Utama (Likuid)
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-[10px] font-semibold text-emerald-200 backdrop-blur-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                  Bisa Ditarik
                </span>
              </div>

              {/* Nominal Area */}
              <div className="my-6 sm:my-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/70">
                  Saldo Tersedia
                </p>
                <p className="mt-1.5 truncate text-3xl font-black tracking-tight text-white sm:text-[2.5rem] lg:text-[2.75rem] leading-none">
                  {formatRupiah(userData.balance)}
                </p>
              </div>

              {/* Actions & Footer */}
              <div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleMenuNavigation("deposit")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-blue-800 shadow-sm transition hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95"
                  >
                    <PlusCircle size={15} />
                    <span>Isi Saldo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMenuNavigation("withdraw")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95"
                  >
                    <ArrowUpRight size={15} />
                    <span>Tarik Saldo</span>
                  </button>
                </div>

                <div className="mt-5 border-t border-white/10 pt-3.5">
                  <p className="text-[11px] font-medium leading-relaxed text-blue-100/75">
                    Dapat digunakan untuk semua transaksi checkout dan dapat ditarik tunai.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* KOIN DAPAY                                             */}
          {/* ====================================================== */}

          <div className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-purple-200/70 bg-linear-to-br from-[#FAF8FF] via-[#FFFFFF] to-[#F1EAFF] p-6 shadow-[0_18px_40px_rgba(139,92,246,0.07)] ring-1 ring-inset ring-white sm:p-7">
            {/* Ambient Background Glow & Light Field */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-linear-to-tr from-violet-300/25 via-purple-200/30 to-pink-200/15 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-purple-200/20 blur-2xl" aria-hidden="true" />

            {/* Layered Decorative 3D Coins Artwork (Matching Mockup) */}
            <div
              className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 opacity-[0.14] sm:opacity-[0.18]"
              style={{ perspective: "1000px" }}
              aria-hidden="true"
            >
              <div
                style={{
                  transform: "rotateY(-18deg) rotateX(10deg) rotateZ(-10deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <DaPayCoin size={175} showShadow={false} showText={true} />
              </div>
            </div>

            <div
              className="pointer-events-none absolute right-1 -bottom-4 opacity-[0.16] sm:opacity-[0.20]"
              style={{ perspective: "1000px" }}
              aria-hidden="true"
            >
              <div
                style={{
                  transform: "rotateY(-12deg) rotateX(6deg) rotateZ(6deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <DaPayCoin size={105} showShadow={false} showText={true} />
              </div>
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
              {/* Header Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-3.5">
                  {/* Hero Coin Brand Asset with Glowing Aura Halo */}
                  <div
                    className="relative flex shrink-0 items-center justify-center rounded-full p-2 bg-linear-to-tr from-violet-200/60 via-purple-100/50 to-violet-300/40 border border-violet-200/80 shadow-[0_4px_18px_rgba(139,92,246,0.20)]"
                    style={{ perspective: "800px" }}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        transform: "rotateY(-10deg) rotateX(6deg) rotateZ(-2deg)",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <DaPayCoin size={44} showShadow={true} showText={true} />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
                      Koin DaPay
                    </h2>
                    <p className="text-xs font-semibold text-purple-600">
                      Reward & Cashback
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700 shadow-2xs">
                  <span className="text-[11px] text-violet-600 leading-none" aria-hidden="true">✦</span>
                  Reward
                </span>
              </div>

              {/* Nominal Area */}
              <div className="my-6 sm:my-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-900/60">
                  Total Reward Koin
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="truncate text-4xl sm:text-5xl font-black tracking-tight text-slate-950 leading-none">
                    {coinBalance.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-violet-700">
                    KOIN
                  </span>
                </div>
              </div>

              {/* Informational Callout & Footer */}
              <div>
                <div className="flex items-center gap-3.5 rounded-2xl border border-purple-200/70 bg-white/85 p-3 shadow-2xs backdrop-blur-xs max-w-md sm:p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50 text-violet-700 shadow-2xs" aria-hidden="true">
                    <Gift size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 sm:text-[13px]">
                      Gunakan Koin DaPay saat checkout
                    </p>
                    <p className="text-[11px] text-slate-500 sm:text-xs">
                      untuk potongan harga langsung.
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-purple-100 pt-3.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium leading-relaxed text-slate-500">
                    <Info size={13} className="shrink-0 text-purple-400" aria-hidden="true" />
                    <span>Koin reward tidak dapat ditarik atau diuangkan ke rekening bank.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* KPI SUMMARY                                              */}
        {/* ======================================================== */}

        <section className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <KpiCard
            icon={<ArrowUpRight size={17} />}
            label="Komisi Referral"
            value={formatRupiah(totalReferralCommission)}
            note="Masuk ke Saldo DaPay"
            tone="purple"
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
          />

          <KpiCard
            icon={<CreditCard size={17} />}
            label="Total Deposit"
            value={formatRupiah(totalDeposit)}
            note="Deposit berhasil"
            tone="blue"
          />

          <KpiCard
            icon={<ShoppingBag size={17} />}
            label="Total Transaksi"
            value={orders.length.toLocaleString("id-ID")}
            note="Total pesanan"
            tone="amber"
          />
        </section>

        {/* ======================================================== */}
        {/* OPERATIONAL SECTION: TRANSAKSI & STATISTIK AFILIASI      */}
        {/* ======================================================== */}

        <section className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* ====================================================== */}
          {/* TRANSAKSI TERBARU (~70%)                               */}
          {/* ====================================================== */}

          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6">
            <div>
              {/* Section Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-blue-600">
                    <History size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      Transaksi Terbaru
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400">
                      Aktivitas pesanan digital terkini
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleMenuNavigation("orders")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span>Lihat Semua →</span>
                </button>
              </div>

              {/* Content Area */}
              <div className="mt-3.5">
                {orders.length === 0 ? (
                  <EmptyDashboard text="Belum ada transaksi pesanan tercatat." />
                ) : (
                  <>
                    {/* Desktop / Tablet Modern Data Table (md+) */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="pb-3 pl-2 pr-3 font-bold">Produk & Layanan</th>
                            <th className="px-3 pb-3 font-bold">ID Pesanan</th>
                            <th className="px-3 pb-3 font-bold">Waktu</th>
                            <th className="px-3 pb-3 font-bold text-center">Status</th>
                            <th className="pb-3 pl-3 pr-2 font-bold text-right">Harga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {orders.slice(0, 5).map((order) => {
                            const status = normalizeStatus(order.status);
                            const style = getStatusClasses(status);
                            const orderRef = order.order_id || order.id;

                            return (
                              <tr
                                key={order.id}
                                className="group h-17.5 transition hover:bg-slate-50/70"
                              >
                                {/* Produk */}
                                <td className="py-3 pl-2 pr-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600">
                                      <ShoppingBag size={15} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate font-bold text-slate-900">
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
                                <td className="px-3 py-3">
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                                    #{orderRef.slice(-8)}
                                  </span>
                                </td>

                                {/* Waktu */}
                                <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                                  {formatDate(order.created_at)}
                                </td>

                                {/* Status */}
                                <td className="whitespace-nowrap px-3 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${style.badge}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                                    {status}
                                  </span>
                                </td>

                                {/* Harga */}
                                <td className="whitespace-nowrap py-3 pl-3 pr-2 text-right font-black text-slate-950">
                                  {formatRupiah(order.total_amount ?? order.price)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Activity Feed (< md) */}
                    <div className="divide-y divide-slate-100 md:hidden">
                      {orders.slice(0, 5).map((order) => {
                        const status = normalizeStatus(order.status);
                        const style = getStatusClasses(status);
                        const orderRef = order.order_id || order.id;

                        return (
                          <div
                            key={order.id}
                            className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-1"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-700">
                              <ShoppingBag size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-900">
                                {order.product_name || "Produk Digital"}
                              </p>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="font-mono font-semibold text-slate-600">
                                  #{orderRef.slice(-8)}
                                </span>
                                <span aria-hidden="true">•</span>
                                <span>{formatDate(order.created_at)}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-black text-slate-950">
                                {formatRupiah(order.total_amount ?? order.price)}
                              </p>
                              <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold ${style.badge}`}>
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
          </div>

          {/* ====================================================== */}
          {/* STATISTIK AFILIASI (~30%)                              */}
          {/* ====================================================== */}

          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4.5 shadow-2xs sm:p-5">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-600">
                    <Gift size={14} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 sm:text-sm">
                      Statistik Afiliasi
                    </h2>
                    <p className="text-[10px] font-medium text-slate-400">
                      Performa mitra & pendapatan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleMenuNavigation("affiliate")}
                  className="inline-flex items-center text-[11px] font-bold text-purple-600 transition hover:text-purple-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <span>Lihat Detail →</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Total Mitra
                  </p>
                  <p className="mt-0.5 text-base font-black text-slate-950">
                    {referrals.length} <span className="text-[10px] font-semibold text-slate-500">Orang</span>
                  </p>
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50/80 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-purple-700">
                    Komisi Referral
                  </p>
                  <p className="mt-0.5 truncate text-base font-black text-purple-900">
                    {formatRupiah(totalReferralCommission)}
                  </p>
                </div>
              </div>

              {/* Progress Referral Bulan Ini */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="font-bold text-slate-700">
                    Progress: {referrals.length}/25 Mitra
                  </span>
                  <span className="rounded-md bg-purple-100/80 px-1.5 py-0.2 font-mono text-[9px] font-black text-purple-700">
                    {Math.min(Math.round((referrals.length / 25) * 100), 100)}%
                  </span>
                </div>

                {/* Compact Rounded Progress Bar */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-purple-100/70 p-0.5">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.min(Math.round((referrals.length / 25) * 100), 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Monthly Commission Insight */}
              <div className="rounded-xl border border-purple-100/90 bg-linear-to-br from-purple-50/70 via-white to-violet-50/40 p-2.5 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-purple-100 bg-purple-100 text-purple-700">
                    <Wallet size={11} />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-purple-900">
                    Komisi Bulan Ini
                  </p>
                </div>

                <p className="mt-1 truncate text-base font-black text-purple-950">
                  {formatRupiah(totalReferralCommission)}
                </p>

                <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                  Otomatis masuk ke <strong className="font-bold text-slate-700">Saldo DaPay</strong> dari transaksi mitra.
                </p>
              </div>
            </div>

            {/* Referral Link & Copy Container */}
            <div className="mt-3 border-t border-slate-100 pt-2.5">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Tautan Referral Anda
              </p>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 p-1 shadow-2xs">
                <code className="min-w-0 flex-1 truncate px-2 font-mono text-[10px] font-semibold text-slate-700">
                  {referralLink || "Link belum tersedia"}
                </code>

                <button
                  type="button"
                  onClick={copyReferralLink}
                  disabled={!referralLink}
                  className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg bg-purple-600 px-2.5 text-[11px] font-bold text-white transition hover:bg-purple-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                >
                  <Copy size={11} />
                  <span>Salin</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* FOOTER                                                   */}
        {/* ======================================================== */}

        <footer className="py-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            © 2026 DANISHTOPUP OFFICIAL PARTNER • ALL RIGHTS RESERVED
          </p>
        </footer>
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

function DashboardShell({
  children,
  activeMenu,
  userName,
  memberType,
  balance,
  setActiveMenu,
}: {
  children: React.ReactNode;
  activeMenu: string;
  userName: string;
  memberType: "Reguler" | "Special";
  balance: number;
  setActiveMenu: (menu: string) => void;
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-450">
        <UserSidebar
          userName={userName}
          memberType={memberType}
          balance={balance}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />

        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-6 lg:px-8 xl:px-10 xl:pb-8">
          <div className="mx-auto w-full max-w-330">
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: "purple" | "emerald" | "blue" | "amber";
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

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs transition hover:shadow-xs">
      {/* Background Mini Sparkline Chart */}
      <svg
        viewBox="0 0 96 36"
        className="pointer-events-none absolute bottom-1 right-2 h-10 w-24 opacity-[0.10]"
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
          d="M2 28 C 16 26, 22 14, 34 18 C 46 22, 54 8, 66 12 C 78 16, 84 4, 94 6"
          stroke={classes.sparkleStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 28 C 16 26, 22 14, 34 18 C 46 22, 54 8, 66 12 C 78 16, 84 4, 94 6 L 94 36 L 2 36 Z"
          fill={`url(#${classes.gradId})`}
        />
      </svg>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${classes.icon}`}>
          {icon}
        </div>
      </div>

      <div className="relative z-10 mt-3">
        <p className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          {value}
        </p>

        <p className={`mt-1 truncate text-[10px] font-semibold ${classes.note}`}>
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
