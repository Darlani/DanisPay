"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  Search,
  TrendingUp,
  Package,
  Gem,
  Wallet,
  Landmark,
  Gift,
  Percent,
  Ticket,
  UserCircle,
  UserX,
  Loader2,
  ArrowRight,
  Star,
  Users,
  Calendar,
  RefreshCw,
  X,
  Database,
  ChevronDown,
  Medal,
} from "lucide-react";

// -----------------------------------------------------------------------------
// BRANDING
// -----------------------------------------------------------------------------

const DaPayText = () => (
  <span className="font-semibold tracking-tight">
    <span className="text-[#2563EB]">Da</span>
    <span className="text-[#F59E0B]">Pay</span>
  </span>
);

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type ExploreCategory =
  | "Produk"
  | "Paket"
  | "Item"
  | "Upgrade"
  | "Member_Special"
  | "Member_Regular"
  | "Belanja_Member"
  | "Belanja_Guest"
  | "Deposit"
  | "Cashout"
  | "Komisi"
  | "Admin_WD"
  | "Voucher";

type DateFilter = "Semua" | "Hari Ini" | "Bulan Ini" | "Tahun Ini";

type ExploreRow = Record<string, any>;

type Accent =
  | "blue"
  | "indigo"
  | "cyan"
  | "amber"
  | "emerald"
  | "violet"
  | "slate"
  | "rose"
  | "orange";

type ExploreCardProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
  accent: Accent;
  description?: string;
};

// -----------------------------------------------------------------------------
// CATEGORY METADATA
// -----------------------------------------------------------------------------

const categoryMeta: Record<
  ExploreCategory,
  {
    label: string;
    eyebrow: string;
    description: string;
    icon: ReactNode;
    accent: Accent;
  }
> = {
  Produk: {
    label: "Top Produk",
    eyebrow: "PRODUK",
    description: "Ringkasan performa produk secara agregat.",
    icon: <TrendingUp size={20} strokeWidth={1.9} />,
    accent: "blue",
  },
  Paket: {
    label: "Top Paket",
    eyebrow: "PAKET",
    description: "Performa berdasarkan nama produk / paket.",
    icon: <Package size={20} strokeWidth={1.9} />,
    accent: "indigo",
  },
  Item: {
    label: "Top Item",
    eyebrow: "ITEM",
    description: "Performa item atau nominal yang terjual.",
    icon: <Gem size={20} strokeWidth={1.9} />,
    accent: "cyan",
  },
  Member_Special: {
    label: "Member Special",
    eyebrow: "MEMBER",
    description: "Profil dan performa member special.",
    icon: <Star size={20} strokeWidth={1.9} />,
    accent: "amber",
  },
  Member_Regular: {
    label: "Member Regular",
    eyebrow: "MEMBER",
    description: "Profil dan performa member regular.",
    icon: <Users size={20} strokeWidth={1.9} />,
    accent: "emerald",
  },
  Belanja_Member: {
    label: "Belanja Member",
    eyebrow: "ORDER",
    description: "Riwayat transaksi pelanggan member.",
    icon: <UserCircle size={20} strokeWidth={1.9} />,
    accent: "violet",
  },
  Belanja_Guest: {
    label: "Belanja Guest",
    eyebrow: "ORDER",
    description: "Riwayat transaksi pelanggan non-member.",
    icon: <UserX size={20} strokeWidth={1.9} />,
    accent: "slate",
  },
  Deposit: {
    label: "Riwayat Depo",
    eyebrow: "WALLET",
    description: "Riwayat deposit member.",
    icon: <Wallet size={20} strokeWidth={1.9} />,
    accent: "emerald",
  },
  Cashout: {
    label: "Riwayat WD",
    eyebrow: "WALLET",
    description: "Riwayat withdrawal member.",
    icon: <Landmark size={20} strokeWidth={1.9} />,
    accent: "rose",
  },
  Upgrade: {
    label: "Upgrade",
    eyebrow: "MEMBER",
    description: "Aktivitas biaya upgrade member.",
    icon: <ArrowRight size={20} strokeWidth={1.9} />,
    accent: "violet",
  },
  Komisi: {
    label: "Komisi User",
    eyebrow: "FINANCE",
    description: "Komisi, cashback, dan referral.",
    icon: <Gift size={20} strokeWidth={1.9} />,
    accent: "orange",
  },
  Admin_WD: {
    label: "Fee WD",
    eyebrow: "FINANCE",
    description: "Riwayat fee administrasi withdrawal.",
    icon: <Percent size={20} strokeWidth={1.9} />,
    accent: "amber",
  },
  Voucher: {
    label: "Voucher",
    eyebrow: "PROMO",
    description: "Penggunaan dan distribusi voucher.",
    icon: <Ticket size={20} strokeWidth={1.9} />,
    accent: "rose",
  },
};

