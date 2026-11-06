"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FlaskConical,
  RotateCcw,
  Power,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import SandboxConversionModal from "@/components/sandbox/SandboxConversionModal";
import SandboxReactivationModal from "@/components/sandbox/SandboxReactivationModal";
import { useI18n } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";
import { localizeHref } from "@/lib/i18n/config";

export interface SandboxQuotaData {
  sessionsToday: number;
  dailySessionLimit: number;
  simulationsToday: number;
  dailySimulationLimit: number;
  simulationsHourly: number;
  hourlySimulationBurstLimit: number;
  isSessionQuotaExhausted: boolean;
  isSimulationQuotaExhausted: boolean;
}

export interface SandboxSessionData {
  authenticated: boolean;
  userId?: string | null;
  isTester: boolean;
  sandboxAccessState: 'ACTIVE' | 'LOCKED' | 'REVOKED' | null;
  sandboxAccessReason?: string | null;
  sandboxReactivationState?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null;
  sandboxReactivationReason?: string | null;
  sandboxReactivationRequestedAt?: string | null;
  isSandboxActive: boolean;
  sandboxBalance: number;
  sandboxCoinBalance?: number;
  simulatedMemberType?: 'regular' | 'special';
  quota?: SandboxQuotaData | null;
  liveBalance?: number;
  liveCoinBalance?: number;
  liveMemberType?: string;
}

function getLockType(reason?: string | null): "conversion" | "inactivity" | "other" {
  if (!reason) return "other";
  const lower = reason.toLowerCase();
  if (lower.includes("convert") || lower.includes("member live")) return "conversion";
  if (
    lower.includes("auto-lock") ||
    lower.includes("aktivitas") ||
    lower.includes("inactivity") ||
    lower.includes("inaktif")
  ) {
    return "inactivity";
  }
  return "other";
}

const CACHE_KEY = "dapay_tester_session_cache";
let memoryCache: SandboxSessionData | null = null;
let inFlightPromise: Promise<SandboxSessionData | null> | null = null;
let lastFetchTime = 0;
const FETCH_COOLDOWN_MS = 2500;

export async function fetchTesterSessionDeduplicated(force = false): Promise<SandboxSessionData | null> {
  const now = Date.now();
  if (!force && memoryCache && now - lastFetchTime < FETCH_COOLDOWN_MS) {
    return memoryCache;
  }
  if (inFlightPromise) {
    return inFlightPromise;
  }
  inFlightPromise = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/tester/session", { headers, credentials: "include" });
      if (res.ok) {
        const json = (await res.json()) as SandboxSessionData;
        setCachedSandboxSession(json);
        lastFetchTime = Date.now();
        return json;
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlightPromise = null;
    }
  })();
  return inFlightPromise;
}

export function broadcastSandboxSync(payload: Partial<SandboxSessionData>) {
  if (typeof window === "undefined") return;
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("dapay_tester_sync");
      bc.postMessage(payload);
      bc.close();
    }
    localStorage.setItem("dapay_tester_realtime_event", JSON.stringify({ ...payload, ts: Date.now() }));
  } catch {
    // ignore
  }
}

