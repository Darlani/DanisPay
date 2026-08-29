"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import {
  Check,
  Copy,
  Eye,
  Package,
} from "lucide-react";
import {
  Order,
  displayOrderId,
  formatDate,
  formatRupiah,
  getPaymentLabel,
  getPaymentLogo,
  getProductImage,
  getStatusClasses,
  normalizeStatus,
  resolveCustomerName,
} from "../types";

interface OrderDesktopTableProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCopy: (text: string, label: string) => void;
}

export default function OrderDesktopTable({
  orders,
  onSelectOrder,
  onCopy,
}: OrderDesktopTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (orderId?: string | null) => {
    if (!orderId) return;
    await onCopy(orderId, "Order ID");
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="overflow-x-auto scrollbar-none sm:overflow-visible">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="py-2.5 sm:py-3.5 pl-3 sm:pl-4 pr-1 sm:pr-2 lg:pr-3 font-bold">
              Produk & Layanan
            </th>
            <th className="px-1.5 sm:px-2.5 lg:px-3 py-2.5 sm:py-3.5 font-bold">
              ID Pesanan & Waktu
            </th>
            <th className="px-1.5 sm:px-2.5 lg:px-3 py-2.5 sm:py-3.5 font-bold">
              Tujuan
            </th>
            <th className="px-1.5 sm:px-2.5 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              Pembayaran
            </th>
            <th className="px-1.5 sm:px-2.5 lg:px-3 pr-3.5 sm:pr-4 lg:pr-3 py-2.5 sm:py-3.5 font-bold text-right">
              <span className="lg:hidden">Total & Status</span>
              <span className="hidden lg:inline">Total</span>
            </th>
            <th className="hidden lg:table-cell px-3 py-3.5 font-bold text-center">
              Status
            </th>
            <th className="hidden lg:table-cell py-3.5 pl-2 pr-4 font-bold text-center">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {orders.map((order) => {
            const status = normalizeStatus(order.status);
            const style = getStatusClasses(status);
            const productImg = getProductImage(order.product_name);
            const paymentLogo = getPaymentLogo(order.payment_method);
            const paymentLabel = getPaymentLabel(order.payment_method);
            const customerName = resolveCustomerName(order);
            const orderRef = order.order_id || order.id;

            return (
              <tr
                key={order.id}
                className="group transition hover:bg-slate-50/80 cursor-pointer active:bg-slate-100"
                onClick={() => onSelectOrder(order)}
              >
                {/* 1. PRODUK & LAYANAN (COMPACT PADDING TO TIGHTEN DISTANCE TO ID PESANAN) */}
                <td className="py-2.5 sm:py-3 pl-3 sm:pl-4 pr-1 sm:pr-2 lg:pr-3 align-middle">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-37.5 sm:max-w-47.5 lg:max-w-60">
                    {productImg ? (
                      <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-0.5 shadow-2xs">
                        <img
                          src={productImg}
                          alt={order.product_name || "Produk"}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                        <Package size={16} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] sm:text-xs font-bold text-slate-900 leading-snug">
                        {order.product_name || "Produk Digital"}
                      </p>
                      <p className="truncate text-[9.5px] sm:text-[10px] font-medium text-slate-400">
                        {order.item_label || order.category || "Item Layanan"}
                      </p>
                    </div>
                  </div>
                </td>

                {/* 2. ID PESANAN & WAKTU (TIGHTENED DISTANCE) */}
                <td
                  className="whitespace-nowrap px-1.5 sm:px-2.5 lg:px-3 py-2.5 sm:py-3 align-middle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-[11.5px] sm:text-xs lg:text-[13px] font-bold text-slate-900 tracking-tight font-sans">
                        {displayOrderId(orderRef)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(orderRef)}
                        className="inline-flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title="Salin ID Pesanan"
                      >
                        {copiedId === orderRef ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} className="text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                    </div>
                    <p className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-slate-400 tracking-normal">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </td>

                {/* 3. TUJUAN (NO TUJUAN + CUSTOMER_NAME) */}
                <td className="whitespace-nowrap px-1.5 sm:px-2.5 lg:px-3 py-2.5 sm:py-3 align-middle">
                  <p className="truncate text-[11px] sm:text-xs font-bold text-slate-900 max-w-27.5 sm:max-w-33.75 lg:max-w-40">
                    {order.customer_no || "-"}
                  </p>
                  {customerName ? (
                    <p className="truncate text-[9.5px] sm:text-[10.5px] font-semibold text-blue-600 max-w-27.5 sm:max-w-33.75 lg:max-w-40 uppercase">
                      {customerName}
                    </p>
                  ) : null}
                </td>

                {/* 4. PEMBAYARAN */}
                <td className="whitespace-nowrap px-1.5 sm:px-2.5 lg:px-3 py-2.5 sm:py-3 align-middle text-center">
                  <div className="flex items-center justify-center">
                    {paymentLogo ? (
                      <div
                        className="flex h-6.5 w-10 sm:h-7 sm:w-12 lg:w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200/90 bg-white p-0.5 sm:p-1 shadow-2xs"
                        title={paymentLabel}
                      >
                        <img
                          src={paymentLogo}
                          alt={paymentLabel}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-700">
                        {paymentLabel}
                      </span>
                    )}
                  </div>
                </td>

                {/* 5. TOTAL & STATUS (COMBINED AS 2 ROWS ON TABLET, SEPARATE ON DESKTOP) */}
                <td className="whitespace-nowrap px-1.5 sm:px-2.5 lg:px-3 pr-3.5 sm:pr-4 lg:pr-3 py-2.5 sm:py-3 text-right align-middle">
                  <div className="flex flex-col items-end justify-center">
                    {/* Row 1: Nominal Total */}
                    <p className="text-[11.5px] sm:text-xs lg:text-xs font-black text-slate-950 leading-tight">
                      {formatRupiah(order.total_amount ?? order.price)}
                    </p>
                    {/* Row 2: Status Badge (Tablet only, hidden on desktop >= 1024px) */}
                    <div className="mt-1 lg:hidden">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold ${style.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        <span>{status}</span>
                      </span>
                    </div>
                  </div>
                </td>

                {/* 6. STATUS (DESKTOP >= 1024px ONLY, HIDDEN ON TABLET) */}
                <td className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-center align-middle">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {status}
                  </span>
                </td>

                {/* 7. AKSI (DESKTOP >= 1024px ONLY, HIDDEN ON TABLET) */}
                <td className="hidden lg:table-cell whitespace-nowrap py-3 pl-2 pr-4 text-center align-middle">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOrder(order);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Lihat Detail Transaksi"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
