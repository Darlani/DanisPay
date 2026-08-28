"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Filter,
  Gift,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/utils/supabaseClient";

/* ================================================================== */
/* TYPES                                                              */
/* ================================================================== */

type AssetType = "balance" | "coin";

type BalanceLog = {
  id: string;
  user_id?: string | null;
  user_email?: string | null;

  amount?: number | string | null;

  type?: string | null;
  description?: string | null;

  initial_balance?:
    | number
    | string
    | null;

  final_balance?:
    | number
    | string
    | null;

  created_at?: string | null;

  /*
   * ================================================================
   * FUTURE WALLET / COIN CONTRACT
   * ================================================================
   *
   * Optional agar kompatibel dengan backend lama.
   *
   * Nanti backend dapat mengirim:
   *
   * asset_type = "balance" | "coin"
   *
   * dan khusus coin:
   *
   * coin_amount
   * initial_coin_balance
   * final_coin_balance
   */

  asset_type?: AssetType | null;

  coin_amount?:
    | number
    | string
    | null;

  initial_coin_balance?:
    | number
    | string
    | null;

  final_coin_balance?:
    | number
    | string
    | null;
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

    balanceLogs?: BalanceLog[];
  };

  error?: string;
};

type LogFlow =
  | "income"
  | "expense"
  | "neutral";

type FinancialEntry = {
  log: BalanceLog;

  asset: AssetType;

  amount: number;

  description: string;

  type: string;

  flow: LogFlow;
};

const PAGE_SIZE = 10;

/* ================================================================== */
/* HELPERS                                                            */
/* ================================================================== */

function toNumber(
  value: unknown,
) {
  const amount = Number(value || 0);

  return Number.isFinite(amount)
    ? amount
    : 0;
}

function formatRupiah(
  value: unknown,
) {
  const amount = toNumber(value);

  return `Rp ${Math.abs(
    amount,
  ).toLocaleString("id-ID")}`;
}

function formatSignedRupiah(
  value: unknown,
) {
  const amount = toNumber(value);

  if (amount > 0) {
    return `+Rp ${amount.toLocaleString(
      "id-ID",
    )}`;
  }

  if (amount < 0) {
    return `-Rp ${Math.abs(
      amount,
    ).toLocaleString("id-ID")}`;
  }

  return "Rp 0";
}

function formatCoins(
  value: unknown,
) {
  const amount = toNumber(value);

  return `${Math.abs(
    amount,
  ).toLocaleString("id-ID")} Koin`;
}

function formatSignedCoins(
  value: unknown,
) {
  const amount = toNumber(value);

  if (amount > 0) {
    return `+${amount.toLocaleString(
      "id-ID",
    )} Koin`;
  }

  if (amount < 0) {
    return `-${Math.abs(
      amount,
    ).toLocaleString("id-ID")} Koin`;
  }

  return "0 Koin";
}

