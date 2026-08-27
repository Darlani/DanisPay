"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Landmark,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";

type DepositViewRow = {
  id: string;
  user_id?: string | null;
  user_email: string;
  amount: number;
  payment_method?: string | null;
  payment_channel?: string | null;
  proof_image?: string | null;
  status?: string | null;
  total_amount?: number | null;
  unique_code?: number | null;
  admin_fee?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DepositStatus = "Semua" | "Pending" | "Berhasil" | "Gagal";
type DepositDateFilter = "Semua" | "Hari Ini" | "7 Hari" | "30 Hari";

const normalizeDepositStatus = (
  status?: string | null,
): "Pending" | "Berhasil" | "Gagal" | "UNKNOWN" => {
  const value = String(status ?? "").trim().toUpperCase();

  if (value === "PENDING") return "Pending";
  if (["SUCCESS", "BERHASIL"].includes(value)) return "Berhasil";
  if (["REJECTED", "REJECT", "FAILED", "FAIL", "GAGAL"].includes(value)) {
    return "Gagal";
  }

  return "UNKNOWN";
};

const rupiah = (value: unknown) =>
  `Rp ${(Number(value) || 0).toLocaleString("id-ID")}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortId = (id: string) => `#DEP-${id.slice(0, 8).toUpperCase()}`;

const getDepositTotal = (deposit: DepositViewRow) =>
  Number(deposit.total_amount ?? deposit.amount ?? 0);

const isSameDay = (timestamp: number) => {
  const source = new Date(timestamp);
  const today = new Date();

  return (
    source.getFullYear() === today.getFullYear() &&
    source.getMonth() === today.getMonth() &&
    source.getDate() === today.getDate()
  );
};

const getStatusClasses = (status: DepositStatus | "UNKNOWN") => {
  switch (status) {
    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Berhasil":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Gagal":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const getStatusDot = (status: DepositStatus | "UNKNOWN") => {
  switch (status) {
    case "Pending":
      return "bg-amber-500";
    case "Berhasil":
      return "bg-emerald-500";
    case "Gagal":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
};

export default function DepositView() {
  const [deposits, setDeposits] = useState<DepositViewRow[]>([]);
  const [selectedDeposit, setSelectedDeposit] =
    useState<DepositViewRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<DepositStatus>("Semua");
  const [dateFilter, setDateFilter] =
    useState<DepositDateFilter>("Semua");
  const [methodFilter, setMethodFilter] = useState("Semua");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchDeposits = useCallback(async (initial = false) => {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("deposits")
        .select(
          "id,user_id,user_email,amount,payment_method,payment_channel,proof_image,status,total_amount,unique_code,admin_fee,created_at,updated_at",
        )
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setDeposits((data ?? []) as DepositViewRow[]);
    } catch (fetchError) {
      console.error("DepositView fetch error:", fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Data deposit belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDeposits(true);

    const channel = supabase
      .channel("admin-deposit-view")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deposits",
        },
        () => {
          void fetchDeposits();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDeposits]);

  const paymentMethods = useMemo<string[]>(() => {
    return Array.from(
      new Set(
        deposits
          .map(
            (deposit) =>
              deposit.payment_method ||
              deposit.payment_channel ||
              "",
          )
          .filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0,
          ),
      ),
    ).sort((a, b) => a.localeCompare(b, "id"));
  }, [deposits]);

  const filteredDeposits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = Date.now();

    return deposits.filter((deposit) => {
      const normalizedStatus = normalizeDepositStatus(deposit.status);

      const searchable = [
        deposit.id,
        deposit.user_email,
        deposit.payment_method,
        deposit.payment_channel,
        deposit.status,
        deposit.amount,
        deposit.total_amount,
      ]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).toLowerCase())
        .join(" ");

      const matchesQuery =
        !normalizedQuery || searchable.includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "Semua" ||
        normalizedStatus === statusFilter;

      const createdAt = new Date(
        deposit.created_at || "",
      ).getTime();

      const matchesDate =
        dateFilter === "Semua"
          ? true
          : Number.isFinite(createdAt) &&
            (dateFilter === "Hari Ini"
              ? isSameDay(createdAt)
              : dateFilter === "7 Hari"
                ? createdAt >= now - 7 * 24 * 60 * 60 * 1000
                : createdAt >= now - 30 * 24 * 60 * 60 * 1000);

      const method =
        deposit.payment_method ||
        deposit.payment_channel ||
        "";

      const matchesMethod =
        methodFilter === "Semua" || method === methodFilter;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesDate &&
        matchesMethod
      );
    });
  }, [
    dateFilter,
    deposits,
    methodFilter,
    query,
    statusFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, methodFilter, perPage, query, statusFilter]);

  const kpis = useMemo(() => {
    const total = filteredDeposits.length;

    return {
      total,
      pending: filteredDeposits.filter(
        (deposit) =>
          normalizeDepositStatus(deposit.status) === "Pending",
      ).length,
      berhasil: filteredDeposits.filter(
        (deposit) =>
          normalizeDepositStatus(deposit.status) === "Berhasil",
      ).length,
      gagal: filteredDeposits.filter((deposit) => {
        const status = normalizeDepositStatus(deposit.status);
        return status === "Gagal" || status === "UNKNOWN";
      }).length,
      nominal: filteredDeposits.reduce(
        (sum, deposit) => sum + getDepositTotal(deposit),
        0,
      ),
    };
  }, [filteredDeposits]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeposits.length / perPage),
  );

  const visibleDeposits = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredDeposits.slice(start, start + perPage);
  }, [filteredDeposits, page, perPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const hasActiveFilters =
    Boolean(query) ||
    statusFilter !== "Semua" ||
    dateFilter !== "Semua" ||
    methodFilter !== "Semua";

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("Semua");
    setDateFilter("Semua");
    setMethodFilter("Semua");
  };

  const runDepositAction = async (
    deposit: DepositViewRow,
    action: "approve" | "reject",
  ) => {
    const normalized = normalizeDepositStatus(deposit.status);

    if (normalized !== "Pending") return;

    const message =
      action === "approve"
        ? "Konfirmasi deposit ini? Saldo member akan diperbarui."
        : "Tolak deposit ini? Saldo member tidak akan ditambahkan.";

    if (!window.confirm(message)) return;

    setProcessingId(deposit.id);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Sesi admin tidak valid. Silakan login kembali.",
        );
      }

      const response = await fetch(
        `/api/admin/deposits/${encodeURIComponent(deposit.id)}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const result: unknown = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result === "object" &&
            result !== null &&
            "error" in result
            ? String(result.error)
            : action === "approve"
              ? "Gagal menyetujui deposit."
              : "Gagal menolak deposit.",
        );
      }

      setSelectedDeposit(null);
      await fetchDeposits();
    } catch (actionError) {
      console.error("Deposit action error:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Operasi deposit gagal.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16 text-slate-900">
      {/* PAGE HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6 lg:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <WalletCards size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Operations
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Deposit
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Kelola deposit member dan pantau statusnya secara real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchDeposits()}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Deposit"
          value={kpis.total.toLocaleString("id-ID")}
          helper="Semua transaksi"
          tone="blue"
          icon={<WalletCards size={18} />}
        />
        <KpiCard
          label="Pending"
          value={kpis.pending.toLocaleString("id-ID")}
          helper="Menunggu konfirmasi"
          tone="amber"
          icon={<ClockIcon />}
        />
        <KpiCard
          label="Berhasil"
          value={kpis.berhasil.toLocaleString("id-ID")}
          helper="Berhasil dikonfirmasi"
          tone="emerald"
          icon={<Check size={18} />}
        />
        <KpiCard
          label="Gagal"
          value={kpis.gagal.toLocaleString("id-ID")}
          helper="Transaksi gagal / ditolak"
          tone="rose"
          icon={<XCircle size={18} />}
        />
        <KpiCard
          label="Total Nominal"
          value={rupiah(kpis.nominal)}
          helper="Semua transaksi"
          tone="green"
          icon={<Landmark size={18} />}
        />
      </section>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-rose-600"
            />
            <div>
              <p className="text-sm font-semibold text-rose-800">
                Operasi deposit gagal
              </p>
              <p className="mt-1 text-xs leading-5 text-rose-700">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchDeposits()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        {/* FILTERS */}
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5 lg:px-6">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.5fr)_150px_150px_180px_auto]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                aria-label="Cari deposit"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari ID deposit, email, metode..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <SelectField
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(value as DepositStatus)
              }
              label="Status"
              options={["Semua", "Pending", "Berhasil", "Gagal"]}
            />

            <SelectField
              value={dateFilter}
              onChange={(value) =>
                setDateFilter(value as DepositDateFilter)
              }
              label="Tanggal"
              options={["Semua", "Hari Ini", "7 Hari", "30 Hari"]}
            />

            <SelectField
              value={methodFilter}
              onChange={setMethodFilter}
              label="Metode Pembayaran"
              options={["Semua", ...paymentMethods]}
            />

            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-default disabled:opacity-40"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <StatusTab
                label="Semua"
                count={kpis.total}
                active={statusFilter === "Semua"}
                onClick={() => setStatusFilter("Semua")}
                tone="blue"
              />
              <StatusTab
                label="Pending"
                count={kpis.pending}
                active={statusFilter === "Pending"}
                onClick={() => setStatusFilter("Pending")}
                tone="amber"
              />
              <StatusTab
                label="Berhasil"
                count={kpis.berhasil}
                active={statusFilter === "Berhasil"}
                onClick={() => setStatusFilter("Berhasil")}
                tone="emerald"
              />
              <StatusTab
                label="Gagal"
                count={kpis.gagal}
                active={statusFilter === "Gagal"}
                onClick={() => setStatusFilter("Gagal")}
                tone="rose"
              />
            </div>

            <p className="text-xs text-slate-400">
              {query
                ? `Menampilkan ${filteredDeposits.length.toLocaleString("id-ID")} hasil pencarian`
                : `${filteredDeposits.length.toLocaleString("id-ID")} deposit`}
            </p>
          </div>
        </div>

        {/* DATA */}
        {loading ? (
          <LoadingState label="Memuat deposit..." />
        ) : visibleDeposits.length === 0 ? (
          <EmptyState
            hasActiveFilters={hasActiveFilters}
            onReset={resetFilters}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-240 w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="w-14 px-5 py-4 text-center">No</th>
                    <th className="px-5 py-4 text-left">ID Deposit</th>
                    <th className="px-5 py-4 text-left">Tanggal</th>
                    <th className="px-5 py-4 text-left">Member</th>
                    <th className="px-5 py-4 text-left">Metode</th>
                    <th className="px-5 py-4 text-right">Nominal</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="w-16 px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visibleDeposits.map((deposit, index) => {
                    const number =
                      (page - 1) * perPage + index + 1;

                    return (
                      <tr
                        key={deposit.id}
                        className="group transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 text-center text-sm text-slate-400">
                          {number}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDeposit(deposit)
                            }
                            className="flex items-center gap-2 text-left"
                          >
                            <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                              {shortId(deposit.id)}
                            </span>

                            <Copy
                              size={13}
                              className="text-slate-300"
                            />
                          </button>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDateTime(deposit.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="min-w-0">
                            <p className="max-w-55 truncate text-sm font-semibold text-slate-800">
                              {deposit.user_email}
                            </p>

                            {deposit.user_id && (
                              <p className="mt-0.5 max-w-55 truncate text-xs text-slate-400">
                                {deposit.user_id}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {deposit.payment_method ||
                                deposit.payment_channel ||
                                "-"}
                            </p>

                            {deposit.payment_channel &&
                              deposit.payment_channel !==
                                deposit.payment_method && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {deposit.payment_channel}
                                </p>
                              )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                          {rupiah(getDepositTotal(deposit))}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={deposit.status} />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDeposit(deposit)
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            aria-label={`Buka detail ${shortId(deposit.id)}`}
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

            {/* MOBILE LIST */}
            <div className="divide-y divide-slate-100 md:hidden">
              {visibleDeposits.map((deposit) => (
                <button
                  key={deposit.id}
                  type="button"
                  onClick={() => setSelectedDeposit(deposit)}
                  className="block w-full p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {deposit.user_email}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {shortId(deposit.id)} ·{" "}
                        {formatDateTime(deposit.created_at)}
                      </p>
                    </div>

                    <StatusBadge status={deposit.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Nominal
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {rupiah(getDepositTotal(deposit))}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Metode
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                        {deposit.payment_method ||
                          deposit.payment_channel ||
                          "-"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-slate-400">
                Menampilkan{" "}
                <strong className="font-semibold text-slate-600">
                  {Math.min(
                    (page - 1) * perPage + 1,
                    filteredDeposits.length,
                  )}
                  -
                  {Math.min(
                    page * perPage,
                    filteredDeposits.length,
                  )}
                </strong>{" "}
                dari{" "}
                <strong className="font-semibold text-slate-600">
                  {filteredDeposits.length}
                </strong>{" "}
                deposit
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((value) => Math.max(1, value - 1))
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((value) =>
                      Math.min(totalPages, value + 1),
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight size={16} />
                </button>

                <select
                  value={perPage}
                  onChange={(event) =>
                    setPerPage(Number(event.target.value))
                  }
                  className="ml-1 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 outline-none"
                  aria-label="Jumlah deposit per halaman"
                >
                  <option value={10}>10 / halaman</option>
                  <option value={25}>25 / halaman</option>
                  <option value={50}>50 / halaman</option>
                </select>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedDeposit && (
        <DepositDrawer
          deposit={selectedDeposit}
          processing={processingId === selectedDeposit.id}
          onClose={() => setSelectedDeposit(null)}
          onApprove={() =>
            void runDepositAction(selectedDeposit, "approve")
          }
          onReject={() =>
            void runDepositAction(selectedDeposit, "reject")
          }
        />
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "amber" | "emerald" | "rose" | "green";
}) {
  const styles = {
    blue: "border-blue-100 bg-blue-50 text-blue-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    rose: "border-rose-100 bg-rose-50 text-rose-600",
    green: "border-emerald-100 bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${styles[tone]}`}
        >
          {icon}
        </span>

        <span className="text-right text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        {label}
      </p>

      <p className="mt-0.5 text-xs text-slate-400">{helper}</p>
    </div>
  );
}

