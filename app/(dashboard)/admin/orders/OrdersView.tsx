"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  CalendarDays,
  ChevronRight,
  Filter,
  Clock3,
  Copy,
  Loader2,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";

type OrderStatus = "Pending" | "Diproses" | "Berhasil" | "Gagal";
type StatusFilter = "Semua" | OrderStatus;
type DateFilter = "Semua" | "Hari Ini" | "7 Hari" | "30 Hari";

type OrderRow = {
  id: string;
  order_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  email?: string | null;
  product_name?: string | null;
  item_label?: string | null;
  total_amount?: number | null;
  price?: number | null;
  buy_price?: number | null;
  payment_method?: string | null;
  user_contact?: string | null;
  customer_name?: string | null;
  customer_no?: string | null;
  category?: string | null;
  cashback?: number | null;
  referral_commission?: number | null;
  voucher_amount?: number | null;
  discount?: number | null;
  unique_code?: number | null;
  notes?: string | null;
};

const STATUSES: readonly OrderStatus[] = [
  "Pending",
  "Diproses",
  "Berhasil",
  "Gagal",
];

const isStatus = (
  value: string | null | undefined,
): value is OrderStatus => STATUSES.includes(value as OrderStatus);

const fullOrderIdOf = (order: OrderRow) =>
  order.order_id || order.id;

const shortOrderIdOf = (order: OrderRow) => {
  const fullId = fullOrderIdOf(order);
  const match = fullId.match(/^(.*?-)([A-Za-z0-9]+)$/);

  if (match) {
    return `${match[1]}${match[2].slice(-5)}`;
  }

  return fullId.slice(-5);
};

const amountOf = (order: OrderRow) =>
  Number(order.price ?? order.total_amount ?? 0);

const reservationAmountOf = (order: OrderRow) => {
  if (
    order.unique_code !== null &&
    order.unique_code !== undefined
  ) {
    return Number(order.unique_code);
  }

  const total = Number(order.total_amount ?? 0);
  const price = Number(order.price ?? 0);

  return total > price ? total - price : 0;
};

const customerPaidOf = (order: OrderRow) =>
  Number(order.total_amount ?? amountOf(order));

const grossMarginOf = (order: OrderRow) =>
  Number(order.price ?? 0) -
  Number(order.buy_price ?? 0) -
  Number(order.cashback ?? 0) -
  Number(order.referral_commission ?? 0) -
  Number(order.voucher_amount ?? 0) -
  Number(order.discount ?? 0) +
  reservationAmountOf(order);

const rupiah = (value: number | null | undefined) =>
  `Rp ${(Number(value) || 0).toLocaleString("id-ID")}`;

const dateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const statusClass = (status?: string | null) =>
  status === "Pending"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : status === "Diproses"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : status === "Berhasil"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : status === "Gagal"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-100 text-slate-600";

const transitions = (status?: string | null): OrderStatus[] =>
  status === "Pending"
    ? ["Diproses", "Gagal"]
    : status === "Diproses"
      ? ["Berhasil", "Gagal"]
      : [];

