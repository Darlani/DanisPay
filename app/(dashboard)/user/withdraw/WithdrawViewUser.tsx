"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowUpFromLine,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coins,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/utils/supabaseClient";

/* ================================================================== */
/* TYPES                                                              */
/* ================================================================== */

type Withdrawal = {
  id: string;

  amount?: number | string | null;

  held_amount?:
    | number
    | string
    | null;

  admin_fee?:
    | number
    | string
    | null;

  status?: string | null;

  bank_name?: string | null;

  account_number?:
    | string
    | null;

  account_name?:
    | string
    | null;

  created_at?: string | null;
};

type DashboardResponse = {
  success?: boolean;

  data?: {
    profile?: {
      balance?:
        | number
        | string
        | null;

      coin_balance?:
        | number
        | string
        | null;
    };

    withdrawals?: Withdrawal[];
  };

  error?: string;
};

const PAGE_SIZE = 10;
const MIN_WITHDRAWAL = 10000;

/* ================================================================== */
/* HELPERS                                                            */
/* ================================================================== */

function toNumber(
  value: unknown,
) {
  const amount = Number(
    value || 0,
  );

  return Number.isFinite(amount)
    ? amount
    : 0;
}

function formatRupiah(
  value: unknown,
) {
  return `Rp ${toNumber(
    value,
  ).toLocaleString("id-ID")}`;
}

function formatCoins(
  value: unknown,
) {
  return `${toNumber(
    value,
  ).toLocaleString("id-ID")} Koin`;
}

