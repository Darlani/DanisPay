"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FlaskConical,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import type { SandboxAnalyticsResponse } from "@/lib/analytics/sandbox-analytics";

type PeriodType = "30d" | "7d" | "all" | "custom";

interface StageMeta {
  title: string;
  chartLabel: string;
  desc: string;
}

const STAGE_META_BY_INDEX: StageMeta[] = [
  {
    title: "1. Pengunjung",
    chartLabel: "Pengunjung",
    desc: "Orang yang mengunjungi halaman Sandbox",
  },
  {
    title: "2. Tertarik Mencoba",
    chartLabel: "Tertarik Mencoba",
    desc: "Orang yang mulai mencoba Sandbox",
  },
  {
    title: "3. Memenuhi Syarat",
    chartLabel: "Memenuhi Syarat",
    desc: "Pengguna yang memenuhi syarat menggunakan Sandbox",
  },
  {
    title: "4. Aktivasi Sandbox",
    chartLabel: "Aktivasi Sandbox",
    desc: "Pengguna yang berhasil mengaktifkan Sandbox",
  },
  {
    title: "5. Menjelajahi Produk",
    chartLabel: "Menjelajahi Produk",
    desc: "Pengguna yang melihat produk atau margin",
  },
  {
    title: "6. Simulasi Berhasil Pertama",
    chartLabel: "Simulasi Berhasil",
    desc: "Transaksi simulasi pertama yang berhasil",
  },
  {
    title: "7. Tetap Aktif 14 Hari",
    chartLabel: "Tetap Aktif 14 Hari",
    desc: "Pengguna yang tetap aktif setidaknya 2 hari dalam 14 hari",
  },
  {
    title: "8. Menjadi Member LIVE",
    chartLabel: "Member LIVE",
    desc: "Pengguna yang beralih ke Member LIVE",
  },
];

const STAGE_META_MAP: Record<string, StageMeta> = {
  discovery: STAGE_META_BY_INDEX[0],
  intent: STAGE_META_BY_INDEX[1],
  eligibility: STAGE_META_BY_INDEX[2],
  activation: STAGE_META_BY_INDEX[3],
  exploration: STAGE_META_BY_INDEX[4],
  first_value: STAGE_META_BY_INDEX[5],
  firstvalue: STAGE_META_BY_INDEX[5],
  "first value": STAGE_META_BY_INDEX[5],
  retention: STAGE_META_BY_INDEX[6],
  conversion: STAGE_META_BY_INDEX[7],
};

function getStageMeta(stage: string | undefined, index: number): StageMeta {
  if (stage) {
    const key = stage.toLowerCase().trim();
    if (STAGE_META_MAP[key]) return STAGE_META_MAP[key];
  }
  if (index >= 0 && index < STAGE_META_BY_INDEX.length) {
    return STAGE_META_BY_INDEX[index];
  }
  return {
    title: `Tahap ${index + 1}`,
    chartLabel: `Tahap ${index + 1}`,
    desc: "Aktivitas alur pengguna Sandbox",
  };
}

// Controlled, executive color progression (DaPay Slate -> Blue -> Emerald at conversion)
const STAGE_BAR_COLORS = [
  "#334155", // 1. Pengunjung (Slate-700)
  "#1e3a8a", // 2. Tertarik Mencoba (Blue-900)
  "#1d4ed8", // 3. Memenuhi Syarat (Blue-700)
  "#2563eb", // 4. Aktivasi Sandbox (Blue-600)
  "#3b82f6", // 5. Menjelajahi Produk (Blue-500)
  "#0284c7", // 6. Simulasi Berhasil Pertama (Sky-600)
  "#0d9488", // 7. Tetap Aktif 14 Hari (Teal-600)
  "#059669", // 8. Menjadi Member LIVE (Emerald-600)
];

