"use client";

import { CheckCircle2, Clock, Zap, Check, XCircle, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface OrderTrackingTimelineProps {
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  className?: string;
  theme?: "dark" | "light";
}

export default function OrderTrackingTimeline({
  status = "Pending",
  createdAt,
  updatedAt,
  className = "",
  theme = "dark",
}: OrderTrackingTimelineProps) {
  const { t, locale } = useI18n();

  const normStatus = (status || "Pending").toLowerCase();
  const isFailed = normStatus.includes("gagal") || normStatus.includes("batal") || normStatus.includes("expired");
  const isPending = normStatus.includes("pending");
  const isProcessing = normStatus.includes("diproses");
  const isSuccess = normStatus.includes("berhasil") || normStatus.includes("selesai");

  // Format tanggal singkat jika tersedia
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(locale === "en" ? "en-US" : "id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const createdTime = formatTime(createdAt);
  const updatedTime = formatTime(updatedAt || createdAt);

  // Status index:
  // 1: Dibuat (selalu completed)
  // 2: Pembayaran (pending = active, processing/success = completed, failed = failed)
  // 3: Diproses (processing = active, success = completed, else upcoming)
  // 4: Selesai (success = completed, failed = failed, else upcoming)

  const steps = [
    {
      id: 1,
      title: t("tracking.stepCreated"),
      time: createdTime,
      state: "completed" as const,
      icon: <FileText size={15} />,
    },
    {
      id: 2,
      title: isPending ? t("tracking.stepPayment") : t("tracking.stepPaid"),
      time: !isPending ? updatedTime : undefined,
      state: isPending
        ? ("active" as const)
        : isFailed
        ? ("failed" as const)
        : ("completed" as const),
      icon: isPending ? (
        <Clock size={15} className="animate-spin text-amber-300" style={{ animationDuration: "3s" }} />
      ) : isFailed ? (
        <XCircle size={15} />
      ) : (
        <Check size={15} />
      ),
    },
    {
      id: 3,
      title: t("tracking.stepProcessing"),
      time: isProcessing || isSuccess ? updatedTime : undefined,
      state: isProcessing
        ? ("active" as const)
        : isSuccess
        ? ("completed" as const)
        : isFailed
        ? ("upcoming" as const)
        : ("upcoming" as const),
      icon: isProcessing ? (
        <Zap size={15} className="animate-pulse text-blue-300" />
      ) : (
        <Zap size={15} />
      ),
    },
    {
      id: 4,
      title: isFailed ? t("tracking.stepFailed") : t("tracking.stepCompleted"),
      time: isSuccess || isFailed ? updatedTime : undefined,
      state: isSuccess
        ? ("completed" as const)
        : isFailed
        ? ("failed" as const)
        : ("upcoming" as const),
      icon: isSuccess ? (
        <CheckCircle2 size={16} />
      ) : isFailed ? (
        <XCircle size={16} />
      ) : (
        <Check size={15} />
      ),
    },
  ];

  const isDark = theme === "dark";

  return (
    <div
      className={`w-full p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark
          ? "bg-slate-950/70 border-slate-800/90 text-white"
          : "bg-slate-50/90 border-slate-200/90 text-slate-900"
      } ${className}`}
    >
      <div className="relative flex items-center justify-between">
        {/* Background Connecting Line */}
        <div
          className={`absolute top-4 left-6 right-6 h-0.5 -translate-y-1/2 z-0 ${
            isDark ? "bg-slate-800" : "bg-slate-200"
          }`}
        />

        {/* Progress Filled Line */}
        <div
          className={`absolute top-4 left-6 h-0.5 -translate-y-1/2 z-0 transition-all duration-500 ${
            isSuccess
              ? "bg-emerald-500 w-[calc(100%-3rem)]"
              : isProcessing
              ? "bg-blue-500 w-[66%]"
              : isPending
              ? "bg-amber-500 w-[33%]"
              : isFailed
              ? "bg-rose-500 w-[33%]"
              : "w-0"
          }`}
        />

        {/* Steps */}
        {steps.map((step) => {
          const isStepCompleted = step.state === "completed";
          const isStepActive = step.state === "active";
          const isStepFailed = step.state === "failed";

          let circleClass = "";
          if (isStepCompleted) {
            circleClass =
              "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 ring-4 " +
              (isDark ? "ring-emerald-500/15" : "ring-emerald-100");
          } else if (isStepActive) {
            circleClass =
              "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30 ring-4 animate-pulse " +
              (isDark ? "ring-blue-500/25" : "ring-blue-100");
          } else if (isStepFailed) {
            circleClass =
              "bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30 ring-4 " +
              (isDark ? "ring-rose-500/20" : "ring-rose-100");
          } else {
            circleClass = isDark
              ? "bg-slate-900 text-slate-500 border-slate-700/80"
              : "bg-white text-slate-400 border-slate-300";
          }

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center flex-1 text-center"
            >
              {/* Circle Icon */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all ${circleClass}`}
              >
                {step.icon}
              </div>

              {/* Step Label */}
              <div className="mt-2 space-y-0.5 px-0.5">
                <p
                  className={`text-[10px] sm:text-xs font-bold leading-tight ${
                    isStepCompleted
                      ? isDark
                        ? "text-emerald-400"
                        : "text-emerald-700"
                      : isStepActive
                      ? isDark
                        ? "text-blue-400 font-extrabold"
                        : "text-blue-700 font-extrabold"
                      : isStepFailed
                      ? isDark
                        ? "text-rose-400"
                        : "text-rose-700"
                      : isDark
                      ? "text-slate-500 font-medium"
                      : "text-slate-400 font-medium"
                  }`}
                >
                  {step.title}
                </p>
                {step.time && (
                  <p
                    className={`text-[9px] font-mono leading-none ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {step.time}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
