"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  CircleHelp,
  Coins,
  Copy,
  ExternalLink,
  FileQuestion,
  MessageCircle,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

type HelpCategory =
  | "all"
  | "account"
  | "transaction"
  | "balance"
  | "coin"
  | "referral";

type FAQItem = {
  id: string;
  category: Exclude<
    HelpCategory,
    "all"
  >;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FAQItem[] = [
  /* ================================================================ */
  /* ACCOUNT                                                           */
  /* ================================================================ */

  {
    id: "account-login",
    category: "account",
    question:
      "Saya tidak bisa masuk ke akun. Apa yang harus dilakukan?",
    answer:
      "Pastikan email dan password yang digunakan benar. Jika sesi sudah berakhir, lakukan login kembali. Jangan membagikan password, OTP, PIN, atau kode keamanan kepada siapapun.",
  },

  {
    id: "account-password",
    category: "account",
    question:
      "Bagaimana cara mengganti password?",
    answer:
      "Buka menu Pengaturan pada sidebar, kemudian buka bagian keamanan akun. Gunakan password baru yang kuat dan pastikan konfirmasinya sesuai.",
  },

  {
    id: "account-security",
    category: "account",
    question:
      "Apa yang harus saya lakukan jika akun saya bermasalah?",
    answer:
      "Jangan membagikan password, OTP, PIN, atau kode keamanan kepada siapapun. Hubungi Admin melalui kanal resmi dan sertakan informasi yang relevan tanpa memberikan data keamanan rahasia.",
  },

  /* ================================================================ */
  /* TRANSACTION                                                       */
  /* ================================================================ */

  {
    id: "transaction-pending",
    category: "transaction",
    question:
      "Kenapa transaksi saya masih Pending?",
    answer:
      "Status Pending berarti transaksi belum selesai diproses. Tunggu sampai status berubah menjadi Diproses, Berhasil, atau Gagal. Jangan melakukan pembayaran ulang sebelum status transaksi jelas.",
  },

  {
    id: "transaction-processing",
    category: "transaction",
    question:
      "Apa arti status Diproses?",
    answer:
      "Diproses berarti transaksi sudah diterima sistem dan sedang diteruskan untuk proses pemenuhan produk atau layanan.",
  },

  {
    id: "transaction-success",
    category: "transaction",
    question:
      "Apa arti transaksi Berhasil?",
    answer:
      "Berhasil berarti transaksi telah diproses dan produk atau layanan telah dinyatakan selesai oleh sistem.",
  },

  {
    id: "transaction-failed",
    category: "transaction",
    question:
      "Apa yang terjadi jika transaksi Gagal?",
    answer:
      "Transaksi Gagal berarti pesanan tidak berhasil diselesaikan. Jangan langsung melakukan pembayaran ulang. Periksa detail transaksi dan riwayat aset yang digunakan. Jika pengembalian dana belum sesuai, hubungi Admin dengan menyertakan Order ID.",
  },

  {
    id: "transaction-refund",
    category: "transaction",
    question:
      "Bagaimana aturan refund jika transaksi gagal?",
    answer:
      "Refund tidak otomatis diubah menjadi Saldo DaPay. Dana dikembalikan ke sumber dana yang digunakan untuk transaksi. Jika transaksi menggunakan Saldo, refund kembali ke Saldo. Jika transaksi menggunakan Koin, refund kembali ke Koin. Untuk transaksi dengan sumber dana campuran, pengembalian mengikuti sumber dana masing-masing.",
  },

  /* ================================================================ */
  /* BALANCE                                                           */
  /* ================================================================ */

  {
    id: "balance-deposit",
    category: "balance",
    question:
      "Bagaimana cara melakukan deposit?",
    answer:
      "Buka menu Deposit pada sidebar, masukkan nominal, pilih metode pembayaran, lalu ikuti instruksi pembayaran. Untuk metode tertentu, sistem akan menampilkan QRIS atau tujuan transfer.",
  },

  {
    id: "balance-deposit-asset",
    category: "balance",
    question:
      "Deposit menambah Saldo atau Koin?",
    answer:
      "Deposit hanya menambah Saldo DaPay. Deposit tidak menambah Koin DaPay.",
  },

  {
    id: "balance-pending",
    category: "balance",
    question:
      "Saya sudah transfer tetapi deposit masih Pending.",
    answer:
      "Pastikan nominal transfer sama persis dengan total transfer yang diberikan sistem, termasuk kode unik jika ada. Untuk metode manual tertentu, Anda juga perlu melakukan konfirmasi kepada Admin.",
  },

  {
    id: "balance-withdraw",
    category: "balance",
    question:
      "Bagaimana cara menarik saldo?",
    answer:
      "Buka menu Tarik Saldo, masukkan nominal penarikan, bank atau e-wallet tujuan, nomor rekening, dan nama pemilik rekening. Pastikan seluruh data tujuan benar sebelum mengirim pengajuan.",
  },

  {
    id: "balance-withdraw-coin",
    category: "balance",
    question:
      "Apakah Koin DaPay bisa ditarik?",
    answer:
      "Tidak. Penarikan hanya menggunakan Saldo DaPay. Koin DaPay tidak dapat dicairkan atau ditarik ke rekening bank maupun e-wallet.",
  },

  {
    id: "balance-withdraw-source",
    category: "balance",
    question:
      "Saldo mana yang bisa digunakan untuk withdrawal?",
    answer:
      "Withdrawal hanya menggunakan Saldo DaPay yang tersedia. Koin DaPay tidak dihitung sebagai saldo yang dapat ditarik.",
  },

  /* ================================================================ */
  /* COIN / CASHBACK                                                   */
  /* ================================================================ */

  {
    id: "coin-what-is",
    category: "coin",
    question:
      "Apa itu Koin DaPay?",
    answer:
      "Koin DaPay adalah aset reward yang terpisah dari Saldo DaPay. Koin dapat digunakan sesuai program dan ketentuan transaksi yang berlaku, tetapi tidak dapat ditarik menjadi uang.",
  },

  {
    id: "coin-cashback",
    category: "coin",
    question:
      "Cashback saya masuk ke mana?",
    answer:
      "Cashback diberikan dalam bentuk Koin DaPay sesuai ketentuan program. Cashback tidak otomatis menjadi Saldo DaPay yang dapat ditarik.",
  },

  {
    id: "coin-use",
    category: "coin",
    question:
      "Untuk apa Koin DaPay digunakan?",
    answer:
      "Koin DaPay dapat digunakan untuk transaksi yang mendukung pembayaran atau penggunaan Koin sesuai ketentuan sistem. Nilai dan penggunaan Koin mengikuti aturan program yang berlaku.",
  },

  {
    id: "coin-withdraw",
    category: "coin",
    question:
      "Apakah Koin DaPay bisa diuangkan?",
    answer:
      "Tidak. Koin DaPay bukan saldo cashable dan tidak dapat ditarik ke bank atau e-wallet.",
  },

  {
    id: "coin-deposit",
    category: "coin",
    question:
      "Apakah deposit dapat mengubah Koin menjadi Saldo?",
    answer:
      "Tidak. Deposit adalah proses pengisian Saldo DaPay. Koin dan Saldo merupakan dua aset yang berbeda.",
  },

  /* ================================================================ */
  /* REFERRAL                                                          */
  /* ================================================================ */

  {
    id: "referral-link",
    category: "referral",
    question:
      "Di mana saya mendapatkan link referral?",
    answer:
      "Buka menu Afiliasi Saya. Link referral dan kode referral Anda akan ditampilkan pada bagian utama halaman tersebut.",
  },

  {
    id: "referral-commission",
    category: "referral",
    question:
      "Di mana saya melihat komisi referral?",
    answer:
      "Komisi referral dapat dilihat di halaman Afiliasi Saya dan juga tercatat pada Riwayat Saldo sebagai aktivitas referral atau commission.",
  },

  {
    id: "referral-balance",
    category: "referral",
    question:
      "Komisi referral masuk ke Saldo atau Koin?",
    answer:
      "Komisi referral masuk ke Saldo DaPay. Komisi referral bukan Koin DaPay dan dapat digunakan sesuai ketentuan Saldo, termasuk penarikan jika memenuhi syarat.",
  },

  {
    id: "referral-cashback",
    category: "referral",
    question:
      "Apa perbedaan komisi referral dan cashback?",
    answer:
      "Komisi referral merupakan penghasilan dari program referral dan masuk ke Saldo DaPay. Cashback merupakan reward transaksi dan diberikan sebagai Koin DaPay. Keduanya memiliki perlakuan yang berbeda.",
  },
];

/* ================================================================== */
/* CATEGORY                                                           */
/* ================================================================== */

const CATEGORY_ITEMS: Array<{
  id: HelpCategory;
  label: string;
  description: string;
}> = [
  {
    id: "all",
    label: "Semua",
    description:
      "Semua pertanyaan",
  },

  {
    id: "account",
    label: "Akun",
    description:
      "Login & keamanan",
  },

  {
    id: "transaction",
    label: "Transaksi",
    description:
      "Order & refund",
  },

  {
    id: "balance",
    label: "Saldo",
    description:
      "Deposit & penarikan",
  },

  {
    id: "coin",
    label: "Koin",
    description:
      "Cashback & reward",
  },

  {
    id: "referral",
    label: "Afiliasi",
    description:
      "Referral & komisi",
  },
];

function getCategoryLabel(
  category: FAQItem["category"],
) {
  const item =
    CATEGORY_ITEMS.find(
      (entry) =>
        entry.id === category,
    );

  return (
    item?.label ||
    category
  );
}

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */

export default function HelpViewUser() {
  const [category, setCategory] =
    useState<HelpCategory>(
      "all",
    );

  const [search, setSearch] =
    useState("");

  const [openFaq, setOpenFaq] =
    useState<string | null>(
      null,
    );

  const [copied, setCopied] =
    useState(false);

  /*
   * Nomor WhatsApp dibaca dari
   * environment frontend jika tersedia.
   */
  const adminWhatsapp =
    process.env
      .NEXT_PUBLIC_ADMIN_WHATSAPP ||
    "";

  const whatsappNumber =
    adminWhatsapp.replace(
      /\D/g,
      "",
    );

  const whatsappUrl =
    whatsappNumber
      ? `https://wa.me/${whatsappNumber}`
      : "";

  /* ================================================================ */
  /* FILTER                                                            */
  /* ================================================================ */

  const filteredFaq =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return FAQ_ITEMS.filter(
        (item) => {
          const matchesCategory =
            category ===
              "all" ||
            item.category ===
              category;

          const searchable = [
            item.question,
            item.answer,
            getCategoryLabel(
              item.category,
            ),
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchable.includes(
              keyword,
            );

          return (
            matchesCategory &&
            matchesSearch
          );
        },
      );
    }, [
      category,
      search,
    ]);

  /* ================================================================ */
  /* HELP MESSAGE                                                      */
  /* ================================================================ */

  const copyHelpMessage =
    async () => {
      const message =
        "Halo Admin DaPay, saya membutuhkan bantuan terkait akun/transaksi saya.";

      try {
        await navigator.clipboard.writeText(
          message,
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
          "Gagal menyalin pesan.",
        );
      }
    };

  const openWhatsApp =
    () => {
      if (!whatsappUrl) {
        alert(
          "Kontak WhatsApp Admin belum dikonfigurasi.",
        );

        return;
      }

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer",
      );
    };

  const showCategory =
    (
      nextCategory: HelpCategory,
    ) => {
      setCategory(
        nextCategory,
      );

      window.setTimeout(
        () => {
          window.scrollTo({
            top: 560,
            behavior:
              "smooth",
          });
        },
        50,
      );
    };

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-295">
        {/* ====================================================== */}
        {/* HEADER                                                  */}
        {/* ====================================================== */}

        <header className="mb-5 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.27em] text-blue-600">
            Support Center
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Bantuan
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
            Temukan jawaban seputar akun,
            transaksi, Saldo DaPay, Koin
            DaPay, deposit, penarikan,
            cashback, dan afiliasi.
          </p>

          {/* SEARCH */}

          <div className="relative mt-5 max-w-2xl">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Cari pertanyaan atau masalah..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Hapus pencarian"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </header>

        {/* ====================================================== */}
        {/* QUICK HELP                                               */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HelpQuickCard
            icon={
              <MessageCircle
                size={19}
              />
            }
            title="Hubungi Admin"
            description="Butuh bantuan langsung?"
            action="Chat WhatsApp"
            onClick={
              openWhatsApp
            }
            accent="green"
          />

          <HelpQuickCard
            icon={
              <FileQuestion
                size={19}
              />
            }
            title="Masalah Transaksi"
            description="Order, status, atau refund."
            action="Lihat FAQ"
            onClick={() =>
              showCategory(
                "transaction",
              )
            }
            accent="blue"
          />

          <HelpQuickCard
            icon={
              <WalletCards
                size={19}
              />
            }
            title="Saldo DaPay"
            description="Deposit atau penarikan."
            action="Lihat FAQ"
            onClick={() =>
              showCategory(
                "balance",
              )
            }
            accent="amber"
          />

          <HelpQuickCard
            icon={
              <Coins size={19} />
            }
            title="Koin DaPay"
            description="Cashback dan reward."
            action="Lihat FAQ"
            onClick={() =>
              showCategory(
                "coin",
              )
            }
            accent="violet"
          />
        </section>

        {/* ====================================================== */}
        {/* ASSET EXPLANATION                                       */}
        {/* ====================================================== */}

        <section className="mb-5 grid gap-4 md:grid-cols-2">
          {/* SALDO */}

          <button
            type="button"
            onClick={() =>
              showCategory(
                "balance",
              )
            }
            className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <WalletCards
                  size={18}
                />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  Saldo DaPay
                </p>

                <h2 className="mt-1 text-base font-black text-slate-900">
                  Aset yang dapat digunakan dan
                  dapat ditarik sesuai ketentuan.
                </h2>

                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  Deposit dan komisi referral
                  masuk ke Saldo DaPay.
                </p>
              </div>
            </div>
          </button>

          {/* KOIN */}

          <button
            type="button"
            onClick={() =>
              showCategory(
                "coin",
              )
            }
            className="rounded-3xl border border-violet-100 bg-violet-50/60 p-5 text-left transition hover:border-violet-200 hover:bg-violet-50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                <Coins size={18} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-700">
                  Koin DaPay
                </p>

                <h2 className="mt-1 text-base font-black text-slate-900">
                  Reward untuk transaksi, bukan saldo
                  yang dapat dicairkan.
                </h2>

                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  Cashback diberikan sebagai Koin
                  DaPay dan tidak dapat ditarik.
                </p>
              </div>
            </div>
          </button>
        </section>

        {/* ====================================================== */}
        {/* CATEGORIES                                              */}
        {/* ====================================================== */}

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ITEMS.map(
              (item) => {
                const selected =
                  category ===
                  item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setCategory(
                        item.id,
                      )
                    }
                    className={[
                      "rounded-xl px-3.5 py-2.5 text-left transition",

                      selected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                    ].join(
                      " ",
                    )}
                  >
                    <p className="text-xs font-bold">
                      {item.label}
                    </p>

                    <p
                      className={[
                        "mt-0.5 text-[8px]",
                        selected
                          ? "text-blue-100"
                          : "text-slate-400",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        item.description
                      }
                    </p>
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* ====================================================== */}
        {/* FAQ                                                     */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CircleHelp
                  size={16}
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Pertanyaan yang Sering
                  Ditanyakan
                </h2>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  {
                    filteredFaq.length
                  }{" "}
                  pertanyaan tersedia
                </p>
              </div>
            </div>
          </div>

          {filteredFaq.length ===
          0 ? (
            <EmptyHelpState
              search={search}
              onClear={() => {
                setSearch(
                  "",
                );

                setCategory(
                  "all",
                );
              }}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredFaq.map(
                (item) => {
                  const isOpen =
                    openFaq ===
                    item.id;

                  return (
                    <div
                      key={
                        item.id
                      }
                      className="transition"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaq(
                            isOpen
                              ? null
                              : item.id,
                          )
                        }
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                        aria-expanded={
                          isOpen
                        }
                      >
                        <div
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",

                            isOpen
                              ? "bg-blue-50 text-blue-600"
                              : "bg-slate-50 text-slate-400",
                          ].join(
                            " ",
                          )}
                        >
                          <CircleHelp
                            size={15}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={[
                                "rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em]",

                                item.category ===
                                "balance"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : item.category ===
                                      "coin"
                                    ? "bg-violet-50 text-violet-600"
                                    : item.category ===
                                        "referral"
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-slate-100 text-slate-400",
                              ].join(
                                " ",
                              )}
                            >
                              {getCategoryLabel(
                                item.category,
                              )}
                            </span>
                          </div>

                          <p className="mt-1.5 text-sm font-semibold text-slate-800">
                            {
                              item.question
                            }
                          </p>
                        </div>

                        <ChevronDown
                          size={17}
                          className={[
                            "shrink-0 text-slate-400 transition-transform",

                            isOpen
                              ? "rotate-180 text-blue-600"
                              : "",
                          ].join(
                            " ",
                          )}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pl-17">
                          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                            <p className="text-xs leading-5 text-slate-600">
                              {
                                item.answer
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* ====================================================== */}
        {/* CONTACT SUPPORT                                        */}
        {/* ====================================================== */}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                  Masih Membutuhkan Bantuan?
                </p>

                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                  Saat menghubungi Admin,
                  sertakan Order ID, waktu transaksi,
                  metode pembayaran, atau detail
                  masalah yang terjadi. Jangan
                  menyertakan password, OTP, PIN,
                  atau kode keamanan.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  copyHelpMessage
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {copied ? (
                  <>
                    <Copy
                      size={14}
                    />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy
                      size={14}
                    />
                    Salin Template
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={
                  openWhatsApp
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
              >
                <MessageCircle
                  size={14}
                />

                Hubungi Admin

                <ExternalLink
                  size={12}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* SECURITY NOTICE                                         */}
        {/* ====================================================== */}

        <section className="mt-5 rounded-[22px] border border-amber-100 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">
                Keamanan Akun
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800/80">
                DaPay tidak meminta password,
                OTP, PIN, atau kode keamanan akun
                melalui chat. Jangan pernah memberikan
                informasi tersebut kepada siapapun.
              </p>
            </div>
          </div>
        </section>

        <p className="pb-10 pt-8 text-center text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-300">
          © 2026 DANISHTOPUP OFFICIAL PARTNER
        </p>
      </div>
    </section>
  );
}

/* ================================================================== */
/* QUICK HELP CARD                                                    */
/* ================================================================== */

function HelpQuickCard({
  icon,
  title,
  description,
  action,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  accent:
    | "green"
    | "blue"
    | "amber"
    | "violet";
}) {
  const classes = {
    green: {
      icon:
        "bg-emerald-50 text-emerald-600",
      action:
        "text-emerald-600 hover:text-emerald-700",
    },

    blue: {
      icon:
        "bg-blue-50 text-blue-600",
      action:
        "text-blue-600 hover:text-blue-700",
    },

    amber: {
      icon:
        "bg-amber-50 text-amber-600",
      action:
        "text-amber-600 hover:text-amber-700",
    },

    violet: {
      icon:
        "bg-violet-50 text-violet-600",
      action:
        "text-violet-600 hover:text-violet-700",
    },
  }[accent];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${classes.icon}`}
        >
          {icon}
        </div>

        <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">
          Support
        </span>
      </div>

      <h3 className="mt-4 text-sm font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className={`mt-4 text-[10px] font-black uppercase tracking-widest transition ${classes.action}`}
      >
        {action} →
      </button>
    </div>
  );
}

/* ================================================================== */
/* EMPTY STATE                                                        */
/* ================================================================== */

function EmptyHelpState({
  search,
  onClear,
}: {
  search: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <FileQuestion
          size={21}
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-700">
        Pertanyaan tidak ditemukan
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Tidak ada FAQ yang cocok dengan{" "}
        {search
          ? `pencarian "${search}".`
          : "kategori yang dipilih."}
      </p>

      <button
        type="button"
        onClick={
          onClear
        }
        className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        Tampilkan Semua
      </button>
    </div>
  );
}