"use client";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Package,
  ShoppingBag,
  BadgeCheck,
  Banknote,
  Gauge,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import SidebarAdmin from "./SidebarAdmin";
import { supabase } from "@/utils/supabaseClient";
import AnalyticsView from "./analytics/AnalyticsView";
import CategoryManagement from "./categories/CategoryManagement";
import ProductManagement from "./products/ProductManagement";
import AccountDatabaseManagement from "./account-database/AccountDatabaseManagement";
import EventView from "./events/EventView";
import OrdersView from "./orders/OrdersView";
import DepositView from "./deposit/DepositView";
import WithdrawalView from "./withdrawal/WithdrawalView";
import ExploreView from "./explore/ExploreView";
import HistoryView from "./history/HistoryView";
import SettingsView from "./settings/SettingsView";
import PaymentManagement from "./payment/PaymentManagement";

type Order = {
  id: string;
  order_id?: string | null;
  product_name?: string | null;
  item_label?: string | null;
  email?: string | null;
  user_contact?: string | null;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
  price?: number | string | null;
  buy_price?: number | string | null;
  cashback?: number | string | null;
  referral_commission?: number | string | null;
  voucher_amount?: number | string | null;
  voucher?: number | string | null;
  used_balance?: number | string | null;
  total_amount?: number | string | null;
};

type OrderStatus = "Pending" | "Diproses" | "Berhasil" | "Gagal";

const ORDER_STATUS_VALUES = [
  "Pending",
  "Diproses",
  "Berhasil",
  "Gagal",
] as const satisfies readonly OrderStatus[];

const isOrderStatus = (status: string | null | undefined): status is OrderStatus =>
  ORDER_STATUS_VALUES.includes(status as OrderStatus);

const canTransitionOrderStatus = (
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) =>
  (currentStatus === "Pending" &&
    (nextStatus === "Diproses" || nextStatus === "Gagal")) ||
  (currentStatus === "Diproses" &&
    (nextStatus === "Berhasil" || nextStatus === "Gagal"));

type AdminFinanceModalMode = "deposit" | "withdraw";

type AdminDeposit = {
  id: string;
  user_email: string;
  amount: number;
  payment_method?: string | null;
  status: string;
  created_at: string;
};

type WithdrawalRequest = {
  id: string;
  user_email: string;
  amount: number;
  admin_fee: number;
  held_amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
};

const NON_NEGATIVE_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/;

function formatTotalDeduction(amount: number, fee: string) {
  if (!NON_NEGATIVE_INTEGER_PATTERN.test(fee)) return "-";

  try {
    return (BigInt(amount) + BigInt(fee)).toLocaleString("id-ID");
  } catch {
    return "-";
  }
}


const FINANCIALLY_FINAL_SUCCESS_STATUSES = new Set(["Berhasil"]);

const isSuccessfulOrder = (status: unknown) =>
  typeof status === "string" &&
  FINANCIALLY_FINAL_SUCCESS_STATUSES.has(status);

const formatRupiah = (value: unknown) =>
  `Rp ${(Number(value) || 0).toLocaleString("id-ID")}`;

const formatOrderTime = (value: unknown) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID");
};

const orderStatusClasses = (status: string | null | undefined) =>
  isSuccessfulOrder(status)
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : status === "Gagal"
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : status === "Diproses"
        ? "border-blue-100 bg-blue-50 text-blue-700"
        : "border-amber-100 bg-amber-50 text-amber-700";

