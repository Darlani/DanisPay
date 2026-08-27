"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  Share2,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/utils/supabaseClient";

/* ================================================================== */
/* TYPES                                                              */
/* ================================================================== */

type Referral = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  created_at?: string | null;
};

type BalanceLog = {
  id?: string | null;
  amount?: number | string | null;
  type?: string | null;
  description?: string | null;
  created_at?: string | null;

  /*
   * Disiapkan untuk kontrak wallet terbaru.
   * Komisi referral tetap dikategorikan sebagai Saldo.
   */
  asset_type?:
    | "balance"
    | "coin"
    | null;
};

type Profile = {
  full_name?: string | null;
  email?: string | null;
  referral_code?: string | null;
  balance?: number | string | null;
  member_type?: string | null;

  /*
   * Field optional untuk kontrak ke depan.
   */
  coin_balance?:
    | number
    | string
    | null;
};

type DashboardResponse = {
  success?: boolean;

  data?: {
    profile?: Profile;
    referrals?: Referral[];
    balanceLogs?: BalanceLog[];
  };

  error?: string;
};

type CommissionEntry = {
  log: BalanceLog;
  amount: number;
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

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatDateTime(
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
  value?: string | null,
) {
  return String(
    value || "",
  )
    .trim()
    .toLowerCase();
}

/* ================================================================== */
/* REFERRAL COMMISSION                                                */
/* ================================================================== */

/*
 * Hanya mengambil:
 *
 * referral
 * commission
 *
 * dan hanya nilai POSITIF.
 *
 * Secara konsep:
 *
 * Referral Commission
 *        ↓
 * Saldo DaPay
 *        ↓
 * Bisa digunakan / ditarik
 *
 * Cashback tidak masuk ke sini.
 * Cashback adalah Koin DaPay.
 */
function getReferralCommissionLogs(
  logs: BalanceLog[],
): CommissionEntry[] {
  return logs
    .filter((log) => {
      const type =
        normalizeType(
          log.type,
        );

      const amount =
        toNumber(
          log.amount,
        );

      const isReferralType =
        [
          "referral",
          "commission",
        ].includes(type);

      const isPositive =
        amount > 0;

      /*
       * Kalau backend sudah mengirim asset_type,
       * referral commission harus tetap balance.
       */
      const assetValid =
        !log.asset_type ||
        log.asset_type ===
          "balance";

      return (
        isReferralType &&
        isPositive &&
        assetValid
      );
    })
    .map((log) => ({
      log,
      amount: toNumber(
        log.amount,
      ),
    }));
}

/* ================================================================== */
/* EMAIL                                                              */
/* ================================================================== */

function maskEmail(
  email?: string | null,
) {
  if (!email) {
    return "-";
  }

  const [local, domain] =
    email.split("@");

  if (!local || !domain) {
    return email;
  }

  if (local.length <= 2) {
    return `${local[0] || "*"}***@${domain}`;
  }

  return `${local.slice(
    0,
    2,
  )}***@${domain}`;
}

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */

export default function AffiliateViewUser() {
  /* ---------------------------------------------------------------- */
  /* DATA                                                             */
  /* ---------------------------------------------------------------- */

  const [
    referrals,
    setReferrals,
  ] = useState<
    Referral[]
  >([]);

  const [
    balanceLogs,
    setBalanceLogs,
  ] = useState<
    BalanceLog[]
  >([]);

  const [profile, setProfile] =
    useState<Profile>({});

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  /* ---------------------------------------------------------------- */
  /* REFERRAL UI                                                      */
  /* ---------------------------------------------------------------- */

  const [
    currentDomain,
    setCurrentDomain,
  ] = useState("");

  const [copied, setCopied] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [
    selectedReferral,
    setSelectedReferral,
  ] =
    useState<Referral | null>(
      null,
    );

  /* ================================================================= */
  /* FETCH                                                             */
  /* ================================================================= */

  const fetchAffiliateData =
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
                "Gagal memuat data afiliasi.",
            );
          }

          setProfile(
            result.data?.profile ||
              {},
          );

          setReferrals(
            Array.isArray(
              result.data?.referrals,
            )
              ? result.data
                  .referrals
              : [],
          );

          setBalanceLogs(
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
            "AffiliateViewUser:",
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
    if (
      typeof window !==
      "undefined"
    ) {
      setCurrentDomain(
        window.location.origin,
      );
    }

    void fetchAffiliateData(
      true,
    );
  }, [fetchAffiliateData]);

  /* ================================================================= */
  /* REFERRAL LINK                                                     */
  /* ================================================================= */

  const referralLink =
    useMemo(() => {
      if (
        !currentDomain ||
        !profile.referral_code
      ) {
        return "";
      }

      return `${currentDomain}/ref/${profile.referral_code}`;
    }, [
      currentDomain,
      profile.referral_code,
    ]);

  /* ================================================================= */
  /* COMMISSION                                                        */
  /* ================================================================= */

  const commissionEntries =
    useMemo(
      () =>
        getReferralCommissionLogs(
          balanceLogs,
        ),
      [balanceLogs],
    );

  const totalCommission =
    useMemo(() => {
      return commissionEntries.reduce(
        (sum, entry) =>
          sum + entry.amount,
        0,
      );
    }, [commissionEntries]);

  const totalReferralCount =
    referrals.length;

  /* ================================================================= */
  /* RECENT COMMISSION                                                */
  /* ================================================================= */

  const recentCommission =
    useMemo(() => {
      return [...commissionEntries]
        .sort((a, b) => {
          const aTime = new Date(
            String(
              a.log.created_at ||
                "",
            ),
          ).getTime();

          const bTime = new Date(
            String(
              b.log.created_at ||
                "",
            ),
          ).getTime();

          return (
            bTime - aTime
          );
        })
        .slice(0, 5);
    }, [commissionEntries]);

  /* ================================================================= */
  /* FILTER                                                           */
  /* ================================================================= */

  const filteredReferrals =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return referrals;
      }

      return referrals.filter(
        (referral) => {
          const searchable = [
            referral.full_name,
            referral.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            keyword,
          );
        },
      );
    }, [
      referrals,
      search,
    ]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredReferrals.length /
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

  const visibleReferrals =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredReferrals.slice(
        start,
        start + PAGE_SIZE,
      );
    }, [
      filteredReferrals,
      page,
    ]);

  /* ================================================================= */
  /* COPY / SHARE                                                      */
  /* ================================================================= */

  const copyReferralLink =
    async () => {
      if (!referralLink) {
        alert(
          "Link referral belum tersedia.",
        );
        return;
      }

      try {
        await navigator.clipboard.writeText(
          referralLink,
        );

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1800,
        );
      } catch {
        alert(
          "Gagal menyalin link referral.",
        );
      }
    };

  const shareReferralLink =
    async () => {
      if (!referralLink) {
        alert(
          "Link referral belum tersedia.",
        );
        return;
      }

      const shareData =
        {
          title:
            "DaPay - Referral",

          text:
            "Gabung DaPay melalui link referral saya.",

          url: referralLink,
        };

      try {
        if (
          typeof navigator !==
            "undefined" &&
          navigator.share
        ) {
          await navigator.share(
            shareData,
          );

          return;
        }

        await navigator.clipboard.writeText(
          referralLink,
        );

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1800,
        );
      } catch {
        /*
         * User membatalkan native share.
         */
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
            className="animate-spin text-amber-600"
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
              <p className="text-[10px] font-black uppercase tracking-[0.27em] text-amber-600">
                Referral Program
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Afiliasi Saya
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                Kelola link referral, lihat jaringan
                member, dan pantau komisi yang
                masuk ke Saldo DaPay.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void fetchAffiliateData(
                  false,
                )
              }
              disabled={refreshing}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-amber-600 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 lg:self-center"
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
        {/* REFERRAL LINK                                           */}
        {/* ====================================================== */}

        <section className="relative mb-5 overflow-hidden rounded-[28px] border border-indigo-100 bg-linear-to-br from-slate-950 via-indigo-950 to-blue-950 p-5 text-white shadow-[0_15px_40px_rgba(30,41,59,0.14)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-lg">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-blue-300 ring-1 ring-white/10">
                    <Share2
                      size={17}
                    />
                  </div>

                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">
                    Link Referral Anda
                  </p>
                </div>

                <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Ajak member baru
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Bagikan link referral Anda dan
                  dapatkan komisi referral yang
                  masuk ke Saldo DaPay sesuai
                  program yang berlaku.
                </p>
              </div>

              <div className="w-full xl:max-w-xl">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
                  <div className="min-w-0 flex-1 px-3">
                    <p className="truncate text-xs font-semibold text-blue-200">
                      {referralLink ||
                        "Link referral belum tersedia"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      copyReferralLink
                    }
                    disabled={
                      !referralLink
                    }
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied ? (
                      <>
                        <Check
                          size={15}
                        />

                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy
                          size={15}
                        />

                        Copy
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={
                      shareReferralLink
                    }
                    disabled={
                      !referralLink
                    }
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Share2
                      size={15}
                    />

                    Bagikan
                  </button>
                </div>

                {profile.referral_code && (
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Kode referral:{" "}
                    <span className="text-blue-300">
                      {
                        profile.referral_code
                      }
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* SUMMARY                                                 */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* MEMBERS */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Total Member Referral
                </p>

                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {totalReferralCount}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                  Member yang terhubung
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <UsersRound
                  size={19}
                />
              </div>
            </div>
          </div>

          {/* COMMISSION = SALDO */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Komisi Referral
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
                  {formatRupiah(
                    totalCommission,
                  )}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-emerald-600">
                  Masuk ke Saldo DaPay
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <CircleDollarSign
                  size={19}
                />
              </div>
            </div>
          </div>

          {/* MEMBER TYPE */}
          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Status Member
                </p>

                <p className="mt-2 text-xl font-black tracking-tight text-indigo-700">
                  {profile.member_type ===
                  "Special"
                    ? "Special Member"
                    : "Reguler Member"}
                </p>

                <p className="mt-1 text-[9px] font-semibold text-indigo-600">
                  Program afiliasi DaPay
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Gift size={19} />
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* COMMISSION EXPLANATION                                  */}
        {/* ====================================================== */}

        <section className="mb-5 rounded-3xl border border-emerald-100 bg-linear-to-r from-emerald-50 via-white to-blue-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <WalletCards
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  Komisi Referral → Saldo
                </p>

                <h2 className="mt-1 text-base font-black text-slate-900">
                  Komisi referral masuk ke Saldo DaPay
                </h2>

                <p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">
                  Komisi referral merupakan saldo milik
                  member yang dapat digunakan untuk
                  transaksi dan dapat ditarik sesuai
                  ketentuan.
                </p>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Gift
                  size={14}
                  className="text-violet-600"
                />

                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700">
                  Cashback
                </span>
              </div>

              <p className="mt-1 text-[9px] leading-4 text-violet-700/80">
                Cashback berada di Koin DaPay,
                bukan di komisi referral.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* RECENT COMMISSION                                      */}
        {/* ====================================================== */}

        <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign
                  size={15}
                />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Komisi Referral Terbaru
                </p>

                <p className="text-[9px] text-slate-400">
                  Semua komisi berikut masuk ke Saldo DaPay.
                </p>
              </div>
            </div>
          </div>

          {recentCommission.length ===
          0 ? (
            <div className="px-5 py-10 text-center">
              <CircleDollarSign
                size={28}
                className="mx-auto text-slate-200"
              />

              <p className="mt-3 text-xs font-semibold text-slate-500">
                Belum ada komisi referral.
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Bagikan link referral Anda untuk mulai
                mendapatkan komisi.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentCommission.map(
                (entry) => (
                  <div
                    key={
                      entry.log.id ||
                      `${entry.log.created_at}-${entry.amount}`
                    }
                    className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CircleDollarSign
                        size={16}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">
                        {entry.log.description ||
                          "Komisi referral"}
                      </p>

                      <p className="mt-1 text-[9px] text-slate-400">
                        {formatDateTime(
                          entry.log.created_at,
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">
                        +{formatRupiah(
                          entry.amount,
                        )}
                      </p>

                      <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-emerald-600">
                        Saldo
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* ====================================================== */}
        {/* REFERRAL MEMBERS                                        */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <UsersRound
                      size={15}
                    />
                  </div>

                  <p className="text-sm font-bold text-slate-800">
                    Jaringan Afiliasi Saya
                  </p>
                </div>

                <p className="mt-1 pl-10 text-[10px] text-slate-400">
                  Member yang bergabung melalui
                  referral Anda.
                </p>
              </div>

              <div className="relative w-full sm:w-65">
                <Search
                  size={15}
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
                  placeholder="Cari member..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
          </div>

          {filteredReferrals.length ===
          0 ? (
            <EmptyAffiliateState
              hasSearch={Boolean(
                search,
              )}
              onClear={() =>
                setSearch("")
              }
            />
          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse">
                  <thead className="border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <TableHeading label="Member" />

                      <TableHeading label="Email" />

                      <TableHeading label="Bergabung" />

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
                    {visibleReferrals.map(
                      (
                        referral,
                        index,
                      ) => (
                        <ReferralRow
                          key={
                            referral.id ||
                            `${referral.email}-${index}`
                          }
                          referral={
                            referral
                          }
                          onView={
                            setSelectedReferral
                          }
                        />
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="divide-y divide-slate-100 md:hidden">
                {visibleReferrals.map(
                  (
                    referral,
                    index,
                  ) => (
                    <ReferralCard
                      key={
                        referral.id ||
                        `${referral.email}-${index}`
                      }
                      referral={
                        referral
                      }
                      onView={
                        setSelectedReferral
                      }
                    />
                  ),
                )}
              </div>

              {/* PAGINATION */}
              <AffiliatePagination
                page={page}
                totalPages={
                  totalPages
                }
                totalItems={
                  filteredReferrals.length
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
                onPage={setPage}
              />
            </>
          )}
        </section>

        {/* ====================================================== */}
        {/* INFO                                                     */}
        {/* ====================================================== */}

        <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CircleDollarSign
                size={15}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                Ketentuan Komisi Referral
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Komisi referral dicatat sebagai Saldo
                DaPay. Saldo tersebut dapat digunakan
                untuk transaksi dan dapat ditarik sesuai
                ketentuan. Cashback tidak dihitung sebagai
                komisi referral dan menggunakan Koin DaPay.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DETAIL REFERRAL                                              */}
      {/* ============================================================ */}

      {selectedReferral && (
        <ReferralDetailModal
          referral={
            selectedReferral
          }
          onClose={() =>
            setSelectedReferral(
              null,
            )
          }
        />
      )}
    </section>
  );
}

/* ================================================================== */
/* REFERRAL ROW                                                       */
/* ================================================================== */

function ReferralRow({
  referral,
  onView,
}: {
  referral: Referral;

  onView: (
    referral: Referral,
  ) => void;
}) {
  return (
    <tr className="group transition-colors hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex min-w-50 items-center gap-3">
          <Avatar
            name={
              referral.full_name ||
              "Member"
            }
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {referral.full_name ||
                "Member Baru"}
            </p>

            <p className="mt-1 text-[9px] text-slate-400">
              Member DaPay
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="text-xs font-medium text-slate-600">
          {maskEmail(
            referral.email,
          )}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays
            size={13}
            className="text-slate-400"
          />

          {formatDate(
            referral.created_at,
          )}
        </div>
      </td>

      <td className="px-5 py-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

          Terdaftar
        </span>
      </td>

      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() =>
            onView(referral)
          }
          className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-amber-600 transition hover:border-amber-200 hover:bg-amber-50"
        >
          Lihat
        </button>
      </td>
    </tr>
  );
}

/* ================================================================== */
/* REFERRAL MOBILE CARD                                               */
/* ================================================================== */

function ReferralCard({
  referral,
  onView,
}: {
  referral: Referral;

  onView: (
    referral: Referral,
  ) => void;
}) {
  return (
    <article className="p-4">
      <button
        type="button"
        onClick={() =>
          onView(referral)
        }
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <Avatar
            name={
              referral.full_name ||
              "Member"
            }
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {referral.full_name ||
                    "Member Baru"}
                </p>

                <p className="mt-1 truncate text-[10px] text-slate-400">
                  {maskEmail(
                    referral.email,
                  )}
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[8px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                Terdaftar
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Bergabung
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {formatDate(
                    referral.created_at,
                  )}
                </p>
              </div>

              <span className="text-[10px] font-bold text-amber-600">
                Lihat Detail →
              </span>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}

/* ================================================================== */
/* AVATAR                                                             */
/* ================================================================== */

function Avatar({
  name,
}: {
  name: string;
}) {
  const initial =
    name
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "M";

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-sm font-black text-white shadow-sm">
      {initial}
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

function AffiliatePagination({
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
    buildAffiliatePageNumbers(
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
        member
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
                    ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700",
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

function buildAffiliatePageNumbers(
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

function EmptyAffiliateState({
  hasSearch,
  onClear,
}: {
  hasSearch: boolean;

  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <UsersRound
          size={21}
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-700">
        {hasSearch
          ? "Member tidak ditemukan"
          : "Belum ada member referral"}
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {hasSearch
          ? "Tidak ada member yang cocok dengan pencarian Anda."
          : "Bagikan link referral Anda untuk mulai membangun jaringan."}
      </p>

      {hasSearch && (
        <button
          type="button"
          onClick={
            onClear
          }
          className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
        >
          Hapus Pencarian
        </button>
      )}
    </div>
  );
}

/* ================================================================== */
/* DETAIL MODAL                                                       */
/* ================================================================== */

function ReferralDetailModal({
  referral,
  onClose,
}: {
  referral: Referral;

  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={
                referral.full_name ||
                "Member"
              }
            />

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">
                Detail Referral
              </p>

              <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
                {referral.full_name ||
                  "Member Baru"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup detail referral"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <Check
                size={15}
                className="text-emerald-600"
              />

              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Member Terdaftar
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-emerald-700/80">
              Member ini tercatat bergabung
              melalui jaringan referral Anda.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <DetailRow
              label="Nama"
              value={
                referral.full_name ||
                "Member Baru"
              }
            />

            <DetailRow
              label="Email"
              value={
                referral.email ||
                "-"
              }
            />

            <DetailRow
              label="Email Tampilan"
              value={maskEmail(
                referral.email,
              )}
            />

            <DetailRow
              label="Tanggal Bergabung"
              value={formatDateTime(
                referral.created_at,
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

      <span className="max-w-75 break-all text-right text-xs font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
}