function formatDate(
  value: unknown,
) {
  if (!value) return "-";

  const date = new Date(
    String(value),
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

function normalizeWithdrawalStatus(
  value?: string | null,
) {
  const status =
    String(
      value || "",
    )
      .trim()
      .toLowerCase();

  if (
    status === "success" ||
    status === "successful" ||
    status === "berhasil" ||
    status === "approved" ||
    status === "completed" ||
    status === "complete"
  ) {
    return "Berhasil";
  }

  if (
    status === "failed" ||
    status === "gagal" ||
    status === "rejected" ||
    status === "reject"
  ) {
    return "Gagal";
  }

  if (
    status === "cancelled" ||
    status === "canceled" ||
    status === "dibatalkan"
  ) {
    return "Dibatalkan";
  }

  return "Pending";
}

function getStatusClasses(
  status: string,
) {
  switch (status) {
    case "Berhasil":
      return {
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot:
          "bg-emerald-500",
      };

    case "Gagal":
      return {
        badge:
          "border-rose-200 bg-rose-50 text-rose-700",
        dot:
          "bg-rose-500",
      };

    case "Dibatalkan":
      return {
        badge:
          "border-slate-200 bg-slate-100 text-slate-600",
        dot:
          "bg-slate-400",
      };

    default:
      return {
        badge:
          "border-amber-200 bg-amber-50 text-amber-700",
        dot:
          "bg-amber-500",
      };
  }
}

function maskAccountNumber(
  accountNumber?: string | null,
) {
  if (!accountNumber) {
    return "-";
  }

  const value =
    String(accountNumber).trim();

  if (value.length <= 4) {
    return value;
  }

  return `${value.slice(
    0,
    2,
  )}${"*".repeat(
    Math.max(
      3,
      value.length - 6,
    ),
  )}${value.slice(-4)}`;
}

function normalizeBankName(
  value?: string | null,
) {
  if (!value) return "-";

  const name =
    value.trim();

  const lower =
    name.toLowerCase();

  if (lower === "bni") return "BNI";
  if (lower === "bsi") return "BSI";
  if (lower === "bca") return "BCA";
  if (lower === "bri") return "BRI";
  if (lower === "mandiri") return "Mandiri";
  if (lower === "dana") return "DANA";
  if (lower === "gopay") return "GoPay";
  if (lower === "ovo") return "OVO";

  if (
    lower === "shopeepay"
  ) {
    return "ShopeePay";
  }

  return name;
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
            event.target
              .value,
          )
        }
        aria-label={
          placeholder
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
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
/* PAGE                                                               */
/* ================================================================== */

export default function WithdrawViewUser() {
  const [
    withdrawals,
    setWithdrawals,
  ] =
    useState<Withdrawal[]>(
      [],
    );

  const [
    balance,
    setBalance,
  ] = useState(0);

  const [
    coinBalance,
    setCoinBalance,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  /* ---------------------------------------------------------------- */
  /* FILTER                                                           */
  /* ---------------------------------------------------------------- */

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("Semua");

  const [
    dateFilter,
    setDateFilter,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  /* ---------------------------------------------------------------- */
  /* FORM                                                             */
  /* ---------------------------------------------------------------- */

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    withdrawAmount,
    setWithdrawAmount,
  ] = useState("");

  const [
    bankName,
    setBankName,
  ] = useState("");

  const [
    accountNumber,
    setAccountNumber,
  ] = useState("");

  const [
    accountName,
    setAccountName,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    selectedWithdrawal,
    setSelectedWithdrawal,
  ] =
    useState<Withdrawal | null>(
      null,
    );

  /* ================================================================= */
  /* FETCH                                                             */
  /* ================================================================= */

  const fetchWithdrawData =
    useCallback(
      async (
        initialLoad = false,
      ) => {
        if (initialLoad) {
          setLoading(true);
        } else {
          setRefreshing(
            true,
          );
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
                "Gagal memuat riwayat penarikan.",
            );
          }

          setBalance(
            toNumber(
              result.data
                ?.profile
                ?.balance,
            ),
          );

          /*
           * Akan otomatis terisi ketika backend
           * sudah mengirim coin_balance.
           *
           * Untuk sekarang default 0.
           */
          setCoinBalance(
            toNumber(
              result.data
                ?.profile
                ?.coin_balance,
            ),
          );

          setWithdrawals(
            Array.isArray(
              result.data
                ?.withdrawals,
            )
              ? result.data
                  .withdrawals
              : [],
          );
        } catch (error) {
          console.error(
            "WithdrawViewUser:",
            error,
          );
        } finally {
          setLoading(false);

          setRefreshing(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void fetchWithdrawData(
      true,
    );
  }, [
    fetchWithdrawData,
  ]);

  /* ================================================================= */
  /* SUMMARY                                                           */
  /* ================================================================= */

  const summary =
    useMemo(() => {
      let successfulAmount =
        0;

      let pendingAmount =
        0;

      let pendingHeldAmount =
        0;

      let successfulCount =
        0;

      let pendingCount =
        0;

      for (const withdrawal of withdrawals) {
        const amount =
          toNumber(
            withdrawal.amount,
          );

        const fee =
          toNumber(
            withdrawal.admin_fee,
          );

        const heldAmount =
          withdrawal.held_amount !==
            null &&
          withdrawal.held_amount !==
            undefined
            ? toNumber(
                withdrawal.held_amount,
              )
            : amount +
              fee;

        const status =
          normalizeWithdrawalStatus(
            withdrawal.status,
          );

        if (
          status ===
          "Berhasil"
        ) {
          successfulAmount +=
            amount;

          successfulCount +=
            1;
        }

        if (
          status ===
          "Pending"
        ) {
          pendingAmount +=
            amount;

          pendingHeldAmount +=
            heldAmount;

          pendingCount +=
            1;
        }
      }

      return {
        successfulAmount,
        pendingAmount,
        pendingHeldAmount,
        successfulCount,
        pendingCount,
      };
    }, [withdrawals]);

  /* ================================================================= */
  /* FILTERED DATA                                                     */
  /* ================================================================= */

  const filteredWithdrawals =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return withdrawals.filter(
        (withdrawal) => {
          const status =
            normalizeWithdrawalStatus(
              withdrawal.status,
            );

          const searchable = [
            withdrawal.id,
            withdrawal.bank_name,
            withdrawal.account_name,
            withdrawal.account_number,
            withdrawal.amount,
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
            status ===
              statusFilter;

          const matchesDate =
            !dateFilter ||
            (withdrawal.created_at &&
              withdrawal.created_at.slice(
                0,
                10,
              ) ===
                dateFilter);

          return (
            matchesSearch &&
            matchesStatus &&
            matchesDate
          );
        },
      );
    }, [
      dateFilter,
      search,
      statusFilter,
      withdrawals,
    ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    dateFilter,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredWithdrawals.length /
          PAGE_SIZE,
      ),
    );

  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages,
      );
    }
  }, [
    page,
    totalPages,
  ]);

  const visibleWithdrawals =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredWithdrawals.slice(
        start,
        start + PAGE_SIZE,
      );
    }, [
      filteredWithdrawals,
      page,
    ]);

  const resetFilters =
    () => {
      setSearch("");
      setStatusFilter(
        "Semua",
      );
      setDateFilter("");
      setPage(1);
    };

  /* ================================================================= */
  /* FORM                                                             */
  /* ================================================================= */

  const resetForm =
    () => {
      setWithdrawAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    };

  const closeForm =
    () => {
      if (
        isSubmitting
      ) {
        return;
      }

      setShowForm(false);
      resetForm();
    };

  const handleSubmitWithdrawal =
    async () => {
      const amount =
        withdrawAmount.trim();

      if (
        !/^(?:0|[1-9][0-9]*)$/.test(
          amount,
        )
      ) {
        alert(
          "Nominal penarikan harus berupa bilangan bulat positif.",
        );

        return;
      }

      let parsedAmount: bigint;

      try {
        parsedAmount =
          BigInt(
            amount,
          );
      } catch {
        alert(
          "Nominal penarikan tidak valid.",
        );

        return;
      }

      if (
        parsedAmount <
        BigInt(
          MIN_WITHDRAWAL,
        )
      ) {
        alert(
          "Minimal penarikan Rp10.000.",
        );

        return;
      }

      /*
       * PENTING:
       * Hanya balance yang dapat digunakan.
       * coinBalance sengaja TIDAK ikut
       * dihitung sebagai saldo withdrawal.
       */
      if (
        parsedAmount >
        BigInt(
          Math.max(
            0,
            Math.floor(
              balance,
            ),
          ),
        )
      ) {
        alert(
          "Saldo DaPay tersedia tidak mencukupi. Koin DaPay tidak dapat digunakan untuk penarikan.",
        );

        return;
      }

      if (
        !bankName.trim()
      ) {
        alert(
          "Bank / E-Wallet wajib diisi.",
        );

        return;
      }

      if (
        !accountNumber.trim()
      ) {
        alert(
          "Nomor rekening wajib diisi.",
        );

        return;
      }

      if (
        !accountName.trim()
      ) {
        alert(
          "Nama pemilik rekening wajib diisi.",
        );

        return;
      }

      setIsSubmitting(
        true,
      );

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (
          !session?.access_token
        ) {
          throw new Error(
            "Sesi tidak valid. Silakan login kembali.",
          );
        }

        const response =
          await fetch(
            "/api/member/withdraw",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization: `Bearer ${session.access_token}`,
              },

              body: JSON.stringify({
                amount,

                bankName:
                  bankName.trim(),

                accountNumber:
                  accountNumber.trim(),

                accountName:
                  accountName.trim(),
              }),
            },
          );

        const result =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Gagal membuat pengajuan tarik saldo.",
          );
        }

        alert(
          "Pengajuan tarik saldo berhasil dibuat. Saldo akan ditahan sementara sampai proses selesai.",
        );

        setShowForm(false);

        resetForm();

        await fetchWithdrawData(
          false,
        );
      } catch (error) {
        alert(
          error instanceof
            Error
            ? error.message
            : "Gagal memproses tarik saldo.",
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  /* ================================================================= */
  /* LOADING                                                           */
  /* ================================================================= */

  if (loading) {
    return (
      <section className="flex min-h-130 w-full items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Loader2
            size={22}
            className="animate-spin text-rose-600"
          />
        </div>
      </section>
    );
  }

  /* ================================================================= */
  /* RENDER                                                            */
  /* ================================================================= */

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-7xl">
        {/* ====================================================== */}
        {/* HEADER                                                  */}
        {/* ====================================================== */}

        <header className="mb-5 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.27em] text-rose-600">
                Balance
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Tarik Saldo
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                Tarik Saldo DaPay ke
                rekening bank atau
                e-wallet yang Anda
                gunakan.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void fetchWithdrawData(
                    false,
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
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

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    true,
                  )
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.98]"
              >
                <ArrowUpFromLine
                  size={16}
                />
                Tarik Saldo
              </button>
            </div>
          </div>
        </header>

        {/* ====================================================== */}
        {/* ASSET INFORMATION                                      */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 lg:grid-cols-2">
          {/* SALDO */}
          <div className="relative overflow-hidden rounded-[26px] bg-linear-to-brrom-rose-600 via-rose-600 to-orange-600 p-5 text-white shadow-[0_14px_32px_rgba(225,29,72,0.14)] sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <CircleDollarSign
                      size={19}
                    />
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-rose-100">
                      Saldo DaPay
                    </p>

                    <p className="mt-1 text-2xl font-black tracking-tight">
                      {formatRupiah(
                        balance,
                      )}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white">
                  Withdrawable
                </span>
              </div>

              <p className="mt-5 max-w-md text-[10px] leading-5 text-rose-100">
                Saldo inilah yang dapat digunakan
                untuk pengajuan penarikan sesuai
                batas dan ketentuan yang berlaku.
              </p>
            </div>
          </div>

          {/* KOIN */}
          <div className="relative overflow-hidden rounded-[26px] border border-violet-100 bg-linear-to-br from-violet-50 via-white to-purple-50 p-5 shadow-[0_12px_30px_rgba(124,58,237,0.07)] sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Coins size={19} />
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-600">
                      Koin DaPay
                    </p>

                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                      {formatCoins(
                        coinBalance,
                      )}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-violet-700">
                  Tidak bisa ditarik
                </span>
              </div>

              <p className="mt-5 max-w-md text-[10px] leading-5 text-slate-500">
                Koin DaPay digunakan untuk transaksi
                dan reward sesuai ketentuan. Koin
                tidak termasuk saldo yang dapat
                dicairkan.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* SUMMARY                                                 */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* CURRENT BALANCE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Saldo Bisa Ditarik
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {formatRupiah(
                    balance,
                  )}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <WalletCards
                  size={19}
                />
              </div>
            </div>
          </div>

          {/* SUCCESS */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Total Berhasil
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
                  {formatRupiah(
                    summary.successfulAmount,
                  )}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-emerald-600">
                  {summary.successfulCount} transaksi
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <CheckCircle2
                  size={19}
                />
              </div>
            </div>
          </div>

          {/* PENDING */}
          <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-600">
                  Sedang Diproses
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-amber-700">
                  {formatRupiah(
                    summary.pendingAmount,
                  )}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-amber-600">
                  {summary.pendingCount} transaksi
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                <Clock3 size={19} />
              </div>
            </div>
          </div>

          {/* HELD */}
          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Dana Ditahan
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-indigo-700">
                  {formatRupiah(
                    summary.pendingHeldAmount,
                  )}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-indigo-600">
                  Nominal + biaya admin
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <AlertCircle
                  size={19}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* IMPORTANT RULE                                          */}
        {/* ====================================================== */}

        <section className="mb-5 rounded-[22px] border border-rose-100 bg-rose-50/60 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm">
              <AlertCircle
                size={15}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">
                Aturan Penarikan
              </p>

              <p className="mt-1 text-xs leading-5 text-rose-700/80">
                Penarikan hanya menggunakan
                <strong> Saldo DaPay</strong>.
                <strong> Koin DaPay tidak dapat
                ditarik</strong> dan tidak dihitung
                sebagai saldo tersedia.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* FILTER                                                  */}
        {/* ====================================================== */}

        <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(300px,1.4fr)_220px_220px]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari bank, nama rekening, atau nominal..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <FilterSelect
              value={
                statusFilter
              }
              onChange={
                setStatusFilter
              }
              options={[
                "Semua",
                "Pending",
                "Berhasil",
                "Gagal",
                "Dibatalkan",
              ]}
              placeholder="Semua Status"
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
                onChange={(
                  event,
                ) =>
                  setDateFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
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
                    visibleWithdrawals.length
                  }
                </strong>{" "}
                dari{" "}
                <strong className="font-bold text-slate-600">
                  {
                    filteredWithdrawals.length
                  }
                </strong>{" "}
                pengajuan
              </span>
            </div>

            {(search ||
              statusFilter !==
                "Semua" ||
              dateFilter) && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-slate-400 transition hover:text-rose-600 sm:self-auto"
              >
                <X size={13} />
                Reset Filter
              </button>
            )}
          </div>
        </section>

        {/* ====================================================== */}
        {/* HISTORY                                                 */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <ArrowUpFromLine
                  size={15}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600">
                  Riwayat Penarikan Saldo
                </p>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  Semua transaksi berasal dari Saldo DaPay.
                </p>
              </div>
            </div>
          </div>

          {filteredWithdrawals.length ===
          0 ? (
            <EmptyWithdrawalState
              onCreate={() =>
                setShowForm(
                  true,
                )
              }
              onReset={
                resetFilters
              }
            />
          ) : (
            <>
              {/* DESKTOP */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-245 border-collapse">
                  <thead className="border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <TableHeading label="Tujuan" />

                      <TableHeading label="Tanggal" />

                      <TableHeading
                        label="Nominal"
                        align="right"
                      />

                      <TableHeading
                        label="Biaya Admin"
                        align="right"
                      />

                      <TableHeading
                        label="Dana Ditahan"
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
                    {visibleWithdrawals.map(
                    (withdrawal, index) => (
                        <DesktopWithdrawalRow
                        key={`withdrawal-desktop-${withdrawal.id ?? "no-id"}-${withdrawal.created_at ?? "no-date"}-${index}`}
                        withdrawal={withdrawal}
                        onView={setSelectedWithdrawal}
                        />
                    ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}

              <div className="divide-y divide-slate-100 md:hidden">
                {visibleWithdrawals.map(
                    (withdrawal, index) => (
                        <MobileWithdrawalCard
                        key={`withdrawal-mobile-${withdrawal.id ?? "no-id"}-${withdrawal.created_at ?? "no-date"}-${index}`}
                        withdrawal={withdrawal}
                        onView={setSelectedWithdrawal}
                        />
                    ),
                    )}
              </div>

              {/* PAGINATION */}

              <WithdrawPagination
                page={page}
                totalPages={
                  totalPages
                }
                totalItems={
                  filteredWithdrawals.length
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
                onPage={
                  setPage
                }
              />
            </>
          )}
        </section>
      </div>

      {/* ============================================================ */}
      {/* CREATE WITHDRAW MODAL                                        */}
      {/* ============================================================ */}

      {showForm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <button
              type="button"
              onClick={
                closeForm
              }
              disabled={
                isSubmitting
              }
              className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Tutup tarik saldo"
            >
              <X size={18} />
            </button>

            <div className="pr-10">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600">
                Withdrawable Balance
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Tarik Saldo
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Saldo yang dapat ditarik:
                {" "}
                <strong className="text-slate-800">
                  {formatRupiah(
                    balance,
                  )}
                </strong>
              </p>
            </div>

            {/* EXPLICIT ASSET RULE */}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                <div className="flex items-center gap-2">
                  <CircleDollarSign
                    size={14}
                    className="text-rose-600"
                  />

                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-700">
                    Bisa Ditarik
                  </p>
                </div>

                <p className="mt-1 text-sm font-black text-slate-900">
                  {formatRupiah(
                    balance,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                <div className="flex items-center gap-2">
                  <Coins
                    size={14}
                    className="text-violet-600"
                  />

                  <p className="text-[9px] font-black uppercase tracking-widest text-violet-700">
                    Tidak Bisa Ditarik
                  </p>
                </div>

                <p className="mt-1 text-sm font-black text-slate-900">
                  {formatCoins(
                    coinBalance,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              {/* AMOUNT */}

              <div>
                <label
                  htmlFor="withdraw-amount"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  Nominal Penarikan
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rp
                  </span>

                  <input
                    id="withdraw-amount"
                    type="text"
                    inputMode="numeric"
                    value={
                      withdrawAmount
                    }
                    onChange={(
                      event,
                    ) =>
                      setWithdrawAmount(
                        event.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      )
                    }
                    placeholder="10000"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-black text-slate-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <p className="mt-2 text-[9px] text-slate-400">
                  Minimal penarikan Rp10.000
                </p>
              </div>

              {/* DESTINATION */}

              <div>
                <label
                  htmlFor="withdraw-bank"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  Bank / E-Wallet
                </label>

                <input
                  id="withdraw-bank"
                  type="text"
                  value={
                    bankName
                  }
                  onChange={(
                    event,
                  ) =>
                    setBankName(
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: BCA / DANA"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* ACCOUNT NUMBER */}

              <div>
                <label
                  htmlFor="withdraw-account-number"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  Nomor Rekening / Akun
                </label>

                <input
                  id="withdraw-account-number"
                  type="text"
                  inputMode="numeric"
                  value={
                    accountNumber
                  }
                  onChange={(
                    event,
                  ) =>
                    setAccountNumber(
                      event.target.value,
                    )
                  }
                  placeholder="Masukkan nomor rekening"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* ACCOUNT NAME */}

              <div>
                <label
                  htmlFor="withdraw-account-name"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  Nama Pemilik
                </label>

                <input
                  id="withdraw-account-name"
                  type="text"
                  value={
                    accountName
                  }
                  onChange={(
                    event,
                  ) =>
                    setAccountName(
                      event.target.value,
                    )
                  }
                  placeholder="Nama sesuai rekening"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* NOTICE */}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <p className="text-[10px] leading-5 text-amber-800">
                    Pastikan data rekening benar.
                    Setelah pengajuan dibuat,
                    nominal penarikan dan biaya admin
                    akan ditahan sementara.
                    <strong>
                      {" "}
                      Koin DaPay tidak ikut ditarik.
                    </strong>
                  </p>
                </div>
              </div>

              {/* SUBMIT */}

              <button
                type="button"
                onClick={
                  handleSubmitWithdrawal
                }
                disabled={
                  isSubmitting
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Memproses...
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine
                      size={17}
                    />

                    Ajukan Penarikan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DETAIL MODAL                                                 */}
      {/* ============================================================ */}

      {selectedWithdrawal && (
        <WithdrawalDetailModal
          withdrawal={
            selectedWithdrawal
          }
          onClose={() =>
            setSelectedWithdrawal(
              null,
            )
          }
        />
      )}
    </section>
  );
}

/* ================================================================== */
/* DESKTOP ROW                                                        */
/* ================================================================== */

function DesktopWithdrawalRow({
  withdrawal,
  onView,
}: {
  withdrawal: Withdrawal;

  onView: (
    withdrawal: Withdrawal,
  ) => void;
}) {
  const status =
    normalizeWithdrawalStatus(
      withdrawal.status,
    );

  const style =
    getStatusClasses(
      status,
    );

  const amount =
    toNumber(
      withdrawal.amount,
    );

  const fee =
    toNumber(
      withdrawal.admin_fee,
    );

  const heldAmount =
    withdrawal.held_amount !==
      null &&
    withdrawal.held_amount !==
      undefined
      ? toNumber(
          withdrawal.held_amount,
        )
      : amount + fee;

  return (
    <tr className="group transition-colors hover:bg-slate-50/70">
      {/* DESTINATION */}

      <td className="px-5 py-4">
        <div className="flex min-w-57.5 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <ArrowUpFromLine
              size={17}
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {normalizeBankName(
                withdrawal.bank_name,
              )}
            </p>

            <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
              {maskAccountNumber(
                withdrawal.account_number,
              )}
              {" · "}
              {withdrawal.account_name ||
                "-"}
            </p>
          </div>
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
              withdrawal.created_at,
            )}
          </span>
        </div>
      </td>

      {/* AMOUNT */}

      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-sm font-black text-slate-900">
          {formatRupiah(
            amount,
          )}
        </span>
      </td>

      {/* FEE */}

      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
          {formatRupiah(
            fee,
          )}
        </span>
      </td>

      {/* HELD */}

      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-sm font-black text-indigo-700">
          {formatRupiah(
            heldAmount,
          )}
        </span>
      </td>

      {/* STATUS */}

      <td className="px-5 py-4 text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold ${style.badge}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
          />

          {status}
        </span>
      </td>

      {/* ACTION */}

      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() =>
            onView(
              withdrawal,
            )
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
          aria-label="Lihat detail penarikan"
        >
          <Eye size={15} />
        </button>
      </td>
    </tr>
  );
}

/* ================================================================== */
/* MOBILE CARD                                                        */
/* ================================================================== */

function MobileWithdrawalCard({
  withdrawal,
  onView,
}: {
  withdrawal: Withdrawal;

  onView: (
    withdrawal: Withdrawal,
  ) => void;
}) {
  const status =
    normalizeWithdrawalStatus(
      withdrawal.status,
    );

  const style =
    getStatusClasses(
      status,
    );

  const amount =
    toNumber(
      withdrawal.amount,
    );

  const fee =
    toNumber(
      withdrawal.admin_fee,
    );

  const heldAmount =
    withdrawal.held_amount !==
      null &&
    withdrawal.held_amount !==
      undefined
      ? toNumber(
          withdrawal.held_amount,
        )
      : amount + fee;

  return (
    <article className="p-3 xs:p-4 min-w-0">
      <button
        type="button"
        onClick={() =>
          onView(
            withdrawal,
          )
        }
        className="w-full text-left min-w-0"
      >
        <div className="flex items-start justify-between gap-2 xs:gap-3 min-w-0">
          <div className="flex min-w-0 items-start gap-2 xs:gap-3 flex-1">
            <div className="flex h-8 w-8 xs:h-9 xs:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpFromLine
                size={15}
                className="xs:h-4 xs:w-4"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs xs:text-sm font-bold text-slate-900 leading-tight">
                {normalizeBankName(
                  withdrawal.bank_name,
                )}
              </p>

              <p className="mt-0.5 truncate text-[9px] xs:text-[10px] text-slate-400">
                {maskAccountNumber(
                  withdrawal.account_number,
                )}
                {" · "}
                {withdrawal.account_name ||
                  "-"}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 xs:px-2 py-0.2 text-[8px] font-bold ${style.badge}`}
          >
            <span
              className={`h-1 w-1 rounded-full ${style.dot}`}
            />

            {status}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl xs:rounded-2xl bg-slate-50 p-2 xs:p-2.5">
          <div className="min-w-0">
            <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 truncate">
              Nominal
            </p>

            <p className="mt-0.5 truncate text-xs xs:text-sm font-black text-slate-900">
              {formatRupiah(
                amount,
              )}
            </p>
          </div>

          <div className="text-right min-w-0">
            <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 truncate">
              Dana Ditahan
            </p>

            <p className="mt-0.5 truncate text-xs xs:text-sm font-black text-indigo-700">
              {formatRupiah(
                heldAmount,
              )}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 text-[9px] xs:text-[10px] text-slate-400">
          <span className="truncate">
            {formatDate(
              withdrawal.created_at,
            )}
          </span>

          <span className="shrink-0 font-semibold text-slate-600">
            Fee{" "}
            {formatRupiah(
              fee,
            )}
          </span>
        </div>
      </button>
    </article>
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

function WithdrawPagination({
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
          page *
            pageSize,
          totalItems,
        );

  const pages =
    buildWithdrawPageNumbers(
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
        pengajuan
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
                    ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
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

function buildWithdrawPageNumbers(
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

  if (
    current <= 3
  ) {
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

function EmptyWithdrawalState({
  onCreate,
  onReset,
}: {
  onCreate: () => void;

  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <ArrowUpFromLine
          size={21}
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-700">
        Belum ada riwayat
        penarikan
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Belum ada pengajuan tarik saldo
        atau tidak ada yang cocok dengan
        filter saat ini.
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={
            onCreate
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-rose-600"
        >
          <ArrowUpFromLine
            size={14}
          />

          Tarik Saldo
        </button>

        <button
          type="button"
          onClick={
            onReset
          }
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* DETAIL MODAL                                                       */
/* ================================================================== */

function WithdrawalDetailModal({
  withdrawal,
  onClose,
}: {
  withdrawal: Withdrawal;

  onClose: () => void;
}) {
  const status =
    normalizeWithdrawalStatus(
      withdrawal.status,
    );

  const style =
    getStatusClasses(
      status,
    );

  const amount =
    toNumber(
      withdrawal.amount,
    );

  const fee =
    toNumber(
      withdrawal.admin_fee,
    );

  const heldAmount =
    withdrawal.held_amount !==
      null &&
    withdrawal.held_amount !==
      undefined
      ? toNumber(
          withdrawal.held_amount,
        )
      : amount + fee;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600">
              Detail Penarikan Saldo
            </p>

            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
              {normalizeBankName(
                withdrawal.bank_name,
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup detail penarikan"
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

                <span
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold ${style.badge}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                  />

                  {status}
                </span>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Penarikan
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  {formatRupiah(
                    amount,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* WITHDRAWAL ASSET */}

          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <div className="flex items-center gap-2">
              <CircleDollarSign
                size={15}
                className="text-rose-600"
              />

              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-rose-700">
                Sumber Dana
              </p>
            </div>

            <p className="mt-1 text-sm font-black text-slate-900">
              Saldo DaPay
            </p>

            <p className="mt-1 text-[10px] leading-5 text-rose-700/80">
              Penarikan hanya berasal dari Saldo
              DaPay. Koin tidak ikut dicairkan.
            </p>
          </div>

          {/* DESTINATION */}

          <div className="mt-4 space-y-2">
            <DetailRow
              label="Bank / E-Wallet"
              value={normalizeBankName(
                withdrawal.bank_name,
              )}
            />

            <DetailRow
              label="Nomor Rekening"
              value={
                withdrawal.account_number ||
                "-"
              }
              sensitive
            />

            <DetailRow
              label="Atas Nama"
              value={
                withdrawal.account_name ||
                "-"
              }
            />

            <DetailRow
              label="Nominal Penarikan"
              value={formatRupiah(
                amount,
              )}
            />

            <DetailRow
              label="Biaya Admin"
              value={formatRupiah(
                fee,
              )}
            />

            <DetailRow
              label="Dana Ditahan"
              value={formatRupiah(
                heldAmount,
              )}
            />

            <DetailRow
              label="Tanggal Pengajuan"
              value={formatDate(
                withdrawal.created_at,
              )}
            />
          </div>

          {/* PENDING NOTICE */}

          {status ===
            "Pending" && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <Clock3
                  size={16}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <p className="text-[10px] leading-5 text-amber-800">
                  Pengajuan masih menunggu
                  diproses oleh Admin. Dana yang
                  diperlukan untuk penarikan sedang
                  ditahan sementara.
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS NOTICE */}

          {status ===
            "Berhasil" && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-[10px] leading-5 text-emerald-800">
                  Penarikan berhasil diproses.
                  Dana telah diselesaikan sesuai
                  metode penarikan yang dipilih.
                </p>
              </div>
            </div>
          )}

          {/* FAILED NOTICE */}

          {status ===
            "Gagal" && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-rose-600"
                />

                <p className="text-[10px] leading-5 text-rose-800">
                  Pengajuan penarikan gagal atau
                  ditolak. Saldo mengikuti proses
                  refund dari sistem.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* DETAIL ROW                                                         */
/* ================================================================== */

function DetailRow({
  label,
  value,
  sensitive = false,
}: {
  label: string;

  value: string;

  sensitive?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <span className="shrink-0 text-xs text-slate-400">
        {label}
      </span>

      <span
        className={`max-w-75 text-right text-xs font-semibold text-slate-700 ${
          sensitive
            ? "break-all"
            : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}