export function getCachedSandboxSession(): SandboxSessionData | null {
  if (memoryCache) return memoryCache;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(CACHE_KEY);
      if (stored) {
        memoryCache = JSON.parse(stored);
        return memoryCache;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setCachedSandboxSession(data: SandboxSessionData | null) {
  memoryCache = data;
  if (typeof window !== "undefined") {
    try {
      if (data) {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } else {
        sessionStorage.removeItem(CACHE_KEY);
      }
    } catch {
      // ignore
    }
  }
}

interface SandboxSessionControlProps {
  variant?: "navbar" | "sidebar" | "badge" | "rail";
  className?: string;
}

export default function SandboxSessionControl({
  variant = "navbar",
  className = "",
}: SandboxSessionControlProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [mounted, setMounted] = useState<boolean>(false);
  const [data, setData] = useState<SandboxSessionData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState<boolean>(false);
  const [showReactivationModal, setShowReactivationModal] = useState<boolean>(false);
  const [reactivationLockType, setReactivationLockType] = useState<"conversion" | "inactivity" | "other" | "revoked">("other");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const fetchSession = useCallback(async (force = false) => {
    const sessionData = await fetchTesterSessionDeduplicated(force);
    if (sessionData) {
      setData(sessionData);
    }
  }, []);

  // 1. Re-fetch kilat saat modal dibuka
  useEffect(() => {
    if (isModalOpen) {
      void fetchSession(true);
    }
  }, [isModalOpen, fetchSession]);

  // 2. Re-fetch kilat saat pengguna kembali membuka tab browser (tab active / window focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchSession(true);
      }
    };
    const handleFocus = () => {
      void fetchSession(true);
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchSession]);

  // 3. Supabase Realtime Push Murni (WebSocket): deteksi instan saat Admin melakukan Setuju/Tolak/Kunci/Revoke
  useEffect(() => {
    const userId = data?.userId;
    if (!userId) return;

    const channel = supabase
      .channel(`sandbox-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sandbox_access",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("[Supabase Realtime] sandbox_access event diterima:", payload);
          await fetchSession(true);
          window.dispatchEvent(new Event("sandboxSessionChanged"));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sandbox_reactivation_requests",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("[Supabase Realtime] sandbox_reactivation_requests event diterima:", payload);
          await fetchSession(true);
          window.dispatchEvent(new Event("sandboxSessionChanged"));
        }
      )
      .subscribe((status) => {
        console.log("[Supabase Realtime] Status koneksi channel:", status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [data?.userId, fetchSession]);

  useEffect(() => {
    setMounted(true);
    const cached = getCachedSandboxSession();
    if (cached) {
      setData(cached);
    }
    void fetchSession();

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("dapay_tester_sync");
        bc.onmessage = (event) => {
          if (event.data) {
            setData((prev) => (prev ? { ...prev, ...event.data } : event.data));
          }
        };
      } catch {
        // BroadcastChannel unsupported
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dapay_tester_realtime_event" && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          setData((prev) => (prev ? { ...prev, ...payload } : payload));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleSessionChanged = () => {
      void fetchSession(true);
    };
    window.addEventListener("sandboxSessionChanged", handleSessionChanged);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sandboxSessionChanged", handleSessionChanged);
    };
  }, [fetchSession]);

  if (!mounted || !data || !data.authenticated) {
    return null;
  }

  const openReactivation = (type: "conversion" | "inactivity" | "other" | "revoked") => {
    setReactivationLockType(type);
    setIsModalOpen(false);
    setShowReactivationModal(true);
  };

  const lockType = getLockType(data.sandboxAccessReason);
  const isLiveSpecial = ((data.liveMemberType || "").trim().toLowerCase() === "special") || ((data.liveMemberType || "").trim().toLowerCase() === "gold");

  const handleActivate = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/tester/session", { method: "POST", headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("sandbox.session.errActivate"));
      }
      const updated = await res.json();
      const nextData: SandboxSessionData = {
        ...data,
        isSandboxActive: true,
        sandboxBalance: updated.balance || data.sandboxBalance,
      };
      setData(nextData);
      setCachedSandboxSession(nextData);
      broadcastSandboxSync(nextData);
      window.dispatchEvent(new Event("sandboxSessionChanged"));
      setIsModalOpen(false);

      // Navigate to sandbox catalog tab directly
      const targetUrl = `${localizeHref("/user", locale)}?tab=catalog`;
      router.push(targetUrl, { scroll: false });
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : t("sandbox.session.errActivate")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/tester/session", { method: "DELETE", headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("sandbox.session.errDeactivate"));
      }
      const nextData: SandboxSessionData = {
        ...data,
        isSandboxActive: false,
      };
      setData(nextData);
      setCachedSandboxSession(nextData);
      broadcastSandboxSync(nextData);
      window.dispatchEvent(new Event("sandboxSessionChanged"));
      setIsModalOpen(false);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : t("sandbox.session.errDeactivate")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWallet = async () => {
    if (!confirm(t("sandbox.session.confirmReset"))) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/tester/wallet/reset", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetAmount: 1000000 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("sandbox.session.errReset"));
      }
      const updated = await res.json();
      const nextData: SandboxSessionData = {
        ...data,
        sandboxBalance: updated.balance || 1000000,
      };
      setData(nextData);
      setCachedSandboxSession(nextData);
      broadcastSandboxSync(nextData);
      window.dispatchEvent(new Event("sandboxSessionChanged"));
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : t("sandbox.session.errReset")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 1. NAVBAR TRIGGER */}
      {variant === "navbar" && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
            data.isSandboxActive
              ? "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20 ring-1 ring-amber-400"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:border-amber-500/60 hover:bg-amber-500/20"
          } ${className}`}
          title={t("sandbox.session.navbarTitle")}
        >
          <FlaskConical
            size={13}
            className={data.isSandboxActive ? "animate-pulse text-white" : "text-amber-400"}
          />
          <span>{data.isSandboxActive ? "Sandbox ON" : "Sandbox"}</span>
          {data.isSandboxActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
          )}
        </button>
      )}

      {/* 2. RAIL / COLLAPSED TRIGGER */}
      {variant === "rail" && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`relative flex flex-col items-center justify-center h-10 w-10 shrink-0 rounded-xl transition-all cursor-pointer shadow-sm select-none ${
            data.isSandboxActive
              ? "bg-linear-to-b from-amber-500 to-orange-500 text-white shadow-amber-500/25 ring-1 ring-amber-400/80 hover:brightness-105 active:scale-95"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:border-amber-500/60 hover:bg-amber-500/20 active:scale-95"
          } ${className}`}
          title={
            data.isSandboxActive
              ? t("sandbox.session.railTitleActive")
              : t("sandbox.session.railTitleInactive")
          }
          aria-label={data.isSandboxActive ? t("sandbox.session.railAriaActive") : t("sandbox.session.railAriaInactive")}
        >
          <FlaskConical
            size={16}
            className={data.isSandboxActive ? "animate-pulse text-white" : "text-amber-500"}
          />
          <span className="text-[7.5px] font-black uppercase tracking-tight leading-none mt-0.5">
            {data.isSandboxActive ? "ON" : "OFF"}
          </span>
          {data.isSandboxActive && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
        </button>
      )}

      {/* 3. SIDEBAR TRIGGER (Sleek Compact Row Button, ~40px) */}
      {variant === "sidebar" && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`w-full h-11 shrink-0 flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition cursor-pointer group overflow-hidden ${
            data.isSandboxActive
              ? "border-amber-400/80 bg-linear-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/15 hover:border-amber-400 shadow-2xs"
              : "border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:border-amber-400/50"
          } ${className}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-2xs transition group-hover:scale-105 ${
                data.isSandboxActive
                  ? "bg-linear-to-br from-amber-500 to-orange-500 ring-1 ring-amber-300/60"
                  : "bg-slate-700 dark:bg-slate-800 text-slate-300 group-hover:bg-amber-500 group-hover:text-white"
              }`}
            >
              <FlaskConical
                size={14}
                className={data.isSandboxActive ? "animate-pulse text-yellow-100" : ""}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[10.5px] font-black text-slate-900 dark:text-white leading-tight truncate">
                  {t("sandbox.session.sidebarTitle")}
                </p>
                {data.isSandboxActive ? (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                ) : null}
              </div>
              <p className="text-[8.5px] font-bold text-slate-500 dark:text-slate-400 leading-tight truncate">
                {data.isSandboxActive
                  ? `Aktif • Rp ${data.sandboxBalance.toLocaleString("id-ID")}`
                  : data.sandboxAccessState === "LOCKED"
                  ? "Terkunci • Klik Buka Kembali"
                  : "Simulasi Uji Coba Transaksi"}
              </p>
            </div>
          </div>
          <span
            className={`flex h-5 items-center rounded-full px-2 text-[9px] font-black shrink-0 transition ${
              data.isSandboxActive
                ? "bg-amber-500 text-slate-950 font-extrabold shadow-2xs"
                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-amber-500 group-hover:text-white"
            }`}
          >
            {data.isSandboxActive ? "Kelola ↗" : "Buka ↗"}
          </span>
        </button>
      )}

      {/* 4. MODAL KONTROL & EDUKASI SESI SANDBOX */}
      {isModalOpen && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-10000 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            {/* Header Modal */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-2xl p-2.5 ${
                    data.isSandboxActive
                      ? "bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20"
                      : "bg-slate-800 text-amber-400 border border-amber-400/20"
                  }`}
                >
                  <FlaskConical size={22} className={data.isSandboxActive ? "animate-pulse" : ""} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    {t("sandbox.session.modalTitle")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("sandbox.session.modalSubtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label={t("sandbox.session.closeAria")}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Edukasi & Pengenalan Sandbox / Benefit Member Spesial */}
            <div className="rounded-2xl border border-amber-500/30 bg-linear-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs">
                <Sparkles size={14} className="text-amber-400" />
                <span>
                  {isLiveSpecial
                    ? t("sandbox.session.promoCardTitleSpecial")
                    : t("sandbox.session.promoCardTitleRegular")}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {isLiveSpecial
                  ? t("sandbox.session.promoCardDescSpecial")
                  : t("sandbox.session.promoCardDescRegular")}
              </p>
            </div>

            {/* Status Akses & Buka Kembali (Jika Terkunci / Pending / Rejected) */}
            {data.sandboxReactivationState === "PENDING" && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Clock size={14} className="text-amber-400 shrink-0" />
                    {t("sandbox.access.pendingTitle")}
                  </span>
                  <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-200">
                    {t("sandbox.access.inQueueBadge")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {t("sandbox.access.pendingDesc")}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-amber-300/80">
                  <ShieldCheck size={12} className="shrink-0 text-amber-400" />
                  <span>{t("sandbox.access.safeNotice")}</span>
                </div>
              </div>
            )}

            {data.sandboxReactivationState === "REJECTED" &&
              (data.sandboxAccessState === "LOCKED" || data.sandboxAccessState === "REVOKED") && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-left space-y-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                      <AlertCircle size={14} className="text-rose-400 shrink-0" />
                      {t("sandbox.access.rejectedTitle")}
                    </span>
                    <span className="rounded-full bg-rose-500/20 border border-rose-400/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-200">
                      {t("sandbox.access.rejectedBadge")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {data.sandboxReactivationReason ? (
                      <>
                        <span className="font-semibold text-rose-200">{t("sandbox.access.managementNotes")}</span>{" "}
                        &ldquo;{data.sandboxReactivationReason}&rdquo;
                      </>
                    ) : (
                      t("sandbox.access.rejectedDesc")
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => openReactivation(data.sandboxAccessState === "REVOKED" ? "revoked" : lockType)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>{t("sandbox.access.btnReapply")}</span>
                  </button>
                </div>
            )}

            {/* Status Sesi Card: Hanya menampilkan Informasi & Saldo Mode Simulasi */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                data.isSandboxActive
                  ? "border-amber-500/40 bg-amber-500/10 shadow-sm"
                  : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("sandbox.session.currentEnvStatus")}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        data.isSandboxActive
                          ? "bg-amber-400 animate-pulse shadow-sm shadow-amber-400"
                          : "bg-slate-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-extrabold tracking-wide ${
                        data.isSandboxActive ? "text-amber-300" : "text-slate-300"
                      }`}
                    >
                      {data.isSandboxActive
                        ? t("sandbox.session.modeSandboxActive")
                        : t("sandbox.session.modeSandboxInactive")}
                    </span>
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    data.isSandboxActive
                      ? "text-amber-300 bg-amber-400/20 border-amber-400/30"
                      : "text-slate-400 bg-slate-800/80 border-slate-700/60"
                  }`}
                >
                  {data.isSandboxActive ? (
                    <>
                      <Clock size={11} /> {t("sandbox.session.oneHour")}
                    </>
                  ) : (
                    t("sandbox.session.badgeInactive")
                  )}
                </span>
              </div>

              {/* Data Nominal Mode Simulasi dari Database (sandbox_wallets & sandbox_access) */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t("sandbox.session.virtualBalance")}</span>
                  <span
                    className={`font-extrabold font-mono text-sm ${
                      data.isSandboxActive ? "text-amber-300" : "text-amber-400/90"
                    }`}
                  >
                    Rp {data.sandboxBalance.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t("sandbox.session.sandboxCoins")}</span>
                  <span className="font-extrabold text-violet-300 font-mono text-sm">
                    {(data.sandboxCoinBalance || 0).toLocaleString("id-ID")} KOIN
                  </span>
                </div>
                {/* Tipe Akun Latihan (Dipertahankan khusus Member Reguler; Pengguna Spesial tidak ditampilkan) */}
                {!isLiveSpecial && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t("sandbox.session.simulatedPersona")}</span>
                    <span className="font-extrabold text-amber-300 uppercase tracking-wide">
                      {t("sandbox.session.memberSpecial")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Jaminan Keamanan Checklist */}
            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {t("sandbox.session.guaranteeTitle")}
              </p>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{t("sandbox.session.guarantee1")}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{t("sandbox.session.guarantee2")}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{t("sandbox.session.guarantee3")}</span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="space-y-2 pt-1">
              {data.isSandboxActive ? (
                <>
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 py-3 text-xs font-bold uppercase tracking-wider transition border border-rose-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Power size={14} />
                    )}
                    {t("sandbox.session.btnReturnLive")}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetWallet}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 py-2.5 text-xs font-semibold transition border border-white/10 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {t("sandbox.session.btnResetBalance")}
                  </button>
                </>
              ) : data.sandboxAccessState === "LOCKED" || data.sandboxAccessState === "REVOKED" ? (
                <button
                  type="button"
                  onClick={() => openReactivation(data.sandboxAccessState === "REVOKED" ? "revoked" : lockType)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold py-3 text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>
                    {lockType === "conversion"
                      ? t("sandbox.access.btnRequestAccess")
                      : t("sandbox.access.btnReopenAccess")}
                  </span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold py-3 text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin text-slate-950" />
                  ) : (
                    <FlaskConical size={14} />
                  )}
                  {t("sandbox.session.btnActivateSession")}
                </button>
              )}

              {/* Low-emphasis conversion CTA if tester and access state is ACTIVE */}
              {data.isTester && data.sandboxAccessState === "ACTIVE" && (
                <div className="pt-2 border-t border-slate-800/80 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsConversionModalOpen(true);
                    }}
                    disabled={isLoading}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} />
                    <span>{t("sandbox.session.conversionCta")}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PEMULIHAN / BUKA KEMBALI SANDBOX */}
      <SandboxReactivationModal
        isOpen={showReactivationModal}
        lockType={reactivationLockType}
        onClose={() => {
          setShowReactivationModal(false);
          setIsModalOpen(true);
        }}
        onSuccess={() => {
          setShowReactivationModal(false);
          void fetchSession(true);
          setIsModalOpen(true);
        }}
      />

      <SandboxConversionModal
        isOpen={isConversionModalOpen}
        onClose={() => setIsConversionModalOpen(false)}
      />
    </>
  );
}