function formatDate(
  value: unknown,
) {
  if (!value) {
    return "-";
  }

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

function normalizeType(
  type?: string | null,
) {
  return String(
    type || "",
  )
    .trim()
    .toLowerCase();
}

/* ================================================================== */
/* ASSET DETECTION                                                    */
/* ================================================================== */

function detectAsset(
  log: BalanceLog,
): AssetType {
  /*
   * Prioritas 1:
   * asset_type dari backend.
   */
  if (log.asset_type) {
    return log.asset_type;
  }

  /*
   * Prioritas 2:
   * tipe reward yang secara bisnis merupakan Koin.
   *
   * Cashback → Koin
   * Bonus    → Koin
   * Reward   → Koin
   */
  const type =
    normalizeType(
      log.type,
    );

  if (
    [
      "cashback",
      "bonus",
      "reward",
    ].includes(type)
  ) {
    return "coin";
  }

  /*
   * Semua jenis finansial lain
   * tetap Saldo selama backend
   * belum menyediakan asset_type.
   */
  return "balance";
}

/* ================================================================== */
/* FLOW DETECTION                                                     */
/* ================================================================== */

function detectFlow(
  amount: number,
): LogFlow {
  if (amount > 0) {
    return "income";
  }

  if (amount < 0) {
    return "expense";
  }

  return "neutral";
}

/* ================================================================== */
/* META                                                              */
/* ================================================================== */

function getEntryMeta(
  entry: FinancialEntry,
) {
  const type =
    normalizeType(
      entry.type,
    );

  if (
    entry.asset ===
    "coin"
  ) {
    if (
      type === "cashback"
    ) {
      return {
        label: "Cashback",

        icon: ShoppingBag,

        iconClass:
          "bg-violet-50 text-violet-600",

        badgeClass:
          "border-violet-100 bg-violet-50 text-violet-700",
      };
    }

    if (
      type === "reward" ||
      type === "bonus"
    ) {
      return {
        label:
          entry.type ||
          "Reward",

        icon: Gift,

        iconClass:
          "bg-violet-50 text-violet-600",

        badgeClass:
          "border-violet-100 bg-violet-50 text-violet-700",
      };
    }

    if (
      type === "refund"
    ) {
      return {
        label: "Refund Koin",

        icon: RefreshCw,

        iconClass:
          "bg-violet-50 text-violet-600",

        badgeClass:
          "border-violet-100 bg-violet-50 text-violet-700",
      };
    }

    return {
      label:
        entry.type ||
        "Koin",

      icon: Coins,

      iconClass:
        "bg-violet-50 text-violet-600",

      badgeClass:
        "border-violet-100 bg-violet-50 text-violet-700",
    };
  }

  if (
    type === "referral" ||
    type === "commission"
  ) {
    return {
      label:
        entry.type ||
        "Pendapatan",

      icon: Gift,

      iconClass:
        "bg-emerald-50 text-emerald-600",

      badgeClass:
        "border-emerald-100 bg-emerald-50 text-emerald-700",
    };
  }

  if (
    type === "deposit"
  ) {
    return {
      label: "Deposit",

      icon: ArrowDownLeft,

      iconClass:
        "bg-emerald-50 text-emerald-600",

      badgeClass:
        "border-emerald-100 bg-emerald-50 text-emerald-700",
    };
  }

  if (
    type === "withdraw"
  ) {
    return {
      label: "Penarikan",

      icon: ArrowUpRight,

      iconClass:
        "bg-rose-50 text-rose-600",

      badgeClass:
        "border-rose-100 bg-rose-50 text-rose-700",
    };
  }

  if (
    type === "payment" ||
    type === "purchase" ||
    type === "order"
  ) {
    return {
      label:
        entry.type ||
        "Pembelian",

      icon: Package,

      iconClass:
        "bg-blue-50 text-blue-600",

      badgeClass:
        "border-blue-100 bg-blue-50 text-blue-700",
    };
  }

  if (
    type === "refund"
  ) {
    return {
      label: "Refund",

      icon: RefreshCw,

      iconClass:
        "bg-amber-50 text-amber-600",

      badgeClass:
        "border-amber-100 bg-amber-50 text-amber-700",
    };
  }

  if (
    entry.flow ===
    "expense"
  ) {
    return {
      label:
        entry.type ||
        "Pengeluaran",

      icon: ArrowUpRight,

      iconClass:
        "bg-rose-50 text-rose-600",

      badgeClass:
        "border-rose-100 bg-rose-50 text-rose-700",
    };
  }

  return {
    label:
      entry.type ||
      "Saldo",

    icon:
      entry.flow ===
      "income"
        ? ArrowDownLeft
        : WalletCards,

    iconClass:
      entry.flow ===
      "income"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-slate-100 text-slate-500",

    badgeClass:
      entry.flow ===
      "income"
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600",
  };
}

function flowLabel(
  flow: LogFlow,
) {
  if (
    flow === "income"
  ) {
    return "Masuk";
  }

  if (
    flow === "expense"
  ) {
    return "Keluar";
  }

  return "Netral";
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
/* PAGE                                                               */
/* ================================================================== */

export default function WalletViewUser() {
  const [logs, setLogs] =
    useState<BalanceLog[]>(
      [],
    );

  const [balance, setBalance] =
    useState(0);

  const [coinBalance, setCoinBalance] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    assetFilter,
    setAssetFilter,
  ] = useState<
    "Semua" | "Saldo" | "Koin"
  >("Semua");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("Semua");

  const [
    flowFilter,
    setFlowFilter,
  ] = useState("Semua");

  const [dateFilter, setDateFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [
    selectedLog,
    setSelectedLog,
  ] =
    useState<BalanceLog | null>(
      null,
    );

  /* ================================================================= */
  /* FETCH                                                             */
  /* ================================================================= */

  const fetchWalletData =
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
                "Gagal memuat riwayat keuangan.",
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
           * Kalau backend nanti sudah mengirim
           * coin_balance, langsung dipakai.
           *
           * Sebelum itu = 0.
           */
          setCoinBalance(
            toNumber(
              result.data
                ?.profile
                ?.coin_balance,
            ),
          );

          setLogs(
            Array.isArray(
              result.data
                ?.balanceLogs,
            )
              ? result.data
                  .balanceLogs
              : [],
          );
        } catch (error) {
          console.error(
            "WalletViewUser:",
            error,
          );
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void fetchWalletData(
      true,
    );
  }, [fetchWalletData]);

  /* ================================================================= */
  /* FINANCIAL ENTRIES                                                 */
  /* ================================================================= */

  const entries =
    useMemo<
      FinancialEntry[]
    >(() => {
      return logs.map(
        (log) => {
          const asset =
            detectAsset(log);

          const amount =
            asset === "coin"
              ? log.coin_amount !==
                  null &&
                log.coin_amount !==
                  undefined
                ? toNumber(
                    log.coin_amount,
                  )
                : toNumber(
                    log.amount,
                  )
              : toNumber(
                  log.amount,
                );

          return {
            log,

            asset,

            amount,

            description:
              log.description ||
              log.type ||
              "Aktivitas",

            type:
              log.type ||
              "Aktivitas",

            flow:
              detectFlow(
                amount,
              ),
          };
        },
      );
    }, [logs]);

  /* ================================================================= */
  /* TYPES                                                             */
  /* ================================================================= */

  const types =
    useMemo(() => {
      return Array.from(
        new Set(
          entries
            .map(
              (entry) =>
                entry.type?.trim(),
            )
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        String(a).localeCompare(
          String(b),
          "id",
        ),
      ) as string[];
    }, [entries]);

  /* ================================================================= */
  /* SUMMARY                                                           */
  /* ================================================================= */

  const balanceIncome =
    useMemo(() => {
      return entries
        .filter(
          (entry) =>
            entry.asset ===
              "balance" &&
            entry.amount >
              0,
        )
        .reduce(
          (sum, entry) =>
            sum +
            entry.amount,
          0,
        );
    }, [entries]);

  const balanceExpense =
    useMemo(() => {
      return Math.abs(
        entries
          .filter(
            (entry) =>
              entry.asset ===
                "balance" &&
              entry.amount <
                0,
          )
          .reduce(
            (sum, entry) =>
              sum +
              entry.amount,
            0,
          ),
      );
    }, [entries]);

  const coinEarned =
    useMemo(() => {
      return entries
        .filter(
          (entry) =>
            entry.asset ===
              "coin" &&
            entry.amount >
              0,
        )
        .reduce(
          (sum, entry) =>
            sum +
            entry.amount,
          0,
        );
    }, [entries]);

  const coinUsed =
    useMemo(() => {
      return Math.abs(
        entries
          .filter(
            (entry) =>
              entry.asset ===
                "coin" &&
              entry.amount <
                0,
          )
          .reduce(
            (sum, entry) =>
              sum +
              entry.amount,
            0,
          ),
      );
    }, [entries]);

  /* ================================================================= */
  /* FILTERED LOGS                                                     */
  /* ================================================================= */

  const filteredEntries =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return entries.filter(
        (entry) => {
          const searchable =
            [
              entry.type,
              entry.description,
              entry.asset,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchable.includes(
              keyword,
            );

          const matchesAsset =
            assetFilter ===
              "Semua" ||
            (assetFilter ===
              "Saldo" &&
              entry.asset ===
                "balance") ||
            (assetFilter ===
              "Koin" &&
              entry.asset ===
                "coin");

          const matchesType =
            typeFilter ===
              "Semua" ||
            entry.type ===
              typeFilter;

          const matchesFlow =
            flowFilter ===
              "Semua" ||
            flowLabel(
              entry.flow,
            ) === flowFilter;

          const matchesDate =
            !dateFilter ||
            (entry.log.created_at &&
              entry.log.created_at.slice(
                0,
                10,
              ) ===
                dateFilter);

          return (
            matchesSearch &&
            matchesAsset &&
            matchesType &&
            matchesFlow &&
            matchesDate
          );
        },
      );
    }, [
      assetFilter,
      dateFilter,
      entries,
      flowFilter,
      search,
      typeFilter,
    ]);

  /* ================================================================= */
  /* PAGINATION                                                        */
  /* ================================================================= */

  useEffect(() => {
    setPage(1);
  }, [
    search,
    assetFilter,
    typeFilter,
    flowFilter,
    dateFilter,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredEntries.length /
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

  const visibleEntries =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredEntries.slice(
        start,
        start + PAGE_SIZE,
      );
    }, [
      filteredEntries,
      page,
    ]);

  const resetFilters =
    () => {
      setSearch("");

      setAssetFilter(
        "Semua",
      );

      setTypeFilter(
        "Semua",
      );

      setFlowFilter(
        "Semua",
      );

      setDateFilter("");

      setPage(1);
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
            className="animate-spin text-blue-600"
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
              <p className="text-[10px] font-black uppercase tracking-[0.27em] text-blue-600">
                Financial Activity
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Riwayat Keuangan
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
                Pantau seluruh aktivitas
                Saldo DaPay dan Koin
                DaPay dalam satu tempat.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void fetchWalletData(
                  false,
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 lg:self-center"
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
        {/* ASSET SUMMARY                                          */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 lg:grid-cols-2">
          {/* SALDO */}
          <div className="relative overflow-hidden rounded-[26px] bg-linear-to-br from-blue-600 via-blue-600 to-indigo-700 p-5 text-white shadow-[0_14px_32px_rgba(37,99,235,0.15)] sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <CircleDollarSign
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-100">
                      Saldo DaPay
                    </p>

                    <p className="mt-1 text-2xl font-black tracking-tight">
                      {formatRupiah(
                        balance,
                      )}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-blue-100">
                  Bisa ditarik
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[8px] uppercase tracking-wider text-blue-100">
                    Saldo Masuk
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {formatRupiah(
                      balanceIncome,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[8px] uppercase tracking-wider text-blue-100">
                    Saldo Keluar
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {formatRupiah(
                      balanceExpense,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KOIN */}
          <div className="relative overflow-hidden rounded-[26px] border border-violet-100 bg-linear-to-br from-violet-50 via-white to-purple-50 p-5 shadow-[0_12px_30px_rgba(124,58,237,0.07)] sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Coins size={18} />
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-600">
                      Koin DaPay
                    </p>

                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                      {formatCoins(
                        coinBalance,
                      )}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-violet-700">
                  Tidak bisa ditarik
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-violet-100 bg-white/80 p-3">
                  <p className="text-[8px] uppercase tracking-wider text-violet-500">
                    Diperoleh
                  </p>

                  <p className="mt-1 text-sm font-black text-violet-700">
                    {formatCoins(
                      coinEarned,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-violet-100 bg-white/80 p-3">
                  <p className="text-[8px] uppercase tracking-wider text-violet-500">
                    Digunakan
                  </p>

                  <p className="mt-1 text-sm font-black text-violet-700">
                    {formatCoins(
                      coinUsed,
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[9px] leading-4 text-slate-500">
                Koin digunakan untuk transaksi
                dan reward sesuai ketentuan.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* ASSET FILTER                                           */}
        {/* ====================================================== */}

        <section className="mb-4 rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <AssetTab
              active={
                assetFilter ===
                "Semua"
              }
              icon={
                <WalletCards
                  size={15}
                />
              }
              label="Semua"
              onClick={() =>
                setAssetFilter(
                  "Semua",
                )
              }
            />

            <AssetTab
              active={
                assetFilter ===
                "Saldo"
              }
              icon={
                <CircleDollarSign
                  size={15}
                />
              }
              label="Saldo"
              onClick={() =>
                setAssetFilter(
                  "Saldo",
                )
              }
            />

            <AssetTab
              active={
                assetFilter ===
                "Koin"
              }
              icon={
                <Coins size={15} />
              }
              label="Koin"
              onClick={() =>
                setAssetFilter(
                  "Koin",
                )
              }
            />
          </div>
        </section>

        {/* ====================================================== */}
        {/* FILTER                                                 */}
        {/* ====================================================== */}

        <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(300px,1.4fr)_190px_190px_190px]">
            {/* SEARCH */}
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
                placeholder="Cari deskripsi atau tipe transaksi..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* TYPE */}
            <FilterSelect
              value={typeFilter}
              onChange={
                setTypeFilter
              }
              options={[
                "Semua",
                ...types,
              ]}
              placeholder="Semua Tipe"
            />

            {/* FLOW */}
            <FilterSelect
              value={flowFilter}
              onChange={
                setFlowFilter
              }
              options={[
                "Semua",
                "Masuk",
                "Keluar",
                "Netral",
              ]}
              placeholder="Semua Arus"
            />

            {/* DATE */}
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
                    visibleEntries.length
                  }
                </strong>{" "}
                dari{" "}
                <strong className="font-bold text-slate-600">
                  {
                    filteredEntries.length
                  }
                </strong>{" "}
                aktivitas
              </span>
            </div>

            {(search ||
              assetFilter !==
                "Semua" ||
              typeFilter !==
                "Semua" ||
              flowFilter !==
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
        {/* LEDGER                                                 */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <WalletCards
                  size={15}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Aktivitas Keuangan
                </p>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  Saldo dan Koin ditampilkan
                  terpisah.
                </p>
              </div>
            </div>
          </div>

          {filteredEntries.length ===
          0 ? (
            <EmptyWalletState
              onReset={
                resetFilters
              }
            />
          ) : (
            <>
              {/* ================================================= */}
              {/* DESKTOP                                             */}
              {/* ================================================= */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-270 border-collapse">
                  <thead className="border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <WalletTableHeading label="Aktivitas" />

                      <WalletTableHeading label="Aset" />

                      <WalletTableHeading label="Tipe" />

                      <WalletTableHeading label="Tanggal" />

                      <WalletTableHeading
                        label="Perubahan"
                        align="right"
                      />

                      <WalletTableHeading
                        label="Saldo Sebelum"
                        align="right"
                      />

                      <WalletTableHeading
                        label="Saldo Sesudah"
                        align="right"
                      />

                      <WalletTableHeading
                        label="Aksi"
                        align="center"
                      />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleEntries.map(
                      (
                        entry,
                      ) => (
                        <DesktopWalletRow
                          key={
                            entry.log.id
                          }
                          entry={
                            entry
                          }
                          onView={
                            setSelectedLog
                          }
                        />
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* ================================================= */}
              {/* MOBILE                                              */}
              {/* ================================================= */}

              <div className="divide-y divide-slate-100 md:hidden">
                {visibleEntries.map(
                  (
                    entry,
                  ) => (
                    <MobileWalletCard
                      key={
                        entry.log.id
                      }
                      entry={
                        entry
                      }
                      onView={
                        setSelectedLog
                      }
                    />
                  ),
                )}
              </div>

              {/* ================================================= */}
              {/* PAGINATION                                          */}
              {/* ================================================= */}

              <WalletPagination
                page={page}
                totalPages={
                  totalPages
                }
                totalItems={
                  filteredEntries.length
                }
                pageSize={
                  PAGE_SIZE
                }
                onPrevious={() =>
                  setPage(
                    (
                      value,
                    ) =>
                      Math.max(
                        1,
                        value - 1,
                      ),
                  )
                }
                onNext={() =>
                  setPage(
                    (
                      value,
                    ) =>
                      Math.min(
                        totalPages,
                        value + 1,
                      ),
                  )
                }
                onPage={setPage}
              />
            </>
          )}
        </section>

        {/* ====================================================== */}
        {/* FINANCIAL RULES                                        */}
        {/* ====================================================== */}

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-start gap-3">
              <CircleDollarSign
                size={17}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-blue-700">
                  Saldo DaPay
                </p>

                <p className="mt-1 text-[10px] leading-5 text-blue-800/80">
                  Saldo dapat digunakan untuk
                  transaksi dan dapat ditarik
                  sesuai ketentuan.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-violet-100 bg-violet-50/60 p-4">
            <div className="flex items-start gap-3">
              <Coins
                size={17}
                className="mt-0.5 shrink-0 text-violet-600"
              />

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-violet-700">
                  Koin DaPay
                </p>

                <p className="mt-1 text-[10px] leading-5 text-violet-800/80">
                  Koin dapat digunakan untuk transaksi,
                  tetapi tidak dapat dicairkan.
                  Cashback masuk ke Koin, bukan Saldo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="pb-10 pt-8 text-center text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-300">
          © 2026 DANISHTOPUP OFFICIAL PARTNER
        </p>
      </div>

      {/* ============================================================ */}
      {/* DETAIL MODAL                                                 */}
      {/* ============================================================ */}

      {selectedLog && (
        <WalletDetailModal
          log={selectedLog}
          onClose={() =>
            setSelectedLog(
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

function DesktopWalletRow({
  entry,
  onView,
}: {
  entry: FinancialEntry;

  onView: (
    log: BalanceLog,
  ) => void;
}) {
  const meta =
    getEntryMeta(entry);

  const Icon =
    meta.icon;

  const amount =
    entry.amount;

  const log =
    entry.log;

  const isCoin =
    entry.asset ===
    "coin";

  const before =
    isCoin
      ? log.initial_coin_balance
      : log.initial_balance;

  const after =
    isCoin
      ? log.final_coin_balance
      : log.final_balance;

  return (
    <tr className="group transition-colors hover:bg-slate-50/70">
      {/* ACTIVITY */}
      <td className="px-5 py-4">
        <div className="flex min-w-62.5 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}
          >
            <Icon size={17} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {entry.description}
            </p>

            <p className="mt-1 truncate text-[10px] text-slate-400">
              {flowLabel(
                entry.flow,
              )}
            </p>
          </div>
        </div>
      </td>

      {/* ASSET */}
      <td className="px-5 py-4">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em]",
            isCoin
              ? "border-violet-100 bg-violet-50 text-violet-700"
              : "border-blue-100 bg-blue-50 text-blue-700",
          ].join(" ")}
        >
          {isCoin ? (
            <Coins size={11} />
          ) : (
            <CircleDollarSign
              size={11}
            />
          )}

          {isCoin
            ? "Koin"
            : "Saldo"}
        </span>
      </td>

      {/* TYPE */}
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
      </td>

      {/* DATE */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays
            size={13}
            className="text-slate-400"
          />

          <span className="whitespace-nowrap">
            {formatDate(
              log.created_at,
            )}
          </span>
        </div>
      </td>

      {/* CHANGE */}
      <td className="px-5 py-4 text-right">
        <span
          className={`whitespace-nowrap text-sm font-black ${
            amount > 0
              ? isCoin
                ? "text-violet-600"
                : "text-emerald-600"
              : amount < 0
                ? "text-rose-600"
                : "text-slate-500"
          }`}
        >
          {isCoin
            ? formatSignedCoins(
                amount,
              )
            : formatSignedRupiah(
                amount,
              )}
        </span>
      </td>

      {/* BEFORE */}
      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
          {isCoin
            ? formatCoins(
                before,
              )
            : formatRupiah(
                before,
              )}
        </span>
      </td>

      {/* AFTER */}
      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-xs font-black text-slate-800">
          {isCoin
            ? formatCoins(
                after,
              )
            : formatRupiah(
                after,
              )}
        </span>
      </td>

      {/* ACTION */}
      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() =>
            onView(log)
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
          aria-label="Lihat detail aktivitas"
        >
          <EyeIcon />
        </button>
      </td>
    </tr>
  );
}

/* ================================================================== */
/* MOBILE CARD                                                        */
/* ================================================================== */

function MobileWalletCard({
  entry,
  onView,
}: {
  entry: FinancialEntry;

  onView: (
    log: BalanceLog,
  ) => void;
}) {
  const meta =
    getEntryMeta(entry);

  const Icon =
    meta.icon;

  const log =
    entry.log;

  const isCoin =
    entry.asset ===
    "coin";

  const before =
    isCoin
      ? log.initial_coin_balance
      : log.initial_balance;

  const after =
    isCoin
      ? log.final_coin_balance
      : log.final_balance;

  return (
    <article className="p-3 xs:p-4 min-w-0">
      <button
        type="button"
        onClick={() =>
          onView(log)
        }
        className="w-full text-left min-w-0"
      >
        <div className="flex items-start justify-between gap-2 xs:gap-3 min-w-0">
          <div className="flex min-w-0 items-start gap-2 xs:gap-3 flex-1">
            <div
              className={`flex h-8 w-8 xs:h-9 xs:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl ${meta.iconClass}`}
            >
              <Icon size={15} className="xs:h-4 xs:w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs xs:text-sm font-bold text-slate-900 leading-tight">
                {entry.description}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 xs:gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-1.5 xs:px-2 py-0.2 text-[8px] font-bold uppercase tracking-[0.08em]",
                    isCoin
                      ? "border-violet-100 bg-violet-50 text-violet-700"
                      : "border-blue-100 bg-blue-50 text-blue-700",
                  ].join(" ")}
                >
                  {isCoin ? (
                    <Coins
                      size={8}
                    />
                  ) : (
                    <CircleDollarSign
                      size={8}
                    />
                  )}

                  {isCoin
                    ? "Koin"
                    : "Saldo"}
                </span>

                <span className="truncate text-[8.5px] xs:text-[9px] text-slate-400">
                  {formatDate(
                    log.created_at,
                  )}
                </span>
              </div>
            </div>
          </div>

          <span
            className={`shrink-0 text-xs xs:text-sm font-black leading-tight ${
              entry.amount >
              0
                ? isCoin
                  ? "text-violet-600"
                  : "text-emerald-600"
                : entry.amount <
                    0
                  ? "text-rose-600"
                  : "text-slate-500"
            }`}
          >
            {isCoin
              ? formatSignedCoins(
                  entry.amount,
                )
              : formatSignedRupiah(
                  entry.amount,
                )}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl xs:rounded-2xl bg-slate-50 p-2 xs:p-2.5">
          <div className="min-w-0">
            <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 truncate">
              Sebelum
            </p>

            <p className="mt-0.5 truncate text-[11px] xs:text-xs font-semibold text-slate-600">
              {isCoin
                ? formatCoins(
                    before,
                  )
                : formatRupiah(
                    before,
                  )}
            </p>
          </div>

          <div className="text-right min-w-0">
            <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 truncate">
              Sesudah
            </p>

            <p className="mt-0.5 truncate text-[11px] xs:text-xs font-black text-slate-800">
              {isCoin
                ? formatCoins(
                    after,
                  )
                : formatRupiah(
                    after,
                  )}
            </p>
          </div>
        </div>
      </button>
    </article>
  );
}

/* ================================================================== */
/* ASSET TAB                                                          */
/* ================================================================== */

function AssetTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;

  icon: React.ReactNode;

  label: string;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-slate-50 text-slate-600 hover:bg-slate-100",
      ].join(" ")}
    >
      {icon}

      {label}
    </button>
  );
}

/* ================================================================== */
/* TABLE HEADING                                                      */
/* ================================================================== */

function WalletTableHeading({
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

function WalletPagination({
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
    buildWalletPageNumbers(
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
        aktivitas
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
                ].join(" ")}
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

function buildWalletPageNumbers(
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

function EmptyWalletState({
  onReset,
}: {
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <WalletCards
          size={21}
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-700">
        Aktivitas belum ditemukan
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Belum ada aktivitas yang
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

function WalletDetailModal({
  log,
  onClose,
}: {
  log: BalanceLog;

  onClose: () => void;
}) {
  const asset =
    detectAsset(log);

  const amount =
    asset === "coin"
      ? log.coin_amount !==
          null &&
        log.coin_amount !==
          undefined
        ? toNumber(
            log.coin_amount,
          )
        : toNumber(
            log.amount,
          )
      : toNumber(
          log.amount,
        );

  const flow =
    detectFlow(amount);

  const entry: FinancialEntry =
    {
      log,

      asset,

      amount,

      description:
        log.description ||
        log.type ||
        "Aktivitas",

      type:
        log.type ||
        "Aktivitas",

      flow,
    };

  const meta =
    getEntryMeta(
      entry,
    );

  const Icon =
    meta.icon;

  const isCoin =
    asset === "coin";

  const before =
    isCoin
      ? log.initial_coin_balance
      : log.initial_balance;

  const after =
    isCoin
      ? log.final_coin_balance
      : log.final_balance;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}
            >
              <Icon size={17} />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
                Detail Keuangan
              </p>

              <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
                {meta.label}
              </h2>
            </div>
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
          {/* ASSET */}
          <div
            className={
              isCoin
                ? "rounded-2xl border border-violet-100 bg-violet-50 p-5"
                : "rounded-2xl border border-blue-100 bg-blue-50 p-5"
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Aset
                </p>

                <p
                  className={
                    isCoin
                      ? "mt-1 text-sm font-black text-violet-700"
                      : "mt-1 text-sm font-black text-blue-700"
                  }
                >
                  {isCoin
                    ? "Koin DaPay"
                    : "Saldo DaPay"}
                </p>
              </div>

              <div
                className={
                  isCoin
                    ? "flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600"
                    : "flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600"
                }
              >
                {isCoin ? (
                  <Coins
                    size={18}
                  />
                ) : (
                  <CircleDollarSign
                    size={18}
                  />
                )}
              </div>
            </div>

            <p
              className={`mt-5 text-3xl font-black tracking-tight ${
                amount > 0
                  ? isCoin
                    ? "text-violet-700"
                    : "text-emerald-700"
                  : amount < 0
                    ? "text-rose-700"
                    : "text-slate-700"
              }`}
            >
              {isCoin
                ? formatSignedCoins(
                    amount,
                  )
                : formatSignedRupiah(
                    amount,
                  )}
            </p>

            <p className="mt-1 text-[10px] font-semibold uppercase text-slate-400">
              {flowLabel(
                flow,
              )}
            </p>
          </div>

          {/* DETAILS */}
          <div className="mt-4 space-y-2">
            <DetailRow
              label="Deskripsi"
              value={
                log.description ||
                "-"
              }
            />

            <DetailRow
              label="Tipe"
              value={
                log.type ||
                "Aktivitas"
              }
            />

            <DetailRow
              label="Aset"
              value={
                isCoin
                  ? "Koin DaPay"
                  : "Saldo DaPay"
              }
            />

            <DetailRow
              label="Tanggal"
              value={formatDate(
                log.created_at,
              )}
            />

            <DetailRow
              label={
                isCoin
                  ? "Koin Sebelum"
                  : "Saldo Sebelum"
              }
              value={
                isCoin
                  ? formatCoins(
                      before,
                    )
                  : formatRupiah(
                      before,
                    )
              }
            />

            <DetailRow
              label="Perubahan"
              value={
                isCoin
                  ? formatSignedCoins(
                      amount,
                    )
                  : formatSignedRupiah(
                      amount,
                    )
              }
            />

            <DetailRow
              label={
                isCoin
                  ? "Koin Sesudah"
                  : "Saldo Sesudah"
              }
              value={
                isCoin
                  ? formatCoins(
                      after,
                    )
                  : formatRupiah(
                      after,
                    )
              }
            />
          </div>

          {/* RULE */}
          <div
            className={
              isCoin
                ? "mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4"
                : "mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4"
            }
          >
            <p
              className={
                isCoin
                  ? "text-[10px] leading-5 text-violet-800"
                  : "text-[10px] leading-5 text-blue-800"
              }
            >
              {isCoin
                ? "Koin DaPay digunakan untuk transaksi/reward dan tidak dapat dicairkan."
                : "Saldo DaPay dapat digunakan untuk transaksi dan dapat ditarik sesuai ketentuan."}
            </p>
          </div>
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
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <span className="shrink-0 text-xs text-slate-400">
        {label}
      </span>

      <span className="max-w-75 text-right text-xs font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
}

/* ================================================================== */
/* EYE ICON                                                           */
/* ================================================================== */

function EyeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.94 10.94 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.94 10.94 0 0 1-19.88 0" />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}