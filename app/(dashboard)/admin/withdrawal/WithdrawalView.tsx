"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
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

type WithdrawalRow = {
  id: string;
  user_email?: string | null;
  amount: number;
  held_amount?: number | null;
  admin_fee?: number | null;
  status?: string | null;
  bank_name: string;
  account_number: string;
  account_name: string;
  created_at?: string | null;
};

type WithdrawalStatus = "Semua" | "Pending" | "Berhasil" | "Ditolak";
type DateFilter = "Semua" | "Hari Ini" | "7 Hari" | "30 Hari";

const normalizeStatus = (
  status?: string | null,
): "Pending" | "Berhasil" | "Ditolak" | "UNKNOWN" => {
  const value = String(status ?? "").trim().toUpperCase();

  if (value === "PENDING") return "Pending";
  if (["SUCCESS", "BERHASIL"].includes(value)) return "Berhasil";
  if (["REJECTED", "REJECT", "GAGAL", "FAILED"].includes(value)) {
    return "Ditolak";
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

const withdrawalCode = (id: string) =>
  `#WDR-${id.slice(0, 8).toUpperCase()}`;

const totalHeld = (row: WithdrawalRow) =>
  Number(row.held_amount ?? Number(row.amount || 0) + Number(row.admin_fee || 0));

const availableStatuses = [
  "Semua",
  "Pending",
  "Berhasil",
  "Ditolak",
] as const;

const statusClasses = (
  status: "Pending" | "Berhasil" | "Ditolak" | "UNKNOWN",
) => {
  switch (status) {
    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Berhasil":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Ditolak":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const statusDot = (
  status: "Pending" | "Berhasil" | "Ditolak" | "UNKNOWN",
) => {
  switch (status) {
    case "Pending":
      return "bg-amber-500";
    case "Berhasil":
      return "bg-emerald-500";
    case "Ditolak":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
};

const isSameDay = (timestamp: number) => {
  const source = new Date(timestamp);
  const today = new Date();

  return (
    source.getFullYear() === today.getFullYear() &&
    source.getMonth() === today.getMonth() &&
    source.getDate() === today.getDate()
  );
};

export default function WithdrawalView() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [selected, setSelected] = useState<WithdrawalRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<WithdrawalStatus>("Semua");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("Semua");
  const [bankFilter, setBankFilter] = useState("Semua");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchWithdrawals = useCallback(async (initial = false) => {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("withdrawals")
        .select(
          "id,user_email,amount,held_amount,admin_fee,status,bank_name,account_number,account_name,created_at",
        )
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setWithdrawals((data ?? []) as WithdrawalRow[]);
    } catch (fetchError) {
      console.error("WithdrawalView fetch error:", fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Data withdrawal belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchWithdrawals(true);

    const channel = supabase
      .channel("admin-withdrawal-view")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawals",
        },
        () => {
          void fetchWithdrawals();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchWithdrawals]);

  const banks = useMemo<string[]>(() => {
    return Array.from(
      new Set(
        withdrawals
          .map((item) => item.bank_name)
          .filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0,
          ),
      ),
    ).sort((a, b) => a.localeCompare(b, "id"));
  }, [withdrawals]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = Date.now();

    return withdrawals.filter((item) => {
      const normalizedStatus = normalizeStatus(item.status);

      const haystack = [
        item.id,
        item.user_email,
        item.bank_name,
        item.account_number,
        item.account_name,
        item.status,
        item.amount,
        item.admin_fee,
      ]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).toLowerCase())
        .join(" ");

      const matchesSearch =
        !normalizedQuery || haystack.includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "Semua" ||
        normalizedStatus === statusFilter;

      const createdAt = new Date(
        item.created_at || "",
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

      const matchesBank =
        bankFilter === "Semua" ||
        item.bank_name === bankFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate &&
        matchesBank
      );
    });
  }, [
    bankFilter,
    dateFilter,
    query,
    statusFilter,
    withdrawals,
  ]);

  useEffect(() => {
    setPage(1);
  }, [bankFilter, dateFilter, perPage, query, statusFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;

    return {
      total,
      pending: filtered.filter(
        (item) =>
          normalizeStatus(item.status) === "Pending",
      ).length,
      berhasil: filtered.filter(
        (item) =>
          normalizeStatus(item.status) === "Berhasil",
      ).length,
      ditolak: filtered.filter(
        (item) =>
          normalizeStatus(item.status) === "Ditolak",
      ).length,
      nominal: filtered.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
    };
  }, [filtered]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / perPage),
  );

  const visible = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const hasActiveFilters =
    Boolean(query) ||
    statusFilter !== "Semua" ||
    dateFilter !== "Semua" ||
    bankFilter !== "Semua";

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("Semua");
    setDateFilter("Semua");
    setBankFilter("Semua");
  };

  const approve = async (item: WithdrawalRow) => {
    if (normalizeStatus(item.status) !== "Pending") return;

    const defaultFee = String(
      Number(item.admin_fee ?? 0),
    );

    const enteredFee = window.prompt(
      "Masukkan final fee admin:",
      defaultFee,
    );

    if (enteredFee === null) return;

    const finalFee = enteredFee.trim();

    if (!/^\d+$/.test(finalFee)) {
      setError("Biaya admin harus berupa bilangan bulat tidak negatif.");
      return;
    }

    try {
      if (BigInt(finalFee) > BigInt("9223372036854775807")) {
        setError("Biaya admin berada di luar batas yang didukung.");
        return;
      }
    } catch {
      setError("Biaya admin tidak valid.");
      return;
    }

    if (
      !window.confirm(
        "Setujui withdrawal ini? Saldo awal dan akhir akan diaudit otomatis.",
      )
    ) {
      return;
    }

    setProcessingId(item.id);
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
        `/api/admin/withdrawals/${encodeURIComponent(item.id)}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            finalFee,
          }),
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
            : "Gagal menyetujui withdrawal.",
        );
      }

      setSelected(null);
      await fetchWithdrawals();
    } catch (actionError) {
      console.error("Withdrawal approve error:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Gagal menyetujui withdrawal.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (item: WithdrawalRow) => {
    if (normalizeStatus(item.status) !== "Pending") return;

    if (
      !window.confirm(
        `Tolak withdrawal ini? Saldo ${rupiah(
          totalHeld(item),
        )} akan dikembalikan penuh ke member.`,
      )
    ) {
      return;
    }

    setProcessingId(item.id);
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
        `/api/admin/withdrawals/${encodeURIComponent(item.id)}/reject`,
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
            : "Gagal menolak withdrawal.",
        );
      }

      setSelected(null);
      await fetchWithdrawals();
    } catch (actionError) {
      console.error("Withdrawal reject error:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Gagal menolak withdrawal.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16 text-slate-900">
      {/* HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6 lg:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ArrowDownLeft size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Operations
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Withdrawal
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Kelola pengajuan penarikan saldo member dan proses verifikasi dalam satu workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchWithdrawals()}
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
      </section>

      {/* KPI */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Withdrawal"
          value={kpis.total.toLocaleString("id-ID")}
          helper="Semua pengajuan"
          tone="blue"
          icon={<WalletCards size={18} />}
        />

        <KpiCard
          label="Pending"
          value={kpis.pending.toLocaleString("id-ID")}
          helper="Menunggu verifikasi"
          tone="amber"
          icon={<Clock3 size={18} />}
        />

        <KpiCard
          label="Berhasil"
          value={kpis.berhasil.toLocaleString("id-ID")}
          helper="Berhasil diproses"
          tone="emerald"
          icon={<Check size={18} />}
        />

        <KpiCard
          label="Ditolak"
          value={kpis.ditolak.toLocaleString("id-ID")}
          helper="Pengajuan ditolak"
          tone="rose"
          icon={<XCircle size={18} />}
        />

        <KpiCard
          label="Total Nominal"
          value={rupiah(kpis.nominal)}
          helper="Nominal withdrawal"
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
                Operasi withdrawal gagal
              </p>

              <p className="mt-1 text-xs leading-5 text-rose-700">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchWithdrawals()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
        </div>
      )}

      {/* WORKSPACE */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        {/* FILTERS */}
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5 lg:px-6">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.5fr)_150px_150px_170px_auto]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                aria-label="Cari withdrawal"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari ID, nama, email, bank, rekening..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <SelectField
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(value as WithdrawalStatus)
              }
              label="Status"
              options={availableStatuses}
            />

            <SelectField
              value={dateFilter}
              onChange={(value) =>
                setDateFilter(value as DateFilter)
              }
              label="Tanggal"
              options={["Semua", "Hari Ini", "7 Hari", "30 Hari"]}
            />

            <SelectField
              value={bankFilter}
              onChange={setBankFilter}
              label="Bank"
              options={["Semua", ...banks]}
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
                label="Ditolak"
                count={kpis.ditolak}
                active={statusFilter === "Ditolak"}
                onClick={() => setStatusFilter("Ditolak")}
                tone="rose"
              />
            </div>

            <p className="text-xs text-slate-400">
              {query
                ? `Menampilkan ${filtered.length.toLocaleString("id-ID")} hasil pencarian`
                : `${filtered.length.toLocaleString("id-ID")} withdrawal`}
            </p>
          </div>
        </div>

        {/* DATA */}
        {loading ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState
            active={hasActiveFilters}
            reset={resetFilters}
          />
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-265 w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="w-14 px-5 py-4 text-center">No</th>
                    <th className="px-5 py-4 text-left">
                      ID Withdrawal
                    </th>
                    <th className="px-5 py-4 text-left">Tanggal</th>
                    <th className="px-5 py-4 text-left">Member</th>
                    <th className="px-5 py-4 text-left">
                      Bank / Rekening
                    </th>
                    <th className="px-5 py-4 text-right">
                      Nominal
                    </th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="w-16 px-5 py-4 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visible.map((item, index) => {
                    const number =
                      (page - 1) * perPage + index + 1;

                    return (
                      <tr
                        key={item.id}
                        className="group transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 text-center text-sm text-slate-400">
                          {number}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="flex items-center gap-2 text-left"
                          >
                            <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                              {withdrawalCode(item.id)}
                            </span>

                            <Copy
                              size={13}
                              className="text-slate-300"
                            />
                          </button>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDateTime(item.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="min-w-0">
                            <p className="max-w-55 truncate text-sm font-semibold text-slate-800">
                              {item.user_email || "Unknown member"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              Member
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.bank_name}
                          </p>

                          <p className="mt-0.5 max-w-55 truncate text-xs text-slate-400">
                            {item.account_number} ·{" "}
                            {item.account_name}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {rupiah(item.amount)}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Fee {rupiah(item.admin_fee)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={item.status} />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            aria-label={`Buka detail ${withdrawalCode(
                              item.id,
                            )}`}
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

            {/* MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="block w-full p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.user_email || "Unknown member"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {withdrawalCode(item.id)} ·{" "}
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>

                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Nominal
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {rupiah(item.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Bank
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                        {item.bank_name}
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
                    filtered.length,
                  )}
                  -
                  {Math.min(page * perPage, filtered.length)}
                </strong>{" "}
                dari{" "}
                <strong className="font-semibold text-slate-600">
                  {filtered.length}
                </strong>{" "}
                withdrawal
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
                  aria-label="Jumlah withdrawal per halaman"
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

      {selected && (
        <WithdrawalDrawer
          item={selected}
          processing={processingId === selected.id}
          onClose={() => setSelected(null)}
          onApprove={() => void approve(selected)}
          onReject={() => void reject(selected)}
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "amber" | "emerald" | "rose" | "green";
  icon: ReactNode;
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
  const normalized = normalizeStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
        normalized,
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${statusDot(
          normalized,
        )}`}
      />

      {normalized}
    </span>
  );
}

