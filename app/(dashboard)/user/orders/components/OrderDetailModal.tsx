"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  Package,
  RotateCcw,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  Order,
  displayOrderId,
  formatCoins,
  formatDate,
  formatRupiah,
  getPaymentLabel,
  getPaymentLogo,
  getProductImage,
  getProductSlug,
  getStatusClasses,
  maskSensitiveToken,
  normalizeStatus,
  resolveCustomerName,
  toNumber,
} from "../types";
import OrderTimeline from "./OrderTimeline";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}

export default function OrderDetailModal({
  order,
  onClose,
  onCopy,
}: OrderDetailModalProps) {
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCustNo, setCopiedCustNo] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const status = normalizeStatus(order.status);
  const style = getStatusClasses(status);
  const productImg = getProductImage(order.product_name);
  const totalAmount = toNumber(order.total_amount ?? order.price);
  const usedBalance = toNumber(order.used_balance);
  const usedCoin = toNumber(order.used_coin);
  const isFailed = status === "Gagal";
  const isExpired = status === "Expired";
  const paymentLogo = getPaymentLogo(order.payment_method);
  const paymentLabel = getPaymentLabel(order.payment_method);
  const customerName = resolveCustomerName(order);

  // Auto-hide token after 30 seconds
  useEffect(() => {
    if (!isTokenVisible) return;
    const timer = setTimeout(() => {
      setIsTokenVisible(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [isTokenVisible]);

  // Reset visibility when closing/unmounting
  useEffect(() => {
    return () => {
      setIsTokenVisible(false);
    };
  }, []);

  const handleCopyRawToken = async () => {
    if (!order.sn) return;
    await onCopy(order.sn, "Token / Serial Number");
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyCustNo = async () => {
    if (!order.customer_no) return;
    await onCopy(order.customer_no, "ID Pelanggan");
    setCopiedCustNo(true);
    setTimeout(() => setCopiedCustNo(false), 2000);
  };

  const handleCopyOrderId = async () => {
    if (!order.order_id) return;
    await onCopy(order.order_id, "Order ID");
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleBeliLagi = () => {
    const slug = getProductSlug(order.product_name, order.category);
    if (!slug) {
      window.open("/", "_blank");
      return;
    }
    const params = new URLSearchParams();
    if (order.customer_no) {
      params.set("target", order.customer_no);
      params.set("customer_no", order.customer_no);
    }
    if (order.item_label) params.set("item", order.item_label);
    if (order.sku) params.set("sku", order.sku);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    window.open(`/${slug}${queryStr}`, "_blank");
  };

  const handleOpenInvoice = () => {
    if (!order.order_id) return;
    window.open(`/checkout/pay/${encodeURIComponent(order.order_id)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 p-3 xs:p-4 sm:p-6 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl xs:rounded-3xl sm:rounded-[28px] border border-slate-200/90 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* ========================================================== */}
        {/* MODAL HEADER                                               */}
        {/* ========================================================== */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                Detail Transaksi
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="mt-0.5 truncate text-sm xs:text-base font-black tracking-tight text-slate-950">
                  {displayOrderId(order.order_id)}
                </h2>
                {order.is_sandbox && (
                  <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-600 border border-amber-500/20">
                    Sandbox
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail transaksi"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================== */}
        {/* MODAL SCROLLABLE BODY                                      */}
        {/* ========================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* PRODUCT BANNER & STATUS */}
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4">
            <div className="flex items-center gap-3 min-w-0">
              {productImg ? (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1 shadow-2xs">
                  <img
                    src={productImg}
                    alt={order.product_name || "Produk"}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 shadow-2xs">
                  <Package size={22} />
                </div>
              )}

              <div className="min-w-0">
                <h3 className="truncate text-sm sm:text-base font-black text-slate-950">
                  {order.product_name || "Produk Digital"}
                </h3>
                <p className="truncate text-xs font-semibold text-blue-600">
                  {order.item_label || order.category || "Item Layanan"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right flex flex-col items-end gap-1">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold ${style.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {status}
              </span>
              <p className="text-sm xs:text-base font-black text-slate-950">
                {formatRupiah(totalAmount)}
              </p>
            </div>
          </div>

          {/* SENSITIVE SERIAL NUMBER / TOKEN / VOUCHER BOX */}
          {order.sn && (
            <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Serial Number / Token / Kode Voucher
                </span>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  {isTokenVisible ? "Terbuka (Auto-hide 30d)" : "Privasi Terlindungi"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white p-2.5 shadow-2xs">
                <code className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm font-black text-slate-900 tracking-wider">
                  {isTokenVisible ? order.sn : maskSensitiveToken(order.sn)}
                </code>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTokenVisible((prev) => !prev)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                    title={isTokenVisible ? "Sembunyikan Token" : "Lihat Token"}
                  >
                    {isTokenVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{isTokenVisible ? "Tutup" : "Lihat"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyRawToken}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition active:scale-95 cursor-pointer"
                    title="Salin Token Asli"
                  >
                    {copiedToken ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedToken ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EXPIRED BANNER (FOR EXPIRED TRANSACTIONS) */}
          {isExpired && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-300/90 bg-slate-100/90 p-3.5 sm:p-4 text-slate-800">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                <Clock size={15} />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-slate-900">
                  Batas Waktu Pembayaran Berakhir (Expired)
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                  Pesanan ini telah kedaluwarsa karena tidak ada pembayaran yang diselesaikan dalam batas waktu. Silakan klik tombol <strong>Beli Lagi</strong> untuk membuat pesanan baru.
                </p>
              </div>
            </div>
          )}

          {/* AUTO-REFUND BANNER (FOR FAILED / REFUNDED TRANSACTIONS) */}
          {isFailed && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/80 p-3.5 sm:p-4 text-rose-900">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <RotateCcw size={15} />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-rose-950">
                  Dana Otomatis Dikembalikan (Refund)
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-rose-800/90">
                  Transaksi dibatalkan oleh sistem. Pembayaran telah dikembalikan utuh ke{" "}
                  <strong className="font-bold text-rose-950">Saldo / Koin DaPay</strong> Anda.
                </p>
                {(usedBalance > 0 || usedCoin > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                    {usedBalance > 0 && (
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-blue-700 border border-rose-200">
                        + {formatRupiah(usedBalance)} Saldo
                      </span>
                    )}
                    {usedCoin > 0 && (
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-purple-700 border border-rose-200">
                        + {formatCoins(usedCoin)} Koin
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATUS TIMELINE */}
          <OrderTimeline order={order} />

          {/* TRANSACTION METADATA DETAILS */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 space-y-2.5 text-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
              Rincian Pembayaran & Pelanggan
            </p>

            {/* Order ID */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">Order ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-800">
                  {order.order_id || order.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-blue-600 transition"
                  title="Salin Order ID"
                >
                  {copiedOrderId ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Target ID / Customer No */}
            {order.customer_no && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Nomor / ID Tujuan:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">
                    {order.customer_no}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCustNo}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-blue-600 transition"
                    title="Salin ID Pelanggan"
                  >
                    {copiedCustNo ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            )}

            {/* Customer Name */}
            {customerName && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Nama / Nickname:</span>
                <span className="font-bold text-slate-900 uppercase">
                  {customerName}
                </span>
              </div>
            )}

            {/* Payment Method */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">Metode Pembayaran:</span>
              <div className="flex items-center gap-1.5">
                {paymentLogo && (
                  <div className="flex h-5 w-8 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white p-0.5 shadow-2xs">
                    <img
                      src={paymentLogo}
                      alt={paymentLabel}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <span className="font-bold text-slate-800">
                  {paymentLabel}
                </span>
              </div>
            </div>

            {/* Used Balance if mixed */}
            {usedBalance > 0 && order.payment_method !== "Saldo" && (
              <div className="flex items-center justify-between gap-2 text-blue-700">
                <span>Potongan Saldo DaPay:</span>
                <span className="font-bold">{formatRupiah(usedBalance)}</span>
              </div>
            )}

            {/* Total Amount */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-700">Total Pembayaran:</span>
              <span className="text-sm font-black text-slate-950">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* MODAL ACTION BUTTONS (BELI LAGI, SALIN ID, INVOICE)        */}
        {/* ========================================================== */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* 1. Salin ID Pelanggan Button */}
            {order.customer_no && (
              <button
                type="button"
                onClick={handleCopyCustNo}
                className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer shadow-2xs"
              >
                {copiedCustNo ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedCustNo ? "ID Tersalin!" : "Salin ID Pelanggan"}</span>
              </button>
            )}

            {/* 2. Download / Lihat Invoice Button */}
            <button
              type="button"
              onClick={handleOpenInvoice}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 sm:px-4 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Download size={14} />
              <span>Lihat Struk / Invoice</span>
            </button>

            {/* 3. Beli Lagi CTA */}
            <button
              type="button"
              onClick={handleBeliLagi}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 sm:px-5 text-xs font-black text-white hover:bg-blue-700 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <ShoppingBag size={14} />
              <span>Beli Lagi →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
