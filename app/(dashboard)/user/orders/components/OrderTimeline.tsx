"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  PackageCheck,
  Server,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Order, formatDate, normalizeStatus } from "../types";

interface OrderTimelineProps {
  order: Order;
}

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const { t } = useI18n();
  const status = normalizeStatus(order.status);

  const isPending = status === "Pending";
  const isExpired = status === "Expired";
  const isProcessing = status === "Proses";
  const isSuccess = status === "Berhasil";
  const isFailed = status === "Gagal";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3.5">
        {t("dashboard.orders.timelineTitle")}
      </p>

      <div className="relative space-y-4 before:absolute before:left-3.5 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-200">
        {/* STEP 1: PESANAN DIBUAT */}
        <div className="relative flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs z-10">
            <CheckCircle2 size={14} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {t("dashboard.orders.stepCreated")}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        {/* STEP 2: PEMBAYARAN */}
        <div className="relative flex items-start gap-3">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-xs z-10 ${
              isPending
                ? "bg-amber-500 text-white animate-pulse"
                : isExpired
                  ? "bg-slate-400 text-white ring-2 ring-slate-200"
                  : isFailed && !order.used_balance && (order.payment_method === "QRIS" || !order.payment_method)
                    ? "bg-rose-500 text-white"
                    : "bg-emerald-500 text-white"
            }`}
          >
            {isPending ? (
              <Clock size={14} />
            ) : isExpired ? (
              <AlertCircle size={14} />
            ) : isFailed && !order.used_balance && (order.payment_method === "QRIS" || !order.payment_method) ? (
              <XCircle size={14} />
            ) : (
              <CreditCard size={14} />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {isPending
                ? t("dashboard.orders.stepWaitingPayment")
                : isExpired
                  ? t("dashboard.orders.stepPaymentExpired")
                  : isFailed && !order.used_balance && (order.payment_method === "QRIS" || !order.payment_method)
                    ? t("dashboard.orders.stepPaymentCancelled")
                    : t("dashboard.orders.stepPaymentConfirmed")}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isPending
                ? t("dashboard.orders.descCompleteBefore")
                : isExpired
                  ? t("dashboard.orders.descExpiredTimeOut")
                  : t("dashboard.orders.descPaymentMethod", { method: order.payment_method || t("dashboard.orders.paymentSaldo") })}
            </p>
          </div>
        </div>

        {/* STEP 3: PROSES PROVIDER */}
        <div className="relative flex items-start gap-3">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-xs z-10 ${
              isProcessing
                ? "bg-blue-600 text-white animate-pulse ring-2 ring-blue-200"
                : isSuccess
                  ? "bg-emerald-500 text-white"
                  : isExpired
                    ? "bg-slate-200 text-slate-400"
                    : isFailed
                      ? "bg-slate-300 text-slate-500"
                      : "bg-slate-200 text-slate-400"
            }`}
          >
            <Server size={14} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {isProcessing
                ? t("dashboard.orders.stepProcessingProvider")
                : isSuccess
                  ? t("dashboard.orders.stepProcessedSystem")
                  : isExpired
                    ? t("dashboard.orders.stepNotProcessed")
                    : isFailed
                      ? t("dashboard.orders.stepFailedProvider")
                      : t("dashboard.orders.stepWaitingQueue")}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isProcessing
                ? t("dashboard.orders.descDelivering")
                : isSuccess
                  ? t("dashboard.orders.descIssued")
                  : isExpired
                    ? t("dashboard.orders.descCancelledNoPay")
                    : isFailed
                      ? t("dashboard.orders.descFailedProvider")
                      : t("dashboard.orders.descAutoAfterPay")}
            </p>
          </div>
        </div>

        {/* STEP 4: STATUS AKHIR */}
        <div className="relative flex items-start gap-3">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-xs z-10 ${
              isSuccess
                ? "bg-emerald-600 text-white ring-2 ring-emerald-200"
                : isExpired
                  ? "bg-slate-400 text-white ring-2 ring-slate-200"
                  : isFailed
                    ? "bg-rose-600 text-white ring-2 ring-rose-200"
                    : "bg-slate-200 text-slate-400"
            }`}
          >
            {isSuccess ? (
              <PackageCheck size={14} />
            ) : isExpired ? (
              <Clock size={14} />
            ) : isFailed ? (
              <XCircle size={14} />
            ) : (
              <Clock size={14} />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className={`text-xs font-bold leading-tight ${
                isSuccess
                  ? "text-emerald-700 font-black"
                  : isExpired
                    ? "text-slate-600 font-black"
                    : isFailed
                      ? "text-rose-700 font-black"
                      : "text-slate-600"
              }`}
            >
              {isSuccess
                ? t("dashboard.orders.stepFinishedSuccess")
                : isExpired
                  ? t("dashboard.orders.stepFinishedExpired")
                  : isFailed
                    ? t("dashboard.orders.stepFinishedFailed")
                    : t("dashboard.orders.stepWaitingFinish")}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isSuccess || isFailed || isExpired
                ? formatDate(order.updated_at || order.created_at)
                : t("dashboard.orders.estProcessTime")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
