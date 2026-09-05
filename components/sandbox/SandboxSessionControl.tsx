"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";

export interface SandboxSessionData {
  authenticated: boolean;
  userId?: string | null;
  isTester: boolean;
  isSandboxActive: boolean;
  sandboxBalance: number;
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
      const res = await fetch("/api/tester/session", { headers });
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
  variant?: "navbar" | "sidebar" | "badge";
  className?: string;
}

export default function SandboxSessionControl({
  variant = "navbar",
  className = "",
}: SandboxSessionControlProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [data, setData] = useState<SandboxSessionData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSession = useCallback(async (force = false) => {
    const sessionData = await fetchTesterSessionDeduplicated(force);
    if (sessionData) {
      setData(sessionData);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const cached = getCachedSandboxSession();
    if (cached) {
      setData(cached);
    }
    void fetchSession(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void fetchSession(true);
    });

    // 1. Cross-tab instant synchronization via BroadcastChannel (0ms)
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("dapay_tester_sync");
      bc.onmessage = (event) => {
        const msg = event.data as { userId?: string; isTester?: boolean; isSandboxActive?: boolean; sandboxBalance?: number };
        if (!msg || typeof msg.isTester !== "boolean") return;
        const newIsTester = msg.isTester;
        setData((prev) => {
          if (prev && msg.userId && prev.userId && msg.userId !== prev.userId) return prev;
          const next: SandboxSessionData = {
            authenticated: true,
            userId: msg.userId ?? prev?.userId ?? null,
            isTester: newIsTester,
            isSandboxActive: newIsTester
              ? (typeof msg.isSandboxActive === "boolean" ? msg.isSandboxActive : (prev?.isSandboxActive ?? false))
              : false,
            sandboxBalance: typeof msg.sandboxBalance === "number" ? msg.sandboxBalance : (prev?.sandboxBalance ?? 0),
          };
          setCachedSandboxSession(next);
          return next;
        });
        window.dispatchEvent(new CustomEvent("sandboxSessionChanged", { detail: msg }));
      };
    }

    // 2. Cross-tab instant synchronization via StorageEvent fallback (0ms)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dapay_tester_realtime_event" && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue) as { userId?: string; isTester?: boolean; isSandboxActive?: boolean; sandboxBalance?: number };
          if (!msg || typeof msg.isTester !== "boolean") return;
          const newIsTester = msg.isTester;
          setData((prev) => {
            if (prev && msg.userId && prev.userId && msg.userId !== prev.userId) return prev;
            const next: SandboxSessionData = {
              authenticated: true,
              userId: msg.userId ?? prev?.userId ?? null,
              isTester: newIsTester,
              isSandboxActive: newIsTester
                ? (typeof msg.isSandboxActive === "boolean" ? msg.isSandboxActive : (prev?.isSandboxActive ?? false))
                : false,
              sandboxBalance: typeof msg.sandboxBalance === "number" ? msg.sandboxBalance : (prev?.sandboxBalance ?? 0),
            };
            setCachedSandboxSession(next);
            return next;
          });
          window.dispatchEvent(new CustomEvent("sandboxSessionChanged", { detail: msg }));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Intra-window sync event (from sibling components in the same tab)
    const handleSync = (e?: Event) => {
      const custom = e as CustomEvent<{ userId?: string; isTester?: boolean; isSandboxActive?: boolean; sandboxBalance?: number }>;
      const detail = custom?.detail;
      if (detail && typeof detail.isTester === "boolean") {
        const newIsTester = detail.isTester;
        setData((prev) => {
          if (prev && detail.userId && prev.userId && detail.userId !== prev.userId) return prev;
          const next: SandboxSessionData = {
            authenticated: true,
            userId: detail.userId ?? prev?.userId ?? null,
            isTester: newIsTester,
            isSandboxActive: newIsTester
              ? (typeof detail.isSandboxActive === "boolean" ? detail.isSandboxActive : (prev?.isSandboxActive ?? false))
              : false,
            sandboxBalance: typeof detail.sandboxBalance === "number" ? detail.sandboxBalance : (prev?.sandboxBalance ?? 0),
          };
          setCachedSandboxSession(next);
          return next;
        });
        return;
      }
      const fresh = getCachedSandboxSession();
      if (fresh) {
        setData(fresh);
      }
    };
    window.addEventListener("sandboxSessionChanged", handleSync);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sandboxSessionChanged", handleSync);
      if (bc) bc.close();
    };
  }, [fetchSession]);

  // 4. Remote cross-device Realtime Websocket via Supabase Postgres Changes
  useEffect(() => {
    if (!data?.userId) return;
    const currentUserId = data.userId;

    const channel = supabase
      .channel(`rt-profile-tester-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUserId}`,
        },
        (payload) => {
          const newRow = payload.new as { is_tester?: boolean };
          if (typeof newRow.is_tester === "boolean") {
            const isTester = newRow.is_tester;
            setData((prev) => {
              if (!prev) return null;
              const next: SandboxSessionData = {
                ...prev,
                isTester,
                isSandboxActive: isTester ? prev.isSandboxActive : false,
              };
              setCachedSandboxSession(next);
              return next;
            });
            window.dispatchEvent(new CustomEvent("sandboxSessionChanged", { detail: { isTester, isSandboxActive: false } }));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [data?.userId]);

  if (!mounted || !data?.isTester) {
    return null;
  }

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
        throw new Error(err.error || "Gagal mengaktifkan sesi sandbox.");
      }
      const updated = await res.json();
      const nextData: SandboxSessionData = {
        authenticated: true,
        isTester: true,
        isSandboxActive: true,
        sandboxBalance: updated.sandboxBalance ?? data.sandboxBalance,
      };
      setData(nextData);
      setCachedSandboxSession(nextData);
      broadcastSandboxSync(nextData);
      window.dispatchEvent(new Event("sandboxSessionChanged"));
      setIsModalOpen(false);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Gagal mengaktifkan sesi sandbox."
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
        throw new Error(err.error || "Gagal mematikan sesi sandbox.");
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
        err instanceof Error ? err.message : "Gagal mematikan sesi sandbox."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWallet = async () => {
    if (!confirm("Reset saldo koin virtual tester ke Rp 1.000.000?")) return;
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
        throw new Error(err.error || "Gagal mereset koin sandbox.");
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
        err instanceof Error ? err.message : "Gagal mereset koin sandbox."
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
          title="Kelola Sesi Sandbox (Tester Terdaftar)"
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

      {/* 2. SIDEBAR WIDGET */}
      {variant === "sidebar" && (
        <div
          className={`rounded-xl border p-3 transition-colors ${
            data.isSandboxActive
              ? "border-amber-500/30 bg-linear-to-br from-amber-500/15 via-orange-500/10 to-transparent"
              : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
          } ${className}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-amber-400">
              <FlaskConical size={14} className={data.isSandboxActive ? "animate-pulse" : ""} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Sandbox Tester
              </span>
            </div>
            <span
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                data.isSandboxActive
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {data.isSandboxActive ? "AKTIF" : "LIVE"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-slate-400">Koin Virtual:</span>
            <span className="font-bold text-amber-300 font-mono">
              Rp {data.sandboxBalance.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`w-full py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              data.isSandboxActive
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <Sparkles size={12} />
            {data.isSandboxActive ? "Kelola Sandbox" : "Masuk Sandbox"}
          </button>
        </div>
      )}

      {/* 3. MODAL KONTROL SESI SANDBOX */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-10000 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-5">
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
                    Sandbox Environment
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sistem simulasi transaksi terisolasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
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

            {/* Status Sesi Card */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                data.isSandboxActive
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status Lingkungan Saat Ini
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        data.isSandboxActive
                          ? "bg-amber-400 animate-pulse shadow-sm shadow-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-sm font-extrabold tracking-wide">
                      {data.isSandboxActive
                        ? "MODE SANDBOX (Simulasi Aktif)"
                        : "MODE LIVE (Produksi Nyata)"}
                    </span>
                  </div>
                </div>
                {data.isSandboxActive && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-400/30">
                    <Clock size={11} /> 1 Jam
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Saldo Koin Virtual:</span>
                <span className="font-extrabold text-amber-300 font-mono text-sm">
                  Rp {data.sandboxBalance.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Jaminan Keamanan Checklist */}
            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/60">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Jaminan Perlindungan Finansial:
              </p>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Saldo kas riil Anda tidak akan pernah dipotong.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Tidak ada pemanggilan API Digiflazz / vendor eksternal nyata.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Transaksi diisolasi dari laporan keuangan dan omzet admin.</span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="space-y-2 pt-2">
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
                    Kembali ke Mode LIVE
                  </button>

                  <button
                    type="button"
                    onClick={handleResetWallet}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 py-2.5 text-xs font-semibold transition border border-white/10 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    Reset Koin Tester ke Rp 1.000.000
                  </button>
                </>
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
                  Aktifkan Sesi Sandbox (1 Jam)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
