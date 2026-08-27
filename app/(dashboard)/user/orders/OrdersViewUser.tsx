"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Copy,
  Eye,
  Filter,
  Loader2,
  Package,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/utils/supabaseClient";

/* ================================================================== */
/* TYPES                                                              */
/* ================================================================== */

type OrderStatus =
  | "Pending"
  | "Diproses"
  | "Berhasil"
  | "Gagal";

type Order = {
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

  /*
   * ================================================================
   * PAYMENT COMPOSITION
   * ================================================================
   *
   * Field ini belum wajib dikirim backend sekarang.
   * Disiapkan untuk kontrak Wallet + Coin yang akan datang.
   *
   * Contoh:
   *
   * used_balance = 18000
   * used_coin    = 12000
   *
   * Total pembayaran = 30000
   */

  used_balance?: number | string | null;
  used_coin?: number | string | null;

  /*
   * Optional explicit refund information.
   *
   * Nanti backend bisa mengirim:
   *
   * refund_balance = 18000
   * refund_coin    = 12000
   */

  refund_balance?: number | string | null;
  refund_coin?: number | string | null;
};

type DashboardResponse = {
  success?: boolean;
  data?: {
    orders?: Order[];
  };
  error?: string;
};

const PAGE_SIZE = 10;

/* ================================================================== */
/* HELPERS                                                            */
/* ================================================================== */

