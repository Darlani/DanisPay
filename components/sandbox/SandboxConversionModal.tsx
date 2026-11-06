"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import {
  setCachedSandboxSession,
  broadcastSandboxSync,
} from "@/components/sandbox/SandboxSessionControl";
import { useI18n } from "@/lib/i18n/context";
import { localizeHref } from "@/lib/i18n/config";

interface SandboxConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SandboxConversionModal({
  isOpen,
  onClose,
  onSuccess,
}: SandboxConversionModalProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsLoading(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const handleConvert = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/tester/convert", {
        method: "POST",
        headers,
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        let msg = t("sandbox.conversion.errGeneric");
        if (body.error) {
          if (body.error.includes("MANAGEMENT_PERSONA")) {
            msg = t("sandbox.conversion.errManagement");
          } else if (body.error.includes("TESTER_NOT_ELIGIBLE")) {
            msg = t("sandbox.conversion.errNotEligible");
          } else {
            msg = body.error;
          }
        }
        throw new Error(msg);
      }

      // Successful conversion: Clean client state & broadcast lock
      setCachedSandboxSession(null);
      broadcastSandboxSync({
        isSandboxActive: false,
        sandboxAccessState: "LOCKED",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }

      setIsSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("sandbox.conversion.errTryAgain")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conversion-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-4.5 sm:p-6 shadow-2xl border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {isSuccess ? (
          <div className="py-4 px-1 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-500/10">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
                {t("sandbox.conversion.successBadge")}
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950">
                {t("sandbox.conversion.successTitle")}
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {t("sandbox.conversion.successDesc")}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(localizeHref("/user", locale));
                  router.refresh();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer"
              >
                <span>{t("sandbox.conversion.enterLiveWorkspace")}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label={t("sandbox.conversion.closeAria")}
              className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50 cursor-pointer"
            >
              <X size={18} />
            </button>

        {/* Header Section */}
        <div className="flex items-start gap-3 mb-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0 pr-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 border border-amber-300 mb-1">
              {t("sandbox.conversion.badge")}
            </span>
            <h2
              id="conversion-modal-title"
              className="text-sm sm:text-base font-black text-slate-950 leading-tight"
            >
              {t("sandbox.conversion.title")}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {t("sandbox.conversion.subtitle")}
            </p>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 sm:p-3 text-xs text-rose-800 border border-rose-200 mb-3 animate-in fade-in duration-150">
            <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* 7 Contract Disclosures Checklist */}
        <div className="space-y-2 rounded-2xl bg-slate-50 p-3 sm:p-3.5 border border-slate-200/80 mb-4 text-xs text-slate-700">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            {t("sandbox.conversion.termsTitle")}
          </p>

          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">{t("sandbox.conversion.term1Title")}</strong> {t("sandbox.conversion.term1Desc")}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">{t("sandbox.conversion.term2Title")}</strong>{" "}
              {t("sandbox.conversion.term2Desc", { regularMember: t("sandbox.session.memberRegular") })}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-amber-900">{t("sandbox.conversion.term3Title")}</strong>{" "}
              {t("sandbox.conversion.term3Desc", { notRealBalance: t("sandbox.conversion.notRealBalanceText") })}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">{t("sandbox.conversion.term4Title")}</strong> {t("sandbox.conversion.term4Desc")}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">{t("sandbox.conversion.term5Title")}</strong> {t("sandbox.conversion.term5Desc")}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <Lock size={14} className="text-slate-500 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">{t("sandbox.conversion.term6Title")}</strong> {t("sandbox.conversion.term6Desc")}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <Lock size={14} className="text-slate-500 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">{t("sandbox.conversion.term7Title")}</strong> {t("sandbox.conversion.term7Desc")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col xs:flex-row items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full xs:flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 text-center"
          >
            {t("sandbox.conversion.btnLater")}
          </button>

          <button
            type="button"
            onClick={handleConvert}
            disabled={isLoading}
            className="w-full xs:flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-slate-950" />
                <span>{t("sandbox.conversion.btnProcessing")}</span>
              </>
            ) : (
              <>
                <span>{t("sandbox.conversion.btnConvert")}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
        </>
        )}
      </div>
    </div>,
    document.body
  );
}