export default function SandboxAnalyticsView() {
  const [period, setPeriod] = useState<PeriodType>("30d");
  const [showCustomDrawer, setShowCustomDrawer] = useState(false);

  // Custom date parameters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cohortStartDate, setCohortStartDate] = useState("");
  const [cohortEndDate, setCohortEndDate] = useState("");

  // Validation message
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SandboxAnalyticsResponse | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAnalytics = useCallback(async () => {
    // Client-side date validation for custom period
    if (period === "custom") {
      if (startDate && endDate && startDate > endDate) {
        setValidationError(
          "Tanggal mulai aktivitas tidak boleh lebih besar dari tanggal akhir aktivitas."
        );
        return;
      }
      if (cohortStartDate && cohortEndDate && cohortStartDate > cohortEndDate) {
        setValidationError(
          "Tanggal mulai aktivasi pengguna tidak boleh lebih besar dari tanggal akhir aktivasi pengguna."
        );
        return;
      }
    }
    setValidationError(null);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sesi admin tidak ditemukan. Silakan login kembali.");
      }

      const params = new URLSearchParams();
      params.set("period", period);
      if (period === "custom") {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (cohortStartDate) params.set("cohortStartDate", cohortStartDate);
        if (cohortEndDate) params.set("cohortEndDate", cohortEndDate);
      }

      const response = await fetch(
        `/api/admin/sandbox/analytics?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        }
      );

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.error || "Gagal memuat analitik Sandbox.");
      }

      setData(json as SandboxAnalyticsResponse);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("[SANDBOX_ANALYTICS_VIEW] Fetch error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data analitik Sandbox."
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [period, startDate, endDate, cohortStartDate, cohortEndDate]);

  useEffect(() => {
    void fetchAnalytics();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchAnalytics]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod === "custom") {
      setShowCustomDrawer(true);
    } else {
      setShowCustomDrawer(false);
      setValidationError(null);
    }
  };

  const discoveryCount = data?.funnel?.[0]?.uniqueUsers ?? 0;
  const activationCount = data?.funnel?.[3]?.uniqueUsers ?? 0;
  const firstValueCount = data?.funnel?.[5]?.uniqueUsers ?? 0;
  const conversionCount = data?.funnel?.[7]?.uniqueUsers ?? 0;

  const matureRate = data?.retention?.matureCohort?.retentionRate ?? 0;
  const matureRetained = data?.retention?.matureCohort?.retainedUsers ?? 0;
  const matureActivated = data?.retention?.matureCohort?.activatedUsers ?? 0;

  const immatureActivated = data?.retention?.immatureCohort?.activatedUsers ?? 0;
  const immatureActive = data?.retention?.immatureCohort?.activeSoFar ?? 0;

  const hasDataQualityIssue =
    data &&
    (data.dataQuality.ambiguousAnonymousIds > 0 ||
      data.dataQuality.unanchoredSimulations > 0 ||
      data.dataQuality.unanchoredConversions > 0 ||
      data.dataQuality.futureTimestampEvents > 0);

  return (
    <div className="space-y-4 text-slate-700">
      {/* 1. Control Toolbar (Presets, Refresh, Windows Info) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Period Tabs */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => handlePeriodChange("7d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === "7d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange("30d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === "30d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange("custom")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === "custom"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalendarDays size={14} />
              Rentang Kustom
            </button>
          </div>

          <button
            type="button"
            onClick={() => void fetchAnalytics()}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            title="Segarkan data analitik"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>

        {/* Metadata Date Context */}
        {data?.meta && !loading && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <div>
              Periode Aktivitas:{" "}
              <span className="font-semibold text-slate-700">
                {new Date(data.meta.eventWindow.start).toLocaleDateString("id-ID")} –{" "}
                {new Date(data.meta.eventWindow.end).toLocaleDateString("id-ID")}
              </span>
            </div>
            <span className="hidden sm:inline text-slate-300">·</span>
            <div>
              Diperbarui:{" "}
              <span className="font-medium text-slate-700">
                {new Date(data.meta.generatedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Date Inputs Drawer (when period === "custom") */}
      {period === "custom" && showCustomDrawer && (
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-blue-700" />
              <span className="text-xs font-bold text-slate-900">
                Filter Rentang Tanggal Kustom
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Format: YYYY-MM-DD
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Mulai Aktivitas
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Selesai Aktivitas
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Mulai Aktivasi Pengguna
              </label>
              <input
                type="date"
                value={cohortStartDate}
                onChange={(e) => setCohortStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Selesai Aktivasi Pengguna
              </label>
              <input
                type="date"
                value={cohortEndDate}
                onChange={(e) => setCohortEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {validationError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void fetchAnalytics()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Terapkan Filter
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-rose-600" />
            <div>
              <p className="text-xs font-bold">Gagal Memuat Analitik Sandbox</p>
              <p className="mt-0.5 text-xs text-rose-600">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchAnalytics()}
            className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 2. Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1: Pengunjung Sandbox */}
        <div className="flex min-h-[110px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Pengunjung Sandbox
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              discoveryCount.toLocaleString("id-ID")
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Kunjungan unik</span>
            <span className="font-semibold text-slate-700">Tahap Awal</span>
          </div>
        </div>

        {/* KPI 2: Aktivasi Sandbox */}
        <div className="flex min-h-[110px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Aktivasi Sandbox
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FlaskConical size={16} />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              activationCount.toLocaleString("id-ID")
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Pengguna aktif</span>
            <span className="font-semibold text-blue-600">
              {discoveryCount > 0
                ? `Konversi: ${((activationCount / discoveryCount) * 100).toFixed(1)}%`
                : "Konversi: 0%"}
            </span>
          </div>
        </div>

        {/* KPI 3: Simulasi Berhasil Pertama */}
        <div className="flex min-h-[110px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Simulasi Berhasil Pertama
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              firstValueCount.toLocaleString("id-ID")
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Simulasi pertama</span>
            <span className="font-semibold text-sky-600">
              {activationCount > 0
                ? `${((firstValueCount / activationCount) * 100).toFixed(1)}% dari aktif`
                : "0%"}
            </span>
          </div>
        </div>

        {/* KPI 4: Tetap Aktif 14 Hari */}
        <div className="flex min-h-[110px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Tetap Aktif 14 Hari
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <RotateCw size={16} />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              `${matureRate.toFixed(1)}%`
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Sudah 14 hari</span>
            <span className="font-semibold text-teal-700">
              {matureRetained} / {matureActivated} Pengguna
            </span>
          </div>
        </div>

        {/* KPI 5: Menjadi Member LIVE */}
        <div className="flex min-h-[110px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Menjadi Member LIVE
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              conversionCount.toLocaleString("id-ID")
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Beralih ke LIVE</span>
            <span className="font-semibold text-emerald-600">
              {activationCount > 0
                ? `Konversi: ${((conversionCount / activationCount) * 100).toFixed(1)}%`
                : "Konversi: 0%"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Alur Perjalanan Pengguna Sandbox (Funnel) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              ALUR PERJALANAN PENGGUNA SANDBOX
            </h3>
            <p className="text-xs text-slate-500">
              Dari kunjungan pertama hingga pengguna menjadi Member LIVE.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              <Layers size={12} />
              8 Tahap Alur Pengguna
            </span>
          </div>
        </div>

        {/* Compact Summary Chart */}
        <div className="mt-4 h-36 w-full">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : data?.funnel && data.funnel.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.funnel.map((item, index) => {
                  const meta = getStageMeta(item.stage, index);
                  return {
                    ...item,
                    shortName: `${index + 1}. ${meta.chartLabel}`,
                  };
                })}
                margin={{ top: 8, right: 8, left: -24, bottom: 8 }}
              >
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  allowDecimals={false}
                />
                <Bar dataKey="uniqueUsers" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {data.funnel.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STAGE_BAR_COLORS[index % STAGE_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Belum ada data alur perjalanan pengguna untuk rentang waktu ini.
            </div>
          )}
        </div>

        {/* Contextual Notice for Historical Data */}
        {discoveryCount < activationCount && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-xs text-blue-800">
            <Info size={14} className="shrink-0 text-blue-600 mt-0.5" />
            <span>
              Sebagian pengguna sudah melakukan aktivasi, tetapi kunjungan awalnya belum tercatat pada periode yang dipilih.
            </span>
          </div>
        )}

        {/* 8-Stage Step Cards Grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.funnel ?? []).map((step, idx) => {
            const meta = getStageMeta(step.stage, idx);
            return (
              <div
                key={`${step.stage}-${idx}`}
                className="relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition hover:border-slate-300 hover:bg-white"
              >
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    {meta.title}
                  </span>
                  <p className="mt-1 text-xs leading-snug text-slate-500">
                    {meta.desc}
                  </p>
                </div>

                <div className="mt-3 border-t border-slate-200/60 pt-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      {step.uniqueUsers.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs font-semibold text-blue-600">
                      Konversi: {step.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                  {/* CRITICAL FIX 1: Positive Drop-Off Rate magnitude, NO minus sign */}
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Turun dari tahap sebelumnya:</span>
                    <span
                      className={`font-semibold ${
                        step.dropOffRate > 0 ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      {step.dropOffRate > 0
                        ? `${step.dropOffRate.toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Two-Column Analytics: Retention vs Kecepatan Pengguna Mencapai Hasil */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Column 1: Retention */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <RotateCw size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  RETENSI 14 HARI PENGGUNA
                </h3>
                <p className="text-xs text-slate-500">
                  Memantau apakah pengguna tetap aktif setelah mencoba Sandbox.
                </p>
              </div>
            </div>

            {/* Mature vs Immature Cards */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Mature Cohort */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    Pengguna yang Sudah Diamati 14 Hari
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Evaluasi Selesai
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold text-emerald-950">
                  {matureRate.toFixed(1)}%
                </div>
                <p className="mt-1 text-xs text-emerald-800">
                  Evaluasi penuh 14 hari selesai.{" "}
                  <span className="font-semibold">{matureRetained}</span> dari{" "}
                  <span className="font-semibold">{matureActivated}</span> pengguna tetap aktif.
                </p>
              </div>

              {/* In-Progress Cohort */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    Pengguna yang Masih Diamati
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    SEDANG BERJALAN
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold text-amber-950">
                  {immatureActive}{" "}
                  <span className="text-xs font-normal text-amber-700">
                    / {immatureActivated} Aktif
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-800">
                  Pengamatan belum mencapai 14 hari. Belum dihitung sebagai gagal retensi.
                </p>
              </div>
            </div>

            {/* Activity Days Distribution */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-800">
                Distribusi Hari Aktivitas Pengguna
              </h4>
              <p className="text-xs text-slate-500">
                Jumlah hari aktif pengguna berinteraksi di Sandbox.
              </p>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 text-center">
                  <span className="text-xs text-slate-500">1 Hari</span>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {data?.retention?.activityDaysDistribution?.["1_day"] ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 text-center">
                  <span className="text-xs text-slate-500">2 Hari</span>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {data?.retention?.activityDaysDistribution?.["2_days"] ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 text-center">
                  <span className="text-xs text-slate-500">3–5 Hari</span>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {data?.retention?.activityDaysDistribution?.["3_to_5_days"] ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 text-center">
                  <span className="text-xs text-slate-500">6+ Hari</span>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {data?.retention?.activityDaysDistribution?.["6_plus_days"] ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Time to Value & Persona */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  SEBERAPA CEPAT PENGGUNA MENCAPAI HASIL
                </h3>
                <p className="text-xs text-slate-500">
                  Waktu yang dibutuhkan pengguna dari aktivasi hingga simulasi transaksi dan konversi.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">
                  Median waktu hingga simulasi berhasil
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">
                    {(
                      data?.timeToValue?.medianTimeToFirstValueHours ?? 0
                    ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Jam</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Rata-rata:{" "}
                  {(
                    data?.timeToValue?.averageTimeToFirstValueHours ?? 0
                  ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  jam
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">
                  Median waktu hingga menjadi Member LIVE
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">
                    {(
                      data?.timeToValue?.medianTimeToConversionDays ?? 0
                    ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Hari</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Rata-rata:{" "}
                  {(
                    data?.timeToValue?.averageTimeToConversionDays ?? 0
                  ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  hari
                </p>
              </div>
            </div>

            {/* Persona Status Card */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    STATUS PENGGUNA SAAT INI
                  </h4>
                  <p className="text-xs text-slate-500">
                    Menampilkan jenis simulasi yang sedang digunakan saat ini, bukan riwayat setiap transaksi.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  Status Terkini
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                  <span className="text-xs font-semibold text-slate-700">
                    Tester Reguler
                  </span>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {data?.currentPersonaState?.currentRegularTesters ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">Simulasi harga dasar</p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                  <span className="text-xs font-semibold text-slate-700">
                    Tester Special
                  </span>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {data?.currentPersonaState?.currentSpecialTesters ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">Simulasi harga diskon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Sumber Pengguna & Kampanye */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              SUMBER PENGGUNA & KAMPANYE
            </h3>
            <p className="text-xs text-slate-500">
              Lihat sumber kunjungan yang menghasilkan aktivasi, simulasi, dan konversi.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="px-3.5 py-2.5">Sumber</th>
                <th className="px-3.5 py-2.5">Media</th>
                <th className="px-3.5 py-2.5">Kampanye</th>
                <th className="px-3.5 py-2.5 text-right">Pengunjung</th>
                <th className="px-3.5 py-2.5 text-right">Aktivasi</th>
                <th className="px-3.5 py-2.5 text-right">Simulasi Berhasil</th>
                <th className="px-3.5 py-2.5 text-right">Menjadi Member LIVE</th>
                <th className="px-3.5 py-2.5 text-right">Rasio Aktivasi</th>
                <th className="px-3.5 py-2.5 text-right">Rasio Konversi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin text-blue-600" size={20} />
                    <p className="mt-2 text-xs">Memuat data sumber pengguna & kampanye...</p>
                  </td>
                </tr>
              ) : data?.attribution && data.attribution.length > 0 ? (
                data.attribution.map((attr, idx) => (
                  <tr
                    key={`${attr.source}-${attr.medium}-${attr.campaign}-${idx}`}
                    className="hover:bg-slate-50/50"
                  >
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                      {attr.source || "(Langsung / Tanpa Sumber)"}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      {attr.medium || "-"}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      {attr.campaign || "-"}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-900">
                      {attr.visitors.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-900">
                      {attr.activations.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-900">
                      {attr.firstValue.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                      {attr.conversions.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-semibold text-blue-600">
                      {attr.activationRate.toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-semibold text-emerald-600">
                      {attr.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    Belum ada data sumber kunjungan yang tercatat pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Contextual Caption */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Info size={13} className="shrink-0 text-slate-400" />
          <span>
            Data di atas mencatat sumber kunjungan, media, dan kampanye yang tersimpan pada akun pengguna.
          </span>
        </div>
      </div>

      {/* 6. Kualitas Data (Data Quality Card) */}
      <div
        className={`rounded-2xl border p-4 shadow-xs ${
          hasDataQualityIssue
            ? "border-amber-300 bg-amber-50/50 text-amber-900"
            : "border-slate-200/80 bg-white text-slate-700"
        }`}
      >
        <div className="flex items-start gap-3">
          {hasDataQualityIssue ? (
            <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
          )}
          <div className="w-full">
            <h4 className="text-xs font-bold text-slate-900">
              {hasDataQualityIssue
                ? "Perlu Perhatian pada Data"
                : "KUALITAS DATA"}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasDataQualityIssue
                ? "Beberapa data aktivitas memerlukan perhatian operasional."
                : "Data analitik Sandbox berjalan normal. Semua pencatatan aktivitas, aktivasi, dan simulasi tercatat dengan baik."}
            </p>

            {hasDataQualityIssue && data?.dataQuality && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs font-semibold">
                <div className="rounded-xl border border-amber-200/80 bg-white p-2.5">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Pengunjung Tanpa Akun Pasti
                  </span>
                  <span className="text-base font-bold text-amber-800">
                    {data.dataQuality.ambiguousAnonymousIds}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    Pengunjung tanpa identitas akun yang belum dapat dipastikan
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white p-2.5">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Simulasi Tanpa Akses
                  </span>
                  <span className="text-base font-bold text-amber-800">
                    {data.dataQuality.unanchoredSimulations}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    Simulasi tanpa akses Sandbox
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white p-2.5">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Konversi Tanpa Akses
                  </span>
                  <span className="text-base font-bold text-amber-800">
                    {data.dataQuality.unanchoredConversions}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    Konversi tanpa riwayat akses Sandbox
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white p-2.5">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Waktu Tidak Valid
                  </span>
                  <span className="text-base font-bold text-amber-800">
                    {data.dataQuality.futureTimestampEvents}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    Data waktu aktivitas tidak valid
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
