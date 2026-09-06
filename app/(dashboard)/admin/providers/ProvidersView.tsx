"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabaseClient";
import {
  Box,
  RefreshCw,
  List,
  LayoutGrid,
  AlertCircle,
  Server,
  Activity,
} from "lucide-react";
import {
  ProviderData,
  ToggleField,
  SelectedError,
  ActionNotice,
} from "./types";
import ProviderKpiCards from "./components/ProviderKpiCards";
import ProviderDesktopTable from "./components/ProviderDesktopTable";
import ProviderGridCards from "./components/ProviderGridCards";
import ProviderErrorModal from "./components/ProviderErrorModal";
import ProviderActionToast from "./components/ProviderActionToast";
import ProviderLegendCard from "./components/ProviderLegendCard";

export type { ProviderData };

// In-memory cache for SWR instant hydration
let swrMemoryCache: ProviderData[] | null = null;

export default function ProvidersView() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingCode, setMutatingCode] = useState<string | null>(null);
  const [refreshingBalanceCode, setRefreshingBalanceCode] = useState<string | null>(null);
  const [syncingCatalogCode, setSyncingCatalogCode] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedError, setSelectedError] = useState<SelectedError | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);

  // Safe client-side hydration: load SWR cache without triggering SSR mismatch
  useEffect(() => {
    setCurrentTime(Date.now());
    let cached = swrMemoryCache;
    if (!cached || cached.length === 0) {
      try {
        const saved = sessionStorage.getItem("dapay_swr_providers");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cached = parsed;
            swrMemoryCache = parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    if (cached && cached.length > 0) {
      setProviders(cached);
      setLoading(false);
    }
  }, []);

  // Cooldown countdown tick
  useEffect(() => {
    const hasActiveCooldown = Object.values(cooldowns).some(
      (ts) => currentTime - ts < 10000
    );
    if (!hasActiveCooldown) return;

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldowns, currentTime]);

  const getCooldownSeconds = useCallback(
    (code: string): number => {
      const last = cooldowns[code];
      if (!last) return 0;
      const elapsed = currentTime - last;
      if (elapsed >= 10000) return 0;
      return Math.ceil((10000 - elapsed) / 1000);
    },
    [cooldowns, currentTime]
  );

  // SWR: Revalidate provider registry quietly in background
  const fetchProviders = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else if (!swrMemoryCache) {
      setLoading(true);
    }
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/admin/providers", {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(
            "Akses ditolak: Anda tidak memiliki izin role admin untuk melihat registry provider."
          );
        }
        throw new Error(`Gagal memuat registry provider (HTTP ${res.status})`);
      }

      const data = await res.json();
      const rawList = data.data || data.providers || (Array.isArray(data) ? data : null);
      if (Array.isArray(rawList)) {
        const sorted = (rawList as ProviderData[]).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setProviders(sorted);
        swrMemoryCache = sorted;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("dapay_swr_providers", JSON.stringify(sorted));
          } catch {
            // ignore storage full
          }
        }
      }

      // Check Master Store Operational Mode (Live vs Sandbox)
      try {
        const { data: storeSetting } = await supabase
          .from("store_settings")
          .select("*")
          .limit(1)
          .single();
        if (storeSetting) {
          const isLive = (storeSetting as { is_live_mode?: boolean | null }).is_live_mode ?? true;
          setIsSandboxMode(!isLive);
        }
      } catch {
        // non-blocking
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan memuat provider.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  const handleToggle = async (
    code: string,
    field: ToggleField,
    currentValue: boolean
  ) => {
    if (mutatingCode) return;
    setMutatingCode(`${code}:${field}`);
    setActionNotice(null);

    const nextValue = !currentValue;

    // Optimistic UI mutation
    setProviders((prev) =>
      prev.map((p) => (p.code === code ? { ...p, [field]: nextValue } : p))
    );

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/admin/providers/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ [field]: nextValue }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        if (res.status === 403) {
          throw new Error(
            json.error ||
              "Akses ditolak: Anda tidak memiliki izin mengubah konfigurasi operasional provider."
          );
        }
        throw new Error(json.error || `Gagal memperbarui status ${code}`);
      }

      await fetchProviders(true);
    } catch (err: unknown) {
      // Revert optimistic mutation on error
      setProviders((prev) =>
        prev.map((p) => (p.code === code ? { ...p, [field]: currentValue } : p))
      );
      const message =
        err instanceof Error ? err.message : "Gagal memperbarui provider.";
      setActionNotice({
        type: "error",
        message,
      });
      await fetchProviders(true);
    } finally {
      setMutatingCode(null);
    }
  };

  const handleRefreshBalance = async (code: string) => {
    if (refreshingBalanceCode) return;
    const cooldownSec = getCooldownSeconds(code);
    if (cooldownSec > 0) return;

    setRefreshingBalanceCode(code);
    setActionNotice(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `/api/admin/providers/${encodeURIComponent(code)}/balance`,
        {
          method: "POST",
          headers,
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Gagal memeriksa saldo ${code}`);
      }

      setCooldowns((prev) => ({ ...prev, [code]: Date.now() }));
      setActionNotice({
        type: "success",
        message: `Saldo ${code} berhasil diperbarui: Rp ${(
          json.balance || 0
        ).toLocaleString("id-ID")}`,
      });

      await fetchProviders(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : `Gagal memeriksa saldo ${code}`;
      setActionNotice({
        type: "error",
        message,
      });
    } finally {
      setRefreshingBalanceCode(null);
    }
  };

  const handleSyncCatalog = async (code: string) => {
    if (syncingCatalogCode) return;
    setSyncingCatalogCode(code);
    setActionNotice(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/admin/products/cron/digiflazz/sync", {
        method: "POST",
        headers,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || `Sinkronisasi katalog ${code} gagal`);
      }

      setActionNotice({
        type: "success",
        message: `Katalog ${code} berhasil disinkronkan (${json.items_synced || json.count || 0} item).`,
      });

      await fetchProviders(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Gagal menjalankan sinkronisasi katalog ${code}`;
      setActionNotice({
        type: "error",
        message,
      });
    } finally {
      setSyncingCatalogCode(null);
    }
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 antialiased">
      {/* FLOATING ACTION TOAST (ZERO LAYOUT SHIFT) */}
      <ProviderActionToast
        notice={actionNotice}
        onDismiss={() => setActionNotice(null)}
      />

      {/* ERROR ALERT BANNER */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchProviders(true)}
            className="min-h-10 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* TOP 4 KPI CARDS (PROPORTION MATCHING WALLET KPI CARDS) */}
      <ProviderKpiCards providers={providers} />

      {/* MASTER OPERATIONAL MODE BANNER (IF IN SANDBOX) */}
      {isSandboxMode && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs">
              <Activity size={14} />
            </span>
            <div>
              <p className="font-bold text-amber-900">
                Mode Simulasi (Sandbox) Toko Sedang Aktif
              </p>
              <p className="text-[11px] text-amber-700 font-medium">
                Seluruh transaksi order diproses internal simulasi. Eksekusi riil ke API provider (&quot;Proses&quot;) dilewati tanpa memotong deposit vendor nyata.
              </p>
            </div>
          </div>
          <Link
            href="/admin?tab=settings"
            className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Pengaturan Toko &rarr;
          </Link>
        </div>
      )}

      {/* MAIN CONTAINER: PROVIDER OPERATIONAL MATRIX */}
      <section className="overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Table/List Subheader */}
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Box size={15} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                  Provider Operational Matrix
                </h2>
                {isSandboxMode ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Sandbox
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                Menampilkan {providers.length} provider terdaftar
              </p>
            </div>
          </div>

          {/* VIEW SWITCH (Table vs Grid) & REVALIDATION TRIGGER */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void fetchProviders(true)}
              disabled={refreshing || loading}
              title="Segarkan data provider"
              aria-label="Segarkan data provider"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-blue-600 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin text-blue-600" : "text-slate-500"}
              />
            </button>

            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100/90 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Tampilan Tabel"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-2xs font-semibold"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Tampilan Grid Cards"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-2xs font-semibold"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT (TABLE OR GRID) */}
        {loading && providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400">
            <RefreshCw size={30} className="animate-spin text-blue-600" />
            <p className="mt-3 text-xs sm:text-sm font-medium text-slate-600">
              Memuat registry provider...
            </p>
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400">
            <Server size={36} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Tidak ada provider terdaftar
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Database registry public.providers tidak memiliki baris aktif.
            </p>
          </div>
        ) : viewMode === "table" ? (
          <ProviderDesktopTable
            providers={providers}
            mutatingCode={mutatingCode}
            refreshingBalanceCode={refreshingBalanceCode}
            syncingCatalogCode={syncingCatalogCode}
            getCooldownSeconds={getCooldownSeconds}
            onToggle={handleToggle}
            onRefreshBalance={handleRefreshBalance}
            onSyncCatalog={handleSyncCatalog}
            onSelectError={setSelectedError}
            isSandboxMode={isSandboxMode}
          />
        ) : (
          <ProviderGridCards
            providers={providers}
            mutatingCode={mutatingCode}
            refreshingBalanceCode={refreshingBalanceCode}
            syncingCatalogCode={syncingCatalogCode}
            getCooldownSeconds={getCooldownSeconds}
            onToggle={handleToggle}
            onRefreshBalance={handleRefreshBalance}
            onSyncCatalog={handleSyncCatalog}
          />
        )}
      </section>

      {/* OPERATIONAL LEGEND & COLUMN GUIDE */}
      <ProviderLegendCard />

      {/* ERROR TELEMETRY MODAL */}
      <ProviderErrorModal
        error={selectedError}
        onClose={() => setSelectedError(null)}
      />
    </div>
  );
}
