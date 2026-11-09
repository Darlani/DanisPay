"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
  ReceiptText, X, ExternalLink, AlertCircle, Clock,
  Trash2, ArrowUpRight, ShieldCheck,
  Copy, Check, ChevronLeft, ArrowRight
} from "lucide-react";
import { Turnstile } from '@marsidev/react-turnstile'; 
import { supabase } from "@/utils/supabaseClient";
import { useI18n } from "@/lib/i18n/context";
import { formatRupiah } from "@/lib/i18n/formatters";

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

export default function TransactionHistoryModal({ isOpen, onClose }: TransactionHistoryModalProps) {
  const { t, locale } = useI18n();
  const inputId = useId();

  const [invoiceInput, setInvoiceInput] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackedOrderDetails | null>(null);
  const [recentOrders, setRecentOrders] = useState<CachedOrder[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  // Supabase Realtime: dengarkan perubahan status order (LIVE & SANDBOX) secara instan
  useEffect(() => {
    if (!order?.order_id) return;

    const currentOrderId = order.order_id;
    const currentStatus = (order.status || "").toLowerCase();

    // Hanya subscribe jika status transaksi masih aktif/dalam proses
    if (currentStatus !== "pending" && currentStatus !== "diproses") {
      return;
    }

    const channel = supabase
      .channel(`modal-order-${currentOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${currentOrderId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<TrackedOrderDetails>;
          if (updated && updated.order_id === currentOrderId) {
            setOrder((prev) => {
              if (!prev) return prev;
              const next: TrackedOrderDetails = {
                ...prev,
                status: updated.status || prev.status,
                sn: updated.sn ?? prev.sn,
                notes: updated.notes ?? prev.notes,
                updated_at: updated.updated_at ?? prev.updated_at,
              };
              if (typeof window !== "undefined") {
                try {
                  const raw = localStorage.getItem("dapay_guest_history");
                  const history: CachedOrder[] = raw ? JSON.parse(raw) : [];
                  const idx = history.findIndex((item) => item.order_id === currentOrderId);
                  if (idx !== -1) {
                    history[idx] = { ...history[idx], status: next.status };
                    localStorage.setItem("dapay_guest_history", JSON.stringify(history));
                    loadRecentOrders();
                  }
                } catch {
                  // Ignore
                }
              }
              return next;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sandbox_orders",
          filter: `order_id=eq.${currentOrderId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<TrackedOrderDetails>;
          if (updated && updated.order_id === currentOrderId) {
            setOrder((prev) => {
              if (!prev) return prev;
              const next: TrackedOrderDetails = {
                ...prev,
                status: updated.status || prev.status,
                sn: updated.sn ?? prev.sn,
                notes: updated.notes ?? prev.notes,
                updated_at: updated.updated_at ?? prev.updated_at,
              };
              if (typeof window !== "undefined") {
                try {
                  const raw = localStorage.getItem("dapay_guest_history");
                  const history: CachedOrder[] = raw ? JSON.parse(raw) : [];
                  const idx = history.findIndex((item) => item.order_id === currentOrderId);
                  if (idx !== -1) {
                    history[idx] = { ...history[idx], status: next.status };
                    localStorage.setItem("dapay_guest_history", JSON.stringify(history));
                    loadRecentOrders();
                  }
                } catch {
                  // Ignore
                }
              }
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [order?.order_id, order?.status, loadRecentOrders]);

  const clearRecentHistory = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("dapay_guest_history");
      setRecentOrders([]);
    } catch {
      // Ignore
    }
  };

  const copyText = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const openInvoiceInNewTab = (orderId: string) => {
    const cleanId = orderId.trim().toUpperCase();
    const targetUrl = locale === "en" ? `/en/invoice/${cleanId}` : `/invoice/${cleanId}`;
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const executeTrack = async (invoiceToSearch: string) => {
    const cleanInvoice = invoiceToSearch.trim().toUpperCase();
    if (!cleanInvoice) return;

    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || process.env.NODE_ENV === "development");

    if (!captchaToken && !isLocal && !order) {
      setError(t("tracking.securityAlert"));
      return;
    }

    // Buka tab secara sinkron agar tidak terblokir oleh popup blocker browser
    let preOpenedTab: Window | null = null;
    if (typeof window !== "undefined") {
      try {
        preOpenedTab = window.open("about:blank", "_blank");
      } catch {
        preOpenedTab = null;
      }
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: cleanInvoice })
      });

      const result = await res.json();

      if (res.ok && result.success && result.data) {
        const orderData: TrackedOrderDetails = result.data;
        setOrder(orderData);

        // Arahkan tab yang sudah dibuka ke target URL struk resmi lengkap
        const targetUrl = locale === "en" ? `/en/invoice/${cleanInvoice}` : `/invoice/${cleanInvoice}`;
        if (preOpenedTab && !preOpenedTab.closed) {
          preOpenedTab.location.href = targetUrl;
        } else if (typeof window !== "undefined") {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }

        // Simpan ke riwayat lokal jika di browser
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("dapay_guest_history");
            const history: CachedOrder[] = raw ? JSON.parse(raw) : [];
            const existingIndex = history.findIndex((item) => item.order_id === cleanInvoice);
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
            localStorage.setItem("dapay_guest_history", JSON.stringify(history.slice(0, 10)));
            loadRecentOrders();
          } catch {
            // Ignore
          }
        }
      } else {
        if (preOpenedTab && !preOpenedTab.closed) {
          preOpenedTab.close();
        }
        setError(result.error || t("tracking.notFound"));
      }
    } catch {
      if (preOpenedTab && !preOpenedTab.closed) {
        preOpenedTab.close();
      }
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

  const handleResetSearch = () => {
    setOrder(null);
    setError("");
  };

  const handleClose = () => {
    setInvoiceInput("");
    setError("");
    setCaptchaToken(null);
    setOrder(null);
    onClose();
  };

  if (!isOpen) return null;

  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || process.env.NODE_ENV === "development");

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
              <h2 id="track-order-modal-title" className="font-bold text-base text-white leading-tight">
                {t("tracking.modalTitle")}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {order ? t("tracking.productInfo") : t("tracking.directTrackNotice")}
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

          {/* JIKA ORDER BELUM DILACAK: TAMPILKAN FORM SEDERHANA */}
          {!order ? (
            <>
              {/* Form Input Invoice */}
              <form onSubmit={handleTrackSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor={inputId} className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
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
                      disabled={loading || !invoiceInput.trim() || (!captchaToken && !isLocalhost)}
                      className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-3.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                    >
                      <span>{t("tracking.searchButton")}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Turnstile Security Widget */}
                <div className="flex justify-center pt-0.5">
                  <Turnstile
                    siteKey={isLocalhost ? "1x00000000000000000000AA" : "0x4AAAAAACkQAA6L_WPQSSms"}
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
                      const isPending = item.status?.toLowerCase() === "pending" || item.status?.toLowerCase() === "diproses";

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
                              <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase shrink-0 ${
                                isSuccess
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : isPending
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              }`}>
                                {item.status || "Pending"}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-400 truncate">
                              {item.item_label || item.product_name || "Produk Digital"}
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
            </>
          ) : (
            /* JIKA ORDER SUDAH DILACAK: TAMPILAN QUICK-CARD SEDERHANA & ELEGAN */
            <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">

              {/* Quick Status Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {order.order_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(order.order_id, "invoice")}
                      title={copiedKey === "invoice" ? t("checkout.copied") : t("checkout.copy")}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      {copiedKey === "invoice" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    order.status?.toLowerCase() === "berhasil"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : order.status?.toLowerCase() === "pending"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : order.status?.toLowerCase() === "diproses"
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200 truncate">
                      {order.item_label || order.product_name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {order.customer_no ? `${order.customer_no} • ` : ""}{order.payment_method || "Online"}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-blue-400 text-xs shrink-0">
                    {formatRupiah(order.total_amount || 0, locale)}
                  </span>
                </div>

                {order.sn && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                      {t("tracking.serialNumberLabel")}
                    </p>
                    <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 select-all break-all">
                        {order.sn}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(order.sn || "", "sn")}
                        title={copiedKey === "sn" ? t("checkout.copied") : t("checkout.copy")}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                      >
                        {copiedKey === "sn" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Informative Micro Notice */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center gap-2.5">
                <ExternalLink size={15} className="text-blue-400 shrink-0" />
                <p className="leading-relaxed">
                  {t("tracking.directTrackNotice")}
                </p>
              </div>

              {/* Action Buttons: Simple & Direct */}
              <div className="space-y-2 pt-1">
                {/* Tombol Utama: Buka di Tab Baru */}
                <button
                  type="button"
                  onClick={() => openInvoiceInNewTab(order.order_id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-98 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>{t("tracking.viewInNewTab")}</span>
                </button>

                {/* Tombol Kembali / Lacak Pesanan Lain */}
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={13} />
                  <span>{t("tracking.trackAnother")}</span>
                </button>
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