function LoadingState() {
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
          Memuat withdrawal...
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Menyiapkan workspace operasional.
        </p>
      </div>
    </div>
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
        Tidak ada withdrawal ditemukan
      </p>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        Coba ubah filter atau gunakan kata kunci pencarian yang lain.
      </p>

      {active && (
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
}

function WithdrawalDrawer({
  item,
  processing,
  onClose,
  onApprove,
  onReject,
}: {
  item: WithdrawalRow;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const normalized = normalizeStatus(item.status);
  const pending = normalized === "Pending";

  return (
    <>
      <button
        type="button"
        aria-label="Tutup detail withdrawal"
        onClick={onClose}
        className="fixed inset-0 z-80 bg-slate-950/30 backdrop-blur-[2px]"
      />

      <aside
        className="fixed inset-y-0 right-0 z-90 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
        aria-label="Detail Withdrawal"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                Detail Withdrawal
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                {withdrawalCode(item.id)}
              </h2>

              <div className="mt-2">
                <StatusBadge status={item.status} />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {formatDateTime(item.created_at)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup detail"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <DetailSection
            title="Informasi Member"
            icon={<WalletCards size={17} />}
          >
            <DetailRow
              label="Email"
              value={item.user_email || "Unknown member"}
            />
          </DetailSection>

          <DetailSection
            title="Informasi Penarikan"
            icon={<ArrowDownLeft size={17} />}
          >
            <DetailRow
              label="Nominal"
              value={rupiah(item.amount)}
              strong
            />

            <DetailRow
              label="Admin Fee"
              value={rupiah(item.admin_fee)}
            />

            <DetailRow
              label="Held Amount"
              value={rupiah(totalHeld(item))}
            />

            <DetailRow
              label="Status"
              value={normalized}
            />
          </DetailSection>

          <DetailSection
            title="Rekening Tujuan"
            icon={<Landmark size={17} />}
          >
            <DetailRow
              label="Bank"
              value={item.bank_name}
            />

            <DetailRow
              label="No. Rekening"
              value={item.account_number}
            />

            <DetailRow
              label="Atas Nama"
              value={item.account_name}
            />
          </DetailSection>

          {pending && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                Tindakan Withdrawal
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Approve meminta final fee. Reject mengembalikan seluruh
                held amount sesuai flow withdrawal V5.
              </p>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={onApprove}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Check size={16} />
                  )}
                  Konfirmasi Withdrawal
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={onReject}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Tolak Withdrawal
                </button>
              </div>
            </section>
          )}

          {!pending && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Status final
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Withdrawal dengan status {normalized} tidak menyediakan
                approval/rejection lanjutan.
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