export default function OrdersView() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Semua");
  const [date, setDate] = useState<DateFilter>("Semua");
  const [category, setCategory] = useState("Semua");
  const [payment, setPayment] = useState("Semua");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [updating, setUpdating] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async (initial = false) => {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/orders/manage", {
        cache: "no-store",
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
      });

      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof body === "object" &&
            body !== null &&
            "error" in body
            ? String(body.error)
            : "Gagal memuat order.",
        );
      }

      setOrders(
        Array.isArray(body) ? (body as OrderRow[]) : [],
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Gagal memuat order.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders(true);

    const channel = supabase
      .channel("orders-admin-view")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => void fetchOrders(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .map((order) => order.category)
            .filter(
              (value): value is string =>
                Boolean(value),
            ),
        ),
      ).sort(),
    [orders],
  );

  const payments = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .map((order) => order.payment_method)
            .filter(
              (value): value is string =>
                Boolean(value),
            ),
        ),
      ).sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = Date.now();

    return orders.filter((order) => {
      const haystack = [
        order.order_id,
        order.email,
        order.customer_name,
        order.customer_no,
        order.user_contact,
        order.product_name,
        order.item_label,
        order.category,
        order.payment_method,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const created = new Date(
        order.created_at || "",
      ).getTime();

      const dateOk =
        date === "Semua" ||
        (Number.isFinite(created) &&
          (date === "Hari Ini"
            ? new Date(created).toDateString() ===
              new Date().toDateString()
            : date === "7 Hari"
              ? created >= now - 7 * 86400000
              : created >= now - 30 * 86400000));

      return (
        (!normalizedQuery ||
          haystack.includes(normalizedQuery)) &&
        (status === "Semua" ||
          order.status === status) &&
        dateOk &&
        (category === "Semua" ||
          order.category === category) &&
        (payment === "Semua" ||
          order.payment_method === payment)
      );
    });
  }, [
    orders,
    query,
    status,
    date,
    category,
    payment,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    status,
    date,
    category,
    payment,
    perPage,
  ]);

  const kpi = useMemo(() => {
    const calculate = (target?: OrderStatus) => {
      const rows = target
        ? filtered.filter(
            (order) => order.status === target,
          )
        : filtered;

      return {
        count: rows.length,
        omzet: rows.reduce(
          (sum, order) => sum + amountOf(order),
          0,
        ),
        grossMargin: rows.reduce(
          (sum, order) => sum + grossMarginOf(order),
          0,
        ),
      };
    };

    return {
      total: calculate(),
      pending: calculate("Pending"),
      diproses: calculate("Diproses"),
      berhasil: calculate("Berhasil"),
      gagal: calculate("Gagal"),
    };
  }, [filtered]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / perPage),
  );

  const visible = filtered.slice(
    (page - 1) * perPage,
    page * perPage,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateStatus = async (
    order: OrderRow,
    next: OrderStatus,
  ) => {
    if (
      !order.email ||
      !transitions(order.status).includes(next)
    ) {
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        "/api/orders/manage",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? {
                  Authorization: `Bearer ${session.access_token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            id: order.id,
            status: next,
            email: order.email,
          }),
        },
      );

      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof body === "object" &&
            body !== null &&
            "error" in body
            ? String(body.error)
            : "Perubahan status ditolak.",
        );
      }

      setSelected(null);
      await fetchOrders();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Gagal memperbarui status.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const copyOrderId = async (order: OrderRow) => {
    const fullId = fullOrderIdOf(order);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullId);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = fullId;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedOrderId(order.id);
      window.setTimeout(() => {
        setCopiedOrderId((current) =>
          current === order.id ? null : current,
        );
      }, 1400);
    } catch {
      setError("Order ID tidak dapat disalin.");
    }
  };

  const reset = () => {
    setQuery("");
    setStatus("Semua");
    setDate("Semua");
    setCategory("Semua");
    setPayment("Semua");
  };

  const activeFilters =
    Boolean(query) ||
    status !== "Semua" ||
    date !== "Semua" ||
    category !== "Semua" ||
    payment !== "Semua";

  return (
    <div className="space-y-6 pb-16 text-slate-900">
      {/* HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShoppingBag size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Operations
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Orders
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Kelola pesanan dan pantau status order dalam
                satu workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchOrders()}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>
      </section>

      {/* KPI */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Total Orders"
          count={kpi.total.count}
          omzet={kpi.total.omzet}
          grossMargin={kpi.total.grossMargin}
          tone="blue"
          icon={<ShoppingBag size={18} />}
        />

        <Kpi
          label="Pending"
          count={kpi.pending.count}
          omzet={kpi.pending.omzet}
          grossMargin={kpi.pending.grossMargin}
          tone="amber"
          icon={<Clock3 size={18} />}
        />

        <Kpi
          label="Diproses"
          count={kpi.diproses.count}
          omzet={kpi.diproses.omzet}
          grossMargin={kpi.diproses.grossMargin}
          tone="blue"
          icon={<Send size={18} />}
        />

        <Kpi
          label="Berhasil"
          count={kpi.berhasil.count}
          omzet={kpi.berhasil.omzet}
          grossMargin={kpi.berhasil.grossMargin}
          tone="emerald"
          icon={<Check size={18} />}
        />

        <Kpi
          label="Gagal"
          count={kpi.gagal.count}
          omzet={kpi.gagal.omzet}
          grossMargin={kpi.gagal.grossMargin}
          tone="rose"
          icon={<XCircle size={18} />}
        />
      </section>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 text-rose-600"
            />

            <div>
              <p className="text-sm font-semibold text-rose-800">
                Operasi order gagal
              </p>

              <p className="mt-0.5 text-xs text-rose-700">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* WORKSPACE */}
      {/* FILTER CONTAINER */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
        <div className="px-4 py-4 sm:px-5 lg:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.7fr)_180px_180px_190px_190px_auto]">
            <FilterField label="Search">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  aria-label="Cari order"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari order ID, user, produk, tujuan..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </FilterField>

            <FilterField label="Status">
              <OutlineSelect
                value={status}
                normalizedValue={status === "Semua" ? "Semua Status" : status}
                label="Status"
                onChange={(value) =>
                  setStatus(value as StatusFilter)
                }
                options={["Semua Status", ...STATUSES]}
              />
            </FilterField>

            <FilterField label="Tanggal">
              <OutlineSelect
                value={date}
                normalizedValue={date === "Semua" ? "Semua Periode" : date}
                label="Tanggal"
                onChange={(value) => {
                  const next =
                    value === "Semua Periode" ? "Semua" : value;
                  setDate(next as DateFilter);
                }}
                options={[
                  "Semua Periode",
                  "Hari Ini",
                  "7 Hari",
                  "30 Hari",
                ]}
                icon={<CalendarDays size={15} />}
              />
            </FilterField>

            <FilterField label="Kategori">
              <OutlineSelect
                value={category}
                normalizedValue={category === "Semua" ? "Semua Kategori" : category}
                label="Kategori"
                onChange={setCategory}
                options={["Semua Kategori", ...categories]}
              />
            </FilterField>

            <FilterField label="Metode Pembayaran">
              <OutlineSelect
                value={payment}
                normalizedValue={payment === "Semua" ? "Semua Metode" : payment}
                label="Metode Pembayaran"
                onChange={setPayment}
                options={["Semua Metode", ...payments]}
              />
            </FilterField>

            <button
              type="button"
              onClick={reset}
              disabled={!activeFilters}
              className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-default disabled:opacity-40"
            >
              <Filter size={16} />
              Filter Lainnya
            </button>
          </div>
        </div>
      </section>

      {/* RESULTS CONTAINER */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
        <div className="border-b border-slate-200 px-0">
          <div className="flex items-stretch overflow-x-auto">
            <StatusTab
              label="Semua"
              count={kpi.total.count}
              active={status === "Semua"}
              onClick={() => setStatus("Semua")}
              tone="blue"
            />

            <StatusTab
              label="Pending"
              count={kpi.pending.count}
              active={status === "Pending"}
              onClick={() => setStatus("Pending")}
              tone="amber"
            />

            <StatusTab
              label="Diproses"
              count={kpi.diproses.count}
              active={status === "Diproses"}
              onClick={() => setStatus("Diproses")}
              tone="blue"
            />

            <StatusTab
              label="Berhasil"
              count={kpi.berhasil.count}
              active={status === "Berhasil"}
              onClick={() => setStatus("Berhasil")}
              tone="emerald"
            />

            <StatusTab
              label="Gagal"
              count={kpi.gagal.count}
              active={status === "Gagal"}
              onClick={() => setStatus("Gagal")}
              tone="rose"
            />

            <div className="ml-auto hidden items-center px-4 sm:flex">
              <span className="whitespace-nowrap text-xs text-slate-400">
                {filtered.length.toLocaleString("id-ID")} order
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-105 flex-col items-center justify-center gap-4">
            <Loader2
              size={24}
              className="animate-spin text-blue-600"
            />
            <p className="text-sm font-semibold text-slate-700">
              Memuat orders...
            </p>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            active={activeFilters}
            reset={reset}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-280 w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    <th className="w-12 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua order pada halaman"
                        checked={
                          visible.length > 0 &&
                          visible.every((order) =>
                            selectedOrderIds.has(order.id),
                          )
                        }
                        onChange={(event) => {
                          setSelectedOrderIds((current) => {
                            const next = new Set(current);

                            visible.forEach((order) => {
                              if (event.target.checked) {
                                next.add(order.id);
                              } else {
                                next.delete(order.id);
                              }
                            });

                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-slate-300 bg-white accent-blue-600"
                      />
                    </th>
                    <th className="px-4 py-4 text-left">Order ID</th>
                    <th className="px-4 py-4 text-left">Tanggal</th>
                    <th className="px-4 py-4 text-left">User</th>
                    <th className="px-4 py-4 text-left">Produk / Layanan</th>
                    <th className="px-4 py-4 text-left">Tujuan</th>
                    <th className="px-4 py-4 text-right">Total</th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="w-16 px-4 py-4 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {visible.map((order) => {
                    const selectedRow = selectedOrderIds.has(order.id);

                    return (
                      <tr
                        key={order.id}
                        className={`transition ${
                          selectedRow
                            ? "bg-blue-50/40"
                            : "bg-white hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Pilih order ${
                              order.order_id || order.id
                            }`}
                            checked={selectedRow}
                            onChange={(event) => {
                              setSelectedOrderIds((current) => {
                                const next = new Set(current);

                                if (event.target.checked) {
                                  next.add(order.id);
                                } else {
                                  next.delete(order.id);
                                }

                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-slate-300 bg-white accent-blue-600"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelected(order)}
                              className="text-left text-sm font-semibold text-slate-900 hover:text-blue-600"
                              title={`Buka detail ${fullOrderIdOf(order)}`}
                            >
                              {shortOrderIdOf(order)}
                            </button>

                            <button
                              type="button"
                              onClick={() => void copyOrderId(order)}
                              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                                copiedOrderId === order.id
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                  : "border-slate-200 bg-white text-slate-400 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              }`}
                              aria-label={
                                copiedOrderId === order.id
                                  ? "Order ID tersalin"
                                  : `Salin Order ID ${fullOrderIdOf(order)}`
                              }
                              title={
                                copiedOrderId === order.id
                                  ? "Tersalin"
                                  : "Salin Order ID"
                              }
                            >
                              {copiedOrderId === order.id ? (
                                <Check size={13} />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>

                          {copiedOrderId === order.id && (
                            <p className="mt-1 text-[10px] font-medium text-emerald-600">
                              Tersalin
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-500">
                          {dateTime(order.created_at)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                              <UserRound size={15} />
                            </span>

                            <div className="min-w-0">
                              <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
                                {order.customer_name ||
                                  order.email ||
                                  "Guest"}
                              </p>

                              <p className="max-w-40 truncate text-xs text-slate-400">
                                {order.email || "Non-member"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="max-w-60 truncate text-sm font-semibold text-slate-800">
                            {order.product_name ||
                              "Produk Digital"}
                          </p>

                          <p className="max-w-60 truncate text-xs text-slate-400">
                            {order.item_label ||
                              order.category ||
                              "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="max-w-44 truncate text-sm font-medium text-slate-700">
                            {order.customer_no ||
                              order.user_contact ||
                              "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                          {rupiah(amountOf(order))}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <Badge status={order.status} />
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelected(order)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            aria-label="Buka detail order"
                          >
                            <MoreHorizontal size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="text-xs text-slate-400">
                Menampilkan{" "}
                {Math.min(
                  (page - 1) * perPage + 1,
                  filtered.length,
                )}
                -
                {Math.min(
                  page * perPage,
                  filtered.length,
                )}{" "}
                dari {filtered.length} order
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((value) =>
                      Math.max(1, value - 1),
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="min-w-9 rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-bold text-white">
                  {page}
                </span>

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((value) =>
                      Math.min(
                        totalPages,
                        value + 1,
                      ),
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight size={16} />
                </button>

                <select
                  value={perPage}
                  onChange={(event) =>
                    setPerPage(
                      Number(event.target.value),
                    )
                  }
                  className="ml-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  aria-label="Jumlah order per halaman"
                >
                  <option value={10}>
                    10 / halaman
                  </option>
                  <option value={25}>
                    25 / halaman
                  </option>
                  <option value={50}>
                    50 / halaman
                  </option>
                </select>
              </div>
            </div>
          </>
        )}
      </section>

      {selected && (
        <Drawer
          order={selected}
          updating={updating}
          close={() => setSelected(null)}
          update={(next) =>
            void updateStatus(selected, next)
          }
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  count,
  omzet,
  grossMargin,
  tone,
  icon,
}: {
  label: string;
  count: number;
  omzet: number;
  grossMargin: number;
  tone: "blue" | "amber" | "emerald" | "rose";
  icon: React.ReactNode;
}) {
  const toneMap = {
    blue: {
      card: "border-blue-300 bg-white",
      accent: "bg-blue-500",
      icon: "border-blue-200 bg-blue-50/70 text-blue-600",
    },
    amber: {
      card: "border-amber-300 bg-white",
      accent: "bg-amber-500",
      icon: "border-amber-200 bg-amber-50/70 text-amber-600",
    },
    emerald: {
      card: "border-emerald-300 bg-white",
      accent: "bg-emerald-500",
      icon: "border-emerald-200 bg-emerald-50/70 text-emerald-600",
    },
    rose: {
      card: "border-rose-300 bg-white",
      accent: "bg-rose-500",
      icon: "border-rose-200 bg-rose-50/70 text-rose-600",
    },
  }[tone];

  return (
    <div
      className={`relative h-32 w-full overflow-hidden rounded-2xl border bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.025)] ${toneMap.card}`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${toneMap.accent}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneMap.icon}`}
        >
          {icon}
        </span>

        <span className="text-2xl font-bold leading-none tracking-tight text-slate-950">
          {count.toLocaleString("id-ID")}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
        <span className="text-[13px] font-semibold leading-5 text-slate-900">
          {label}
        </span>

        <span className="text-sm font-bold leading-5 text-slate-950">
          {rupiah(omzet)}
        </span>

        <span className="text-sm font-medium leading-5 text-slate-500">
          Gross Margin
        </span>

        <span className="text-sm font-bold leading-5 text-emerald-600">
          {rupiah(grossMargin)}
        </span>
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function OutlineSelect({
  value,
  normalizedValue,
  onChange,
  options,
  label,
  icon,
}: {
  value: string;
  normalizedValue: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !containerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const commit = (option: string) => {
    if (
      option === "Semua Status" ||
      option === "Semua Periode" ||
      option === "Semua Kategori" ||
      option === "Semua Metode"
    ) {
      onChange("Semua");
    } else {
      onChange(option);
    }

    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <span className="sr-only">{label}</span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white ${
          icon ? "pl-3" : "pl-4"
        } pr-3 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <span className="shrink-0 text-slate-400">
              {icon}
            </span>
          )}

          <span className="truncate">
            {normalizedValue}
          </span>
        </span>

        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-70 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
        >
          {options.map((option) => {
            const selected =
              option === normalizedValue ||
              (option.startsWith("Semua ") &&
                normalizedValue === option);

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => commit(option)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                  selected
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{option}</span>

                {selected && (
                  <Check
                    size={15}
                    className="text-blue-600"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusTab({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone: "blue" | "amber" | "emerald" | "rose";
}) {
  const tones = {
    blue: {
      text: "text-blue-600",
      count: "bg-blue-50 text-blue-700",
      line: "bg-blue-500",
    },
    amber: {
      text: "text-amber-600",
      count: "bg-amber-50 text-amber-700",
      line: "bg-amber-500",
    },
    emerald: {
      text: "text-emerald-600",
      count: "bg-emerald-50 text-emerald-700",
      line: "bg-emerald-500",
    },
    rose: {
      text: "text-rose-600",
      count: "bg-rose-50 text-rose-700",
      line: "bg-rose-500",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative inline-flex min-w-33.75 shrink-0 items-center justify-center gap-2 border-r border-slate-200 px-5 py-4 text-sm font-semibold transition last:border-r-0 ${
        active
          ? `${tones.text} bg-white`
          : `${tones.text} bg-white hover:bg-slate-50`
      }`}
    >
      {label}

      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tones.count}`}
      >
        {count.toLocaleString("id-ID")}
      </span>

      {active && (
        <span
          className={`absolute inset-x-0 bottom-0 h-0.5 ${tones.line}`}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function Badge({
  status,
}: {
  status?: string | null;
}) {
  const label = isStatus(status)
    ? status
    : "UNKNOWN";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(
        status,
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Pending"
            ? "bg-amber-500"
            : status === "Diproses"
              ? "bg-blue-500"
              : status === "Berhasil"
                ? "bg-emerald-500"
                : status === "Gagal"
                  ? "bg-rose-500"
                  : "bg-slate-400"
        }`}
      />
      {label}
    </span>
  );
}

function EmptyState({
  active,
  reset,
}: {
  active: boolean;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-105 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Search size={20} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        Tidak ada order ditemukan
      </p>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        Coba ubah filter atau gunakan kata kunci
        pencarian yang lain.
      </p>

      {active && (
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
}

function Drawer({
  order,
  updating,
  close,
  update,
}: {
  order: OrderRow;
  updating: boolean;
  close: () => void;
  update: (next: OrderStatus) => void;
}) {
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDetailOrder = async () => {
      setDetailLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(
          `/api/orders/manage?id=${encodeURIComponent(order.id)}`,
          {
            cache: "no-store",
            headers: session?.access_token
              ? {
                  Authorization: `Bearer ${session.access_token}`,
                }
              : undefined,
          },
        );

        const body: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof body === "object" &&
              body !== null &&
              "error" in body
              ? String(body.error)
              : "Detail order gagal dimuat.",
          );
        }

        if (!cancelled && body && !Array.isArray(body)) {
          setDetailOrder(body as OrderRow);
        }
      } catch (detailError) {
        console.error("Order detail fetch error:", detailError);
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetailOrder();

    return () => {
      cancelled = true;
    };
  }, [order.id]);

  const activeOrder = detailOrder ?? order;
  const nextActions = transitions(activeOrder.status);
  const reservationAmount = reservationAmountOf(activeOrder);
  const totalPaid = customerPaidOf(activeOrder);

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px]"
        style={{ zIndex: 80 }}
        onClick={close}
      />

      <aside
        className="fixed inset-y-0 right-0 z-90 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
        aria-label="Detail Order"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                Detail Order
              </p>

              <h2 className="mt-0.5 break-all text-base font-bold leading-5 tracking-tight text-slate-950">
                {fullOrderIdOf(activeOrder)}
              </h2>

              <p className="mt-0 text-[11px] text-slate-400">
                {dateTime(activeOrder.created_at)}
                {detailLoading ? " · Memuat data..." : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup detail order"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Current Status
              </p>
              <div className="mt-1.5">
                <Badge status={activeOrder.status} />
              </div>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Total
              </p>
              <p className="mt-0.5 text-sm font-bold leading-5 text-slate-900">
                {detailLoading ? "…" : rupiah(totalPaid)}
              </p>
            </div>
          </div>

          <Section title="Customer" icon={<UserRound size={16} />}>
            <DetailRow label="Nama" value={activeOrder.customer_name || "-"} />
            <DetailRow label="Email" value={activeOrder.email || "Non-member"} />
            <DetailRow label="Tujuan" value={activeOrder.customer_no || "-"} />
          </Section>

          <Section title="Order" icon={<Package size={16} />}>
            <DetailRow
              label="Produk"
              value={activeOrder.product_name || "Produk Digital"}
            />
            <DetailRow label="Item" value={activeOrder.item_label || "-"} />
            <DetailRow label="Kategori" value={activeOrder.category || "-"} />
          </Section>

          <Section title="Financial Summary" icon={<ShoppingBag size={16} />}>
            <FinancialRow
              label="Harga Jual"
              value={rupiah(activeOrder.price ?? 0)}
              strong
            />

            <FinancialRow
              label="Modal Vendor"
              value={rupiah(activeOrder.buy_price ?? 0)}
              negative
            />

            <FinancialRow
              label="Cashback Member"
              value={rupiah(activeOrder.cashback ?? 0)}
              negative={Number(activeOrder.cashback ?? 0) > 0}
            />

            <FinancialRow
              label="Komisi Referral"
              value={rupiah(activeOrder.referral_commission ?? 0)}
              negative={Number(activeOrder.referral_commission ?? 0) > 0}
            />

            <FinancialRow
              label="Voucher"
              value={rupiah(activeOrder.voucher_amount ?? 0)}
              negative={Number(activeOrder.voucher_amount ?? 0) > 0}
            />

            <FinancialRow
              label="Kode Unik / Reservasi"
              value={rupiah(reservationAmount)}
              positive={reservationAmount > 0}
            />

            <div className="mt-1.5 rounded-xl bg-emerald-50 px-3 py-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-semibold text-emerald-700">
                  Gross Margin
                </span>
                <span className="text-sm font-bold leading-4 text-emerald-700">
                  {rupiah(grossMarginOf(activeOrder))}
                </span>
              </div>
            </div>
          </Section>

          <Section title="Payment Information" icon={<WalletCards size={16} />}>
            <DetailRow
              label="Metode Pembayaran"
              value={activeOrder.payment_method || "-"}
            />

            <FinancialRow
              label={activeOrder.payment_method || "Pembayaran"}
              value={rupiah(activeOrder.price ?? 0)}
              strong
            />

            <DetailRow
              label="Total Dibayar"
              value={detailLoading ? "…" : rupiah(totalPaid)}
              strong
            />
          </Section>

          {activeOrder.notes && (
            <Section title="Catatan" icon={<AlertCircle size={16} />}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium leading-5 text-slate-600">
                {activeOrder.notes}
              </div>
            </Section>
          )}

          {nextActions.length > 0 ? (
            <section className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-slate-500" />
                <h3 className="text-[13px] font-semibold text-slate-900">
                  Available Actions
                </h3>
              </div>

              <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                Tindakan mengikuti state machine order yang disetujui.
              </p>

              <div className="mt-3 grid gap-1.5">
                {nextActions.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    disabled={updating}
                    onClick={() => update(nextStatus)}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold transition disabled:opacity-50 ${
                      nextStatus === "Gagal"
                        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : nextStatus === "Berhasil"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    {updating ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : nextStatus === "Gagal" ? (
                      <XCircle size={15} />
                    ) : nextStatus === "Berhasil" ? (
                      <Check size={15} />
                    ) : (
                      <ArrowRight size={15} />
                    )}
                    {nextStatus === "Diproses"
                      ? "Pindahkan ke Diproses"
                      : `Tandai ${nextStatus}`}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[13px] font-semibold text-slate-800">
                Status Final
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                {activeOrder.status === "Berhasil" || activeOrder.status === "Gagal"
                  ? `Order dengan status ${activeOrder.status} tidak menyediakan perubahan lanjutan.`
                  : "Tidak ada transition yang tersedia."}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function FinancialRow({
  label,
  value,
  negative = false,
  positive = false,
  strong = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  positive?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span
        className={`text-[13px] leading-4 ${
          strong
            ? "font-semibold text-slate-900"
            : "font-medium text-slate-500"
        }`}
      >
        {label}
      </span>

      <span
        className={`text-[13px] leading-4 ${
          negative
            ? "font-semibold text-rose-500"
            : positive
              ? "font-semibold text-emerald-600"
              : strong
                ? "font-bold text-slate-900"
                : "font-medium text-slate-700"
        }`}
      >
        {negative ? "- " : ""}
        {value.replace(/^-\s/, "")}
      </span>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-slate-900">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-[13px] font-semibold leading-5 text-slate-900">
          {title}
        </h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
      <span className="text-[11px] font-medium leading-4 text-slate-400">
        {label}
      </span>
      <span
        className={`max-w-[64%] text-right text-[11px] leading-4 ${
          strong ? "font-bold text-slate-900" : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