function toNumber(
  value: unknown,
) {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatRupiah(value: unknown) {
  const amount = toNumber(value);

  return `Rp ${amount.toLocaleString(
    "id-ID",
  )}`;
}

function formatCoins(value: unknown) {
  const amount = toNumber(value);

  return `${amount.toLocaleString(
    "id-ID",
  )} Koin`;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(
    String(value),
  );

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function normalizeStatus(
  value?: string | null,
): OrderStatus {
  const status = String(
    value || "",
  )
    .trim()
    .toLowerCase();

  if (
    status === "berhasil" ||
    status === "success" ||
    status === "successful" ||
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
    status === "gagal" ||
    status === "failed" ||
    status === "reject" ||
    status === "rejected"
  ) {
    return "Gagal";
  }

  return "Pending";
}

/**
 * Order ID yang ditampilkan ke user:
 *
 * DANISH-B38D224B39994386A561601E30E02DF9
 * →
 * DANISH-02DF9
 *
 * ID asli tetap dipakai ketika melakukan copy.
 */
function displayOrderId(
  orderId?: string | null,
) {
  if (!orderId) return "-";

  const value =
    String(orderId);

  if (
    value.startsWith(
      "DANISH-",
    )
  ) {
    return `DANISH-${value.slice(
      -5,
    )}`;
  }

  return value.length > 5
    ? value.slice(-5)
    : value;
}

function getStatusClasses(
  status: OrderStatus,
) {
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

function getPaymentLabel(
  method?: string | null,
) {
  if (!method) return "-";

  const value =
    method
      .trim()
      .toLowerCase();

  if (value === "qris")
    return "QRIS";

  if (value === "dana")
    return "DANA";

  if (value === "gopay")
    return "GoPay";

  if (value === "ovo")
    return "OVO";

  if (
    value === "shopeepay"
  ) {
    return "ShopeePay";
  }

  return method;
}

/* ================================================================== */
/* PAYMENT COMPOSITION                                                */
/* ================================================================== */

function getPaymentComposition(
  order: Order,
) {
  const usedBalance =
    toNumber(
      order.used_balance,
    );

  const usedCoin =
    toNumber(
      order.used_coin,
    );

  const hasBalance =
    usedBalance > 0;

  const hasCoin =
    usedCoin > 0;

  /*
   * Backend belum mengirim komposisi.
   * Jangan memalsukan data lama sebagai Koin.
   *
   * Kita fallback ke metode pembayaran lama.
   */

  if (!hasBalance && !hasCoin) {
    return {
      usedBalance: 0,
      usedCoin: 0,
      mode: "external" as const,
    };
  }

  if (hasBalance && hasCoin) {
    return {
      usedBalance,
      usedCoin,
      mode: "mixed" as const,
    };
  }

  if (hasBalance) {
    return {
      usedBalance,
      usedCoin: 0,
      mode: "balance" as const,
    };
  }

  return {
    usedBalance: 0,
    usedCoin,
    mode: "coin" as const,
  };
}

function getPaymentCompositionLabel(
  order: Order,
) {
  const payment =
    getPaymentComposition(
      order,
    );

  switch (payment.mode) {
    case "mixed":
      return "Saldo + Koin";

    case "balance":
      return "Saldo DaPay";

    case "coin":
      return "Koin DaPay";

    default:
      return getPaymentLabel(
        order.payment_method,
      );
  }
}

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */

export default function OrdersViewUser() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("Semua");

  const [categoryFilter, setCategoryFilter] =
    useState("Semua");

  const [dateFilter, setDateFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<Order | null>(null);

  /* ================================================================== */
  /* FETCH                                                             */
  /* ================================================================== */

  const fetchOrders =
    useCallback(
      async (
        initialLoad = false,
      ) => {
        if (initialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        try {
          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (
            !session?.access_token
          ) {
            window.location.href =
              "/login";
            return;
          }

          const response =
            await fetch(
              "/api/user/dashboard",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
              },
            );

          if (
            response.status ===
            401
          ) {
            window.location.href =
              "/login";
            return;
          }

          const result =
            (await response.json()) as DashboardResponse;

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                "Gagal memuat riwayat transaksi.",
            );
          }

          setOrders(
            Array.isArray(
              result.data?.orders,
            )
              ? result.data
                  .orders
              : [],
          );
        } catch (error) {
          console.error(
            "OrdersViewUser:",
            error,
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void fetchOrders(true);
  }, [fetchOrders]);

  /* ================================================================== */
  /* CATEGORIES                                                        */
  /* ================================================================== */

  const categories =
    useMemo(() => {
      return Array.from(
        new Set(
          orders
            .map(
              (order) =>
                order.category?.trim(),
            )
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        String(a).localeCompare(
          String(b),
          "id",
        ),
      ) as string[];
    }, [orders]);

  /* ================================================================== */
  /* FILTERED ORDERS                                                   */
  /* ================================================================== */

  const filteredOrders =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const normalizedStatus =
            normalizeStatus(
              order.status,
            );

          const searchable = [
            order.order_id,
            order.product_name,
            order.item_label,
            order.category,
            order.payment_method,
            order.customer_no,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchable.includes(
              keyword,
            );

          const matchesStatus =
            statusFilter ===
              "Semua" ||
            normalizedStatus ===
              statusFilter;

          const matchesCategory =
            categoryFilter ===
              "Semua" ||
            order.category ===
              categoryFilter;

          const matchesDate =
            !dateFilter ||
            (order.created_at &&
              order.created_at.slice(
                0,
                10,
              ) ===
                dateFilter);

          return (
            matchesSearch &&
            matchesStatus &&
            matchesCategory &&
            matchesDate
          );
        },
      );
    }, [
      categoryFilter,
      dateFilter,
      orders,
      search,
      statusFilter,
    ]);

  /* ================================================================== */
  /* PAGINATION                                                        */
  /* ================================================================== */

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    categoryFilter,
    dateFilter,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredOrders.length /
          PAGE_SIZE,
      ),
    );

  useEffect(() => {
    if (page > totalPages) {
      setPage(
        totalPages,
      );
    }
  }, [
    page,
    totalPages,
  ]);

  const visibleOrders =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredOrders.slice(
        start,
        start + PAGE_SIZE,
      );
    }, [
      filteredOrders,
      page,
    ]);

  /* ================================================================== */
  /* ACTIONS                                                           */
  /* ================================================================== */

  const handleCopyOrderId =
    async (
      orderId?: string | null,
    ) => {
      if (!orderId) return;

      try {
        await navigator.clipboard.writeText(
          orderId,
        );

        alert(
          "Order ID berhasil disalin.",
        );
      } catch {
        alert(
          "Gagal menyalin Order ID.",
        );
      }
    };

  const resetFilters =
    () => {
      setSearch("");
      setStatusFilter(
        "Semua",
      );
      setCategoryFilter(
        "Semua",
      );
      setDateFilter("");
      setPage(1);
    };

  /* ================================================================== */
  /* LOADING                                                           */
  /* ================================================================== */

  if (loading) {
    return (
      <section className="flex min-h-130 w-full items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Loader2
            size={22}
            className="animate-spin text-blue-600"
          />
        </div>
      </section>
    );
  }

  /* ================================================================== */
  /* RENDER                                                            */
  /* ================================================================== */

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-7xl">
        {/* ====================================================== */}
        {/* HEADER                                                  */}
        {/* ====================================================== */}

        <header className="mb-5 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.27em] text-blue-600">
                Transactions
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Riwayat Transaksi
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                Lihat semua transaksi produk
                dan layanan yang pernah Anda
                lakukan.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void fetchOrders(
                  false,
                )
              }
              disabled={refreshing}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </div>
        </header>

        {/* ====================================================== */}
        {/* PAYMENT LEGEND                                          */}
        {/* ====================================================== */}

        <section className="mb-4 rounded-[22px] border border-blue-100 bg-linear-to-r from-blue-50 via-white to-violet-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                Pembayaran DaPay
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Transaksi dapat menggunakan
                Saldo, Koin, atau kombinasi
                keduanya.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <PaymentLegend
                icon={
                  <CircleDollarSign
                    size={12}
                  />
                }
                label="Saldo"
                tone="balance"
              />

              <PaymentLegend
                icon={
                  <Coins size={12} />
                }
                label="Koin"
                tone="coin"
              />

              <PaymentLegend
                icon={
                  <WalletCards
                    size={12}
                  />
                }
                label="Saldo + Koin"
                tone="mixed"
              />
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* FILTER                                                   */}
        {/* ====================================================== */}

        <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(300px,1.4fr)_190px_190px_190px]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari produk, order ID, atau nomor..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <FilterSelect
              value={statusFilter}
              onChange={
                setStatusFilter
              }
              options={[
                "Semua",
                "Pending",
                "Diproses",
                "Berhasil",
                "Gagal",
              ]}
              placeholder="Semua Status"
            />

            <FilterSelect
              value={
                categoryFilter
              }
              onChange={
                setCategoryFilter
              }
              options={[
                "Semua",
                ...categories,
              ]}
              placeholder="Semua Kategori"
            />

            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={
                  dateFilter
                }
                onChange={(event) =>
                  setDateFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter size={13} />

              <span>
                Menampilkan{" "}
                <strong className="font-bold text-slate-600">
                  {
                    visibleOrders.length
                  }
                </strong>{" "}
                dari{" "}
                <strong className="font-bold text-slate-600">
                  {
                    filteredOrders.length
                  }
                </strong>{" "}
                transaksi
              </span>
            </div>

            {(search ||
              statusFilter !==
                "Semua" ||
              categoryFilter !==
                "Semua" ||
              dateFilter) && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-slate-400 transition hover:text-blue-600 sm:self-auto"
              >
                <X size={13} />
                Reset Filter
              </button>
            )}
          </div>
        </section>

        {/* ====================================================== */}
        {/* TRANSACTION CONTAINER                                  */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Package size={15} />
              </div>

              <p className="text-xs font-semibold text-slate-600">
                Menampilkan{" "}
                <span className="font-black text-slate-900">
                  {filteredOrders.length ===
                  0
                    ? 0
                    : (page -
                        1) *
                        PAGE_SIZE +
                      1}
                </span>
                {" - "}
                <span className="font-black text-slate-900">
                  {Math.min(
                    page *
                      PAGE_SIZE,
                    filteredOrders.length,
                  )}
                </span>
                {" dari "}
                <span className="font-black text-slate-900">
                  {
                    filteredOrders.length
                  }
                </span>{" "}
                transaksi
              </p>
            </div>
          </div>

          {filteredOrders.length ===
          0 ? (
            <EmptyState
              onReset={
                resetFilters
              }
            />
          ) : (
            <>
              {/* ================================================= */}
              {/* DESKTOP TABLE                                      */}
              {/* ================================================= */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-295 border-collapse">
                  <thead className="border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <TableHeading label="Produk" />

                      <TableHeading label="Order ID" />

                      <TableHeading label="Tanggal" />

                      <TableHeading label="Pembayaran" />

                      <TableHeading
                        label="Total"
                        align="right"
                      />

                      <TableHeading
                        label="Status"
                        align="center"
                      />

                      <TableHeading
                        label="Aksi"
                        align="center"
                      />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleOrders.map(
                      (order) => (
                        <DesktopOrderRow
                          key={
                            order.id
                          }
                          order={
                            order
                          }
                          onCopy={
                            handleCopyOrderId
                          }
                          onView={
                            setSelectedOrder
                          }
                        />
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* ================================================= */}
              {/* MOBILE                                             */}
              {/* ================================================= */}

              <div className="divide-y divide-slate-100 md:hidden">
                {visibleOrders.map(
                  (order) => (
                    <MobileOrderCard
                      key={
                        order.id
                      }
                      order={
                        order
                      }
                      onCopy={
                        handleCopyOrderId
                      }
                      onView={
                        setSelectedOrder
                      }
                    />
                  ),
                )}
              </div>

              {/* ================================================= */}
              {/* PAGINATION                                          */}
              {/* ================================================= */}

              <Pagination
                page={page}
                totalPages={
                  totalPages
                }
                totalItems={
                  filteredOrders.length
                }
                pageSize={
                  PAGE_SIZE
                }
                onPrevious={() =>
                  setPage(
                    (value) =>
                      Math.max(
                        1,
                        value -
                          1,
                      ),
                  )
                }
                onNext={() =>
                  setPage(
                    (value) =>
                      Math.min(
                        totalPages,
                        value +
                          1,
                      ),
                  )
                }
                onPage={setPage}
              />
            </>
          )}
        </section>
      </div>

      {/* ============================================================ */}
      {/* DETAIL MODAL                                                 */}
      {/* ============================================================ */}

      {selectedOrder && (
        <OrderDetailModal
          order={
            selectedOrder
          }
          onClose={() =>
            setSelectedOrder(
              null,
            )
          }
          onCopy={
            handleCopyOrderId
          }
        />
      )}
    </section>
  );
}

/* ================================================================== */
/* DESKTOP ORDER ROW                                                  */
/* ================================================================== */

function DesktopOrderRow({
  order,
  onCopy,
  onView,
}: {
  order: Order;
  onCopy: (
    value?: string | null,
  ) => void;
  onView: (
    order: Order,
  ) => void;
}) {
  const status =
    normalizeStatus(
      order.status,
    );

  const payment =
    getPaymentComposition(
      order,
    );

  return (
    <tr className="group transition-colors hover:bg-slate-50/70">
      {/* PRODUCT */}
      <td className="px-5 py-4">
        <div className="flex min-w-57.5 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500">
            <Package size={17} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {order.product_name ||
                "Produk Digital"}
            </p>

            <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
              {order.item_label ||
                order.category ||
                "Produk / Layanan"}
            </p>
          </div>
        </div>
      </td>

      {/* ORDER ID */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[9px] font-bold tracking-wide text-slate-600">
            {displayOrderId(
              order.order_id,
            )}
          </span>

          {order.order_id && (
            <button
              type="button"
              onClick={() =>
                onCopy(
                  order.order_id,
                )
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
              aria-label="Salin Order ID"
            >
              <Copy size={12} />
            </button>
          )}
        </div>
      </td>

      {/* DATE */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays
            size={13}
            className="shrink-0 text-slate-400"
          />

          <span className="whitespace-nowrap">
            {formatDate(
              order.created_at,
            )}
          </span>
        </div>
      </td>

      {/* PAYMENT */}
      <td className="px-5 py-4">
        <PaymentSummary
          order={order}
          compact
        />
      </td>

      {/* TOTAL */}
      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-sm font-black text-slate-900">
          {formatRupiah(
            order.total_amount ??
              order.price,
          )}
        </span>
      </td>

      {/* STATUS */}
      <td className="px-5 py-4 text-center">
        <StatusBadge
          status={status}
          size="normal"
        />
      </td>

      {/* ACTION */}
      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() =>
            onView(order)
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
          aria-label="Lihat detail transaksi"
        >
          <Eye size={15} />
        </button>
      </td>
    </tr>
  );
}

/* ================================================================== */
/* PAYMENT SUMMARY                                                   */
/* ================================================================== */

function PaymentSummary({
  order,
  compact = false,
}: {
  order: Order;
  compact?: boolean;
}) {
  const payment =
    getPaymentComposition(
      order,
    );

  /*
   * Backend lama belum mengirim used_balance/used_coin.
   * Maka tampilkan metode pembayaran lama.
   */

  if (
    payment.mode ===
    "external"
  ) {
    return (
      <div>
        <p className="text-xs font-semibold text-slate-700">
          {getPaymentLabel(
            order.payment_method,
          )}
        </p>

        <p className="mt-0.5 text-[8px] text-slate-400">
          Pembayaran eksternal
        </p>
      </div>
    );
  }

  if (
    payment.mode ===
    "mixed"
  ) {
    return (
      <div
        className={
          compact
            ? ""
            : "rounded-2xl border border-violet-100 bg-violet-50 p-3"
        }
      >
        <p className="text-xs font-bold text-slate-800">
          Saldo + Koin
        </p>

        <div className="mt-1 space-y-0.5">
          <p className="text-[8px] font-semibold text-blue-600">
            {formatRupiah(
              payment.usedBalance,
            )}
          </p>

          <p className="text-[8px] font-semibold text-violet-600">
            {formatCoins(
              payment.usedCoin,
            )}
          </p>
        </div>
      </div>
    );
  }

  if (
    payment.mode ===
    "balance"
  ) {
    return (
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <CircleDollarSign
            size={12}
          />
          Saldo DaPay
        </p>

        <p className="mt-0.5 text-[8px] text-slate-400">
          {formatRupiah(
            payment.usedBalance,
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
        <Coins size={12} />
        Koin DaPay
      </p>

      <p className="mt-0.5 text-[8px] text-slate-400">
        {formatCoins(
          payment.usedCoin,
        )}
      </p>
    </div>
  );
}

/* ================================================================== */
/* MOBILE CARD                                                        */
/* ================================================================== */

function MobileOrderCard({
  order,
  onCopy,
  onView,
}: {
  order: Order;
  onCopy: (
    value?: string | null,
  ) => void;
  onView: (order: Order) => void;
}) {
  const status = normalizeStatus(
    order.status,
  );

  return (
    <article className="p-4">
      <div className="w-full text-left">
        {/* ====================================================== */}
        {/* MAIN CONTENT                                            */}
        {/* ====================================================== */}

        <button
          type="button"
          onClick={() => onView(order)}
          className="w-full text-left"
          aria-label={`Lihat detail transaksi ${
            displayOrderId(order.order_id)
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                <Package size={17} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {order.product_name ||
                    "Produk Digital"}
                </p>

                <p className="mt-1 truncate text-[10px] text-slate-400">
                  {order.item_label ||
                    order.category ||
                    "Produk / Layanan"}
                </p>
              </div>
            </div>

            <StatusBadge
              status={status}
              size="small"
            />
          </div>
        </button>

        {/* ====================================================== */}
        {/* ORDER META                                              */}
        {/* ====================================================== */}

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Order ID
            </p>

            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate text-xs font-bold text-slate-700">
                {displayOrderId(
                  order.order_id,
                )}
              </span>

              {order.order_id && (
                <button
                  type="button"
                  onClick={() =>
                    void onCopy(
                      order.order_id,
                    )
                  }
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-blue-600"
                  aria-label="Salin Order ID"
                >
                  <Copy size={11} />
                </button>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Total
            </p>

            <p className="mt-1 text-sm font-black text-slate-900">
              {formatRupiah(
                order.total_amount ??
                  order.price,
              )}
            </p>
          </div>
        </div>

        {/* ====================================================== */}
        {/* FOOTER META                                             */}
        {/* ====================================================== */}

        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400">
          <span>
            {formatDate(
              order.created_at,
            )}
          </span>

          <button
            type="button"
            onClick={() => onView(order)}
            className="font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Lihat Detail →
          </button>
        </div>
      </div>
    </article>
  );
}

/* ================================================================== */
/* STATUS BADGE                                                       */
/* ================================================================== */

function StatusBadge({
  status,
  size,
}: {
  status: OrderStatus;
  size:
    | "small"
    | "normal";
}) {
  const style =
    getStatusClasses(
      status,
    );

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border font-bold",
        style.badge,
        size === "small"
          ? "px-2.5 py-1 text-[8px]"
          : "px-2.5 py-1.5 text-[9px]",
      ].join(" ")}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
      />

      {status}
    </span>
  );
}

/* ================================================================== */
/* PAYMENT LEGEND                                                     */
/* ================================================================== */

function PaymentLegend({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone:
    | "balance"
    | "coin"
    | "mixed";
}) {
  const classes = {
    balance:
      "border-blue-100 bg-blue-50 text-blue-700",
    coin:
      "border-violet-100 bg-violet-50 text-violet-700",
    mixed:
      "border-slate-200 bg-white text-slate-700",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[8px] font-bold ${classes}`}
    >
      {icon}
      {label}
    </span>
  );
}

/* ================================================================== */
/* FILTER SELECT                                                      */
/* ================================================================== */

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (
    value: string,
  ) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        aria-label={
          placeholder
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option ===
              "Semua"
                ? placeholder
                : option}
            </option>
          ),
        )}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

/* ================================================================== */
/* TABLE HEADING                                                      */
/* ================================================================== */

function TableHeading({
  label,
  align = "left",
}: {
  label: string;
  align?:
    | "left"
    | "center"
    | "right";
}) {
  return (
    <th
      className={[
        "px-5 py-4 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400",
        align === "center"
          ? "text-center"
          : align === "right"
            ? "text-right"
            : "text-left",
      ].join(" ")}
    >
      {label}
    </th>
  );
}

/* ================================================================== */
/* PAGINATION                                                         */
/* ================================================================== */

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
  onPage: (
    page: number,
  ) => void;
}) {
  const start =
    totalItems === 0
      ? 0
      : (page - 1) *
          pageSize +
        1;

  const end =
    totalItems === 0
      ? 0
      : Math.min(
          page * pageSize,
          totalItems,
        );

  const pages =
    buildPageNumbers(
      page,
      totalPages,
    );

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs text-slate-400">
        Menampilkan{" "}
        <strong className="font-bold text-slate-600">
          {start}
        </strong>
        {" - "}
        <strong className="font-bold text-slate-600">
          {end}
        </strong>
        {" dari "}
        <strong className="font-bold text-slate-600">
          {totalItems}
        </strong>{" "}
        transaksi
      </p>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={
            onPrevious
          }
          disabled={
            page <= 1
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft
            size={15}
          />
        </button>

        {pages.map(
          (
            item,
            index,
          ) =>
            item ===
            "..." ? (
              <span
                key={`dots-${index}`}
                className="flex h-9 min-w-7 items-center justify-center text-xs text-slate-400"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() =>
                  onPage(
                    item,
                  )
                }
                className={[
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border text-xs font-semibold transition",
                  item ===
                    page
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                ].join(
                  " ",
                )}
              >
                {item}
              </button>
            ),
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={
            page >=
            totalPages
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight
            size={15}
          />
        </button>
      </div>
    </div>
  );
}

function buildPageNumbers(
  current: number,
  total: number,
): Array<
  number | "..."
> {
  if (total <= 7) {
    return Array.from(
      {
        length: total,
      },
      (_, index) =>
        index + 1,
    );
  }

  if (current <= 3) {
    return [
      1,
      2,
      3,
      4,
      "...",
      total,
    ];
  }

  if (
    current >=
    total - 2
  ) {
    return [
      1,
      "...",
      total - 3,
      total - 2,
      total - 1,
      total,
    ];
  }

  return [
    1,
    "...",
    current - 1,
    current,
    current + 1,
    "...",
    total,
  ];
}

/* ================================================================== */
/* EMPTY STATE                                                        */
/* ================================================================== */

function EmptyState({
  onReset,
}: {
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <Package size={21} />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-700">
        Transaksi tidak ditemukan
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Tidak ada transaksi yang
        sesuai dengan pencarian
        atau filter yang dipilih.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        Reset Filter
      </button>
    </div>
  );
}

/* ================================================================== */
/* DETAIL MODAL                                                       */
/* ================================================================== */

function OrderDetailModal({
  order,
  onClose,
  onCopy,
}: {
  order: Order;
  onClose: () => void;
  onCopy: (
    value?: string | null,
  ) => void;
}) {
  const status =
    normalizeStatus(
      order.status,
    );

  const payment =
    getPaymentComposition(
      order,
    );

  const total =
    toNumber(
      order.total_amount ??
        order.price,
    );

  /*
   * ================================================================
   * REFUND DISPLAY
   * ================================================================
   *
   * Jika backend belum menyediakan refund fields:
   *
   * - order gagal + komposisi tersedia
   *   → tampilkan refund berdasarkan original payment source
   *
   * Ini hanya display contract.
   * Backend tetap menjadi source of truth.
   */

  const refundBalance =
    order.refund_balance !==
      null &&
    order.refund_balance !==
      undefined
      ? toNumber(
          order.refund_balance,
        )
      : status === "Gagal"
        ? payment.usedBalance
        : 0;

  const refundCoin =
    order.refund_coin !==
      null &&
    order.refund_coin !==
      undefined
      ? toNumber(
          order.refund_coin,
        )
      : status === "Gagal"
        ? payment.usedCoin
        : 0;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
              Detail Transaksi
            </p>

            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
              {displayOrderId(
                order.order_id,
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup detail"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-76px)] overflow-y-auto p-5">
          {/* STATUS */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={
                      status
                    }
                    size="normal"
                  />
                </div>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Total
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  {formatRupiah(
                    total,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* PAYMENT COMPOSITION */}
          <div className="mt-4 rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 via-white to-violet-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Pembayaran
                </p>

                <p className="mt-1 text-sm font-black text-slate-900">
                  {getPaymentCompositionLabel(
                    order,
                  )}
                </p>
              </div>

              <WalletCards
                size={18}
                className="text-blue-600"
              />
            </div>

            {payment.mode ===
            "external" ? (
              <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Metode
                  </span>

                  <span className="text-xs font-bold text-slate-700">
                    {getPaymentLabel(
                      order.payment_method,
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {payment.usedBalance >
                  0 && (
                  <PaymentAmountRow
                    icon={
                      <CircleDollarSign
                        size={14}
                      />
                    }
                    label="Saldo DaPay"
                    amount={formatRupiah(
                      payment.usedBalance,
                    )}
                    tone="balance"
                  />
                )}

                {payment.usedCoin >
                  0 && (
                  <PaymentAmountRow
                    icon={
                      <Coins size={14} />
                    }
                    label="Koin DaPay"
                    amount={formatCoins(
                      payment.usedCoin,
                    )}
                    tone="coin"
                  />
                )}

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-xs font-bold text-slate-500">
                    Total Pembayaran
                  </span>

                  <span className="text-sm font-black text-slate-900">
                    {formatRupiah(
                      total,
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* REFUND */}
          {status === "Gagal" &&
            (refundBalance >
              0 ||
              refundCoin >
                0) && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">
                  Refund
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Refund mengikuti sumber
                  pembayaran asli. Koin tetap kembali
                  sebagai Koin.
                </p>

                <div className="mt-3 space-y-2">
                  {refundBalance >
                    0 && (
                    <RefundRow
                      label="Saldo kembali"
                      value={formatRupiah(
                        refundBalance,
                      )}
                      tone="balance"
                    />
                  )}

                  {refundCoin >
                    0 && (
                    <RefundRow
                      label="Koin kembali"
                      value={formatCoins(
                        refundCoin,
                      )}
                      tone="coin"
                    />
                  )}
                </div>
              </div>
            )}

          {/* DETAILS */}
          <div className="mt-4 space-y-2">
            <DetailRow
              label="Produk"
              value={
                order.product_name ||
                "Produk Digital"
              }
            />

            <DetailRow
              label="Item"
              value={
                order.item_label ||
                "-"
              }
            />

            <DetailRow
              label="Kategori"
              value={
                order.category ||
                "-"
              }
            />

            <DetailRow
              label="Order ID"
              value={displayOrderId(
                order.order_id,
              )}
              action={
                order.order_id ? (
                  <button
                    type="button"
                    onClick={() =>
                      onCopy(
                        order.order_id,
                      )
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:text-blue-600"
                    aria-label="Salin Order ID"
                  >
                    <Copy size={13} />
                  </button>
                ) : null
              }
            />

            <DetailRow
              label="Tanggal"
              value={formatDate(
                order.created_at,
              )}
            />

            <DetailRow
              label="Metode Pembayaran"
              value={getPaymentCompositionLabel(
                order,
              )}
            />

            {payment.mode ===
              "external" && (
              <DetailRow
                label="Channel Pembayaran"
                value={getPaymentLabel(
                  order.payment_method,
                )}
              />
            )}

            <DetailRow
              label="Nomor Tujuan"
              value={
                order.customer_no ||
                "-"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* PAYMENT AMOUNT ROW                                                 */
/* ================================================================== */

function PaymentAmountRow({
  icon,
  label,
  amount,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  amount: string;
  tone:
    | "balance"
    | "coin";
}) {
  const classes =
    tone === "balance"
      ? {
          box:
            "border-blue-100 bg-blue-50/70",
          icon:
            "bg-blue-100 text-blue-600",
          amount:
            "text-blue-700",
        }
      : {
          box:
            "border-violet-100 bg-violet-50/70",
          icon:
            "bg-violet-100 text-violet-600",
          amount:
            "text-violet-700",
        };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${classes.box}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${classes.icon}`}
        >
          {icon}
        </div>

        <span className="text-xs font-semibold text-slate-700">
          {label}
        </span>
      </div>

      <span
        className={`text-xs font-black ${classes.amount}`}
      >
        {amount}
      </span>
    </div>
  );
}

/* ================================================================== */
/* REFUND ROW                                                         */
/* ================================================================== */

function RefundRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "balance"
    | "coin";
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white bg-white px-3 py-2.5">
      <span className="text-xs font-semibold text-slate-600">
        {label}
      </span>

      <span
        className={
          tone === "balance"
            ? "text-xs font-black text-blue-700"
            : "text-xs font-black text-violet-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

/* ================================================================== */
/* DETAIL ROW                                                         */
/* ================================================================== */

function DetailRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <span className="shrink-0 text-xs text-slate-400">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <span className="max-w-65 truncate text-right text-xs font-semibold text-slate-700">
          {value}
        </span>

        {action}
      </div>
    </div>
  );
}