"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownToLine,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  ExternalLink,
  Filter,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { supabase } from "@/utils/supabaseClient";

/* ================================================================== */
/* TYPES                                                              */
/* ================================================================== */

type DepositPaymentMethod = {
  methodKey: string;
  name: string;
  accountName: string;
  accountNo: string;
  logoUrl: string | null;
  isQr: boolean;
  minPrice: string | null;
};

type DepositInstruction = {
  depositId: string;
  amount: string;
  uniqueCode: number;
  totalAmount: string;
  payment: Omit<
    DepositPaymentMethod,
    "minPrice"
  >;
  adminContact: string | null;
  qrisString: string | null;
};

type Deposit = {
  id: string;
  amount?: number | string | null;
  unique_code?: number | string | null;
  total_amount?: number | string | null;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
  deposit_id?: string | null;
};

type DashboardResponse = {
  success?: boolean;

  data?: {
    deposits?: Deposit[];

    profile?: {
      balance?: number | string | null;

      /*
       * Optional untuk kontrak wallet baru.
       * Deposit tetap hanya menambah Saldo DaPay.
       */
      coin_balance?:
        | number
        | string
        | null;
    };
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
  const amount = Number(
    value || 0,
  );

  return Number.isFinite(
    amount,
  )
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

function formatDepositAmount(
  amount: string,
) {
  try {
    return new Intl.NumberFormat(
      "id-ID",
    ).format(
      BigInt(amount),
    );
  } catch {
    return amount;
  }
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

function normalizeDepositStatus(
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

function normalizePaymentName(
  value?: string | null,
) {
  if (!value) {
    return "-";
  }

  const method =
    value
      .trim()
      .toLowerCase();

  if (
    method === "qris"
  ) {
    return "QRIS";
  }

  if (
    method === "dana"
  ) {
    return "DANA";
  }

  if (
    method === "gopay"
  ) {
    return "GoPay";
  }

  if (
    method === "ovo"
  ) {
    return "OVO";
  }

  if (
    method === "shopeepay"
  ) {
    return "ShopeePay";
  }

  if (
    method === "bni_manual"
  ) {
    return "BNI";
  }

  if (
    method === "bsi_manual"
  ) {
    return "BSI";
  }

  return value;
}

function getDepositId(
  deposit: Deposit,
) {
  return (
    deposit.deposit_id ||
    deposit.id ||
    "-"
  );
}

function displayDepositId(
  value: string,
) {
  if (
    !value ||
    value === "-"
  ) {
    return "-";
  }

  if (
    value.length <= 12
  ) {
    return value;
  }

  return `${value.slice(
    0,
    8,
  )}...${value.slice(
    -4,
  )}`;
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
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        aria-label={
          placeholder
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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

export default function DepositViewUser() {
  /* ---------------------------------------------------------------- */
  /* DATA                                                             */
  /* ---------------------------------------------------------------- */

  const [
    deposits,
    setDeposits,
  ] = useState<
    Deposit[]
  >([]);

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
    paymentFilter,
    setPaymentFilter,
  ] = useState("Semua");

  const [
    dateFilter,
    setDateFilter,
  ] = useState("");

  const [page, setPage] =
    useState(1);

  /* ---------------------------------------------------------------- */
  /* CREATE DEPOSIT                                                   */
  /* ---------------------------------------------------------------- */

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    depositAmount,
    setDepositAmount,
  ] = useState("");

  const [
    depositMethods,
    setDepositMethods,
  ] = useState<
    DepositPaymentMethod[]
  >([]);

  const [
    selectedDepositMethodKey,
    setSelectedDepositMethodKey,
  ] = useState("");

  const [
    isLoadingDepositMethods,
    setIsLoadingDepositMethods,
  ] = useState(false);

  const [
    isProcessingDeposit,
    setIsProcessingDeposit,
  ] = useState(false);

  /* ---------------------------------------------------------------- */
  /* INSTRUCTION / DETAIL                                             */
  /* ---------------------------------------------------------------- */

  const [
    depositInstruction,
    setDepositInstruction,
  ] =
    useState<DepositInstruction | null>(
      null,
    );

  const [
    selectedDeposit,
    setSelectedDeposit,
  ] =
    useState<Deposit | null>(
      null,
    );

  /* ================================================================= */
  /* FETCH DATA                                                        */
  /* ================================================================= */

  const fetchDepositData =
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
                "Gagal memuat riwayat deposit.",
            );
          }

          setBalance(
            toNumber(
              result.data
                ?.profile
                ?.balance,
            ),
          );

          setCoinBalance(
            toNumber(
              result.data
                ?.profile
                ?.coin_balance,
            ),
          );

          setDeposits(
            Array.isArray(
              result.data
                ?.deposits,
            )
              ? result.data
                  .deposits
              : [],
          );
        } catch (error) {
          console.error(
            "DepositViewUser:",
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
    void fetchDepositData(
      true,
    );
  }, [
    fetchDepositData,
  ]);

  /* ================================================================= */
  /* PAYMENT METHOD OPTIONS                                            */
  /* ================================================================= */

  const paymentOptions =
    useMemo(() => {
      return Array.from(
        new Set(
          deposits
            .map(
              (
                deposit,
              ) =>
                normalizePaymentName(
                  deposit.payment_method,
                ),
            )
            .filter(
              (value) =>
                value !== "-",
            ),
        ),
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "id",
        ),
      );
    }, [deposits]);

  /* ================================================================= */
  /* SUMMARY                                                           */
  /* ================================================================= */

  const summary =
    useMemo(() => {
      let successfulAmount =
        0;

      let pendingAmount =
        0;

      let successfulCount =
        0;

      let pendingCount =
        0;

      for (const deposit of deposits) {
        const amount =
          toNumber(
            deposit.amount,
          );

        const status =
          normalizeDepositStatus(
            deposit.status,
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

          pendingCount +=
            1;
        }
      }

      return {
        successfulAmount,
        pendingAmount,
        successfulCount,
        pendingCount,
      };
    }, [deposits]);

  /* ================================================================= */
  /* FILTERED DATA                                                     */
  /* ================================================================= */

  const filteredDeposits =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return deposits.filter(
        (deposit) => {
          const status =
            normalizeDepositStatus(
              deposit.status,
            );

          const payment =
            normalizePaymentName(
              deposit.payment_method,
            );

          const depositId =
            getDepositId(
              deposit,
            );

          const searchable =
            [
              depositId,
              deposit.payment_method,
              payment,
              deposit.amount,
              deposit.total_amount,
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

          const matchesPayment =
            paymentFilter ===
              "Semua" ||
            payment ===
              paymentFilter;

          const matchesDate =
            !dateFilter ||
            (deposit.created_at &&
              deposit.created_at.slice(
                0,
                10,
              ) ===
                dateFilter);

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPayment &&
            matchesDate
          );
        },
      );
    }, [
      deposits,
      dateFilter,
      paymentFilter,
      search,
      statusFilter,
    ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    paymentFilter,
    dateFilter,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredDeposits.length /
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

  const visibleDeposits =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredDeposits.slice(
        start,
        start + PAGE_SIZE,
      );
    }, [
      filteredDeposits,
      page,
    ]);

  const resetFilters =
    () => {
      setSearch("");
      setStatusFilter(
        "Semua",
      );
      setPaymentFilter(
        "Semua",
      );
      setDateFilter("");
      setPage(1);
    };

  /* ================================================================= */
  /* PAYMENT METHODS                                                   */
  /* ================================================================= */

  const loadDepositMethods =
    async () => {
      setIsLoadingDepositMethods(
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
            "/api/member/deposits/payment-methods",
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
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
              "Gagal memuat metode deposit.",
          );
        }

        const methods =
          Array.isArray(
            result.methods,
          )
            ? result.methods
            : [];

        setDepositMethods(
          methods,
        );

        setSelectedDepositMethodKey(
          (current) =>
            methods.some(
              (
                method: DepositPaymentMethod,
              ) =>
                method.methodKey ===
                current,
            )
              ? current
              : methods[0]
                  ?.methodKey ||
                "",
        );
      } catch (error) {
        setDepositMethods(
          [],
        );

        setSelectedDepositMethodKey(
          "",
        );

        alert(
          error instanceof
            Error
            ? error.message
            : "Gagal memuat metode deposit.",
        );
      } finally {
        setIsLoadingDepositMethods(
          false,
        );
      }
    };

  const openCreateDeposit =
    () => {
      setDepositInstruction(
        null,
      );

      setShowCreateForm(
        true,
      );

      void loadDepositMethods();
    };

  const closeCreateDeposit =
    () => {
      if (
        isProcessingDeposit
      ) {
        return;
      }

      setShowCreateForm(
        false,
      );

      setDepositInstruction(
        null,
      );
    };

  /* ================================================================= */
  /* QRIS                                                              */
  /* ================================================================= */

  const loadDepositQris =
    async (
      depositId: string,
      accessToken: string,
    ) => {
      const response =
        await fetch(
          `/api/member/deposits/${encodeURIComponent(
            depositId,
          )}/qris`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (
        !response.ok ||
        typeof result.qrisString !==
          "string"
      ) {
        throw new Error(
          result.error ||
            "Gagal membuat QRIS deposit.",
        );
      }

      return result.qrisString;
    };

  const retryDepositQris =
    async () => {
      if (
        !depositInstruction
      ) {
        return;
      }

      setIsProcessingDeposit(
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

        const qrisString =
          await loadDepositQris(
            depositInstruction.depositId,
            session.access_token,
          );

        setDepositInstruction(
          (current) =>
            current
              ? {
                  ...current,
                  qrisString,
                }
              : current,
        );
      } catch (error) {
        alert(
          error instanceof
            Error
            ? error.message
            : "Gagal membuat QRIS deposit.",
        );
      } finally {
        setIsProcessingDeposit(
          false,
        );
      }
    };

  /* ================================================================= */
  /* CREATE DEPOSIT                                                    */
  /* ================================================================= */

  const handleDepositRequest =
    async () => {
      const amount =
        depositAmount.trim();

      if (
        !/^(?:[1-9][0-9]*)$/.test(
          amount,
        )
      ) {
        alert(
          "Nominal deposit harus berupa bilangan bulat positif.",
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
          "Nominal deposit tidak valid.",
        );

        return;
      }

      if (
        parsedAmount <
        BigInt(
          10000,
        )
      ) {
        alert(
          "Minimal deposit Rp10.000",
        );

        return;
      }

      if (
        !selectedDepositMethodKey
      ) {
        alert(
          "Pilih metode pembayaran terlebih dahulu.",
        );

        return;
      }

      setIsProcessingDeposit(
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
            "/api/member/deposit",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization: `Bearer ${session.access_token}`,
              },

              body: JSON.stringify({
                amount,

                paymentMethodKey:
                  selectedDepositMethodKey,
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
              "Gagal membuat permintaan deposit.",
          );
        }

        const payment =
          result.payment as
            | DepositInstruction["payment"]
            | undefined;

        if (
          typeof result.depositId !==
            "string" ||
          typeof result.amount !==
            "string" ||
          !/^(?:[1-9][0-9]*)$/.test(
            result.amount,
          ) ||
          !Number.isSafeInteger(
            result.uniqueCode,
          ) ||
          result.uniqueCode <
            1 ||
          typeof result.totalAmount !==
            "string" ||
          !/^(?:[1-9][0-9]*)$/.test(
            result.totalAmount,
          ) ||
          !payment
        ) {
          throw new Error(
            "Respons deposit tidak lengkap.",
          );
        }

        const instruction: DepositInstruction =
          {
            depositId:
              result.depositId,

            amount:
              result.amount,

            uniqueCode:
              result.uniqueCode,

            totalAmount:
              result.totalAmount,

            payment,

            adminContact:
              typeof result.adminContact ===
              "string"
                ? result.adminContact
                : null,

            qrisString: null,
          };

        setDepositInstruction(
          instruction,
        );

        if (
          payment.isQr
        ) {
          const qrisString =
            await loadDepositQris(
              result.depositId,
              session.access_token,
            );

          setDepositInstruction({
            ...instruction,
            qrisString,
          });
        }

        setDepositAmount("");

        await fetchDepositData(
          false,
        );
      } catch (error) {
        alert(
          error instanceof
            Error
            ? error.message
            : "Gagal proses deposit.",
        );
      } finally {
        setIsProcessingDeposit(
          false,
        );
      }
    };

  /* ================================================================= */
  /* COPY                                                              */
  /* ================================================================= */

  const copyToClipboard =
    async (
      value: string,
      message: string,
    ) => {
      try {
        await navigator.clipboard.writeText(
          value,
        );

        alert(message);
      } catch {
        alert(
          "Gagal menyalin data.",
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
            className="animate-spin text-emerald-600"
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.27em] text-emerald-600">
                Balance
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Deposit
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                Tambahkan{" "}
                <strong>
                  Saldo DaPay
                </strong>{" "}
                melalui metode pembayaran
                yang tersedia.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void fetchDepositData(
                    false,
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                onClick={
                  openCreateDeposit
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                <PlusCircle
                  size={16}
                />

                Isi Saldo
              </button>
            </div>
          </div>
        </header>

        {/* ====================================================== */}
        {/* ASSET CARDS                                            */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 lg:grid-cols-2">
          {/* SALDO */}
          <div className="relative overflow-hidden rounded-[26px] border border-emerald-100 bg-linear-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">
                  Saldo DaPay
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {formatRupiah(
                    balance,
                  )}
                </p>

                <p className="mt-2 max-w-md text-[10px] leading-5 text-slate-500">
                  Setiap deposit akan menambah
                  Saldo DaPay.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CircleDollarSign
                  size={20}
                />
              </div>
            </div>
          </div>

          {/* KOIN */}
          <div className="relative overflow-hidden rounded-[26px] border border-violet-100 bg-linear-to-br from-violet-50 via-white to-purple-50 p-5 shadow-sm sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-600">
                  Koin DaPay
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {coinBalance.toLocaleString(
                    "id-ID",
                  )}{" "}
                  Koin
                </p>

                <p className="mt-2 max-w-md text-[10px] leading-5 text-slate-500">
                  Koin adalah aset reward yang
                  terpisah dan bukan hasil dari
                  proses deposit.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <span className="text-lg font-black">
                  C
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* SUMMARY                                                 */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* BALANCE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Saldo DaPay Saat Ini
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {formatRupiah(
                    balance,
                  )}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                  Saldo yang tersedia di akun
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
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
                  Deposit Berhasil
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
                  {formatRupiah(
                    summary.successfulAmount,
                  )}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-emerald-600">
                  {summary.successfulCount}{" "}
                  transaksi
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
                  Deposit Pending
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-amber-700">
                  {formatRupiah(
                    summary.pendingAmount,
                  )}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-amber-600">
                  {summary.pendingCount}{" "}
                  transaksi
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                <CreditCard
                  size={19}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* DEPOSIT RULE                                            */}
        {/* ====================================================== */}

        <section className="mb-5 rounded-[22px] border border-emerald-100 bg-emerald-50/60 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <ArrowDownToLine
                size={15}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Deposit Menambah Saldo DaPay
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                Setiap pembayaran deposit yang
                berhasil akan menambah{" "}
                <strong>
                  Saldo DaPay
                </strong>
                . Deposit tidak menghasilkan
                atau menambah Koin DaPay.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* FILTER                                                  */}
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
                    event.target
                      .value,
                  )
                }
                placeholder="Cari deposit ID, metode, atau nominal..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* STATUS */}
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

            {/* PAYMENT */}
            <FilterSelect
              value={
                paymentFilter
              }
              onChange={
                setPaymentFilter
              }
              options={[
                "Semua",
                ...paymentOptions,
              ]}
              placeholder="Semua Metode"
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
                    event.target
                      .value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
                    visibleDeposits.length
                  }
                </strong>{" "}
                dari{" "}
                <strong className="font-bold text-slate-600">
                  {
                    filteredDeposits.length
                  }
                </strong>{" "}
                deposit
              </span>
            </div>

            {(search ||
              statusFilter !==
                "Semua" ||
              paymentFilter !==
                "Semua" ||
              dateFilter) && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-slate-400 transition hover:text-emerald-600 sm:self-auto"
              >
                <X size={13} />

                Reset Filter
              </button>
            )}
          </div>
        </section>

        {/* ====================================================== */}
        {/* DEPOSIT TABLE                                           */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowDownToLine
                  size={15}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600">
                  Riwayat Deposit
                </p>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  Seluruh deposit masuk ke Saldo DaPay.
                </p>
              </div>
            </div>
          </div>

          {filteredDeposits.length ===
          0 ? (
            <EmptyDepositState
              onCreate={
                openCreateDeposit
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
                      <TableHeading
                        label="Deposit"
                      />

                      <TableHeading
                        label="Metode"
                      />

                      <TableHeading
                        label="Tanggal"
                      />

                      <TableHeading
                        label="Nominal Saldo"
                        align="right"
                      />

                      <TableHeading
                        label="Total Transfer"
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
                    {visibleDeposits.map(
                      (
                        deposit,
                      ) => (
                        <DesktopDepositRow
                          key={
                            deposit.id
                          }
                          deposit={
                            deposit
                          }
                          onView={
                            setSelectedDeposit
                          }
                        />
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}

              <div className="divide-y divide-slate-100 md:hidden">
                {visibleDeposits.map(
                  (
                    deposit,
                  ) => (
                    <MobileDepositCard
                      key={
                        deposit.id
                      }
                      deposit={
                        deposit
                      }
                      onView={
                        setSelectedDeposit
                      }
                    />
                  ),
                )}
              </div>

              {/* PAGINATION */}

              <DepositPagination
                page={page}
                totalPages={
                  totalPages
                }
                totalItems={
                  filteredDeposits.length
                }
                pageSize={
                  PAGE_SIZE
                }
                onPrevious={() =>
                  setPage(
                    (value) =>
                      Math.max(
                        1,
                        value - 1,
                      ),
                  )
                }
                onNext={() =>
                  setPage(
                    (value) =>
                      Math.min(
                        totalPages,
                        value + 1,
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
      {/* CREATE DEPOSIT MODAL                                         */}
      {/* ============================================================ */}

      {showCreateForm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <button
              type="button"
              onClick={
                closeCreateDeposit
              }
              disabled={
                isProcessingDeposit
              }
              className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Tutup deposit"
            >
              <X size={18} />
            </button>

            <div className="pr-10">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                Saldo DaPay
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Isi Saldo DaPay
              </h2>

              <p className="mt-1 text-[10px] leading-5 text-slate-500">
                Pembayaran deposit akan
                menambah Saldo DaPay,
                bukan Koin DaPay.
              </p>
            </div>

            {!depositInstruction ? (
              <div className="mt-7 space-y-5">
                {/* AMOUNT */}

                <div>
                  <label
                    htmlFor="deposit-amount"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Nominal Saldo DaPay
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      Rp
                    </span>

                    <input
                      id="deposit-amount"
                      type="text"
                      inputMode="numeric"
                      value={
                        depositAmount
                      }
                      onChange={(
                        event,
                      ) =>
                        setDepositAmount(
                          event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        )
                      }
                      placeholder="10000"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <p className="mt-2 text-[9px] text-slate-400">
                    Minimum deposit Rp10.000
                  </p>
                </div>

                {/* PAYMENT METHODS */}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Metode Pembayaran
                    </p>
                  </div>

                  {isLoadingDepositMethods ? (
                    <div className="flex justify-center rounded-2xl border border-slate-100 bg-slate-50 py-10">
                      <Loader2
                        size={24}
                        className="animate-spin text-emerald-600"
                      />
                    </div>
                  ) : depositMethods.length ===
                    0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                      <p className="text-xs font-semibold text-slate-500">
                        Tidak ada metode pembayaran
                        yang tersedia.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {depositMethods.map(
                        (
                          method,
                        ) => {
                          const selected =
                            selectedDepositMethodKey ===
                            method.methodKey;

                          return (
                            <button
                              key={
                                method.methodKey
                              }
                              type="button"
                              onClick={() =>
                                setSelectedDepositMethodKey(
                                  method.methodKey,
                                )
                              }
                              className={[
                                "flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all",
                                selected
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50",
                              ].join(
                                " ",
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  method.logoUrl ||
                                  "/payment/default.png"
                                }
                                alt={
                                  method.name
                                }
                                className="h-10 w-14 rounded-lg bg-slate-50 object-contain p-1"
                              />

                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[11px] font-black uppercase text-slate-800">
                                  {
                                    method.name
                                  }
                                </span>

                                {method.minPrice && (
                                  <span className="mt-0.5 block text-[8px] font-bold uppercase text-slate-400">
                                    Min. Rp
                                    {formatDepositAmount(
                                      method.minPrice,
                                    )}
                                  </span>
                                )}
                              </span>

                              {selected && (
                                <CheckCircle2
                                  size={
                                    18
                                  }
                                  className="shrink-0 text-emerald-600"
                                />
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>

                {/* RULE */}

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-2.5">
                    <CircleDollarSign
                      size={15}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <p className="text-[10px] leading-5 text-emerald-800">
                      Nominal yang Anda masukkan
                      akan menjadi{" "}
                      <strong>
                        Saldo DaPay
                      </strong>
                      . Deposit tidak menambah
                      Koin DaPay.
                    </p>
                  </div>
                </div>

                {/* SUBMIT */}

                <button
                  type="button"
                  onClick={
                    handleDepositRequest
                  }
                  disabled={
                    isProcessingDeposit ||
                    isLoadingDepositMethods ||
                    !selectedDepositMethodKey
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessingDeposit ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Memproses...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine
                        size={17}
                      />

                      Ajukan Deposit
                    </>
                  )}
                </button>
              </div>
            ) : (
              <DepositInstructionPanel
                instruction={
                  depositInstruction
                }
                isProcessing={
                  isProcessingDeposit
                }
                onRetryQris={
                  retryDepositQris
                }
                onCopy={
                  copyToClipboard
                }
                onClose={() =>
                  setShowCreateForm(
                    false,
                  )
                }
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DETAIL DEPOSIT                                               */}
      {/* ============================================================ */}

      {selectedDeposit && (
        <DepositDetailModal
          deposit={
            selectedDeposit
          }
          onClose={() =>
            setSelectedDeposit(
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

function DesktopDepositRow({
  deposit,
  onView,
}: {
  deposit: Deposit;

  onView: (
    deposit: Deposit,
  ) => void;
}) {
  const status =
    normalizeDepositStatus(
      deposit.status,
    );

  const style =
    getStatusClasses(
      status,
    );

  const depositId =
    getDepositId(
      deposit,
    );

  return (
    <tr className="group transition-colors hover:bg-slate-50/70">
      {/* DEPOSIT */}

      <td className="px-5 py-4">
        <div className="flex min-w-55 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard
              size={17}
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {displayDepositId(
                depositId,
              )}
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Deposit → Saldo DaPay
            </p>
          </div>
        </div>
      </td>

      {/* METHOD */}

      <td className="px-5 py-4">
        <span className="text-xs font-semibold text-slate-700">
          {normalizePaymentName(
            deposit.payment_method,
          )}
        </span>
      </td>

      {/* DATE */}

      <td className="px-5 py-4">
        <span className="whitespace-nowrap text-xs text-slate-500">
          {formatDate(
            deposit.created_at,
          )}
        </span>
      </td>

      {/* AMOUNT */}

      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-sm font-bold text-slate-900">
          {formatRupiah(
            deposit.amount,
          )}
        </span>
      </td>

      {/* TOTAL */}

      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-sm font-black text-emerald-600">
          {formatRupiah(
            deposit.total_amount ??
              deposit.amount,
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
              deposit,
            )
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-50"
          aria-label="Lihat detail deposit"
        >
          <ExternalLink
            size={14}
          />
        </button>
      </td>
    </tr>
  );
}

/* ================================================================== */
/* MOBILE CARD                                                        */
/* ================================================================== */

function MobileDepositCard({
  deposit,
  onView,
}: {
  deposit: Deposit;

  onView: (
    deposit: Deposit,
  ) => void;
}) {
  const status =
    normalizeDepositStatus(
      deposit.status,
    );

  const style =
    getStatusClasses(
      status,
    );

  return (
    <article className="p-4">
      <button
        type="button"
        onClick={() =>
          onView(
            deposit,
          )
        }
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard
                size={17}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {displayDepositId(
                  getDepositId(
                    deposit,
                  ),
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                {normalizePaymentName(
                  deposit.payment_method,
                )}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-bold ${style.badge}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
            />

            {status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Nominal Saldo
            </p>

            <p className="mt-1 text-sm font-black text-slate-900">
              {formatRupiah(
                deposit.amount,
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Total Transfer
            </p>

            <p className="mt-1 text-sm font-black text-emerald-600">
              {formatRupiah(
                deposit.total_amount ??
                  deposit.amount,
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-slate-400">
          {formatDate(
            deposit.created_at,
          )}
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

function DepositPagination({
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
    buildDepositPageNumbers(
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
        deposit
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
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
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
          onClick={
            onNext
          }
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

function buildDepositPageNumbers(
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

function EmptyDepositState({
  onCreate,
  onReset,
}: {
  onCreate: () => void;

  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <CreditCard
          size={21}
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-700">
        Belum ada riwayat
        deposit
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Belum ada transaksi deposit
        atau tidak ada yang cocok
        dengan filter saat ini.
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={
            onCreate
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"
        >
          <PlusCircle
            size={14}
          />

          Isi Saldo
        </button>

        <button
          type="button"
          onClick={
            onReset
          }
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* DEPOSIT INSTRUCTION PANEL                                          */
/* ================================================================== */

function DepositInstructionPanel({
  instruction,
  isProcessing,
  onRetryQris,
  onCopy,
  onClose,
}: {
  instruction: DepositInstruction;

  isProcessing: boolean;

  onRetryQris: () => void;

  onCopy: (
    value: string,
    message: string,
  ) => void;

  onClose: () => void;
}) {
  const methodKey =
    instruction.payment
      .methodKey;

  const isManualBank =
    methodKey ===
      "bni_manual" ||
    methodKey ===
      "bsi_manual";

  const isOptionalWhatsapp =
    methodKey ===
      "qris" ||
    methodKey ===
      "dana" ||
    methodKey ===
      "gopay" ||
    methodKey ===
      "ovo";

  const whatsappConfirmationUrl =
    instruction.adminContact
      ? `https://wa.me/${
          instruction.adminContact
        }?text=${encodeURIComponent(
          `Halo Admin, saya ingin konfirmasi deposit ${instruction.depositId} melalui ${instruction.payment.name}. Saldo DaPay yang diisi Rp${formatDepositAmount(instruction.amount)}, total transfer Rp${formatDepositAmount(instruction.totalAmount)}.`,
        )}`
      : null;

  return (
    <div className="mt-7 space-y-5">
      {/* SUMMARY */}

      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
          Deposit Pending
        </p>

        <p className="mt-3 text-[9px] font-black uppercase text-slate-500">
          Saldo DaPay yang diisi
        </p>

        <p className="mt-1 text-lg font-black text-slate-900">
          Rp
          {formatDepositAmount(
            instruction.amount,
          )}
        </p>

        <p className="mt-2 text-[9px] leading-4 text-slate-400">
          Pembayaran ini digunakan untuk
          menambah Saldo DaPay, bukan
          Koin DaPay.
        </p>

        <div className="mx-auto mt-4 h-px max-w-45 bg-emerald-200" />

        <p className="mt-3 text-[9px] font-black uppercase text-slate-500">
          Kode Unik
        </p>

        <p className="mt-1 text-sm font-black text-slate-900">
          {instruction.uniqueCode}
        </p>

        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
          Total Transfer
        </p>

        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">
          Rp
          {formatDepositAmount(
            instruction.totalAmount,
          )}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <p className="max-w-57.5 truncate text-[9px] font-bold text-slate-500">
            {instruction.depositId}
          </p>

          <button
            type="button"
            onClick={() =>
              onCopy(
                instruction.depositId,
                "ID deposit berhasil disalin.",
              )
            }
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 transition hover:text-emerald-600"
            aria-label="Salin ID deposit"
          >
            <Copy size={12} />
          </button>
        </div>
      </div>

      {/* QRIS */}

      {instruction.payment
        .isQr ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-fit rounded-3xl border-2 border-dashed border-emerald-200 bg-white p-4">
            {instruction.qrisString ? (
              <QRCodeSVG
                value={
                  instruction.qrisString
                }
                size={220}
                level="H"
                includeMargin
              />
            ) : (
              <button
                type="button"
                onClick={
                  onRetryQris
                }
                disabled={
                  isProcessing
                }
                className="flex min-h-55 min-w-55 flex-col items-center justify-center gap-3 rounded-2xl text-[9px] font-black uppercase text-emerald-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2
                      className="animate-spin"
                      size={28}
                    />

                    Memuat QRIS
                  </>
                ) : (
                  "Muat QRIS"
                )}
              </button>
            )}
          </div>

          <p className="text-[10px] font-bold uppercase leading-relaxed text-slate-500">
            Scan QRIS dan bayar tepat Rp
            {formatDepositAmount(
              instruction.totalAmount,
            )}
            .
          </p>

          {isOptionalWhatsapp &&
            whatsappConfirmationUrl && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
                <p className="text-[10px] font-bold leading-relaxed text-slate-500">
                  Setelah pembayaran selesai,
                  Anda dapat mengonfirmasi ke
                  Admin agar pengecekan lebih
                  cepat.
                </p>

                <a
                  href={
                    whatsappConfirmationUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
                >
                  Konfirmasi via WhatsApp
                  <ExternalLink
                    size={12}
                  />
                </a>
              </div>
            )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* PAYMENT DESTINATION */}

          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  instruction
                    .payment
                    .logoUrl ||
                  "/payment/default.png"
                }
                alt={
                  instruction
                    .payment
                    .name
                }
                className="h-10 w-14 rounded-lg bg-white object-contain p-1"
              />

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-slate-400">
                  Tujuan Transfer
                </p>

                <p className="truncate text-sm font-black uppercase text-slate-900">
                  {
                    instruction
                      .payment
                      .name
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="truncate text-xl font-black tracking-wider text-slate-900">
                {
                  instruction
                    .payment
                    .accountNo
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  onCopy(
                    instruction
                      .payment
                      .accountNo,
                    "Nomor tujuan berhasil disalin.",
                  )
                }
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 transition hover:text-blue-600"
                aria-label="Salin nomor tujuan"
              >
                <Copy size={14} />
              </button>
            </div>

            <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
              A/N{" "}
              {
                instruction
                  .payment
                  .accountName
              }
            </p>
          </div>

          {/* COPY ACTIONS */}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                onCopy(
                  instruction
                    .payment
                    .accountNo,
                  "Nomor tujuan berhasil disalin.",
                )
              }
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[9px] font-black uppercase text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
            >
              Copy Tujuan
            </button>

            <button
              type="button"
              onClick={() =>
                onCopy(
                  instruction.totalAmount,
                  "Nominal berhasil disalin.",
                )
              }
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[9px] font-black uppercase text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
            >
              Copy Nominal
            </button>
          </div>

          <p className="text-center text-[10px] font-bold uppercase leading-relaxed text-slate-500">
            Transfer tepat sebesar Rp
            {formatDepositAmount(
              instruction.totalAmount,
            )}
            .
          </p>

          {/* MANUAL BANK */}

          {isManualBank && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-black leading-relaxed text-amber-800">
                Setelah transfer, Anda WAJIB
                mengonfirmasi pembayaran ke Admin
                melalui WhatsApp agar deposit dapat
                diproses.
              </p>

              {whatsappConfirmationUrl ? (
                <a
                  href={
                    whatsappConfirmationUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
                >
                  Konfirmasi via WhatsApp
                  <ExternalLink
                    size={12}
                  />
                </a>
              ) : (
                <p className="mt-3 text-[10px] font-black uppercase text-rose-600">
                  Kontak Admin belum tersedia.
                </p>
              )}
            </div>
          )}

          {/* OPTIONAL WHATSAPP */}

          {isOptionalWhatsapp &&
            whatsappConfirmationUrl && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-bold leading-relaxed text-slate-500">
                  Setelah pembayaran selesai,
                  Anda dapat mengonfirmasi ke Admin
                  agar pengecekan lebih cepat.
                </p>

                <a
                  href={
                    whatsappConfirmationUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
                >
                  Konfirmasi via WhatsApp
                  (Opsional)
                  <ExternalLink
                    size={12}
                  />
                </a>
              </div>
            )}
        </div>
      )}

      {/* CLOSE */}

      <button
        type="button"
        onClick={
          onClose
        }
        disabled={
          isProcessing
        }
        className="w-full rounded-xl border border-slate-200 bg-white py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Selesai
      </button>
    </div>
  );
}

/* ================================================================== */
/* DETAIL MODAL                                                       */
/* ================================================================== */

function DepositDetailModal({
  deposit,
  onClose,
}: {
  deposit: Deposit;

  onClose: () => void;
}) {
  const status =
    normalizeDepositStatus(
      deposit.status,
    );

  const style =
    getStatusClasses(
      status,
    );

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Detail Deposit
            </p>

            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
              {displayDepositId(
                getDepositId(
                  deposit,
                ),
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup detail deposit"
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
                  Saldo DaPay
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  {formatRupiah(
                    deposit.amount,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* ASSET INFORMATION */}

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <CircleDollarSign
                size={15}
                className="text-emerald-600"
              />

              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Aset
              </p>
            </div>

            <p className="mt-1 text-sm font-black text-slate-900">
              Saldo DaPay
            </p>

            <p className="mt-1 text-[10px] leading-5 text-emerald-700/80">
              Deposit ini ditujukan untuk
              menambah Saldo DaPay. Deposit tidak
              menghasilkan Koin DaPay.
            </p>
          </div>

          {/* DETAILS */}

          <div className="mt-4 space-y-2">
            <DetailRow
              label="Deposit ID"
              value={getDepositId(
                deposit,
              )}
            />

            <DetailRow
              label="Metode Pembayaran"
              value={normalizePaymentName(
                deposit.payment_method,
              )}
            />

            <DetailRow
              label="Nominal Saldo DaPay"
              value={formatRupiah(
                deposit.amount,
              )}
            />

            <DetailRow
              label="Total Transfer"
              value={formatRupiah(
                deposit.total_amount ??
                  deposit.amount,
              )}
            />

            <DetailRow
              label="Kode Unik"
              value={
                deposit.unique_code !==
                null &&
                deposit.unique_code !==
                  undefined
                  ? String(
                      deposit.unique_code,
                    )
                  : "-"
              }
            />

            <DetailRow
              label="Tanggal"
              value={formatDate(
                deposit.created_at,
              )}
            />
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