// -----------------------------------------------------------------------------
// ACCENT STYLES
// -----------------------------------------------------------------------------

const accentStyles: Record<
  Accent,
  {
    icon: string;
    soft: string;
    activeBorder: string;
    activeBg: string;
    text: string;
    dot: string;
  }
> = {
  blue: {
    icon: "text-blue-600",
    soft: "bg-blue-50",
    activeBorder: "border-blue-300",
    activeBg: "bg-blue-50/70",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  indigo: {
    icon: "text-indigo-600",
    soft: "bg-indigo-50",
    activeBorder: "border-indigo-300",
    activeBg: "bg-indigo-50/70",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  cyan: {
    icon: "text-cyan-600",
    soft: "bg-cyan-50",
    activeBorder: "border-cyan-300",
    activeBg: "bg-cyan-50/70",
    text: "text-cyan-700",
    dot: "bg-cyan-500",
  },
  amber: {
    icon: "text-amber-600",
    soft: "bg-amber-50",
    activeBorder: "border-amber-300",
    activeBg: "bg-amber-50/70",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  emerald: {
    icon: "text-emerald-600",
    soft: "bg-emerald-50",
    activeBorder: "border-emerald-300",
    activeBg: "bg-emerald-50/70",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  violet: {
    icon: "text-violet-600",
    soft: "bg-violet-50",
    activeBorder: "border-violet-300",
    activeBg: "bg-violet-50/70",
    text: "text-violet-700",
    dot: "bg-violet-500",
  },
  slate: {
    icon: "text-slate-600",
    soft: "bg-slate-100",
    activeBorder: "border-slate-300",
    activeBg: "bg-slate-50",
    text: "text-slate-700",
    dot: "bg-slate-500",
  },
  rose: {
    icon: "text-rose-600",
    soft: "bg-rose-50",
    activeBorder: "border-rose-300",
    activeBg: "bg-rose-50/70",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
  orange: {
    icon: "text-orange-600",
    soft: "bg-orange-50",
    activeBorder: "border-orange-300",
    activeBg: "bg-orange-50/70",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
};

// -----------------------------------------------------------------------------
// STATUS HELPERS
// -----------------------------------------------------------------------------

const isSuccessStatus = (status?: unknown) =>
  ["BERHASIL", "SUCCESS", "SELESAI", "PAID", "SETTLEMENT"].includes(
    String(status || "").toUpperCase(),
  );

const formatRupiah = (value: unknown) =>
  `Rp ${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;

const formatDateIndo = (dateStr?: string) => {
  if (!dateStr) return "-";

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (status?: string) => {
  const normalized = String(status || "").toUpperCase();

  if (
    ["BERHASIL", "SUCCESS", "PAID", "SETTLEMENT"].includes(normalized)
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "DIPROSES") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["GAGAL", "REJECTED", "FAILED"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

const normalizeStatusLabel = (status?: string) => {
  const normalized = String(status || "").trim().toUpperCase();

  if (
    ["SUCCESS", "PAID", "SETTLEMENT", "SELESAI"].includes(normalized)
  ) {
    return "BERHASIL";
  }

  if (normalized === "PENDING") return "PENDING";
  if (normalized === "DIPROSES") return "DIPROSES";
  if (normalized === "GAGAL" || normalized === "FAILED") return "GAGAL";
  if (normalized === "REJECTED") return "REJECTED";

  return "UNKNOWN";
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export default function ExploreView() {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<ExploreCategory>("Produk");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<ExploreRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("Semua");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);

  const handleCategoryChange = (nextCategory: ExploreCategory) => {
    setCategory(nextCategory);
    setShowAll(false);
    workspaceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ---------------------------------------------------------------------------
  // DATA FETCH
  // ---------------------------------------------------------------------------

  const fetchExploreData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setErrorMessage(null);
    setData([]);

    try {
      const startDate = new Date();

      let qExplore = supabase.from("explore_reports").select("*");
      let qOrders = supabase.from("orders").select("*");
      let qLogs = supabase.from("balance_logs").select("*");
      let qDeposits = supabase.from("deposits").select("*");
      let qWithdraw = supabase.from("withdrawals").select("*");
      const qProfiles = supabase
        .from("profiles")
        .select("*")
        .neq("role", "admin");

      if (dateFilter !== "Semua") {
        if (dateFilter === "Hari Ini") {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === "Bulan Ini") {
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === "Tahun Ini") {
          startDate.setMonth(0, 1);
          startDate.setHours(0, 0, 0, 0);
        }

        const isoDate = startDate.toISOString();

        qExplore = qExplore.gte("created_at", isoDate);
        qOrders = qOrders.gte("created_at", isoDate);
        qLogs = qLogs.gte("created_at", isoDate);
        qDeposits = qDeposits.gte("created_at", isoDate);
        qWithdraw = qWithdraw.gte("created_at", isoDate);
      }

      const [
        exploreRes,
        profilesRes,
        ordersRes,
        logsRes,
        depositsRes,
        withdrawRes,
      ] = await Promise.all([
        qExplore,
        qProfiles,
        qOrders,
        qLogs,
        qDeposits,
        qWithdraw,
      ]);

      const queryError = [
        exploreRes.error,
        profilesRes.error,
        ordersRes.error,
        logsRes.error,
        depositsRes.error,
        withdrawRes.error,
      ].find(Boolean);

      if (queryError) {
        throw queryError;
      }

      const rawExplore = exploreRes.data || [];
      const rawProfiles = profilesRes.data || [];
      const rawOrders = ordersRes.data || [];
      const rawLogs = logsRes.data || [];

      if (["Produk", "Paket", "Item"].includes(category)) {
        const grouped = rawExplore.reduce(
          (acc: Record<string, ExploreRow>, curr: ExploreRow) => {
            const statusOk = isSuccessStatus(curr.status);

            if (!statusOk) return acc;

            const key =
              category === "Produk"
                ? curr.category || "LAINNYA"
                : category === "Paket"
                  ? curr.product_name || "UNKNOWN"
                  : `${curr.item_label} - ${curr.product_name}`;

            const desc =
              category === "Item"
                ? curr.item_label || "ITEM"
                : key;

            const subDesc =
              category === "Produk"
                ? "GENERAL"
                : category === "Paket"
                  ? curr.category || "PRODUCT"
                  : curr.product_name || "PACKAGE";

            acc[key] = acc[key] || {
              name: desc,
              item_desc: desc,
              package_name: subDesc,
              count: 0,
              total_jual: 0,
              total_hpp: 0,
              total_profit: 0,
            };

            acc[key].count += 1;
            acc[key].total_jual +=
              (curr.jual_final || 0) + (curr.used_balance || 0);
            acc[key].total_hpp += curr.hpp || 0;
            acc[key].total_profit += curr.profit_rp || 0;

            return acc;
          },
          {},
        );

        setData(
          (Object.values(grouped) as ExploreRow[]).sort(
            (a, b) =>
              Number(b.count || 0) - Number(a.count || 0),
          ),
        );
      } else if (
        category === "Member_Special" ||
        category === "Member_Regular"
      ) {
        const isSpecial = category === "Member_Special";

        const filtered = rawProfiles.filter((profile) => {
          const type = profile.member_type?.toLowerCase();

          return isSpecial
            ? type === "special"
            : type === "regular" || !type;
        });

        const mapped = filtered.map((profile) => {
          const trxCount = rawExplore.filter(
            (exp: ExploreRow) =>
              exp.email?.toLowerCase() ===
                profile.email?.toLowerCase() &&
              [
                "BERHASIL",
                "SUCCESS",
                "PAID",
                "SETTLEMENT",
              ].includes(String(exp.status || "").toUpperCase()),
          ).length;

          return {
            email: profile.email,
            name: profile.full_name,
            type: profile.member_type || "Regular",
            metric_val: profile.balance,
            created_at: profile.created_at,
            trx_count: trxCount,
          };
        });

        setData(
          mapped.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
      } else if (category === "Belanja_Member") {
        const memberOrders = rawOrders.filter(
          (order: ExploreRow) =>
            order.email && order.email !== "null",
        );

        setData(
          memberOrders
            .map((order: ExploreRow) => ({
              package_name: order.email,
              item_desc: `${order.item_label} ${order.product_name}`,
              jual: order.total_amount || order.price,
              created_at: order.created_at,
              status: order.status,
            }))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
        );
      } else if (category === "Belanja_Guest") {
        const guestOrders = rawOrders.filter(
          (order: ExploreRow) =>
            !order.email || order.email === "null",
        );

        setData(
          guestOrders
            .map((order: ExploreRow) => ({
              package_name: "NON-MEMBER (GUEST)",
              item_desc: `${order.item_label} ${order.product_name}`,
              jual: order.total_amount || order.price,
              created_at: order.created_at,
              status: order.status,
            }))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
        );
      } else if (category === "Voucher") {
        const voucherOrders = rawOrders.filter(
          (order: ExploreRow) => (order.voucher_amount || 0) > 0,
        );

        const grouped = voucherOrders.reduce(
          (acc: Record<string, ExploreRow>, curr: ExploreRow) => {
            const key = curr.voucher_code || "PROMO";

            if (!acc[key]) {
              acc[key] = {
                name: key,
                count: 0,
                total_jual: 0,
                created_at: curr.created_at,
                status: "BERHASIL",
              };
            }

            acc[key].count += 1;
            acc[key].total_jual += curr.voucher_amount || 0;

            if (
              new Date(curr.created_at) >
              new Date(acc[key].created_at)
            ) {
              acc[key].created_at = curr.created_at;
            }

            return acc;
          },
          {},
        );

        setData(
          (Object.values(grouped) as ExploreRow[]).sort(
            (a, b) =>
              Number(b.count || 0) - Number(a.count || 0),
          ),
        );
      } else if (category === "Upgrade") {
        const upgradeData = rawLogs.filter(
          (log: ExploreRow) => (log.upgrade_fee || 0) > 0,
        );

        setData(
          upgradeData
            .map((upgrade: ExploreRow) => ({
              package_name: upgrade.description,
              item_desc: "UPGRADE LEVEL",
              jual: upgrade.upgrade_fee,
              created_at: upgrade.created_at,
              status: "BERHASIL",
            }))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
        );
      } else if (category === "Komisi") {
        const komisiData = rawLogs.filter(
          (log: ExploreRow) =>
            ["Commission", "Cashback", "Referral"].includes(log.type),
        );

        setData(
          komisiData
            .map((log: ExploreRow) => ({
              package_name: log.user_email,
              item_desc: log.description,
              jual: Math.abs(log.amount),
              created_at: log.created_at,
              status: "BERHASIL",
            }))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
        );
      } else if (category === "Admin_WD") {
        const feeWDData = (withdrawRes.data || []).filter(
          (withdrawal: ExploreRow) =>
            (withdrawal.admin_fee || 0) > 0,
        );

        setData(
          feeWDData
            .map((withdrawal: ExploreRow) => ({
              package_name: withdrawal.email,
              item_desc: "FEE ADMIN WD",
              jual: withdrawal.admin_fee,
              created_at: withdrawal.created_at,
              status: withdrawal.status,
            }))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
        );
      } else if (category === "Deposit") {
        setData(
          (depositsRes.data || [])
            .map((deposit: ExploreRow) => ({
              package_name: deposit.user_email,
              item_desc: `DEPO: ${deposit.payment_name}`,
              jual: deposit.amount,
              created_at: deposit.created_at,
              status: deposit.status,
            }))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
        );
      } else if (category === "Cashout") {
        setData(
          (withdrawRes.data || [])
            .map((withdrawal: ExploreRow) => ({
              package_name: withdrawal.email,
              item_desc: `WD: ${withdrawal.bank_name}`,
              jual: withdrawal.amount,
              created_at: withdrawal.created_at,
              status: withdrawal.status,
            }))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
        );
      }
    } catch (error) {
      console.error("Gagal load data:", error);
      setErrorMessage(
        "Data Explore gagal dimuat. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, dateFilter]);

  useEffect(() => {
    void fetchExploreData();
    setShowAll(false);
  }, [fetchExploreData]);

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return data;

    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [data, searchQuery]);

  const displayData = showAll
    ? filteredData
    : filteredData.slice(0, 10);

  const selectedMeta = categoryMeta[category];

  const workspaceTitle = useMemo(() => {
    switch (category) {
      case "Produk":
        return "Produk";
      case "Paket":
        return "Paket Item";
      case "Item":
        return "Item";
      case "Member_Special":
        return "Member Special";
      case "Member_Regular":
        return "Member Regular";
      case "Belanja_Member":
        return "Belanja Member";
      case "Belanja_Guest":
        return "Belanja Guest";
      case "Deposit":
        return "Riwayat Deposit";
      case "Cashout":
        return "Riwayat Withdraw";
      case "Upgrade":
        return "Upgrade";
      case "Komisi":
        return "Komisi User";
      case "Admin_WD":
        return "Fee WD";
      case "Voucher":
        return "Voucher";
      default:
        return selectedMeta.label;
    }
  }, [category, selectedMeta.label]);

  // ---------------------------------------------------------------------------
  // TABLE RENDERING
  // ---------------------------------------------------------------------------

  const renderStatusBadge = (status?: string) => {
    const normalized = normalizeStatusLabel(status);

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-tight ${statusClass(
          status,
        )}`}
      >
        {normalized}
      </span>
    );
  };

  const renderTableContent = () => {
    if (["Produk", "Paket", "Item"].includes(category)) {
      return (
        <>
          <thead className="bg-slate-950">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              <th className="w-20 px-5 py-4 text-center">Rank</th>
              <th className="px-5 py-4 text-left">Deskripsi</th>
              <th className="px-5 py-4 text-left">Kategori</th>
              <th className="px-5 py-4 text-center">Qty Sold</th>
              <th className="px-5 py-4 text-right">Modal</th>
              <th className="px-5 py-4 text-right">Harga Jual</th>
              <th className="bg-emerald-950/80 px-5 py-4 text-right">
                Contribution
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {displayData.map((item, index) => (
              <tr
                key={`${item.item_desc}-${index}`}
                className="group transition hover:bg-slate-50/80"
              >
                <td className="px-5 py-4 text-center">
                  {index < 3 && !showAll ? (
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <Medal size={16} />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-slate-600">
                      #{index + 1}
                    </span>
                  )}
                </td>

                <td className="px-5 py-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {item.item_desc}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span className="text-sm text-slate-500">
                    {item.package_name}
                  </span>
                </td>

                <td className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
                  {item.count}x
                </td>

                <td className="px-5 py-4 text-right text-sm text-slate-500">
                  {formatRupiah(item.total_hpp)}
                </td>

                <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                  {formatRupiah(item.total_jual)}
                </td>

                <td className="bg-emerald-50/40 px-5 py-4 text-right text-sm font-semibold text-emerald-700">
                  {formatRupiah(item.total_profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </>
      );
    }

    if (
      ["Member_Special", "Member_Regular"].includes(category)
    ) {
      return (
        <>
          <thead className="bg-slate-950">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              <th className="w-20 px-5 py-4 text-center">Rank</th>
              <th className="px-5 py-4 text-left">Profil Member</th>
              <th className="px-5 py-4 text-center">Join Date</th>
              <th className="px-5 py-4 text-center">Qty Trx</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="bg-emerald-950/80 px-5 py-4 text-right">
                Balance
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {displayData.map((item, index) => (
              <tr
                key={`${item.email}-${index}`}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-5 py-4 text-center text-sm font-semibold text-slate-600">
                  #{index + 1}
                </td>

                <td className="px-5 py-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {item.name || "-"}
                  </div>

                  <div className="mt-0.5 text-xs text-slate-400">
                    {item.email || "-"}
                  </div>
                </td>

                <td className="px-5 py-4 text-center text-sm text-slate-500">
                  {formatDateIndo(item.created_at)}
                </td>

                <td className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
                  {item.trx_count}x
                </td>

                <td className="px-5 py-4 text-center">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                      String(item.type || "").toLowerCase() ===
                      "special"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {item.type}
                  </span>
                </td>

                <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-700">
                  {formatRupiah(item.metric_val)}
                </td>
              </tr>
            ))}
          </tbody>
        </>
      );
    }

    if (category === "Voucher") {
      return (
        <>
          <thead className="bg-slate-950">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              <th className="w-20 px-5 py-4 text-center">Rank</th>
              <th className="px-5 py-4 text-left">Kode Voucher</th>
              <th className="px-5 py-4 text-center">Qty</th>
              <th className="px-5 py-4 text-center">
                Terakhir Digunakan
              </th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="bg-slate-900 px-5 py-4 text-right">
                Total Potongan
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {displayData.map((item, index) => (
              <tr
                key={`${item.name}-${index}`}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-5 py-4 text-center text-sm font-semibold text-slate-600">
                  #{index + 1}
                </td>

                <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                  {item.name}
                </td>

                <td className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
                  {item.count}x
                </td>

                <td className="px-5 py-4 text-center text-sm text-slate-500">
                  {formatDateIndo(item.created_at)}
                </td>

                <td className="px-5 py-4 text-center">
                  {renderStatusBadge(item.status)}
                </td>

                <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                  {formatRupiah(item.total_jual)}
                </td>
              </tr>
            ))}
          </tbody>
        </>
      );
    }

    return (
      <>
        <thead className="bg-slate-950">
          <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            <th className="w-20 px-5 py-4 text-center">No</th>
            <th className="px-5 py-4 text-left">User / Member</th>
            <th className="px-5 py-4 text-left">Keterangan</th>
            <th className="px-5 py-4 text-center">Tanggal</th>
            <th className="px-5 py-4 text-center">Status</th>
            <th className="bg-slate-900 px-5 py-4 text-right">
              Nominal
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {displayData.map((item, index) => (
            <tr
              key={`${item.package_name}-${item.created_at}-${index}`}
              className="transition hover:bg-slate-50/80"
            >
              <td className="px-5 py-4 text-center text-sm font-semibold text-slate-600">
                #{index + 1}
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                {item.package_name || "SYSTEM"}
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {item.item_desc}
              </td>

              <td className="px-5 py-4 text-center text-sm text-slate-500">
                {formatDateIndo(item.created_at)}
              </td>

              <td className="px-5 py-4 text-center">
                {renderStatusBadge(item.status)}
              </td>

              <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                {formatRupiah(item.jual)}
              </td>
            </tr>
          ))}
        </tbody>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------------------

  return (
    <div className="space-y-7 pb-16 text-slate-900">
      {/* ------------------------------------------------------------------- */}
      {/* PAGE HEADER                                                        */}
      {/* ------------------------------------------------------------------- */}

      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6 lg:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <Database size={22} strokeWidth={2} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[30px]">
                  Explore Database
                </h1>

                <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-700">
                  Audit 360°
                </span>
              </div>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Jelajahi dan analisis data operasional DaPay dari berbagai
                sumber dalam satu workspace.
              </p>

              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <DaPayText /> System Explorer
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* CATEGORY NAVIGATION                                                */}
      {/* ------------------------------------------------------------------- */}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
              Explore Navigator
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-[-0.025em] text-slate-950">
              Pilih data yang ingin dijelajahi
            </h2>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-slate-400">
              13 dataset
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          <ExploreCard
            active={category === "Produk"}
            onClick={() => handleCategoryChange("Produk")}
            label="Top Produk"
            icon={<TrendingUp size={20} strokeWidth={1.9} />}
            accent="blue"
            description="PRODUK"
          />

          <ExploreCard
            active={category === "Paket"}
            onClick={() => handleCategoryChange("Paket")}
            label="Top Paket"
            icon={<Package size={20} strokeWidth={1.9} />}
            accent="indigo"
            description="PAKET"
          />

          <ExploreCard
            active={category === "Item"}
            onClick={() => handleCategoryChange("Item")}
            label="Top Item"
            icon={<Gem size={20} strokeWidth={1.9} />}
            accent="cyan"
            description="ITEM"
          />

          <ExploreCard
            active={category === "Member_Special"}
            onClick={() => handleCategoryChange("Member_Special")}
            label="Member Special"
            icon={<Star size={20} strokeWidth={1.9} />}
            accent="amber"
            description="MEMBER"
          />

          <ExploreCard
            active={category === "Member_Regular"}
            onClick={() => handleCategoryChange("Member_Regular")}
            label="Member Regular"
            icon={<Users size={20} strokeWidth={1.9} />}
            accent="emerald"
            description="MEMBER"
          />

          <ExploreCard
            active={category === "Belanja_Member"}
            onClick={() => handleCategoryChange("Belanja_Member")}
            label="Belanja Member"
            icon={<UserCircle size={20} strokeWidth={1.9} />}
            accent="violet"
            description="ORDER"
          />

          <ExploreCard
            active={category === "Belanja_Guest"}
            onClick={() => handleCategoryChange("Belanja_Guest")}
            label="Belanja Guest"
            icon={<UserX size={20} strokeWidth={1.9} />}
            accent="slate"
            description="ORDER"
          />

          <ExploreCard
            active={category === "Deposit"}
            onClick={() => handleCategoryChange("Deposit")}
            label="Riwayat Depo"
            icon={<Wallet size={20} strokeWidth={1.9} />}
            accent="emerald"
            description="WALLET"
          />

          <ExploreCard
            active={category === "Cashout"}
            onClick={() => handleCategoryChange("Cashout")}
            label="Riwayat WD"
            icon={<Landmark size={20} strokeWidth={1.9} />}
            accent="rose"
            description="WALLET"
          />

          <ExploreCard
            active={category === "Upgrade"}
            onClick={() => handleCategoryChange("Upgrade")}
            label="Upgrade"
            icon={<ArrowRight size={20} strokeWidth={1.9} />}
            accent="violet"
            description="MEMBER"
          />

          <ExploreCard
            active={category === "Komisi"}
            onClick={() => handleCategoryChange("Komisi")}
            label="Komisi User"
            icon={<Gift size={20} strokeWidth={1.9} />}
            accent="orange"
            description="FINANCE"
          />

          <ExploreCard
            active={category === "Admin_WD"}
            onClick={() => handleCategoryChange("Admin_WD")}
            label="Fee WD"
            icon={<Percent size={20} strokeWidth={1.9} />}
            accent="amber"
            description="FINANCE"
          />

          {/* Voucher di kiri */}
            <ExploreCard
              active={category === "Voucher"}
              onClick={() => handleCategoryChange("Voucher")}
              label="Voucher"
              icon={<Ticket size={20} strokeWidth={1.9} />}
              accent="rose"
              description="PROMO"
            />
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* DATA WORKSPACE                                                     */}
      {/* ------------------------------------------------------------------- */}

      <section
        ref={workspaceRef}
        className="scroll-mt-24 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
      >
        {/* Workspace header */}
        <div className="border-b border-slate-200 px-4 py-5 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.025em] text-slate-950">
                {workspaceTitle}
              </h2>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                {selectedMeta.description}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {searchQuery.trim() ? "Matching records" : "Total records"}
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {filteredData.length.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative shrink-0 lg:w-55">
              <Calendar
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={dateFilter}
                onChange={(event) =>
                  setDateFilter(event.target.value as DateFilter)
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Semua">Semua Waktu</option>
                <option value="Hari Ini">Hari Ini</option>
                <option value="Bulan Ini">Bulan Ini</option>
                <option value="Tahun Ini">Tahun Ini</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Cari data berdasarkan isi tabel..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              {searchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => void fetchExploreData()}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-400">
            {searchQuery.trim() ? (
              <span>
                Menampilkan{" "}
                <strong className="font-semibold text-slate-600">
                  {displayData.length}
                </strong>{" "}
                hasil untuk{" "}
                <strong className="font-semibold text-slate-600">
                  &quot;{searchQuery}&quot;
                </strong>
              </span>
            ) : (
              <span>
                {showAll
                  ? "Menampilkan seluruh data"
                  : "Menampilkan 10 data pertama"}
              </span>
            )}
          </div>
        </div>

        {/* Data */}
        <div className="min-h-90">
          {loading ? (
            <div
              className="flex min-h-90 flex-col items-center justify-center gap-4 px-6 text-center"
              aria-busy="true"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                <Loader2
                  className="animate-spin text-blue-600"
                  size={22}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Sinkronisasi data
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Sedang mengambil dataset{" "}
                  {selectedMeta.eyebrow.toLowerCase()}.
                </p>
              </div>
            </div>
          ) : errorMessage ? (
            <div
              className="flex min-h-90 flex-col items-center justify-center gap-4 px-6 text-center"
              role="alert"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <RefreshCw size={20} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Gagal memuat data
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {errorMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void fetchExploreData()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              >
                <RefreshCw size={14} />
                Coba Lagi
              </button>
            </div>
          ) : displayData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-215 w-full border-collapse text-left">
                {renderTableContent()}
              </table>
            </div>
          ) : (
            <div className="flex min-h-90 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                <Search size={20} />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                {searchQuery
                  ? "Data tidak ditemukan"
                  : "Belum ada data tersedia"}
              </p>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                {searchQuery
                  ? "Coba gunakan kata kunci lain atau bersihkan pencarian untuk melihat seluruh data."
                  : `Belum ada data untuk dataset ${selectedMeta.eyebrow.toLowerCase()} pada periode ${dateFilter.toLowerCase()}.`}
              </p>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                >
                  Bersihkan Pencarian
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && filteredData.length > 10 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
            <p className="text-xs text-slate-400">
              {showAll
                ? "Menampilkan seluruh data"
                : "Menampilkan 10 data pertama"}
            </p>

            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            >
              {showAll
                ? "Sembunyikan Data"
                : `Lihat Semua Data (${filteredData.length})`}
              <ArrowRight
                size={15}
                className={
                  showAll
                    ? "rotate-180 transition"
                    : "transition"
                }
              />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EXPLORE CARD
// -----------------------------------------------------------------------------

function ExploreCard({
  active,
  onClick,
  label,
  icon,
  accent,
  description,
}: ExploreCardProps) {
  const style = accentStyles[accent];

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`
        group
        relative
        flex
        h-24
        w-full
        items-center
        gap-3
        rounded-2xl
        border
        bg-white
        px-4
        text-left
        transition-all
        duration-200
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-200
        ${
          active
            ? `${style.activeBg} ${style.activeBorder} shadow-[0_6px_18px_rgba(15,23,42,0.06)]`
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
        }
      `}
    >
      <span
        aria-hidden="true"
        className={`
          absolute
          left-0
          top-1/2
          h-10
          w-1
          -translate-y-1/2
          rounded-r-full
          transition-all
          ${active ? style.dot : "bg-transparent"}
        `}
      />

      <span
        className={`
          flex
          h-12
          w-12
          shrink-0
          items-center
          justify-center
          rounded-[14px]
          border
          bg-white
          shadow-[0_2px_8px_rgba(15,23,42,0.04)]
          transition-all
          ${
            active
              ? style.activeBorder
              : "border-slate-100"
          }
          ${style.icon}
        `}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`
            block
            line-clamp-2
            whitespace-normal
            leading-5
            text-[14px]
            font-semibold
            tracking-[-0.015em]
            ${
              active
                ? style.text
                : "text-slate-900"
            }
          `}
        >
          {label}
        </span>

        <span className="mt-1 block text-[11px] font-medium text-slate-400">
          {description}
        </span>
      </span>
    </button>
  );
}