const orderStatusDotClasses = (status: string | null | undefined) =>
  isSuccessfulOrder(status)
    ? "bg-emerald-500"
    : status === "Gagal"
      ? "bg-rose-500"
      : status === "Diproses"
        ? "bg-blue-500"
        : "bg-amber-500";

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-label="Memuat Dashboard">
      <div className="h-28 rounded-3xl bg-slate-200/70" />
      <div className="h-20 rounded-[20px] bg-slate-200/70" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 rounded-[20px] bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="h-80 rounded-[22px] bg-slate-200/70 lg:col-span-8" />
        <div className="h-80 rounded-[22px] bg-slate-200/70 lg:col-span-4" />
      </div>
      <div className="h-80 rounded-[22px] bg-slate-200/70" />
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [pendingDepositCount, setPendingDepositCount] = useState(0);
  const [pendingWithdrawCount, setPendingWithdrawCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [financeModal, setFinanceModal] = useState<AdminFinanceModalMode | null>(null);
  const [financeModalPendingOnly, setFinanceModalPendingOnly] = useState(false);
  const [attentionOrderMode, setAttentionOrderMode] = useState<
    "pending" | "onProcess" | null
  >(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setDashboardError(null);

    try {
      const [ordersResult, depositsResult, withdrawalsResult] =
        await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("deposits")
            .select("id", { count: "exact", head: true })
            .eq("status", "Pending"),
          supabase
            .from("withdrawals")
            .select("id", { count: "exact", head: true })
            .eq("status", "Pending"),
        ]);

      if (
        ordersResult.error ||
        depositsResult.error ||
        withdrawalsResult.error
      ) {
        throw (
          ordersResult.error ||
          depositsResult.error ||
          withdrawalsResult.error
        );
      }

      setOrders((ordersResult.data || []) as Order[]);
      setPendingDepositCount(depositsResult.count || 0);
      setPendingWithdrawCount(withdrawalsResult.count || 0);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Error Fetching Dashboard:", error);
      setDashboardError("Gagal memuat data Dashboard. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role?.toLowerCase();

      if (userRole !== "admin" && userRole !== "manager") {
        router.push("/user");
      }
    };

    checkAdmin();
  }, [router]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin-dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        fetchData,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits" },
        fetchData,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        fetchData,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(
      () => setCooldown((value) => value - 1),
      1000,
    );

    return () => clearTimeout(timer);
  }, [cooldown]);

  const filteredOrders = useMemo(() => {
    const now = new Date();

    if (dateFilter === "today") {
      return orders.filter(
        (order) =>
          new Date(order.created_at || "").toDateString() ===
          now.toDateString(),
      );
    }

    if (dateFilter === "week") {
      const startOfCurrentWeek = new Date(now);
      startOfCurrentWeek.setHours(0, 0, 0, 0);
      const dayOfWeek = startOfCurrentWeek.getDay();
      startOfCurrentWeek.setDate(
        startOfCurrentWeek.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek),
      );

      return orders.filter((order) => {
        const createdAt = new Date(order.created_at || "");
        return createdAt >= startOfCurrentWeek && createdAt <= now;
      });
    }

    return orders;
  }, [dateFilter, orders]);

  const dashboardKpis = useMemo(() => {
    const successfulOrders = filteredOrders.filter((order) =>
      isSuccessfulOrder(order.status),
    );

    const totalOrder = filteredOrders.length;

    return {
      totalOrder,
      successfulOrder: successfulOrders.length,
      omzetBerhasil: successfulOrders.reduce(
        (sum, order) => sum + (Number(order.price) || 0),
        0,
      ),
      successRate:
        totalOrder === 0
          ? 0
          : Math.round((successfulOrders.length / totalOrder) * 100),
    };
  }, [filteredOrders]);

  const pendingOrderCount = useMemo(
    () => orders.filter((order) => order.status === "Pending").length,
    [orders],
  );

  const onProcessOrderCount = useMemo(
    () => orders.filter((order) => order.status === "Diproses").length,
    [orders],
  );

  const totalAttentionCount =
    pendingDepositCount +
    pendingWithdrawCount +
    pendingOrderCount +
    onProcessOrderCount;

  const attentionItems = [
    {
      key: "deposit",
      label: "Deposit Pending",
      count: pendingDepositCount,
      description: "Menunggu verifikasi",
      icon: <CreditCard size={18} />,
      onClick: () => {
        setFinanceModal("deposit");
        setFinanceModalPendingOnly(true);
      },
    },
    {
      key: "withdraw",
      label: "Withdraw Pending",
      count: pendingWithdrawCount,
      description: "Menunggu proses",
      icon: <Wallet size={18} />,
      onClick: () => {
        setFinanceModal("withdraw");
        setFinanceModalPendingOnly(true);
      },
    },
    {
      key: "orderPending",
      label: "Order Pending",
      count: pendingOrderCount,
      description: "Perlu ditinjau",
      icon: <Clock size={18} />,
      onClick: () => setAttentionOrderMode("pending"),
    },
    {
      key: "orderOnProcess",
      label: "Order On Process",
      count: onProcessOrderCount,
      description: "Perlu dipantau",
      icon: <Send size={18} />,
      onClick: () => setAttentionOrderMode("onProcess"),
    },
  ].filter((item) => item.count > 0);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  const orderTrend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fixed calendar-week comparison: Monday -> Sunday.
    // Each weekday compares this week against the same weekday last week.
    // Future days in the current week remain null so they are not mistaken for 0 orders.
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() + mondayOffset);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const validOrders = orders
      .map((order) => ({
        order,
        createdAt: new Date(order.created_at || ""),
      }))
      .filter(({ createdAt }) => !Number.isNaN(createdAt.getTime()));

    const getOrdersForDate = (targetDate: Date) =>
      validOrders
        .filter(
          ({ createdAt }) => createdAt.toDateString() === targetDate.toDateString(),
        )
        .map(({ order }) => order);

    return Array.from({ length: 7 }, (_, index) => {
      const currentDate = new Date(currentWeekStart);
      currentDate.setDate(currentWeekStart.getDate() + index);

      const previousDate = new Date(previousWeekStart);
      previousDate.setDate(previousWeekStart.getDate() + index);

      const isFuture = currentDate > today;
      const currentOrders = isFuture ? [] : getOrdersForDate(currentDate);
      const previousOrders = getOrdersForDate(previousDate);

      const currentSuccessfulOrders = currentOrders.filter((order) =>
        isSuccessfulOrder(order.status),
      );
      const previousSuccessfulOrders = previousOrders.filter((order) =>
        isSuccessfulOrder(order.status),
      );

      const currentOmzet = currentSuccessfulOrders.reduce(
        (sum, order) => sum + (Number(order.price) || 0),
        0,
      );
      const previousOmzet = previousSuccessfulOrders.reduce(
        (sum, order) => sum + (Number(order.price) || 0),
        0,
      );

      return {
        key: currentDate.toDateString(),
        label: currentDate.toLocaleDateString("id-ID", { weekday: "short" }),
        currentDateLabel: currentDate.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
        previousDateLabel: previousDate.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
        isFuture,
        isToday: currentDate.getTime() === today.getTime(),
        currentCount: isFuture ? null : currentOrders.length,
        previousCount: previousOrders.length,
        currentSuccessfulCount: currentSuccessfulOrders.length,
        previousSuccessfulCount: previousSuccessfulOrders.length,
        currentOmzet,
        previousOmzet,
      };
    });
  }, [orders]);

  const { orderWeekLabel, previousOrderWeekLabel } = useMemo(() => {
    const currentStart = new Date();
    currentStart.setHours(0, 0, 0, 0);
    const dayOfWeek = currentStart.getDay();
    currentStart.setDate(
      currentStart.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek),
    );

    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + 6);

    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - 7);

    const previousEnd = new Date(previousStart);
    previousEnd.setDate(previousStart.getDate() + 6);

    const formatWeekRange = (start: Date, end: Date) => {
      const startLabel = start.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      const endLabel = end.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return `${startLabel} – ${endLabel}`;
    };

    return {
      orderWeekLabel: formatWeekRange(currentStart, currentEnd),
      previousOrderWeekLabel: formatWeekRange(previousStart, previousEnd),
    };
  }, []);

  const weeklyOrderTotal = useMemo(
    () =>
      orderTrend.reduce(
        (sum, item) => sum + (item.currentCount ?? 0),
        0,
      ),
    [orderTrend],
  );

  const previousComparableOrderTotal = useMemo(
    () =>
      orderTrend.reduce(
        (sum, item) => sum + (item.isFuture ? 0 : item.previousCount),
        0,
      ),
    [orderTrend],
  );

  const weeklyOrderDelta = weeklyOrderTotal - previousComparableOrderTotal;

  const weeklyOrderDeltaPercent =
    previousComparableOrderTotal === 0
      ? null
      : Math.round((weeklyOrderDelta / previousComparableOrderTotal) * 100);

  const trendAxisMax = useMemo(() => {
    const highestCount = Math.max(
      ...orderTrend.flatMap((item) => [
        item.currentCount ?? 0,
        item.previousCount,
      ]),
      0,
    );

    return Math.max(3, Math.ceil(highestCount / 3) * 3);
  }, [orderTrend]);

  const trendAxisTicks = useMemo(
    () => [
      trendAxisMax,
      (trendAxisMax / 3) * 2,
      trendAxisMax / 3,
      0,
    ],
    [trendAxisMax],
  );

  const kpiSparkline = useMemo(() => {
    const validOrders = orders
      .map((order) => ({
        order,
        createdAt: new Date(order.created_at || ""),
      }))
      .filter(({ createdAt }) => !Number.isNaN(createdAt.getTime()));

    const summarizeBucket = (bucketOrders: Order[]) => {
      const successfulOrders = bucketOrders.filter((order) =>
        isSuccessfulOrder(order.status),
      );
      const totalOrder = bucketOrders.length;
      const omzet = successfulOrders.reduce(
        (sum, order) => sum + (Number(order.price) || 0),
        0,
      );

      return {
        totalOrder,
        successfulOrder: successfulOrders.length,
        omzet,
        successRate:
          totalOrder === 0
            ? 0
            : (successfulOrders.length / totalOrder) * 100,
      };
    };

    if (dateFilter === "today") {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const currentHour = now.getHours();
      const bucketSize = 3;
      const bucketCount = Math.floor(currentHour / bucketSize) + 1;

      const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const start = new Date(startOfToday);
        start.setHours(index * bucketSize, 0, 0, 0);

        const end = new Date(start);
        end.setHours(start.getHours() + bucketSize, 0, 0, 0);

        const bucketOrders = validOrders
          .filter(
            ({ createdAt }) =>
              createdAt >= start &&
              createdAt < end &&
              createdAt <= now,
          )
          .map(({ order }) => order);

        return summarizeBucket(bucketOrders);
      });

      return {
        totalOrder: buckets.map((item) => item.totalOrder),
        successfulOrder: buckets.map((item) => item.successfulOrder),
        omzet: buckets.map((item) => item.omzet),
        successRate: buckets.map((item) => item.successRate),
        label: "Tren hari ini · per 3 jam",
      };
    }

    if (dateFilter === "week") {
      const currentTime = new Date();
      const today = new Date(currentTime);
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(
        today.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek),
      );
      const elapsedDays = dayOfWeek === 0 ? 7 : dayOfWeek;

      const buckets = Array.from({ length: elapsedDays }, (_, index) => {
        const start = new Date(currentWeekStart);
        start.setDate(currentWeekStart.getDate() + index);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        const bucketEnd = end > currentTime ? currentTime : end;

        const bucketOrders = validOrders
          .filter(
            ({ createdAt }) =>
              createdAt >= start && createdAt < bucketEnd,
          )
          .map(({ order }) => order);
        return summarizeBucket(bucketOrders);
      });

      return {
        totalOrder: buckets.map((item) => item.totalOrder),
        successfulOrder: buckets.map((item) => item.successfulOrder),
        omzet: buckets.map((item) => item.omzet),
        successRate: buckets.map((item) => item.successRate),
        label: "Tren minggu ini ? harian",
      };
    }

    if (validOrders.length === 0) {
      return {
        totalOrder: [0],
        successfulOrder: [0],
        omzet: [0],
        successRate: [0],
        label: "Tren semua data",
      };
    }

    const earliest = validOrders.reduce(
      (min, item) => (item.createdAt < min ? item.createdAt : min),
      validOrders[0].createdAt,
    );

    const latest = validOrders.reduce(
      (max, item) => (item.createdAt > max ? item.createdAt : max),
      validOrders[0].createdAt,
    );

    const firstMonth = new Date(
      earliest.getFullYear(),
      earliest.getMonth(),
      1,
    );
    const lastMonth = new Date(
      latest.getFullYear(),
      latest.getMonth(),
      1,
    );

    const buckets: ReturnType<typeof summarizeBucket>[] = [];
    const cursor = new Date(firstMonth);

    while (cursor <= lastMonth) {
      const start = new Date(cursor);
      const end = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        1,
      );

      const bucketOrders = validOrders
        .filter(
          ({ createdAt }) =>
            createdAt >= start && createdAt < end,
        )
        .map(({ order }) => order);

      buckets.push(summarizeBucket(bucketOrders));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      totalOrder: buckets.map((item) => item.totalOrder),
      successfulOrder: buckets.map((item) => item.successfulOrder),
      omzet: buckets.map((item) => item.omzet),
      successRate: buckets.map((item) => item.successRate),
      label: "Tren semua data · bulanan",
    };
  }, [dateFilter, orders]);

  const selectedPeriodLabel =
    dateFilter === "all"
      ? "Semua order"
      : dateFilter === "today"
        ? "Hari ini"
        : "Minggu ini";

  const handleUpdateStatus = async (
    id: string,
    newStatus: OrderStatus,
    userEmail: string,
  ) => {
    const currentOrder = orders.find((order) => order.id === id);
    const previousStatus = currentOrder?.status;

    if (
      !currentOrder ||
      !isOrderStatus(previousStatus) ||
      !canTransitionOrderStatus(previousStatus, newStatus)
    ) {
      alert("Transisi status order tidak diizinkan.");
      return;
    }

    setOrders((previous) =>
      previous.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order,
      ),
    );
    setSelectedOrder(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/orders/manage", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        id,
        status: newStatus,
        email: userEmail,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      alert(errorData.error || "Gagal update status!");
      fetchData();
      return;
    }

    if (
      currentOrder &&
      (newStatus === "Berhasil" || newStatus === "Gagal")
    ) {
      const contactTarget = currentOrder.user_contact || userEmail;

      if (contactTarget?.includes("@")) {
        fetch("/api/transaction/send-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrder.order_id,
            productName: currentOrder.product_name,
            status: newStatus,
            paymentMethod: currentOrder.payment_method,
            totalAmount: currentOrder.price || 0,
            userContact: contactTarget,
          }),
        }).catch((error) =>
          console.error("Gagal trigger struk:", error),
        );
      }
    }
  };

  const handleCheckStatus = async (
    orderId: string | null | undefined,
  ) => {
    if (!orderId) return;

    setIsCheckingStatus(true);

    try {
      const response = await fetch("/api/digiflazz/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `Status supplier: ${result.status}. Dashboard telah diperbarui.`,
        );
        fetchData();
        setSelectedOrder(null);
      } else {
        alert(
          "Gagal memeriksa status supplier: " +
            (result.error || "Server Busy"),
        );
      }
    } catch {
      alert("Koneksi terputus saat memeriksa status supplier.");
    } finally {
      setIsCheckingStatus(false);
      setCooldown(60);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f6f8fb] font-sans text-slate-600">
      <SidebarAdmin
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          isSidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-20"
        }`}
      >
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {selectedOrder && (
              <OrderDetailModal
                order={selectedOrder}
                cooldown={cooldown}
                isCheckingStatus={isCheckingStatus}
                onClose={() => setSelectedOrder(null)}
                onCheckStatus={handleCheckStatus}
                onUpdateStatus={handleUpdateStatus}
              />
            )}

            {financeModal && (
              <AdminFinanceModal
                initialMode={financeModal}
                pendingOnly={financeModalPendingOnly}
                onClose={() => setFinanceModal(null)}
                onDataChanged={fetchData}
              />
            )}

            {attentionOrderMode && (
              <OrderAttentionModal
                mode={attentionOrderMode}
                orders={orders}
                onSelectOrder={(order) => setSelectedOrder(order)}
                onClose={() => setAttentionOrderMode(null)}
                blockEscape={selectedOrder !== null}
              />
            )}

            {activeMenu === "Dashboard" && (
              <div className="space-y-5" aria-busy={loading}>
                <header className="rounded-3xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.045)] md:px-6 md:py-6 lg:px-7">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#07152f] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] sm:flex">
                        <Activity size={26} />
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 md:text-[30px]">
                            DASHBOARD
                          </h1>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-blue-600 ring-1 ring-blue-100">
                            Command Center
                          </span>
                        </div>
                        <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-slate-500">
                          Ringkasan operasional DaPay, antrean yang perlu ditindak,
                          dan aktivitas order terbaru dalam satu tampilan.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-[14px] border border-slate-200 bg-slate-50 p-1">
                        {["all", "today", "week"].map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setDateFilter(filter)}
                            aria-pressed={dateFilter === filter}
                            className={`rounded-[10px] px-3.5 py-2.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:py-2 ${
                              dateFilter === filter
                                ? "bg-[#07152f] text-white shadow-sm"
                                : "text-slate-500 hover:bg-white hover:text-slate-900"
                            }`}
                          >
                            {filter === "all"
                              ? "Semua"
                              : filter === "today"
                                ? "Hari Ini"
                                : "Minggu Ini"}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-10"
                        aria-label="Muat ulang Dashboard"
                        title="Muat ulang Dashboard"
                      >
                        <RefreshCw
                          size={17}
                          className={loading ? "animate-spin" : ""}
                        />
                      </button>
                    </div>
                  </div>
                </header>

                {loading && !hasLoadedOnce ? (
                  <DashboardSkeleton />
                ) : dashboardError ? (
                  <section
                    className="rounded-[22px] border border-rose-100 bg-white p-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
                    aria-live="polite"
                  >
                    <AlertCircle
                      className="mx-auto text-rose-500"
                      size={28}
                    />
                    <h2 className="mt-3 text-base font-bold text-slate-900">
                      Dashboard belum dapat dimuat
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {dashboardError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchData}
                      className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Coba lagi
                    </button>
                  </section>
                ) : (
                  <>
                    <section aria-labelledby="attention-heading">
                      {totalAttentionCount === 0 ? (
                        <div className="relative min-h-18 overflow-hidden rounded-[18px] border border-emerald-100 bg-linear-to-r from-emerald-50/80 via-white to-emerald-50/35 px-5 py-3.5 shadow-[0_7px_20px_rgba(15,23,42,0.025)] md:px-6">
                          <div className="relative z-20 flex min-h-11 items-center gap-3.5 pr-0 sm:pr-60">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200">
                              <CheckCircle2 size={18} strokeWidth={2} />
                            </span>
                            <div>
                              <h2
                                id="attention-heading"
                                className="text-[12px] font-bold text-emerald-800"
                              >
                                Operasional dalam kondisi baik
                              </h2>
                              <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                                Tidak ada antrean yang memerlukan perhatian saat ini.
                              </p>
                            </div>
                          </div>

                          <div
                            className="pointer-events-none absolute inset-y-0 right-3 hidden w-56 sm:block"
                            aria-hidden="true"
                          >
                            <div className="absolute bottom-0 right-1 flex h-12 items-end gap-1 opacity-75">
                              {[10, 18, 14, 26, 20, 34, 27, 44, 34, 52, 42].map(
                                (height, index) => (
                                  <span
                                    key={index}
                                    className="w-1.5 rounded-t-sm bg-blue-100"
                                    style={{ height }}
                                  />
                                ),
                              )}
                            </div>

                            <svg
                              viewBox="0 0 210 64"
                              className="absolute bottom-0 right-0 h-16 w-52.5 text-blue-100/80"
                              fill="none"
                            >
                              <path
                                d="M2 51 C23 49, 34 30, 53 34 C71 38, 83 22, 101 27 C123 34, 136 13, 155 20 C174 27, 188 16, 208 18"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>

                            <span className="absolute bottom-2 right-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/85 text-emerald-600 shadow-[0_6px_16px_rgba(16,185,129,0.10)] ring-1 ring-emerald-200/80">
                              <ShieldCheck size={30} strokeWidth={1.9} />
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[20px] border border-amber-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] md:p-5">
                          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div>
                              <h2
                                id="attention-heading"
                                className="text-[15px] font-bold text-slate-950"
                              >
                                Needs Attention
                              </h2>
                              <p className="mt-1 text-[10px] text-slate-500">
                                {totalAttentionCount.toLocaleString("id-ID")} antrean
                                memerlukan tindakan
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {attentionItems.map((item) => (
                              <AttentionCard
                                key={item.key}
                                label={item.label}
                                count={item.count}
                                description={item.description}
                                icon={item.icon}
                                onClick={item.onClick}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </section>

                    <section
                      aria-labelledby="kpi-heading"
                      className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-6"
                    >
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <h2
                            id="kpi-heading"
                            className="text-[15px] font-bold text-slate-950"
                          >
                            Ringkasan KPI
                          </h2>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Metrik utama performa order
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                          label="Total Order"
                          value={dashboardKpis.totalOrder.toLocaleString("id-ID")}
                          description={selectedPeriodLabel}
                          icon={<ShoppingBag size={20} strokeWidth={1.9} />}
                          tone="blue"
                          trend={kpiSparkline.totalOrder}
                          trendLabel={kpiSparkline.label}
                        />
                        <KpiCard
                          label="Order Berhasil"
                          value={dashboardKpis.successfulOrder.toLocaleString(
                            "id-ID",
                          )}
                          description="Status Berhasil"
                          icon={<BadgeCheck size={20} strokeWidth={1.9} />}
                          tone="emerald"
                          trend={kpiSparkline.successfulOrder}
                          trendLabel={kpiSparkline.label}
                        />
                        <KpiCard
                          label="Omzet Berhasil"
                          value={formatRupiah(dashboardKpis.omzetBerhasil)}
                          description="Nilai order berhasil"
                          icon={<Banknote size={20} strokeWidth={1.9} />}
                          tone="violet"
                          trend={kpiSparkline.omzet}
                          trendLabel={kpiSparkline.label}
                        />
                        <KpiCard
                          label="Tingkat Keberhasilan"
                          value={`${dashboardKpis.successRate}%`}
                          description="Berhasil ÷ total order"
                          icon={<Gauge size={20} strokeWidth={1.9} />}
                          tone="amber"
                          trend={kpiSparkline.successRate}
                          trendLabel={kpiSparkline.label}
                        />
                      </div>
                    </section>

                    <div className="grid gap-5 lg:grid-cols-12">
                      <section
                        className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-6 lg:col-span-8"
                        aria-labelledby="trend-heading"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2
                              id="trend-heading"
                              className="text-[15px] font-bold text-slate-950"
                            >
                              Aktivitas Order
                            </h2>
                            <p className="mt-1 text-[10px] text-slate-500">
                              Perbandingan total order per hari: minggu ini vs minggu lalu
                              (Senin - Minggu)
                            </p>
                          </div>

                          <div className="inline-flex shrink-0 items-center gap-2.5 self-start rounded-2xl bg-blue-50/70 px-3 py-2 ring-1 ring-blue-100/80">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                              <CalendarDays size={15} />
                            </span>
                            <div>
                              <p className="text-[10px] font-bold text-blue-700">
                                Minggu Ini vs Minggu Lalu
                              </p>
                              <p className="mt-0.5 text-[9px] font-medium text-slate-500">
                                {orderWeekLabel}
                              </p>
                              <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                                vs {previousOrderWeekLabel}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex gap-2.5 sm:gap-4">
                          <div
                            className="flex h-36 w-6 shrink-0 flex-col justify-between pb-px text-right text-[9px] font-medium tabular-nums text-slate-400"
                            aria-hidden="true"
                          >
                            {trendAxisTicks.map((tick) => (
                              <span key={tick}>{tick}</span>
                            ))}
                          </div>

                          <div
                            className="min-w-0 flex-1"
                            aria-label={`Grafik perbandingan aktivitas order ${orderWeekLabel} dengan ${previousOrderWeekLabel}`}
                          >
                            <div className="relative h-36">
                              <div className="pointer-events-none absolute inset-x-0 top-1 h-px border-t border-dashed border-slate-200" />
                              <div className="pointer-events-none absolute inset-x-0 top-[33.333%] h-px border-t border-dashed border-slate-200" />
                              <div className="pointer-events-none absolute inset-x-0 top-[66.666%] h-px border-t border-dashed border-slate-200" />
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-slate-200" />

                              <div className="relative z-10 flex h-full items-end gap-1.5 sm:gap-3">
                                {orderTrend.map((item) => {
                                  const previousHeight =
                                    item.previousCount === 0
                                      ? "2px"
                                      : `${Math.max(
                                          5,
                                          (item.previousCount / trendAxisMax) * 100,
                                        )}%`;

                                  const currentHeight =
                                    item.currentCount === null
                                      ? "0px"
                                      : item.currentCount === 0
                                        ? "2px"
                                        : `${Math.max(
                                            5,
                                            (item.currentCount / trendAxisMax) * 100,
                                          )}%`;

                                  const currentTooltip = item.isFuture
                                    ? `Minggu ini (${item.currentDateLabel}): belum terjadi`
                                    : `Minggu ini (${item.currentDateLabel}): ${item.currentCount} order, ${item.currentSuccessfulCount} berhasil, omzet ${formatRupiah(item.currentOmzet)}`;

                                  const tooltip = `${item.label} · Minggu lalu (${item.previousDateLabel}): ${item.previousCount} order, ${item.previousSuccessfulCount} berhasil, omzet ${formatRupiah(item.previousOmzet)} · ${currentTooltip}`;

                                  return (
                                    <div
                                      key={item.key}
                                      className={`group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-t-xl px-0.5 ${
                                        item.isToday ? "bg-blue-50/45" : ""
                                      }`}
                                      title={tooltip}
                                    >
                                      <div className="flex h-full w-full items-end justify-center gap-1 sm:gap-1.5">
                                        <div className="relative flex h-full w-[38%] max-w-8 items-end justify-center">
                                          <div
                                            className={`w-full rounded-t-md transition-all ${
                                              item.previousCount > 0
                                                ? "bg-slate-300 shadow-[0_4px_10px_rgba(100,116,139,0.12)] group-hover:bg-slate-400"
                                                : "bg-slate-100"
                                            }`}
                                            style={{ height: previousHeight }}
                                          />
                                          <span
                                            className="pointer-events-none absolute hidden text-[8px] font-semibold tabular-nums text-slate-500 sm:block"
                                            style={{
                                              bottom: `calc(${previousHeight} + 4px)`,
                                            }}
                                          >
                                            {item.previousCount}
                                          </span>
                                        </div>

                                        <div className="relative flex h-full w-[38%] max-w-8 items-end justify-center">
                                          <div
                                            className={`w-full rounded-t-md transition-all ${
                                              item.isFuture
                                                ? "bg-transparent"
                                                : item.currentCount && item.currentCount > 0
                                                  ? "bg-linear-to-t from-blue-600 to-blue-400 shadow-[0_5px_12px_rgba(37,99,235,0.16)] group-hover:from-blue-700 group-hover:to-blue-500"
                                                  : "bg-blue-100"
                                            }`}
                                            style={{ height: currentHeight }}
                                          />
                                          <span
                                            className="pointer-events-none absolute hidden text-[8px] font-bold tabular-nums text-blue-700 sm:block"
                                            style={{
                                              bottom:
                                                item.currentCount === null
                                                  ? "4px"
                                                  : `calc(${currentHeight} + 4px)`,
                                            }}
                                          >
                                            {item.currentCount === null
                                              ? "—"
                                              : item.currentCount}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-2.5 flex gap-1.5 sm:gap-3">
                              {orderTrend.map((item) => (
                                <div
                                  key={`${item.key}-label`}
                                  className="min-w-0 flex-1 text-center"
                                >
                                  <p
                                    className={`text-[9px] font-semibold ${
                                      item.isToday
                                        ? "text-blue-600"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {item.label}
                                  </p>
                                  <p className="mt-0.5 truncate text-[8px] text-blue-500">
                                    {item.currentDateLabel}
                                  </p>
                                  <p className="mt-0.5 truncate text-[7px] text-slate-400">
                                    vs {item.previousDateLabel}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-[3px] bg-slate-300" />
                            Minggu Lalu
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-[3px] bg-blue-500" />
                            Minggu Ini
                          </span>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                                <ShoppingBag size={13} />
                              </span>
                              <div>
                                <p className="text-[12px] font-bold tabular-nums text-slate-900">
                                  {previousComparableOrderTotal}
                                </p>
                                <p className="text-[8px] text-slate-400">
                                  Minggu Lalu · hari sepadan
                                </p>
                              </div>
                            </div>

                            <div className="h-7 w-px bg-slate-200" />

                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                                <ShoppingBag size={13} />
                              </span>
                              <div>
                                <p className="text-[12px] font-bold tabular-nums text-slate-900">
                                  {weeklyOrderTotal}
                                </p>
                                <p className="text-[8px] text-slate-400">
                                  Minggu Ini · s.d. hari ini
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-1 sm:items-end">
                            <span
                              className={`text-[9px] font-semibold ${
                                weeklyOrderDelta > 0
                                  ? "text-emerald-600"
                                  : weeklyOrderDelta < 0
                                    ? "text-rose-600"
                                    : "text-slate-500"
                              }`}
                            >
                              {weeklyOrderDeltaPercent === null
                                ? `${weeklyOrderDelta >= 0 ? "+" : ""}${weeklyOrderDelta} order vs minggu lalu`
                                : `${weeklyOrderDeltaPercent >= 0 ? "+" : ""}${weeklyOrderDeltaPercent}% vs minggu lalu`}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[8px] font-medium text-slate-400">
                              Pembanding memakai hari yang sama · hari mendatang: —
                              <AlertCircle size={11} />
                            </span>
                          </div>
                        </div>
                      </section>

                      <section
                        className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-6 lg:col-span-4"
                        aria-labelledby="shortcut-heading"
                      >
                        <h2
                          id="shortcut-heading"
                          className="text-[15px] font-bold text-slate-950"
                        >
                          Akses Cepat
                        </h2>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Jalan pintas ke modul yang sering digunakan.
                        </p>

                        <div className="mt-4 space-y-2.5">
                          <Shortcut
                            label="Deposit"
                            description="Kelola deposit member"
                            icon={<CreditCard size={17} />}
                            tone="blue"
                            onClick={() => {
                              setFinanceModal("deposit");
                              setFinanceModalPendingOnly(false);
                            }}
                          />
                          <Shortcut
                            label="Withdraw"
                            description="Kelola withdraw member"
                            icon={<Wallet size={17} />}
                            tone="amber"
                            onClick={() => {
                              setFinanceModal("withdraw");
                              setFinanceModalPendingOnly(false);
                            }}
                          />
                          <Shortcut
                            label="Explore Produk"
                            description="Jelajahi semua produk"
                            icon={<Package size={17} />}
                            tone="emerald"
                            onClick={() => setActiveMenu("Explore")}
                          />
                          <Shortcut
                            label="Analytics"
                            description="Lihat laporan lengkap"
                            icon={<TrendingUp size={17} />}
                            tone="violet"
                            onClick={() => setActiveMenu("Analytics")}
                          />
                        </div>
                      </section>
                    </div>

                    <section
                      id="recent-orders"
                      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                      aria-labelledby="recent-orders-heading"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
                        <div>
                          <h2
                            id="recent-orders-heading"
                            className="text-[15px] font-bold text-slate-950"
                          >
                            Aktivitas Order Terbaru
                          </h2>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Transaksi terbaru yang masuk ke sistem DaPay.
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-medium text-slate-500">
                          6 order terakhir
                        </span>
                      </div>

                      {recentOrders.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                          <Package
                            className="mx-auto text-slate-300"
                            size={26}
                          />
                          <p className="mt-3 text-sm font-medium text-slate-700">
                            Belum ada order untuk ditampilkan.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-225 table-fixed text-left">
                              <colgroup>
                                <col className="w-[13%]" />
                                <col className="w-[23%]" />
                                <col className="w-[18%]" />
                                <col className="w-[13%]" />
                                <col className="w-[12%]" />
                                <col className="w-[14%]" />
                                <col className="w-[7%]" />
                              </colgroup>
                              <thead className="bg-slate-50/80 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-500">
                                <tr>
                                  <th className="px-5 py-3.5">Order</th>
                                  <th className="px-5 py-3.5">Produk</th>
                                  <th className="px-5 py-3.5">Pelanggan</th>
                                  <th className="px-5 py-3.5 text-right">
                                    Nominal
                                  </th>
                                  <th className="px-5 py-3.5 text-center">
                                    Status
                                  </th>
                                  <th className="px-5 py-3.5 text-right">
                                    Waktu
                                  </th>
                                  <th className="px-5 py-3.5 text-center">
                                    Detail
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {recentOrders.map((order) => (
                                  <RecentOrderRow
                                    key={order.id}
                                    order={order}
                                    onClick={() => setSelectedOrder(order)}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="divide-y divide-slate-100 md:hidden">
                            {recentOrders.map((order) => (
                              <RecentOrderMobileCard
                                key={order.id}
                                order={order}
                                onClick={() => setSelectedOrder(order)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}

            {activeMenu === "Analytics" && <AnalyticsView />}
            {activeMenu === "Category" && <CategoryManagement />}
            {activeMenu === "Products" && <ProductManagement />}
            {activeMenu === "AccountDatabase" && (
              <AccountDatabaseManagement />
            )}
            {activeMenu === "Event" && <EventView />}
            {activeMenu === "Orders" && <OrdersView />}
            {activeMenu === "Deposit" && <DepositView />}
            {activeMenu === "Withdrawal" && <WithdrawalView />}
            {activeMenu === "Explore" && <ExploreView />}
            {activeMenu === "History" && <HistoryView />}
            {activeMenu === "Payment" && <PaymentManagement />}
            {activeMenu === "Settings" && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminFinanceModal({
  initialMode,
  pendingOnly = false,
  onClose,
  onDataChanged,
}: {
  initialMode: AdminFinanceModalMode;
  pendingOnly?: boolean;
  onClose: () => void;
  onDataChanged: () => void | Promise<void>;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Deposit dan Withdraw dipilih dari Dashboard. Popup hanya menampilkan
  // satu konteks operasional agar tidak membuat navigasi yang berulang.
  const isDeposit = initialMode === "deposit";
  const modalTitle = isDeposit ? "Kelola Deposit" : "Kelola Withdraw";
  const modalDescription = isDeposit
    ? "Verifikasi dan proses deposit member tanpa meninggalkan Dashboard."
    : "Tinjau dan proses permintaan penarikan member tanpa meninggalkan Dashboard.";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label={`Tutup ${modalTitle}`}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-modal-title"
        aria-describedby="finance-modal-description"
        className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:rounded-[30px]"
      >
        <header className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                  isDeposit
                    ? "bg-blue-50 text-blue-600 ring-blue-100"
                    : "bg-amber-50 text-amber-600 ring-amber-100"
                }`}
              >
                {isDeposit ? <CreditCard size={21} /> : <Wallet size={21} />}
              </span>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Operasional Dashboard
                </p>
                <h2
                  id="finance-modal-title"
                  className="mt-1 text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl"
                >
                  {modalTitle}
                </h2>
                <p
                  id="finance-modal-description"
                  className="mt-1 max-w-2xl text-[11px] leading-4 text-slate-500"
                >
                  {modalDescription}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={`Tutup ${modalTitle}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
          {isDeposit ? (
            <AdminDepositPanel
              pendingOnly={pendingOnly}
              onDataChanged={onDataChanged}
            />
          ) : (
            <AdminWithdrawPanel
              pendingOnly={pendingOnly}
              onDataChanged={onDataChanged}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function OrderAttentionModal({
  mode,
  orders,
  onSelectOrder,
  onClose,
  blockEscape = false,
}: {
  mode: "pending" | "onProcess";
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onClose: () => void;
  blockEscape?: boolean;
}) {
  const isPending = mode === "pending";
  const title = isPending ? "Order Pending" : "Order On Process";
  const statusFilter = isPending ? "Pending" : "Diproses";
  const filteredOrders = useMemo(
    () => orders.filter((order) => order.status === statusFilter),
    [orders, statusFilter],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (blockEscape) return;
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, blockEscape]);

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label={`Tutup ${title}`}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-attention-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:rounded-[30px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                isPending
                  ? "bg-amber-50 text-amber-600 ring-amber-100"
                  : "bg-blue-50 text-blue-600 ring-blue-100"
              }`}
            >
              {isPending ? <Clock size={21} /> : <Send size={21} />}
            </span>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Need Attention
              </p>
              <h2
                id="order-attention-title"
                className="mt-1 text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl"
              >
                {title}
              </h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-4 text-slate-500">
                {filteredOrders.length} order berstatus {statusFilter}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Tutup ${title}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {filteredOrders.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center px-5 py-10 text-center">
              <CheckCircle2 size={26} className="text-emerald-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Tidak ada order {statusFilter}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Semua order berstatus {statusFilter} sudah selesai ditindak.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-[11%]" />
                    <col className="w-[22%]" />
                    <col className="w-[17%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[15%]" />
                    <col className="w-[9%]" />
                  </colgroup>
                  <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Order</th>
                      <th className="px-6 py-4">Produk</th>
                      <th className="px-6 py-4">Pelanggan</th>
                      <th className="px-6 py-4 text-right">Nominal</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Waktu</th>
                      <th className="px-6 py-4 text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                      <OrderAttentionRow
                        key={order.id}
                        order={order}
                        onClick={() => onSelectOrder(order)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredOrders.map((order) => (
                  <RecentOrderMobileCard
                    key={order.id}
                    order={order}
                    onClick={() => onSelectOrder(order)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function AdminDepositPanel({
  pendingOnly = false,
  onDataChanged,
}: {
  pendingOnly?: boolean;
  onDataChanged: () => void | Promise<void>;
}) {
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeposits = async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from("deposits").select("*");

    if (pendingOnly) {
      query = query.eq("status", "Pending");
    }

    const { data, error: fetchError } = await query.order("created_at", {
      ascending: false,
    });

    if (fetchError) {
      console.error("Error Fetch Admin Deposit:", fetchError);
      setError("Data deposit belum dapat dimuat.");
    } else {
      setDeposits((data || []) as AdminDeposit[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchDeposits();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm("Konfirmasi saldo masuk? Audit saldo awal/akhir akan dicatat.")) return;

    setProcessingId(id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sesi admin tidak valid. Silakan login kembali.");
      }

      const response = await fetch(
        `/api/admin/deposits/${encodeURIComponent(id)}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Gagal menyetujui deposit.");
      }

      alert("Deposit berhasil disetujui dan saldo member telah diperbarui.");
      await fetchDeposits();
      void onDataChanged();
    } catch (submitError: unknown) {
      alert(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyetujui deposit.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Tolak deposit ini? Saldo pengguna tidak akan ditambahkan.")) return;

    setProcessingId(id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sesi admin tidak valid. Silakan login kembali.");
      }

      const response = await fetch(
        `/api/admin/deposits/${encodeURIComponent(id)}/reject`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Gagal menolak deposit.");
      }

      alert("Deposit ditolak. Saldo pengguna tidak berubah.");
      await fetchDeposits();
      void onDataChanged();
    } catch (submitError: unknown) {
      alert(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menolak deposit.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = deposits.filter((item) => item.status === "Pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">Daftar Deposit</p>
          <p className="mt-1 text-[10px] text-slate-500">
            {pendingOnly
              ? `${pendingCount.toLocaleString("id-ID")} pending`
              : `${pendingCount.toLocaleString("id-ID")} pending · ${deposits.length.toLocaleString("id-ID")} total data`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchDeposits()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[10px] font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <PanelLoading label="Memuat deposit..." />
          ) : deposits.length === 0 ? (
            <PanelEmpty label="Belum ada data deposit." />
          ) : (
            deposits.map((deposit) => {
              const isProcessing = processingId === deposit.id;
              return (
                <article
                  key={deposit.id}
                  className={`p-4 ${isProcessing ? "pointer-events-none opacity-55" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-slate-900">
                        {deposit.user_email || "-"}
                      </p>
                      <p className="mt-1 text-[9px] text-slate-400">
                        {formatOrderTime(deposit.created_at)}
                      </p>
                    </div>
                    <FinanceStatusBadge status={deposit.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Nominal</p>
                      <p className="mt-1 text-[12px] font-black text-emerald-600">
                        {formatRupiah(deposit.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Via</p>
                      <p className="mt-1 truncate text-[11px] font-bold uppercase text-slate-700">
                        {deposit.payment_method || "-"}
                      </p>
                    </div>
                  </div>

                  {deposit.status === "Pending" && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => void handleReject(deposit.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[11px] font-bold text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-1"
                      >
                        <X size={14} /> Tolak
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => void handleApprove(deposit.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-[11px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1"
                      >
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Setujui
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-190 table-fixed text-left">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-[0.07em] text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5 text-right">Nominal</th>
                <th className="px-5 py-3.5 text-center">Via</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5}><PanelLoading label="Memuat deposit..." /></td></tr>
              ) : deposits.length === 0 ? (
                <tr><td colSpan={5}><PanelEmpty label="Belum ada data deposit." /></td></tr>
              ) : (
                deposits.map((deposit) => {
                  const isProcessing = processingId === deposit.id;
                  return (
                    <tr
                      key={deposit.id}
                      className={`transition hover:bg-slate-50/70 ${isProcessing ? "pointer-events-none opacity-55" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <p className="truncate text-[11px] font-bold text-slate-900">{deposit.user_email || "-"}</p>
                        <p className="mt-1 text-[9px] text-slate-400">{formatOrderTime(deposit.created_at)}</p>
                      </td>
                      <td className="px-5 py-4 text-right text-[11px] font-black tabular-nums text-emerald-600">{formatRupiah(deposit.amount)}</td>
                      <td className="px-5 py-4 text-center text-[10px] font-bold uppercase text-slate-600">{deposit.payment_method || "-"}</td>
                      <td className="px-5 py-4 text-center"><FinanceStatusBadge status={deposit.status} /></td>
                      <td className="px-5 py-4">
                        {deposit.status === "Pending" ? (
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => void handleReject(deposit.id)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-1 md:h-10 md:w-10"
                              aria-label="Tolak deposit"
                            >
                              <X size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => void handleApprove(deposit.id)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 md:h-10 md:w-10"
                              aria-label="Setujui deposit"
                            >
                              {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                            </button>
                          </div>
                        ) : (
                          <span className="block text-center text-[9px] font-medium text-slate-300">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminWithdrawPanel({
  pendingOnly = false,
  onDataChanged,
}: {
  pendingOnly?: boolean;
  onDataChanged: () => void | Promise<void>;
}) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFees, setEditingFees] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [lastActionTime, setLastActionTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from("withdrawals").select("*");

    if (pendingOnly) {
      query = query.eq("status", "Pending");
    }

    const { data, error: fetchError } = await query.order("created_at", {
      ascending: false,
    });

    if (fetchError) {
      console.error("Error Fetch Admin Withdraw:", fetchError);
      setError("Data withdraw belum dapat dimuat.");
    } else {
      setRequests((data || []) as WithdrawalRequest[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const handleFeeChange = (id: string, value: string) => {
    setEditingFees((current) => ({ ...current, [id]: value }));
  };

  const isCooldown = () => {
    const now = Date.now();
    if (now - lastActionTime < 3000) {
      alert("Tunggu 3 detik sebelum melakukan aksi berikutnya.");
      return true;
    }
    setLastActionTime(now);
    return false;
  };

  const approveWithdraw = async (request: WithdrawalRequest) => {
    if (processingIds.has(request.id) || isCooldown()) return;

    const finalAdminFee =
      editingFees[request.id] !== undefined
        ? editingFees[request.id]
        : String(request.admin_fee || 0);

    if (!NON_NEGATIVE_INTEGER_PATTERN.test(finalAdminFee)) {
      return alert("Biaya admin harus berupa bilangan bulat tidak negatif.");
    }

    try {
      if (BigInt(finalAdminFee) > BigInt("9223372036854775807")) {
        return alert("Biaya admin berada di luar batas yang didukung.");
      }
    } catch {
      return alert("Biaya admin tidak valid.");
    }

    if (!confirm("Setujui withdraw ini? Saldo awal dan akhir akan diaudit otomatis.")) return;

    setProcessingIds((current) => new Set(current).add(request.id));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sesi admin tidak valid. Silakan login kembali.");
      }

      const response = await fetch(
        `/api/admin/withdrawals/${encodeURIComponent(request.id)}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ finalFee: finalAdminFee }),
        },
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Gagal menyetujui penarikan.");
      }

      alert("Withdraw berhasil disetujui.");
      await fetchRequests();
      void onDataChanged();
    } catch (submitError: unknown) {
      alert(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyetujui penarikan.",
      );
    } finally {
      setProcessingIds((current) => {
        const next = new Set(current);
        next.delete(request.id);
        return next;
      });
    }
  };

  const rejectWithdraw = async (request: WithdrawalRequest) => {
    if (processingIds.has(request.id) || isCooldown()) return;
    if (
      !confirm(
        `Tolak withdraw ini? Saldo Rp ${request.held_amount.toLocaleString("id-ID")} akan dikembalikan penuh ke member.`,
      )
    ) {
      return;
    }

    setProcessingIds((current) => new Set(current).add(request.id));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sesi admin tidak valid. Silakan login kembali.");
      }

      const response = await fetch(
        `/api/admin/withdrawals/${encodeURIComponent(request.id)}/reject`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Gagal menolak penarikan.");
      }

      alert("Withdraw ditolak dan saldo telah dikembalikan.");
      await fetchRequests();
      void onDataChanged();
    } catch (submitError: unknown) {
      alert(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menolak penarikan.",
      );
    } finally {
      setProcessingIds((current) => {
        const next = new Set(current);
        next.delete(request.id);
        return next;
      });
    }
  };

  const pendingCount = requests.filter((item) => item.status === "Pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">Daftar Withdraw</p>
          <p className="mt-1 text-[10px] text-slate-500">
            {pendingOnly
              ? `${pendingCount.toLocaleString("id-ID")} pending`
              : `${pendingCount.toLocaleString("id-ID")} pending · ${requests.length.toLocaleString("id-ID")} total data`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchRequests()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[10px] font-bold text-slate-600 shadow-sm transition hover:border-amber-200 hover:text-amber-600 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <PanelLoading label="Memuat withdraw..." />
          ) : requests.length === 0 ? (
            <PanelEmpty label="Belum ada data withdraw." />
          ) : (
            requests.map((request) => {
              const currentEditFee =
                editingFees[request.id] !== undefined
                  ? editingFees[request.id]
                  : String(request.admin_fee || 0);
              const isProcessing = processingIds.has(request.id);

              return (
                <article
                  key={request.id}
                  className={`p-4 ${isProcessing ? "pointer-events-none opacity-55" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-slate-900">{request.user_email}</p>
                      <p className="mt-1 text-[9px] text-slate-400">{formatOrderTime(request.created_at)}</p>
                    </div>
                    <FinanceStatusBadge status={request.status} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Penarikan</span>
                      <span className="text-[12px] font-black text-blue-600">{formatRupiah(request.amount)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Admin Fee</span>
                      {request.status === "Pending" ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={currentEditFee}
                          onChange={(event) => handleFeeChange(request.id, event.target.value)}
                          className="w-28 rounded-lg border border-rose-200 bg-white px-2 py-2 text-right text-[11px] font-bold text-rose-600 outline-none focus:border-rose-400 sm:w-24 sm:py-1.5 sm:text-[10px]"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600">{formatRupiah(request.admin_fee)}</span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Total Potong</span>
                      <span className="text-[12px] font-black text-slate-950">Rp {formatTotalDeduction(request.amount, currentEditFee)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Tujuan</p>
                      <p className="mt-1 text-[11px] font-bold uppercase text-slate-900">{request.bank_name || "-"}</p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-500">{request.account_number || "-"}{request.account_name ? ` · ${request.account_name}` : ""}</p>
                    </div>

                    {request.status === "Pending" && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => void rejectWithdraw(request)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-1 md:h-10 md:w-10"
                          aria-label="Tolak withdraw"
                        >
                          <X size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => void approveWithdraw(request)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 md:h-10 md:w-10"
                          aria-label="Setujui withdraw"
                        >
                          {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-245 table-fixed text-left">
            <colgroup>
              <col className="w-[21%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-[0.07em] text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Member</th>
                <th className="px-4 py-3.5 text-right">Penarikan</th>
                <th className="px-4 py-3.5 text-center">Admin Fee</th>
                <th className="px-4 py-3.5 text-right">Total Potong</th>
                <th className="px-4 py-3.5">Tujuan</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7}><PanelLoading label="Memuat withdraw..." /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7}><PanelEmpty label="Belum ada data withdraw." /></td></tr>
              ) : (
                requests.map((request) => {
                  const currentEditFee =
                    editingFees[request.id] !== undefined
                      ? editingFees[request.id]
                      : String(request.admin_fee || 0);
                  const isProcessing = processingIds.has(request.id);

                  return (
                    <tr
                      key={request.id}
                      className={`transition hover:bg-slate-50/70 ${isProcessing ? "pointer-events-none opacity-55" : ""}`}
                    >
                      <td className="px-4 py-4">
                        <p className="truncate text-[10px] font-bold text-slate-900">{request.user_email}</p>
                        <p className="mt-1 text-[8px] text-slate-400">{formatOrderTime(request.created_at)}</p>
                      </td>
                      <td className="px-4 py-4 text-right text-[10px] font-black tabular-nums text-blue-600">{formatRupiah(request.amount)}</td>
                      <td className="px-4 py-4 text-center">
                        {request.status === "Pending" ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={currentEditFee}
                            onChange={(event) => handleFeeChange(request.id, event.target.value)}
                            className="w-24 rounded-lg border border-rose-200 bg-rose-50/60 px-2 py-1.5 text-center text-[9px] font-bold text-rose-600 outline-none focus:border-rose-400"
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-rose-600">{formatRupiah(request.admin_fee)}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-[10px] font-black tabular-nums text-slate-900">Rp {formatTotalDeduction(request.amount, currentEditFee)}</td>
                      <td className="px-4 py-4">
                        <p className="truncate text-[10px] font-bold uppercase text-slate-900">{request.bank_name || "-"}</p>
                        <p className="mt-1 truncate text-[8px] text-slate-400">{request.account_number || "-"}{request.account_name ? ` · ${request.account_name}` : ""}</p>
                      </td>
                      <td className="px-4 py-4 text-center"><FinanceStatusBadge status={request.status} /></td>
                      <td className="px-4 py-4">
                        {request.status === "Pending" ? (
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => void rejectWithdraw(request)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-1 md:h-10 md:w-10"
                              aria-label="Tolak withdraw"
                            >
                              <X size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => void approveWithdraw(request)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 md:h-10 md:w-10"
                              aria-label="Setujui withdraw"
                            >
                              {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                            </button>
                          </div>
                        ) : (
                          <span className="block text-center text-[9px] font-medium text-slate-300">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FinanceStatusBadge({ status }: { status: string }) {
  const normalized = status || "Pending";
  const styles =
    normalized === "Pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized === "Success" || normalized === "Berhasil"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : normalized === "Rejected" || normalized === "Gagal"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normalized}
    </span>
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center gap-2 px-5 py-10 text-[10px] font-semibold text-slate-400">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

function PanelEmpty({ label }: { label: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center px-5 py-10 text-[10px] font-semibold text-slate-400">
      {label}
    </div>
  );
}

function AttentionCard({
  label,
  count,
  description,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-100">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold text-slate-900">
          {label}
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-500">
          {description}
        </span>
      </span>

      <span className="flex items-center gap-2">
        <span className="text-xl font-black tabular-nums tracking-tight text-slate-950">
          {count}
        </span>
        <ChevronRight
          size={15}
          className="text-amber-500 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}

function KpiCard({
  label,
  value,
  description,
  icon,
  tone,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
  trend: number[];
  trendLabel: string;
}) {
  const tones = {
    blue: {
      iconShell: "bg-blue-50 text-blue-600 ring-blue-100",
      line: "#2563eb",
      fill: "#dbeafe",
    },
    emerald: {
      iconShell: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      line: "#059669",
      fill: "#d1fae5",
    },
    violet: {
      iconShell: "bg-violet-50 text-violet-600 ring-violet-100",
      line: "#7c3aed",
      fill: "#ede9fe",
    },
    amber: {
      iconShell: "bg-amber-50 text-orange-600 ring-amber-100",
      line: "#ea580c",
      fill: "#ffedd5",
    },
  };

  const selected = tones[tone];

  return (
    <article
      className="relative flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
    >
      <div className="relative z-10 flex items-center justify-between gap-2">
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.07em] text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ${selected.iconShell}`}
        >
          {icon}
        </span>
      </div>

      <p
        title={value}
        className="relative z-10 mt-3 whitespace-nowrap text-[19px] font-black tracking-[-0.035em] text-slate-950 md:text-[21px] xl:text-[22px]"
      >
        {value}
      </p>
      <p className="relative z-10 mt-1 truncate text-[10px] text-slate-500">
        {description}
      </p>

      <div
        className="pointer-events-none absolute bottom-0 right-0 z-0 h-16 w-2/5 opacity-70 sm:h-20 sm:w-1/2"
        title={trendLabel}
        aria-hidden="true"
      >
        <KpiSparkline
          values={trend}
          lineColor={selected.line}
          fillColor={selected.fill}
        />
      </div>

      <span className="sr-only">{trendLabel}</span>
    </article>
  );
}

function KpiSparkline({
  values,
  lineColor,
  fillColor,
}: {
  values: number[];
  lineColor: string;
  fillColor: string;
}) {
  const width = 110;
  const height = 58;
  const paddingX = 4;
  const paddingY = 6;

  const safeValues =
    values.length > 1
      ? values
      : values.length === 1
        ? [values[0], values[0]]
        : [0, 0];

  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const spread = Math.max(maxValue - minValue, 1);

  const points = safeValues.map((value, index) => {
    const x =
      paddingX +
      (index / Math.max(safeValues.length - 1, 1)) *
        (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((value - minValue) / spread) * (height - paddingY * 2);

    return { x, y };
  });

  const smoothPath = points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }

    const previous = points[index - 1];
    const previousPrevious = points[index - 2] ?? previous;
    const next = points[index + 1] ?? point;

    const control1X = previous.x + (point.x - previousPrevious.x) / 6;
    const control1Y = previous.y + (point.y - previousPrevious.y) / 6;
    const control2X = point.x - (next.x - previous.x) / 6;
    const control2Y = point.y - (next.y - previous.y) / 6;

    return `${path} C ${control1X.toFixed(2)} ${control1Y.toFixed(2)}, ${control2X.toFixed(2)} ${control2Y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath = `${smoothPath} L ${lastPoint.x.toFixed(2)} ${(height - paddingY).toFixed(2)} L ${firstPoint.x.toFixed(2)} ${(height - paddingY).toFixed(2)} Z`;

  const gradientId = `kpi-spark-${lineColor.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full overflow-visible"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={smoothPath}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Shortcut({
  label,
  description,
  icon,
  tone,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
  onClick: () => void;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:-translate-y-px hover:border-blue-200 hover:bg-slate-50/60 hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ring-1 ${tones[tone]}`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-slate-950">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[9px] text-slate-500">
          {description}
        </span>
      </span>

      <ChevronRight
        size={15}
        className="shrink-0 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-blue-600"
      />
    </button>
  );
}

function RecentOrderRow({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <span className="text-[11px] font-bold text-blue-600">
          #{order.order_id?.slice(-8) || "-"}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="truncate text-[11px] font-bold text-slate-900">
          {order.product_name || "-"}
        </p>
        <p className="mt-0.5 truncate text-[9px] text-slate-400">
          {order.item_label || "-"}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="truncate text-[10px] text-slate-600">
          {order.email || order.user_contact || "Guest"}
        </p>
      </td>

      <td className="px-5 py-4 text-right text-[11px] font-bold tabular-nums text-slate-900">
        {formatRupiah(order.price)}
      </td>

      <td className="px-5 py-4 text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${orderStatusClasses(
            order.status,
          )}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${orderStatusDotClasses(
              order.status,
            )}`}
          />
          {order.status || "Pending"}
        </span>
      </td>

      <td className="px-5 py-4 text-right text-[9px] text-slate-400">
        {formatOrderTime(order.created_at)}
      </td>

      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={onClick}
          className="text-[10px] font-bold text-blue-600 transition hover:text-blue-800 focus-visible:outline-none focus-visible:underline focus-visible:text-blue-800"
        >
          Lihat Detail
        </button>
      </td>
    </tr>
  );
}

function OrderAttentionRow({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="px-6 py-5">
        <span className="text-[12px] font-bold text-blue-600">
          #{order.order_id?.slice(-8) || "-"}
        </span>
      </td>

      <td className="px-6 py-5">
        <p className="truncate text-[12px] font-bold text-slate-900">
          {order.product_name || "-"}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {order.item_label || "-"}
        </p>
      </td>

      <td className="px-6 py-5">
        <p className="truncate text-[11px] text-slate-600">
          {order.email || order.user_contact || "Guest"}
        </p>
      </td>

      <td className="px-6 py-5 text-right text-[12px] font-bold tabular-nums text-slate-900">
        {formatRupiah(order.price)}
      </td>

      <td className="px-6 py-5 text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${orderStatusClasses(
            order.status,
          )}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${orderStatusDotClasses(
              order.status,
            )}`}
          />
          {order.status || "Pending"}
        </span>
      </td>

      <td className="px-6 py-5 text-right text-[10px] text-slate-400">
        {formatOrderTime(order.created_at)}
      </td>

      <td className="px-6 py-5 text-center">
        <button
          type="button"
          onClick={onClick}
          className="text-[11px] font-bold text-blue-600 transition hover:text-blue-800 focus-visible:outline-none focus-visible:underline focus-visible:text-blue-800"
        >
          Lihat Detail
        </button>
      </td>
    </tr>
  );
}

function RecentOrderMobileCard({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-slate-900">
            {order.product_name || "Produk tidak tersedia"}
          </p>
          <p className="mt-1 truncate text-[10px] text-slate-400">
            #{order.order_id?.slice(-8) || "-"} ·{" "}
            {order.email || order.user_contact || "Guest"}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${orderStatusClasses(
            order.status,
          )}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${orderStatusDotClasses(
              order.status,
            )}`}
          />
          {order.status || "Pending"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold tabular-nums text-slate-900">
            {formatRupiah(order.price)}
          </p>
          <p className="mt-1 text-[9px] text-slate-400">
            {formatOrderTime(order.created_at)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="rounded-[10px] bg-slate-950 px-4 py-2.5 text-[11px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1"
        >
          Lihat Detail
        </button>
      </div>
    </article>
  );
}

function OrderDetailModal({
  order,
  cooldown,
  isCheckingStatus,
  onClose,
  onCheckStatus,
  onUpdateStatus,
}: {
  order: Order;
  cooldown: number;
  isCheckingStatus: boolean;
  onClose: () => void;
  onCheckStatus: (orderId: string | null | undefined) => void;
  onUpdateStatus: (
    id: string,
    status: OrderStatus,
    email: string,
  ) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const hargaJual = Number(order.price || 0);
  const cashback = Number(order.cashback || 0);
  const referral = Number(order.referral_commission || 0);
  const voucher = Number(order.voucher_amount || order.voucher || 0);
  const koinPaid = Number(order.used_balance || 0);
  const transferPaid = Number(order.total_amount || 0);
  const modalVendor = Number(order.buy_price || 0);
  const profitBersih =
    transferPaid +
    koinPaid -
    modalVendor -
    cashback -
    referral;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-600">
              Detail Order
            </p>
            <h2 className="mt-1 break-all text-lg font-black tracking-[-0.025em] text-slate-950 sm:text-xl">
              #{order.order_id || "-"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Detail Order"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3.5 p-3.5 sm:space-y-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <DetailTile
              icon={<Package size={16} />}
              label="Produk"
              primary={order.product_name || "-"}
              secondary={order.item_label || "-"}
            />
            <DetailTile
              icon={<User size={16} />}
              label="Pelanggan"
              primary={order.email || "Guest"}
              secondary={order.user_contact || "-"}
            />
          </div>

          <div className="rounded-[18px] bg-slate-950 p-4 text-white sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
              <span className="text-sm text-slate-400">Harga jual</span>
              <span className="text-lg font-bold">
                {formatRupiah(hargaJual)}
              </span>
            </div>

            <div className="space-y-1.5 py-3 text-sm">
              <FinanceLine label="Modal vendor" value={modalVendor} />
              <FinanceLine label="Cashback member" value={cashback} />
              <FinanceLine label="Komisi referral" value={referral} />
              <FinanceLine label="Voucher" value={voucher} />
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Dibayar koin</span>
                <span>{formatRupiah(koinPaid)}</span>
              </div>
              <div className="mt-1.5 flex justify-between text-sm text-slate-400">
                <span>Dibayar transfer</span>
                <span>{formatRupiah(transferPaid)}</span>
              </div>
              <div className="mt-3 flex justify-between gap-3 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-emerald-300">
                <span className="font-semibold">Profit bersih</span>
                <span className="font-bold">
                  {formatRupiah(profitBersih)}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${orderStatusClasses(
              order.status,
            )}`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.08em]">
              Status Saat Ini
            </span>
            <span className="text-sm font-bold">{order.status || "Tidak diketahui"}</span>
          </div>

          {order.status === "Berhasil" || order.status === "Gagal" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Status Final
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                Tidak ada transisi lanjutan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {order.status === "Diproses" && (
                <ActionButton
                  label="Berhasil"
                  icon={<Check size={17} />}
                  tone="emerald"
                  onClick={() =>
                    onUpdateStatus(order.id, "Berhasil", order.email || "")
                  }
                />
              )}
              {(order.status === "Pending" || order.status === "Diproses") && (
                <ActionButton
                  label="Gagal"
                  icon={<AlertCircle size={17} />}
                  tone="rose"
                  onClick={() =>
                    onUpdateStatus(order.id, "Gagal", order.email || "")
                  }
                />
              )}
              {order.status === "Pending" && (
                <ActionButton
                  label="Diproses"
                  icon={<Send size={17} />}
                  tone="blue"
                  onClick={() =>
                    onUpdateStatus(order.id, "Diproses", order.email || "")
                  }
                />
              )}
            </div>
          )}

          {(order.status === "Diproses" || order.status === "Pending") && (
            <button
              type="button"
              onClick={() => onCheckStatus(order.order_id)}
              disabled={isCheckingStatus || cooldown > 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 sm:py-3"
            >
              {isCheckingStatus ? (
                <Loader2 className="animate-spin" size={17} />
              ) : cooldown > 0 ? (
                <Clock size={17} />
              ) : (
                <RotateCcw size={17} />
              )}

              {isCheckingStatus
                ? "Memeriksa supplier..."
                : cooldown > 0
                  ? `Coba lagi dalam ${cooldown} dtk`
                  : "Cek status supplier"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailTile({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-[13px] font-semibold leading-4 text-slate-900 sm:mt-3 sm:text-sm">
        {primary}
      </p>
      <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
        {secondary}
      </p>
    </div>
  );
}

function FinanceLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex justify-between text-slate-400">
      <span>{label}</span>
      <span className="text-rose-300">- {formatRupiah(value)}</span>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "rose";
  onClick: () => void;
}) {
  const tones = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    rose: "bg-rose-600 hover:bg-rose-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}
