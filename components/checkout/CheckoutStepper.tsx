"use client";

import { CreditCard, Clock, Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface StepperProps {
  status: string; // "Pending" | "Diproses" | "Berhasil" | "Gagal"
  failureStep?: "payment" | "processing";
}

export default function CheckoutStepper({
  status,
  failureStep = "payment",
}: StepperProps) {
  const { t } = useI18n();
  const s = status?.toLowerCase() || "pending";

  const isFailed = s === "gagal" || s === "expired" || s === "batal";
  const isProcessing = s === "diproses";
  const isSuccess = s === "berhasil" || s === "selesai";

  // Step 1: Bayar
  const isStep1Failed = isFailed && failureStep === "payment";
  const isStep1Success =
    (isFailed && failureStep === "processing") || isProcessing || isSuccess;

  // Step 2: Diproses
  const isStep2Failed = isFailed && failureStep === "processing";
  const isStep2Success = isSuccess;
  const isStep2Active = isProcessing;

  // Step 3: Selesai
  const isStep3Success = isSuccess;

  return (
    <div className="w-full flex items-center justify-between px-4 sm:px-8 py-3">
      {/* Step 1: Bayar */}
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs transition-colors ${
            isStep1Failed
              ? "bg-[#dc2626] text-white"
              : isStep1Success
              ? "bg-emerald-500 text-white"
              : "bg-[#f97316] text-white"
          }`}
        >
          {isStep1Failed ? (
            <X size={18} strokeWidth={3} />
          ) : isStep1Success ? (
            <Check size={18} strokeWidth={2.5} />
          ) : (
            <CreditCard size={18} />
          )}
        </div>
        <span
          className={`text-xs mt-2 font-medium ${
            isStep1Failed
              ? "text-[#dc2626] font-semibold"
              : "text-slate-800 font-semibold"
          }`}
        >
          {t("checkout.stepperPay")}
        </span>
      </div>

      {/* Line 1 */}
      <div
        className={`flex-1 h-0.5 mx-2 sm:mx-4 -mt-5 transition-colors ${
          isStep1Success ? "bg-emerald-500" : "bg-slate-200"
        }`}
      />

      {/* Step 2: Diproses */}
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs transition-colors ${
            isStep2Failed
              ? "bg-[#dc2626] text-white"
              : isStep2Success
              ? "bg-emerald-500 text-white"
              : isStep2Active
              ? "bg-blue-600 text-white ring-4 ring-blue-100"
              : "bg-slate-300 text-white"
          }`}
        >
          {isStep2Failed ? (
            <X size={18} strokeWidth={3} />
          ) : isStep2Success ? (
            <Check size={18} strokeWidth={2.5} />
          ) : (
            <Clock size={18} className={isStep2Active ? "animate-pulse" : ""} />
          )}
        </div>
        <span
          className={`text-xs mt-2 font-medium ${
            isStep2Failed
              ? "text-[#dc2626] font-semibold"
              : isStep2Success
              ? "text-slate-800 font-semibold"
              : isStep2Active
              ? "text-blue-600 font-bold"
              : "text-slate-400"
          }`}
        >
          {t("checkout.stepperProcessing")}
        </span>
      </div>

      {/* Line 2 */}
      <div
        className={`flex-1 h-0.5 mx-2 sm:mx-4 -mt-5 transition-colors ${
          isStep3Success ? "bg-emerald-500" : "bg-slate-200"
        }`}
      />

      {/* Step 3: Selesai */}
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs transition-colors ${
            isStep3Success
              ? "bg-emerald-500 text-white"
              : "bg-slate-300 text-white"
          }`}
        >
          <Check size={18} strokeWidth={2.5} />
        </div>
        <span
          className={`text-xs mt-2 font-medium ${
            isStep3Success ? "text-emerald-600 font-bold" : "text-slate-400"
          }`}
        >
          {t("checkout.stepperDone")}
        </span>
      </div>
    </div>
  );
}
