"use client";


import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  LayoutDashboard,
  Loader2,
  Menu,
  Package,
  RefreshCw,
  RotateCcw,
  Send,
  User,
  Wallet,
  X,
} from "lucide-react";
import SidebarAdmin from "./SidebarAdmin";
import {
  type AdminTabId,
  ADMIN_PAGE_META,
  getAdminTabHref,
  resolveAdminTab,
} from "./config/navigation";
import AdminSkeleton from "./shared/AdminSkeleton";
import OverviewView from "./domains/overview/OverviewView";
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
import ProvidersView from "./providers/ProvidersView";

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

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeMenu = resolveAdminTab(rawTab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [kpiOrders, setKpiOrders] = useState<
    Pick<Order, "created_at" | "status" | "price">[] | null
  >(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [weeklyOrders, setWeeklyOrders] = useState<
    Pick<Order, "created_at" | "status" | "price">[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [pendingDepositCount, setPendingDepositCount] = useState(0);
  const [pendingWithdrawCount, setPendingWithdrawCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [financeModal, setFinanceModal] = useState<AdminFinanceModalMode | null>(null);
  const [financeModalPendingOnly, setFinanceModalPendingOnly] = useState(false);
  const [attentionOrderMode, setAttentionOrderMode] = useState<
    "pending" | "onProcess" | null
  >(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchOrdersIdRef = useRef(0);
  const fetchDepositsIdRef = useRef(0);
  const fetchWithdrawalsIdRef = useRef(0);

  const handleSetActiveMenu = (menu: string) => {
    const targetUrl = getAdminTabHref(menu as AdminTabId);
    router.push(targetUrl, { scroll: false });
  };

  const fetchOrders = async (isManual = false) => {
    const fetchId = ++fetchOrdersIdRef.current;
    try {
      // Compute 14-day chart window in browser local time — identical semantics
      // to the orderTrend calculation in OverviewView.tsx
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dow = today.getDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() + mondayOffset);
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(currentWeekStart.getDate() - 7);
      const chartWindowEnd = new Date(); // current moment

      const [
        ordersResult,
        kpiOrdersResult,
        recentOrdersResult,
        weeklyOrdersResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .in("status", ["Pending", "Diproses"])
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("created_at, status, price")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(
            "id, order_id, product_name, item_label, email, user_contact, price, buy_price, cashback, referral_commission, voucher_amount, used_balance, total_amount, payment_method, status, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("orders")
          .select("created_at, status, price")
          .gte("created_at", previousWeekStart.toISOString())
          .lte("created_at", chartWindowEnd.toISOString())
          .order("created_at", { ascending: true }),
      ]);

      if (fetchId !== fetchOrdersIdRef.current) return;

      if (
        ordersResult.error ||
        kpiOrdersResult.error ||
        recentOrdersResult.error ||
        weeklyOrdersResult.error
      ) {
        throw (
          ordersResult.error ||
          kpiOrdersResult.error ||
          recentOrdersResult.error ||
          weeklyOrdersResult.error
        );
      }

      setOrders((ordersResult.data || []) as Order[]);
      setKpiOrders(
        (kpiOrdersResult.data || []) as Pick<
          Order,
          "created_at" | "status" | "price"
        >[],
      );
      setRecentOrders((recentOrdersResult.data || []) as Order[]);
      setWeeklyOrders(
        (weeklyOrdersResult.data || []) as Pick<
          Order,
          "created_at" | "status" | "price"
        >[],
      );
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (isManual) throw error;
    }
  };

  const fetchDeposits = async (isManual = false) => {
    const fetchId = ++fetchDepositsIdRef.current;
    try {
      const { count, error } = await supabase
        .from("deposits")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending");

      if (fetchId !== fetchDepositsIdRef.current) return;
      if (error) throw error;

      setPendingDepositCount(count || 0);
    } catch (error) {
      console.error("Error fetching deposits:", error);
      if (isManual) throw error;
    }
  };

  const fetchWithdrawals = async (isManual = false) => {
    const fetchId = ++fetchWithdrawalsIdRef.current;
    try {
      const { count, error } = await supabase
        .from("withdrawals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending");

      if (fetchId !== fetchWithdrawalsIdRef.current) return;
      if (error) throw error;

      setPendingWithdrawCount(count || 0);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      if (isManual) throw error;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setDashboardError(null);

    try {
      await Promise.all([
        fetchOrders(true),
        fetchDeposits(true),
        fetchWithdrawals(true),
      ]);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Error Fetching Dashboard:", error);
      setDashboardError("Gagal memuat data Dashboard. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const [adminProfile, setAdminProfile] = useState<{
    name: string;
    role: string;
    avatarUrl?: string | null;
  }>({
    name: "Admin",
    role: "Admin",
    avatarUrl: null,
  });

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
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role?.toLowerCase();

      if (userRole !== "admin" && userRole !== "manager") {
        router.push("/user");
        return;
      }

      const rawRole = (profile?.role || "").trim().toLowerCase();
      const displayRole =
        rawRole === "manager"
          ? "Manager"
          : rawRole === "lead admin" || rawRole === "lead_admin" || rawRole === "leadadmin"
            ? "Lead Admin"
            : "Admin";

      const avatar =
        (user.user_metadata?.avatar_url as string | undefined) ||
        (user.user_metadata?.picture as string | undefined) ||
        null;

      const fullName =
        profile?.full_name?.trim() ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Admin";

      setAdminProfile({
        name: fullName,
        role: displayRole,
        avatarUrl: avatar,
      });
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
        () => fetchOrders(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits" },
        () => fetchDeposits(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        () => fetchWithdrawals(false),
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
    setRecentOrders((previous) =>
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert(
          "Sesi admin tidak valid atau telah berakhir. Silakan login kembali.",
        );
        return;
      }

      const response = await fetch("/api/digiflazz/check-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      const result = await response.json().catch(() => ({}));

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

  const currentMeta = ADMIN_PAGE_META[activeMenu] || {
    title: activeMenu,
    subtitle: "Workspace administrasi sistem DaPay.",
    icon: LayoutDashboard,
  };
  const TabIcon = currentMeta.icon;

  return (
    <div className="flex min-h-screen bg-[#f6f8fb] font-sans text-slate-600">
      <SidebarAdmin
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={handleSetActiveMenu}
      />

      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          isSidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-20"
        }`}
      >
        {/* ================================================================ */}
        {/* DYNAMIC WORKSPACE HEADER (SHELL-LEVEL IDENTITY)                  */}
        {/* ================================================================ */}
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl py-2.5">
            <div className="flex items-center justify-between gap-3">
              {/* LEFT: Mobile Toggle + Workspace Icon + Title/Subtitle */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {/* Mobile hamburger toggle */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Buka navigasi sidebar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 md:hidden"
                >
                  <Menu size={18} strokeWidth={2} />
                </button>

                {/* Workspace Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs sm:h-10 sm:w-10">
                  <TabIcon size={18} className="sm:h-5 sm:w-5" strokeWidth={2} />
                </div>

                {/* Title & Subtitle */}
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm font-black tracking-tight text-slate-900 sm:text-base md:text-lg leading-tight">
                    {currentMeta.title}
                  </h1>
                  <p className="truncate text-[11px] font-medium text-slate-400 sm:text-xs leading-tight mt-0.5">
                    {currentMeta.subtitle}
                  </p>
                </div>
              </div>

              {/* RIGHT: Notification + User Identity (Avatar, Name, Role) */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Notification Bell */}
                <Link
                  href="/admin?tab=event"
                  scroll={false}
                  title="Event & Notifikasi Operasional"
                  aria-label="Event & Notifikasi Operasional"
                  className="relative flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
                >
                  <Bell size={15} className="text-slate-600" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-blue-600 text-[8.5px] font-black text-white ring-2 ring-white shadow-2xs">
                    •
                  </span>
                </Link>

                {/* User Identity: Avatar + Name + Role */}
                <Link
                  href="/admin?tab=settings"
                  scroll={false}
                  title={`Profil: ${adminProfile.name} (${adminProfile.role})`}
                  aria-label={`Profil Admin: ${adminProfile.name}`}
                  className="group flex items-center gap-2 rounded-full border border-slate-200/80 bg-white py-1 pl-1 pr-2 sm:pr-3 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50/90 active:scale-95 min-w-0"
                >
                  {/* Avatar */}
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-slate-900 via-blue-950 to-indigo-950 text-white font-black text-[11px] sm:text-xs shadow-xs ring-1 ring-white">
                    {adminProfile.avatarUrl ? (
                      <img
                        src={adminProfile.avatarUrl}
                        alt={adminProfile.name}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      adminProfile.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Name & Role (hidden on mobile < 640px, visible sm+) */}
                  <div className="hidden sm:block text-left min-w-0 max-w-28 md:max-w-36 lg:max-w-44">
                    <p className="truncate text-xs font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                      {adminProfile.name}
                    </p>
                    <span
                      className={`inline-block mt-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider leading-tight ${
                        adminProfile.role === "Manager"
                          ? "bg-slate-100 text-slate-700"
                          : adminProfile.role === "Lead Admin"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {adminProfile.role}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </header>

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
              <OverviewView
                orders={orders}
                kpiOrders={kpiOrders}
                recentOrders={recentOrders}
                weeklyOrders={weeklyOrders}
                loading={loading}
                dashboardError={dashboardError}
                pendingDepositCount={pendingDepositCount}
                pendingWithdrawCount={pendingWithdrawCount}
                hasLoadedOnce={hasLoadedOnce}
                onRefresh={fetchData}
                onSelectOrder={(order) => setSelectedOrder(order)}
                onOpenFinanceModal={(mode, pendingOnly) => {
                  setFinanceModal(mode);
                  setFinanceModalPendingOnly(Boolean(pendingOnly));
                }}
                onOpenAttentionOrders={(mode) => setAttentionOrderMode(mode)}
              />
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
            {activeMenu === "Providers" && <ProvidersView />}
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
              : `${pendingCount.toLocaleString("id-ID")} pending Â· ${deposits.length.toLocaleString("id-ID")} total data`}
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
              : `${pendingCount.toLocaleString("id-ID")} pending Â· ${requests.length.toLocaleString("id-ID")} total data`}
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
                      <p className="mt-0.5 truncate text-[9px] text-slate-500">{request.account_number || "-"}{request.account_name ? ` Â· ${request.account_name}` : ""}</p>
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
                        <p className="mt-1 truncate text-[8px] text-slate-400">{request.account_number || "-"}{request.account_name ? ` Â· ${request.account_name}` : ""}</p>
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
            #{order.order_id?.slice(-8) || "-"} Â·{" "}
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

export default function AdminDashboard() {
  return (
    <Suspense fallback={<AdminSkeleton variant="dashboard" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
