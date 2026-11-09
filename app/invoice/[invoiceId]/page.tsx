"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import {
  CheckCircle,
  Loader2,
  X,
  Zap,
  Shield,
  Lock,
  Info,
  CreditCard,
  ChevronLeft,
  Clock,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import ReceiptPascabayar from "./ReceiptPascabayar";
import ReceiptPrabayar from "./ReceiptPrabayar";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";
import PaymentInstructionsModal from "@/components/checkout/PaymentInstructionsModal";
import { useI18n } from "@/lib/i18n/context";
import InvoiceReceiptSkeleton from "@/components/skeletons/InvoiceReceiptSkeleton";
import { getWhatsAppUrl } from "@/utils/storeConfig";

interface PaymentAccount {
  name: string;
  account_no: string;
  account_name: string;
  logo_url: string | null;
  is_qr: boolean;
  method_key: string;
}

interface OrderData {
  id?: string;
  order_id: string;
  product_name: string;
  brand_name?: string | null;
  clean_product_name?: string | null;
  item_label?: string;
  sku?: string;
  customer_no: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  sn?: string | null;
  is_sandbox?: boolean;
  user_id?: string | null;
  category?: string;
  payment_code?: string;
  product_logo?: string | null;
  notes?: string | null;
  used_balance?: number;
}

