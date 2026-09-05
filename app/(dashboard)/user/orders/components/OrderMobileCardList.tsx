"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import {
  Check,
  Copy,
  Package,
} from "lucide-react";
import {
  Order,
  displayOrderId,
  formatDate,
  formatRupiah,
  getProductImage,
  getStatusClasses,
  normalizeStatus,
  resolveCustomerName,
} from "../types";

interface OrderMobileCardListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCopy: (text: string, label: string) => void;
}

export default function OrderMobileCardList({
  orders,
  onSelectOrder,
  onCopy,
}: OrderMobileCardListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (e: React.MouseEvent, orderId?: string | null) => {
    e.stopPropagation();
    if (!orderId) return;
    await onCopy(orderId, "Order ID");
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="divide-y divide-slate-100">
      {orders.map((order) => {
        const status = normalizeStatus(order.status);
        const style = getStatusClasses(status);
        const productImg = getProductImage(order.product_name);
        const orderRef = order.order_id || order.id;

        return (
          <div
            key={order.id}
            onClick={() => onSelectOrder(order)}
            className="flex items-center justify-between gap-2 xs:gap-3 p-2.5 xs:p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:bg-slate-100 cursor-pointer min-w-0"
          >
            {/* Left: Product Logo & Title & Subline */}
            <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
              {productImg ? (
                <div className="flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-2xs">
                  <img
                    src={productImg}
                    alt={order.product_name || "Produk"}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                  <Package size={16} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] xs:text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {order.product_name || "Produk Digital"}
                </p>
                {(() => {
                  const custName = resolveCustomerName(order);
                  return (
                    <p className="truncate text-[9.5px] xs:text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5">
                      {order.item_label || order.category || "Item Layanan"}
                      {custName ? ` • ${custName}` : order.customer_no ? ` • ${order.customer_no}` : ""}
                    </p>
                  );
                })()}
                <div className="mt-1 flex items-center gap-1.5 text-[9px] xs:text-[10px] sm:text-xs text-slate-400 font-semibold truncate">
                  <span className="font-mono text-slate-500 font-bold">
                    {displayOrderId(orderRef)}
                  </span>
                  {order.is_sandbox && (
                    <span className="inline-flex items-center rounded bg-amber-500/10 px-1 py-0.2 text-[8.5px] font-bold uppercase tracking-wider text-amber-600 border border-amber-500/20">
                      Sandbox
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, orderRef)}
                    className="inline-flex items-center justify-center text-slate-400 hover:text-slate-700"
                    title="Salin Order ID"
                  >
                    {copiedId === orderRef ? (
                      <Check size={11} className="text-emerald-600" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                  <span aria-hidden="true">•</span>
                  <span className="truncate">{formatDate(order.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Right: Price & Status Pill (Stacked) */}
            <div className="shrink-0 text-right flex flex-col items-end gap-1">
              <p className="text-[11.5px] xs:text-xs sm:text-sm font-black text-slate-950 leading-tight">
                {formatRupiah(order.total_amount ?? order.price)}
              </p>
              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 xs:px-2 py-0.5 text-[8.5px] xs:text-[9px] sm:text-[10px] font-bold ${style.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