function ClockIcon() {
  return (
    <span className="text-sm font-bold leading-none">◷</span>
  );
}

function SelectField({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </label>
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
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-slate-950 text-white"
          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}

      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? "bg-white/10 text-white" : tones[tone]
        }`}
      >
        {count.toLocaleString("id-ID")}
      </span>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const normalized = normalizeDepositStatus(status);
  const label = normalized;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(
        normalized,
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
          normalized,
        )}`}
      />
      {label}
    </span>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-105 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
        <Loader2
          size={22}
          className="animate-spin text-blue-600"
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800">
          {label}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Menyiapkan workspace operasional.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  onReset,
}: {
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-105 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Search size={20} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        Tidak ada deposit ditemukan
      </p>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        Coba ubah filter atau gunakan kata kunci yang lain.
      </p>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
}

function DepositDrawer({
  deposit,
  processing,
  onClose,
  onApprove,
  onReject,
}: {
  deposit: DepositViewRow;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const normalized = normalizeDepositStatus(deposit.status);
  const isPending = normalized === "Pending";

  const proof =
    typeof deposit.proof_image === "string"
      ? deposit.proof_image.trim()
      : "";

  return (
    <>
      <button
        type="button"
        aria-label="Tutup detail deposit"
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px]"
        style={{ zIndex: 80 }}
      />

      <aside
        className="fixed inset-y-0 right-0 z-90 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
        aria-label="Detail Deposit"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                Detail Deposit
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                {shortId(deposit.id)}
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {formatDateTime(deposit.created_at)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Current Status
              </p>

              <div className="mt-2">
                <StatusBadge status={deposit.status} />
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Nominal
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {rupiah(getDepositTotal(deposit))}
              </p>
            </div>
          </div>

          <DetailSection
            title="Informasi Member"
            icon={<WalletCards size={17} />}
          >
            <DetailRow label="Email" value={deposit.user_email} />

            {deposit.user_id && (
              <DetailRow label="User ID" value={deposit.user_id} />
            )}
          </DetailSection>

          <DetailSection
            title="Informasi Deposit"
            icon={<Landmark size={17} />}
          >
            <DetailRow
              label="Metode Pembayaran"
              value={
                deposit.payment_method ||
                deposit.payment_channel ||
                "-"
              }
            />

            {deposit.payment_channel && (
              <DetailRow
                label="Channel"
                value={deposit.payment_channel}
              />
            )}

            <DetailRow
              label="Nominal Deposit"
              value={rupiah(deposit.amount)}
              strong
            />

            <DetailRow
              label="Kode Unik"
              value={rupiah(deposit.unique_code)}
            />

            <DetailRow
              label="Biaya Admin"
              value={rupiah(deposit.admin_fee)}
            />

            <DetailRow
              label="Total Diterima"
              value={rupiah(getDepositTotal(deposit))}
              strong
            />
          </DetailSection>

          {proof && (
            <DetailSection
              title="Bukti Pembayaran"
              icon={<Eye size={17} />}
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="break-all text-xs leading-5 text-slate-600">
                  {proof}
                </p>

                {/^https?:\/\//i.test(proof) && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={proof}
                      alt="Bukti pembayaran deposit"
                      className="max-h-60 w-full object-contain"
                    />
                  </div>
                )}

                {/^https?:\/\//i.test(proof) && (
                  <a
                    href={proof}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download size={14} />
                    Buka Bukti
                  </a>
                )}
              </div>
            </DetailSection>
          )}

          <DetailSection
            title="Waktu"
            icon={<CalendarDays size={17} />}
          >
            <DetailRow
              label="Dibuat"
              value={formatDateTime(deposit.created_at)}
            />
            <DetailRow
              label="Diperbarui"
              value={formatDateTime(deposit.updated_at)}
            />
          </DetailSection>

          {isPending ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                Tindakan Deposit
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Konfirmasi akan menjalankan flow approval deposit existing.
                Penolakan tidak menambahkan saldo member.
              </p>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={onApprove}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Konfirmasi Deposit
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={onReject}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Tolak Deposit
                </button>
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Deposit sudah diproses
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Status ini tidak menyediakan action approval lanjutan.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-slate-900">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>

      <div className="space-y-2">{children}</div>
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
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <span className="text-xs text-slate-400">{label}</span>

      <span
        className={`max-w-[64%] wrap-break-word text-right text-xs ${
          strong
            ? "font-bold text-slate-900"
            : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