function InvoiceContent() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const [trx, setTrx] = useState<OrderData | null>(null);
  const [dbStatus, setDbStatus] = useState("Pending");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [targetExpiryTime, setTargetExpiryTime] = useState<number | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [qrisString, setQrisString] = useState<string>("");
  const [isTimeCalculated, setIsTimeCalculated] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const handleSimulatePayment = async (options?: {
    auto_resolve?: boolean;
    force_fail?: boolean;
  }) => {
    if (simulating || !trx?.order_id) return;
    setSimulating(true);
    try {
      const res = await fetch("/api/tester/simulate-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: trx.order_id,
          auto_resolve: options?.auto_resolve ?? true,
          force_fail: options?.force_fail ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || t("checkout.simulatePayFailed"));
        return;
      }
      setDbStatus(data.status || "Berhasil");
      setTrx((prev) =>
        prev
          ? {
              ...prev,
              status: data.status || "Berhasil",
              sn: data.sn,
              notes:
                data.status === "Gagal"
                  ? (prev.notes || "Pengiriman Gagal: Kendala teknis sistem DaPay (Simulasi Gagal Sandbox)")
                  : prev.notes,
            }
          : prev
      );
    } catch (e) {
      console.error("Simulate pay error:", e);
      alert(t("checkout.simulatePayError"));
    } finally {
      setSimulating(false);
    }
  };

  // --- SINKRONISASI CACHE GUEST LOKAL ---
  const updateGuestCacheStatus = (orderId: string, newStatus: string) => {
    const guestCache = localStorage.getItem("dapay_guest_history");
    if (guestCache) {
      try {
        const history: Array<{ order_id: string; status: string }> = JSON.parse(guestCache);
        const orderIndex = history.findIndex((o) => o.order_id === orderId);
        if (orderIndex !== -1 && history[orderIndex].status !== newStatus) {
          history[orderIndex].status = newStatus;
          localStorage.setItem("dapay_guest_history", JSON.stringify(history));
        }
      } catch (e) {
        console.error("Gagal update status cache lokal", e);
      }
    }
  };

  useEffect(() => {
    if (invoiceId && dbStatus) {
      updateGuestCacheStatus(invoiceId, dbStatus);
    }
  }, [dbStatus, invoiceId]);

  // --- 1. DATA FETCHING & REALTIME ---
  useEffect(() => {
    if (!invoiceId) return;

    const fetchTransaction = async () => {
      try {
        const invoiceRes = await fetch("/api/orders/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: invoiceId }),
        });

        const invoiceJson = await invoiceRes.json();
        const orderData: OrderData | null = invoiceRes.ok ? invoiceJson.data : null;

        const { data: accounts } = await supabase
          .from("payment_accounts")
          .select("name, account_no, account_name, logo_url, is_qr, method_key");

        if (accounts) setPaymentAccounts(accounts);

        let nowTs = Date.now();
        try {
          const serverTimeRes = await fetch("/api/system/time");
          if (serverTimeRes.ok) {
            const { serverNow } = await serverTimeRes.json();
            if (serverNow) {
              const parsed = new Date(serverNow).getTime();
              if (!Number.isNaN(parsed)) nowTs = parsed;
            }
          }
        } catch {
          nowTs = Date.now();
        }

        if (orderData) {
          const totalAmount = Number(orderData.total_amount || 0);
          const currentStatus = orderData.status?.toLowerCase();

          if (
            totalAmount === 0 ||
            currentStatus === "berhasil" ||
            currentStatus === "diproses" ||
            currentStatus === "selesai"
          ) {
            setTrx(orderData);
            setDbStatus(orderData.status || "Berhasil");
            setIsTimeCalculated(true);
            return;
          }

          setTrx(orderData);

          if (
            orderData.payment_method?.toLowerCase().includes("qris") &&
            orderData.status === "Pending"
          ) {
            if (orderData.is_sandbox === true) {
              setQrisString(
                `https://dapay.id/sandbox-mock-qris?order_id=${encodeURIComponent(
                  orderData.order_id
                )}&amount=${orderData.total_amount}`
              );
            } else {
              try {
                const qrisRes = await fetch("/api/orders/qris", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: orderData.order_id }),
                });
                if (qrisRes.ok) {
                  const qrisData = await qrisRes.json();
                  if (qrisData.success) {
                    setQrisString(qrisData.qrisString);
                  }
                }
              } catch (qrisErr) {
                console.error("Gagal fetch API QRIS:", qrisErr);
              }
            }
          }

          if (orderData.status === "Pending") {
            const createdAt = new Date(orderData.created_at).getTime();
            const validCreatedAt = !Number.isNaN(createdAt) ? createdAt : nowTs;
            const expiredTime = validCreatedAt + 2 * 60 * 60 * 1000;
            const initialSecondsLeft = Math.max(0, Math.floor((expiredTime - nowTs) / 1000));

            if (initialSecondsLeft <= 0) {
              setDbStatus("Gagal");
              setTimeLeft(0);
              setIsTimeCalculated(true);
              if (orderData.order_id) {
                fetch("/api/orders/expire", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ order_id: orderData.order_id }),
                }).catch(() => {});
              }
            } else {
              setDbStatus("Pending");
              const targetTs = Date.now() + initialSecondsLeft * 1000;
              setTargetExpiryTime(targetTs);
              setTimeLeft(initialSecondsLeft);
              setIsTimeCalculated(true);
            }
          } else {
            setDbStatus(orderData.status || "Gagal");
            setIsTimeCalculated(true);
          }
        }
      } catch (err) {
        console.error("Kesalahan Sinkronisasi:", err);
      }
    };

    fetchTransaction();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel(`order-status-${invoiceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${invoiceId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const newSn = payload.new.sn;
          const newNotes = payload.new.notes;
          if (newStatus) {
            setDbStatus(newStatus);
            setTrx((prev) =>
              prev
                ? {
                    ...prev,
                    status: newStatus,
                    sn: newSn,
                    notes: newNotes !== undefined ? newNotes : prev.notes,
                  }
                : prev
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sandbox_orders",
          filter: `order_id=eq.${invoiceId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const newSn = payload.new.sn;
          const newNotes = payload.new.notes;
          if (newStatus) {
            setDbStatus(newStatus);
            setTrx((prev) =>
              prev
                ? {
                    ...prev,
                    status: newStatus,
                    sn: newSn,
                    notes: newNotes !== undefined ? newNotes : prev.notes,
                  }
                : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [invoiceId]);

  // --- 2. TIMER LOGIC (TARGET TIMESTAMP ABSOLUT) ---
  useEffect(() => {
    if (dbStatus !== "Pending" || !targetExpiryTime || !isTimeCalculated) {
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;

    const updateTimer = () => {
      const now = Date.now();
      const secondsRemaining = Math.max(0, Math.floor((targetExpiryTime - now) / 1000));
      setTimeLeft(secondsRemaining);

      if (secondsRemaining <= 0) {
        if (intervalId) clearInterval(intervalId);
        setDbStatus("Gagal");

        if (invoiceId) {
          fetch("/api/orders/expire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: invoiceId }),
          }).catch((err) => {
            console.error("Gagal sinkron status kedaluwarsa ke database:", err);
          });
        }
      }
    };

    updateTimer();
    intervalId = setInterval(updateTimer, 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [dbStatus, targetExpiryTime, isTimeCalculated, invoiceId]);

  // --- 3. NOTIFIKASI SUARA ---
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (dbStatus === "Berhasil" && !soundPlayed.current) {
      const audio = new Audio("/sound/ting.mp3");
      const timer = setTimeout(() => {
        audio
          .play()
          .then(() => {
            soundPlayed.current = true;
          })
          .catch((err) => {
            console.log("Browser blokir suara:", err);
          });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [dbStatus]);

  // --- 4. HELPERS ---
  const isGagal =
    dbStatus === "Gagal" || dbStatus === "Expired" || dbStatus === "Batal";
  const isProcessing = dbStatus === "Diproses";
  const isBerhasil = dbStatus === "Berhasil";

  const isNotesExpired = Boolean(
    trx?.notes &&
      (trx.notes.toLowerCase().includes("batal otomatis") ||
        trx.notes.toLowerCase().includes("batas waktu") ||
        trx.notes.toLowerCase().includes("kadaluarsa") ||
        trx.notes.toLowerCase().includes("kedaluwarsa") ||
        trx.notes.toLowerCase().includes("expired"))
  );

  const isProviderFailure =
    isGagal &&
    !isNotesExpired &&
    Boolean(
      (trx?.notes && trx.notes.trim() !== "") ||
        (trx?.used_balance && Number(trx.used_balance) > 0)
    );

  const isExpiredFailure = isGagal && !isProviderFailure;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimeLeft = (seconds: number) => {
    const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const h = Math.floor(safeSeconds / 3600);
    const m = Math.floor((safeSeconds % 3600) / 60);
    const s = safeSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatTransactionDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const monthsId = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const monthsEn = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const months = locale === "en" ? monthsEn : monthsId;
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} - ${hours}:${minutes}`;
  };

  const getPaymentDetails = (method: string) => {
    const p = method?.toLowerCase().trim() || "";
    const account = paymentAccounts.find((acc) => {
      const mk = (acc.method_key || "").toLowerCase().trim();
      const nm = (acc.name || "").toLowerCase().trim();
      return (
        (mk && p.includes(mk)) ||
        (nm && p.includes(nm)) ||
        (nm && nm.includes(p))
      );
    });

    if (account) {
      return {
        name: account.name,
        no: account.account_no,
        an: account.account_name,
        logo: account.logo_url || "/payment/default.png",
        isQR: account.is_qr,
      };
    }
    return {
      name: method || "Transfer",
      no: "-",
      an: "-",
      logo: "/payment/default.png",
      isQR: false,
    };
  };

  if (!trx) return <InvoiceReceiptSkeleton />;

  const displayProductName =
    trx.brand_name ||
    trx.clean_product_name ||
    (trx.product_name
      ? trx.product_name
          .replace(
            /\s+\d+([.,]\d+)*\s*(diamonds?|dm|uc|cp|koin|coins?|rb|k|vip|pass)?$/i,
            ""
          )
          .trim()
      : "") ||
    trx.product_name;

  const formattedTotal = new Intl.NumberFormat(
    locale === "en" ? "en-US" : "id-ID"
  ).format(trx.total_amount || 0);

  const payDetail = getPaymentDetails(trx.payment_method);
  const paymentMethodUpper = (trx.payment_method || "").toUpperCase();
  const isQris = payDetail.isQR || paymentMethodUpper.includes("QRIS");
  const isEwallet = [
    "DANA",
    "OVO",
    "GOPAY",
    "SHOPEEPAY",
    "LINKAJA",
    "ISAKU",
  ].some((ew) => paymentMethodUpper.includes(ew));

  // Bedakan secara tegas antara VIRTUAL ACCOUNT (otomatis) vs TRANSFER MANUAL (ke rekening toko)
  const isVa =
    paymentMethodUpper.includes("VA") ||
    paymentMethodUpper.includes("VIRTUAL ACCOUNT");

  const isManualTransfer = !isQris && !isEwallet && !isVa;

  // --- HALAMAN UTAMA INVOICE PEMBAYARAN (2 KOLOM: LAPAKGAMING STYLE) ---
  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:px-6 font-sans tracking-tight">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Breadcrumb Navigasi Atas */}
        <div className="text-xs font-semibold text-blue-600 flex items-center gap-1.5 pl-1">
          <button
            onClick={() => router.back()}
            className="hover:underline flex items-center gap-0.5 cursor-pointer text-blue-600"
          >
            <ChevronLeft size={14} />
            {t("checkout.back")}
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 font-mono">#{trx.order_id}</span>
        </div>

        {/* Layout 2 Kolom Responsif */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ========================================================
              KOLOM KIRI (UTAMA) - 8 Kolom Desktop
             ======================================================== */}
          <div className="lg:col-span-8 space-y-4">
            {/* KARTU 1: KOTAK PEMBAYARAN UTAMA */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7 space-y-5">
              {/* Stepper 3 Tahap */}
              <CheckoutStepper
                status={dbStatus}
                failureStep={isProviderFailure ? "processing" : "payment"}
              />

              {/* KASUS 1: GAGAL KEDALUWARSA (BELUM BAYAR & WAKTU HABIS) */}
              {isExpiredFailure && (
                <>
                  {/* Banner Merah Muda: Udah lewat batas waktu bayar */}
                  <div className="bg-[#fee2e2]/70 border border-[#fecaca] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#dc2626] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <X size={20} strokeWidth={3} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 leading-tight">
                        {t("checkout.expiredBannerTitle")}
                      </span>
                      <span className="text-xs font-medium text-slate-600 mt-0.5">
                        {t("checkout.expiredBannerDesc")}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Biru Tua Solid: Beli lagi */}
                  <Link
                    href={locale === "en" ? "/en" : "/"}
                    className="block w-full py-3.5 bg-[#102a83] hover:bg-[#0c2064] text-white rounded-xl font-bold text-xs uppercase transition-all shadow-md text-center tracking-wider active:scale-98"
                  >
                    {t("checkout.buyAgainBtn")}
                  </Link>

                  {/* Info No. Transaksi & Waktu Transaksi di dalam Kartu 1 */}
                  <div className="pt-2 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        {t("checkout.transactionNo")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 font-mono">
                          #{trx.order_id}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(trx.order_id, "transaksi_no_expired")
                          }
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          {copiedId === "transaksi_no_expired"
                            ? t("checkout.copied")
                            : t("checkout.copy")}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        {t("checkout.transactionTime")}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatTransactionDate(trx.created_at)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* KASUS 2: GAGAL PENGIRIMAN SISTEM SETELAH PEMBAYARAN */}
              {isProviderFailure && (
                <>
                  {/* Banner Merah Muda / Rose: Pengiriman Gagal */}
                  <div className="bg-[#fee2e2]/70 border border-[#fecaca] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#dc2626] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <X size={20} strokeWidth={3} />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-bold text-slate-900 leading-tight">
                        {trx.user_id
                          ? t("checkout.memberRefundFailedTitle")
                          : t("checkout.guestRefundFailedTitle")}
                      </span>
                      <span className="text-xs font-medium text-slate-600 leading-relaxed">
                        {trx.user_id
                          ? t("checkout.memberRefundFailedDesc", {
                              amount: formattedTotal,
                            })
                          : t("checkout.guestRefundFailedDesc", {
                              amount: formattedTotal,
                            })}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Aksi: Member (Cek Saldo) vs Guest (WhatsApp Refund) */}
                  {trx.user_id ? (
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <Link
                        href={
                          locale === "en"
                            ? "/en/dashboard/saldo"
                            : "/dashboard/saldo"
                        }
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase transition-all shadow-md text-center tracking-wider active:scale-98"
                      >
                        {t("checkout.checkBalanceBtn")}
                      </Link>
                      <Link
                        href={locale === "en" ? "/en" : "/"}
                        className="flex-1 py-3.5 bg-[#102a83] hover:bg-[#0c2064] text-white rounded-xl font-bold text-xs uppercase transition-all shadow-md text-center tracking-wider active:scale-98"
                      >
                        {t("checkout.buyAgainBtn")}
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <a
                        href={getWhatsAppUrl(
                          t("checkout.whatsappGuestRefundMsg", {
                            orderId: trx.order_id,
                            product: `${displayProductName} - ${
                              trx.item_label || trx.sku || ""
                            }`,
                            amount: formattedTotal,
                            customerNo: trx.customer_no,
                          })
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase transition-all shadow-md text-center tracking-wider active:scale-98 flex items-center justify-center gap-2"
                      >
                        {t("checkout.claimRefundWaBtn")}
                      </a>
                      <Link
                        href={locale === "en" ? "/en" : "/"}
                        className="flex-1 py-3.5 bg-[#102a83] hover:bg-[#0c2064] text-white rounded-xl font-bold text-xs uppercase transition-all shadow-md text-center tracking-wider active:scale-98"
                      >
                        {t("checkout.buyAgainBtn")}
                      </Link>
                    </div>
                  )}

                  {/* Info No. Transaksi & Waktu Transaksi di dalam Kartu 1 */}
                  <div className="pt-2 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        {t("checkout.transactionNo")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 font-mono">
                          #{trx.order_id}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(trx.order_id, "transaksi_no_failed")
                          }
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          {copiedId === "transaksi_no_failed"
                            ? t("checkout.copied")
                            : t("checkout.copy")}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        {t("checkout.transactionTime")}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatTransactionDate(trx.created_at)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* KASUS 3: SEDANG DIPROSES (PEMBAYARAN DITERIMA, SISTEM MENGIRIM PRODUK) */}
              {isProcessing && (
                <>
                  {/* Banner Biru: Sedang Diproses */}
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Loader2 size={20} className="animate-spin text-white" />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-bold text-slate-900 leading-tight">
                          {t("checkout.processingBannerTitle")}
                        </span>
                        <span className="text-xs font-medium text-slate-600 leading-relaxed">
                          {t("checkout.processingBannerDesc")}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/90 rounded-xl p-3 border border-blue-100/80 flex items-center gap-2.5 text-xs text-blue-900 font-medium">
                      <Clock size={16} className="text-blue-600 shrink-0" />
                      <span>{t("checkout.processingEtaNotice")}</span>
                    </div>
                  </div>

                  {/* Baris Ringkasan Produk & Status Lunas */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={trx.product_logo || "/default-logo.png"}
                          alt={displayProductName}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#059669] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {t("checkout.topUpBadge")}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            {trx.item_label || trx.sku}
                          </h4>
                        </div>
                        <span className="text-xs text-slate-400 font-medium mt-0.5">
                          {displayProductName}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-xs text-slate-400 font-medium block">
                        {t("checkout.totalPayment")}
                      </span>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                          Rp{formattedTotal}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                          {t("checkout.paidBadge")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sandbox Testing Banner (jika tester di Sandbox sedang proses) */}
                  {trx.is_sandbox && (
                    <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                          🧪 {t("checkout.sandboxMode")}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-600">
                          {t("checkout.simulationTesting")}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-700">
                        {t("checkout.simulateTestingProcessingHint")}
                      </p>
                      <div className="pt-1 flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          disabled={simulating}
                          onClick={() => handleSimulatePayment({ force_fail: false })}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
                        >
                          {simulating ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              {t("checkout.processingSimulation")}
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              {t("checkout.simulateSuccessDelivery")}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={simulating}
                          onClick={() => handleSimulatePayment({ force_fail: true })}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
                        >
                          {simulating ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              {t("checkout.processingSimulation")}
                            </>
                          ) : (
                            <>
                              <X size={14} />
                              {t("checkout.simulateFailedDelivery")}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* KASUS 4: BERHASIL / SELESAI (PRODUK SUKSES TERKIRIM) */}
              {isBerhasil && (
                <>
                  {/* Banner Hijau Sukses */}
                  <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-bold text-slate-900 leading-tight">
                        {t("checkout.orderSuccessDelivery")}
                      </span>
                      <span className="text-xs font-medium text-slate-600 leading-relaxed">
                        {t("checkout.transactionSuccessProcessed")}
                      </span>
                    </div>
                  </div>

                  {/* Baris Ringkasan Produk & Status Lunas */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={trx.product_logo || "/default-logo.png"}
                          alt={displayProductName}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#059669] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {t("checkout.topUpBadge")}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            {trx.item_label || trx.sku}
                          </h4>
                        </div>
                        <span className="text-xs text-slate-400 font-medium mt-0.5">
                          {displayProductName}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-xs text-slate-400 font-medium block">
                        {t("checkout.totalPayment")}
                      </span>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                          Rp{formattedTotal}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                          {t("checkout.paidBadge")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KOTAK HASIL PENGIRIMAN: SN / TOKEN PLN / KODE VOUCHER */}
                  {trx.sn && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {trx.sku?.toLowerCase() === "pln" || trx.category?.toLowerCase().includes("pln")
                            ? "TOKEN LISTRIK PLN"
                            : t("checkout.serialNumberLabel")}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(trx.sn || "", "trx_sn_success")}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer active:scale-95 transition-transform"
                        >
                          {copiedId === "trx_sn_success"
                            ? t("checkout.copied")
                            : t("checkout.copy")}
                        </button>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-slate-200 text-slate-900 font-mono font-bold text-sm sm:text-base tracking-wider break-all select-all">
                        {trx.sn}
                      </div>
                    </div>
                  )}

                  {/* TOMBOL AKSI: LIHAT/UNDUH STRUK & BELI LAGI */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setIsReceiptModalOpen(true)}
                      className="flex-1 py-3 px-4 bg-white hover:bg-slate-50 border-2 border-blue-600 text-blue-600 rounded-xl font-bold text-xs uppercase transition-all shadow-2xs flex items-center justify-center gap-2 tracking-wider active:scale-98 cursor-pointer"
                    >
                      <Receipt size={16} />
                      {t("checkout.viewDigitalReceipt")}
                    </button>
                    <Link
                      href={locale === "en" ? "/en" : "/"}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase transition-all shadow-md text-center tracking-wider active:scale-98"
                    >
                      {t("checkout.buyAgainBtn")}
                    </Link>
                  </div>
                </>
              )}

              {/* KASUS 5: PENDING (BELUM BAYAR) */}
              {!isGagal && !isProcessing && !isBerhasil && (
                <>
                  {/* Banner Orange Countdown Batas Waktu */}
              <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-2xl p-4 sm:p-4.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#f97316] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CreditCard size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 leading-tight">
                    {t("checkout.payBannerTitle")}
                  </span>
                  <span className="text-xs font-medium text-slate-500 mt-0.5">
                    {t("checkout.payTimeLimit", { time: "" })}
                    <strong className="text-[#dc2626] font-bold ml-1 font-mono">
                      {formatTimeLeft(timeLeft)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Baris Ringkasan Produk & Total Pembayaran */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={trx.product_logo || "/default-logo.png"}
                      alt={displayProductName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#059669] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {t("checkout.topUpBadge")}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                        {trx.item_label || trx.sku}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 font-medium mt-0.5">
                      {displayProductName}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-xs text-slate-400 font-medium block">
                    {t("checkout.totalPayment")}
                  </span>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                      Rp{formattedTotal}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          String(trx.total_amount || 0),
                          "total_payment_header"
                        )
                      }
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {copiedId === "total_payment_header"
                        ? t("checkout.copied")
                        : t("checkout.copy")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Kotak Metode Pembayaran Spesifik */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span>{t("checkout.payWith")}</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={payDetail.logo}
                      alt={trx.payment_method}
                      className="h-4 w-auto object-contain"
                    />
                    <span className="font-bold text-slate-800 text-xs">
                      {trx.payment_method}
                    </span>
                  </div>
                </div>

                {/* --- METODE VIRTUAL ACCOUNT (VA) --- */}
                {isVa && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                    {/* Kotak Biru Nomor VA */}
                    <div className="flex-1 bg-[#e0edff] rounded-2xl px-4 py-3 flex items-center justify-between sm:justify-start gap-4 sm:gap-6 border border-[#bfdbfe]/70">
                      <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
                        {t("checkout.virtualAccountNo")}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-wide">
                          {payDetail.no !== "-" ? payDetail.no : (trx.payment_code || trx.order_id)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              payDetail.no !== "-" ? payDetail.no : (trx.payment_code || trx.order_id),
                              "va_no"
                            )
                          }
                          className="text-xs font-bold text-[#1e40af] hover:text-[#1d4ed8] cursor-pointer active:scale-95 transition-transform"
                        >
                          {copiedId === "va_no"
                            ? t("checkout.copied")
                            : t("checkout.copy")}
                        </button>
                      </div>
                    </div>

                    {/* Tombol Lihat Cara Bayar VA */}
                    <button
                      type="button"
                      onClick={() => setIsInstructionModalOpen(true)}
                      className="px-5 py-3 rounded-2xl border-2 border-[#1e40af] text-[#1e40af] bg-white hover:bg-blue-50/50 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap text-center shrink-0"
                    >
                      {t("checkout.viewPaymentInstructions")}
                    </button>
                  </div>
                )}

                {/* --- METODE TRANSFER BANK MANUAL (ATURAN TRANSFER MANUAL) --- */}
                {isManualTransfer && (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Kotak Biru Nomor Rekening Manual (Bukan VA) */}
                      <div className="flex-1 bg-[#eff6ff] rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 border border-[#dbeafe]">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                            No. rekening:
                          </span>
                          <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-wide">
                            {payDetail.no !== "-" ? payDetail.no : trx.order_id}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                payDetail.no !== "-" ? payDetail.no : trx.order_id,
                                "transfer_no"
                              )
                            }
                            className="text-xs font-bold text-[#1e40af] hover:text-[#1d4ed8] cursor-pointer active:scale-95 transition-transform ml-1"
                          >
                            {copiedId === "transfer_no"
                              ? t("checkout.copied")
                              : t("checkout.copy")}
                          </button>
                        </div>

                        {payDetail.an && payDetail.an !== "-" && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            <span>a.n. </span>
                            <strong className="text-slate-800 font-semibold">{payDetail.an}</strong>
                          </div>
                        )}
                      </div>

                      {/* Tombol Lihat Cara Bayar Transfer Manual */}
                      <button
                        type="button"
                        onClick={() => setIsInstructionModalOpen(true)}
                        className="px-5 py-3 rounded-2xl border-2 border-[#1e40af] text-[#1e40af] bg-white hover:bg-blue-50/50 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap text-center shrink-0"
                      >
                        {t("checkout.viewPaymentInstructions")}
                      </button>
                    </div>

                    {/* Informasi Penting Aturan Transfer Manual */}
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
                      💡 <strong>Aturan Transfer Manual:</strong> Pastikan Anda mentransfer nominal tepat sebesar{" "}
                      <strong className="font-mono text-amber-900 font-bold">
                        Rp {formattedTotal}
                      </strong>{" "}
                      ke nomor rekening di atas agar pesanan dapat diverifikasi dan diproses secara otomatis oleh sistem.
                    </div>
                  </div>
                )}

                {/* --- METODE QRIS --- */}
                {isQris && (
                  <div className="bg-white border-2 border-dashed border-blue-200 rounded-3xl p-5 flex flex-col items-center justify-center space-y-3">
                    <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-100">
                      {qrisString ? (
                        <QRCodeSVG
                          value={qrisString}
                          size={220}
                          level="H"
                          includeMargin={true}
                          className="rounded-xl"
                        />
                      ) : (
                        <div className="w-52 h-52 flex flex-col items-center justify-center bg-slate-50 rounded-xl">
                          <Loader2
                            size={28}
                            className="animate-spin text-blue-600"
                          />
                          <span className="text-xs text-slate-400 mt-2 font-medium">
                            {t("checkout.preparingPayment")}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium text-center max-w-sm">
                      {t("checkout.scanAndPay", {
                        amount: `Rp ${formattedTotal}`,
                      })}
                    </p>
                  </div>
                )}

                {/* --- METODE E-WALLET (DANA, OVO, GOPAY, DLL) --- */}
                {isEwallet && (
                  <div className="bg-slate-50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={payDetail.logo}
                          alt={trx.payment_method}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {trx.payment_method}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {t("checkout.accountName")} {payDetail.an || "DaPay"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (trx.is_sandbox) {
                          handleSimulatePayment();
                        } else {
                          alert(
                            t("checkout.transferWarningText") ||
                              "Silakan buka aplikasi e-wallet Anda untuk menyelesaikan pembayaran."
                          );
                        }
                      }}
                      className="px-6 py-2.5 bg-[#1e40af] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer text-center"
                    >
                      {t("checkout.payNow")}
                    </button>
                  </div>
                )}

                {/* Sandbox Testing Banner (Khusus Environment Sandbox) */}
                {trx.is_sandbox && (
                  <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                        🧪 {t("checkout.sandboxMode")}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-600">
                        {t("checkout.simulationTesting")}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-700">
                      {t("checkout.sandboxNotice")}
                    </p>
                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        disabled={simulating}
                        onClick={() => handleSimulatePayment({ auto_resolve: false })}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        {simulating ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            {t("checkout.processingSimulation")}
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            {t("checkout.simulatePayToProcessing")}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={simulating}
                        onClick={() => handleSimulatePayment({ auto_resolve: true })}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        {simulating ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            {t("checkout.processingSimulation")}
                          </>
                        ) : (
                          <>
                            <Zap size={14} />
                            {t("checkout.instantSimulationPay")}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
                </>
              )}
            </div>

            {/* KARTU 2: STATUS TRANSAKSI (Hanya ditampilkan jika belum kedaluwarsa atau bukan gagal) */}
            {!isGagal && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">
                    {t("checkout.statusTransaction")}
                  </span>
                  {isBerhasil ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-emerald-500 text-emerald-600 text-xs font-bold uppercase tracking-wider bg-emerald-50">
                      <CheckCircle size={12} />
                      {t("checkout.statusSuccess")}
                    </span>
                  ) : isProcessing ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-blue-500 text-blue-600 text-xs font-bold uppercase tracking-wider bg-blue-50">
                      <Loader2 size={12} className="animate-spin" />
                      {t("checkout.stepperProcessing")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full border border-orange-500 text-orange-600 text-xs font-bold uppercase tracking-wider bg-orange-50/50">
                      {t("checkout.notYetProcessed")}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">
                    {t("checkout.transactionNo")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 font-mono">
                      #{trx.order_id}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(trx.order_id, "transaksi_no")
                      }
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      {copiedId === "transaksi_no"
                        ? t("checkout.copied")
                        : t("checkout.copy")}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-500 font-medium">
                    {t("checkout.transactionTime")}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatTransactionDate(trx.created_at)}
                  </span>
                </div>
              </div>
            )}

            {/* KARTU 3: DETAIL PRODUK */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight pb-1 border-b border-slate-100">
                {t("checkout.productDetails")}
              </h3>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">
                  {t("checkout.productName")}
                </span>
                <span className="font-bold text-slate-800">
                  {displayProductName}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">
                  {t("checkout.itemNominal")}
                </span>
                <span className="font-bold text-slate-800">
                  {trx.item_label || trx.sku}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">
                  {t("checkout.userId")}
                </span>
                <span className="font-bold text-slate-800 font-mono">
                  {trx.customer_no}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">
                  {t("checkout.quantity")}
                </span>
                <span className="font-bold text-slate-800">1</span>
              </div>
            </div>

            {/* KARTU 4: DETAIL PEMBAYARAN */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight pb-1 border-b border-slate-100">
                {t("checkout.paymentDetails")}
              </h3>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">
                  {t("checkout.totalTransaction")}
                </span>
                <span className="font-semibold text-slate-800">
                  Rp{formattedTotal}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">
                  {t("checkout.totalPayment")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                    Rp{formattedTotal}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        String(trx.total_amount || 0),
                        "total_payment_detail"
                      )
                    }
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {copiedId === "total_payment_detail"
                      ? t("checkout.copied")
                      : t("checkout.copy")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              KOLOM KANAN (SIDEBAR EDUKASI & KEAMANAN) - 4 Kolom Desktop
             ======================================================== */}
          <div className="lg:col-span-4 space-y-4">
            {/* SIDEBAR CARD 1: GARANSI UANG KEMBALI */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Shield size={20} className="fill-blue-100" />
                </div>
                <span className="text-xs font-semibold text-slate-700 leading-snug">
                  {t("checkout.moneyBackGuarantee")}
                </span>
              </div>
              <div
                className="text-blue-600 shrink-0 cursor-pointer"
                title={t("checkout.moneyBackGuarantee")}
              >
                <Info size={18} />
              </div>
            </div>

            {/* SIDEBAR CARD 2: CATATAN (7 POIN PANDUAN RESMI) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {t("checkout.notesTitle")}
              </h3>
              <ol className="list-decimal list-outside pl-4 space-y-2 text-xs text-slate-600 leading-relaxed">
                <li>{t("checkout.note1")}</li>
                <li>{t("checkout.note2")}</li>
                <li>{t("checkout.note3")}</li>
                <li>{t("checkout.note4")}</li>
                <li>{t("checkout.note5")}</li>
                <li>{t("checkout.note6")}</li>
                <li>{t("checkout.note7")}</li>
              </ol>
            </div>

            {/* SIDEBAR CARD 3: JAGA KEAMANAN DATAMU */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                <Lock size={20} className="fill-amber-100" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  {t("checkout.keepDataSafeTitle")}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t("checkout.keepDataSafeDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up Modal Cara Pembayaran VA / Transfer Manual */}
      <PaymentInstructionsModal
        isOpen={isInstructionModalOpen}
        onClose={() => setIsInstructionModalOpen(false)}
        bankName={trx.payment_method || "Virtual Account"}
        isManual={isManualTransfer}
        accountNo={payDetail.no !== "-" ? payDetail.no : (trx.payment_code || trx.order_id)}
        accountName={payDetail.an}
      />

      {/* Pop-up Modal Struk Resmi Digital DaPay */}
      {isReceiptModalOpen && trx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("receipt.digitalReceiptProof")}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    #{trx.order_id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label={t("checkout.close")}
              >
                <X size={16} />
              </button>
            </div>

            <div className="pt-1">
              {trx.category?.toLowerCase().includes("pascabayar") ||
              trx.sku?.toLowerCase() === "pln" ? (
                <ReceiptPascabayar order={trx} />
              ) : (
                <ReceiptPrabayar order={trx} />
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                {t("checkout.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicePage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500 italic uppercase">
          {t("common.loading")}
        </div>
      }
    >
      <InvoiceContent />
    </Suspense>
  );
}
