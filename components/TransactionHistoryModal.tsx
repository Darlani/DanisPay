"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import {
  ReceiptText,
  X,
  AlertCircle,
  Clock,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useI18n } from "@/lib/i18n/context";
import { localizeHref } from "@/lib/i18n/config";

interface CachedOrder {
  order_id: string;
  product_name?: string;
  item_label?: string;
  status?: string;
  created_at?: string;
  payment_method?: string;
  total_amount?: number;
}

interface TrackedOrderDetails {
  order_id: string;
  status: string;
  product_name?: string;
  item_label?: string;
  customer_no?: string;
  price?: number;
  total_amount?: number;
  created_at?: string;
  updated_at?: string;
  sn?: string;
  notes?: string;
  payment_method?: string;
  category?: string;
}

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionHistoryModal({
  isOpen,
  onClose,
}: TransactionHistoryModalProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const inputId = useId();

  const [invoiceInput, setInvoiceInput] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentOrders, setRecentOrders] = useState<CachedOrder[]>([]);

  // Ambil riwayat pesanan lokal dari localStorage
  const loadRecentOrders = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("dapay_guest_history");
      if (raw) {
        const parsed: CachedOrder[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentOrders(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadRecentOrders();
      setError("");
    }
  }, [isOpen, loadRecentOrders]);

  const clearRecentHistory = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("dapay_guest_history");
      setRecentOrders([]);
    } catch {
      // Ignore
    }
  };

  const executeTrack = async (invoiceToSearch: string) => {
    const cleanInvoice = invoiceToSearch.trim().toUpperCase();
    if (!cleanInvoice) return;

    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        process.env.NODE_ENV === "development");

    if (!captchaToken && !isLocal) {
      setError(t("tracking.securityAlert"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: cleanInvoice }),
      });

      const result = await res.json();

      if (res.ok && result.success && result.data) {
        const orderData: TrackedOrderDetails = result.data;

        // Simpan ke riwayat lokal jika di browser
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("dapay_guest_history");
            const history: CachedOrder[] = raw ? JSON.parse(raw) : [];
            const existingIndex = history.findIndex(
              (item) => item.order_id === cleanInvoice
            );
            const updatedItem: CachedOrder = {
              order_id: orderData.order_id,
              product_name: orderData.product_name,
              item_label: orderData.item_label,
              status: orderData.status,
              created_at: orderData.created_at,
              payment_method: orderData.payment_method,
              total_amount: orderData.total_amount,
            };

            if (existingIndex !== -1) {
              history[existingIndex] = updatedItem;
            } else {
              history.unshift(updatedItem);
            }
            localStorage.setItem(
              "dapay_guest_history",
              JSON.stringify(history.slice(0, 10))
            );
          } catch {
            // Ignore
          }
        }

        // STANDAR LAPAKGAMING/CODASHOP: Tutup modal dan navigasi mulus di tab yang sama
        handleClose();
        router.push(localizeHref(`/invoice/${cleanInvoice}`, locale));
      } else {
        setError(result.error || t("tracking.notFound"));
      }
    } catch {
      setError(t("tracking.serverError"));
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTrack(invoiceInput);
  };

  const handleSelectRecent = (orderId: string) => {
    setInvoiceInput(orderId);
    executeTrack(orderId);
  };

  const handleClose = () => {
    setInvoiceInput("");
    setError("");
    setCaptchaToken(null);
    onClose();
  };

  if (!isOpen) return null;

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      process.env.NODE_ENV === "development");

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-order-modal-title"
    >
      {/* Modal Container: Sederhana, Bersih & Compact (max-w-md) */}
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <ReceiptText size={18} />
            </div>
            <div>
              <h2
                id="track-order-modal-title"
                className="font-bold text-base text-white leading-tight"
              >
                {t("tracking.modalTitle")}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t("tracking.directTrackNotice")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.close")}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Form Input Invoice */}
          <form onSubmit={handleTrackSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor={inputId}
                className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider"
              >
                {t("tracking.orderIdLabel")}
              </label>
              <div className="relative flex items-center">
                <input
                  id={inputId}
                  type="text"
                  value={invoiceInput}
                  onChange={(e) => setInvoiceInput(e.target.value.toUpperCase())}
                  placeholder={t("tracking.placeholder")}
                  disabled={loading}
                  autoComplete="off"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-3 pr-24 text-sm font-mono tracking-wide text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !invoiceInput.trim() ||
                    (!captchaToken && !isLocalhost)
                  }
                  className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-3.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <span>{t("tracking.searchButton")}</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Turnstile Security Widget */}
            <div className="flex justify-center pt-0.5">
              <Turnstile
                siteKey={
                  isLocalhost
                    ? "1x00000000000000000000AA"
                    : "0x4AAAAAACkQAA6L_WPQSSms"
                }
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: "dark" }}
              />
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle size={15} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Skeleton Shimmer Streaming saat Memproses */}
          {loading && (
            <div className="space-y-2.5 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 animate-pulse">
              <div className="h-3.5 w-28 bg-slate-800 rounded-md" />
              <div className="h-5 w-3/4 bg-slate-800 rounded-lg" />
              <div className="h-3.5 w-1/2 bg-slate-800 rounded-md" />
            </div>
          )}

          {/* Riwayat Transaksi Terakhir di Perangkat Ini */}
          {recentOrders.length > 0 && !loading && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5 text-[11px]">
                  <Clock size={12} className="text-slate-500" />
                  <span>{t("tracking.recentSearches")}</span>
                </span>
                <button
                  type="button"
                  onClick={clearRecentHistory}
                  className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10.5px] cursor-pointer"
                >
                  <Trash2 size={10} />
                  <span>{t("tracking.clearRecent")}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {recentOrders.map((item) => {
                  const isSuccess = item.status?.toLowerCase() === "berhasil";
                  const isPending =
                    item.status?.toLowerCase() === "pending" ||
                    item.status?.toLowerCase() === "diproses";

                  return (
                    <button
                      key={item.order_id}
                      type="button"
                      onClick={() => handleSelectRecent(item.order_id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/40 transition-all text-left group cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                            {item.order_id}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase shrink-0 ${
                              isSuccess
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : isPending
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {item.status || "Pending"}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          {item.item_label ||
                            item.product_name ||
                            "Produk Digital"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0">
                        <ArrowUpRight size={14} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Micro Trust Notice */}
          <div className="pt-1 text-center">
            <p className="text-[10.5px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>{t("common.safeFastTx")}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
