"use client";

import React, { useMemo } from "react";
import { Server, AlertTriangle, Activity, Zap } from "lucide-react";
import { ProviderData, formatRupiah } from "../types";

interface ProviderKpiCardsProps {
  providers: ProviderData[];
}

function WaveDecoration({
  color1,
  color2,
}: {
  color1: string;
  color2: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden leading-none z-0">
      <svg
        viewBox="0 0 400 48"
        className="w-full h-6 min-[360px]:h-7 sm:h-8 lg:h-9"
        preserveAspectRatio="none"
      >
        <path
          d="M0,24 C120,8 240,40 400,16 L400,48 L0,48 Z"
          fill={color1}
        />
        <path
          d="M0,32 C140,16 270,42 400,26 L400,48 L0,48 Z"
          fill={color2}
        />
      </svg>
    </div>
  );
}

export default function ProviderKpiCards({ providers }: ProviderKpiCardsProps) {
  const totalVendorBalance = useMemo(
    () => providers.reduce((acc, p) => acc + (Number(p.balance) || 0), 0),
    [providers]
  );

  const activeExecutionCount = useMemo(
    () =>
      providers.filter(
        (p) => p.is_execution_enabled && p.is_enabled && !p.is_maintenance
      ).length,
    [providers]
  );

  const activeExecutionPercentage = useMemo(() => {
    if (providers.length === 0) return 0;
    return Math.round((activeExecutionCount / providers.length) * 100);
  }, [activeExecutionCount, providers.length]);

  const maintenanceCount = useMemo(
    () => providers.filter((p) => p.is_maintenance).length,
    [providers]
  );

  const aggregateHealth = useMemo(() => {
    if (providers.length === 0) return "UNKNOWN";
    const down = providers.some((p) => p.health_status === "DOWN");
    if (down) return "DOWN";
    const degraded = providers.some((p) => p.health_status === "DEGRADED");
    if (degraded) return "DEGRADED";
    return "HEALTHY";
  }, [providers]);

  return (
    <section className="mb-4 sm:mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2 min-[360px]:gap-2.5 sm:gap-3.5 md:gap-4 lg:gap-3 xl:gap-4">
      {/* ============================================================ */}
      {/* 1. TOTAL VENDOR BALANCE (BLUE SERVER CARD WITH SUBTLE WAVE)  */}
      {/* ============================================================ */}
      <div className="kpi-card group relative flex flex-col justify-between overflow-hidden rounded-xl min-[360px]:rounded-2xl border border-slate-200/80 bg-white p-2 min-[360px]:p-2.5 min-[400px]:p-3 sm:p-4 md:p-4.5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 min-h-23 min-[360px]:min-h-25.5 sm:min-h-28.75 lg:min-h-29.5">
        <div className="kpi-head-row relative z-10 flex items-start gap-1.5 min-[360px]:gap-2 min-[400px]:gap-2.5 sm:gap-3.5">
          {/* Solid Blue Server Icon */}
          <div className="kpi-icon-box flex h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 min-[400px]:h-9 min-[400px]:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg min-[360px]:rounded-xl sm:rounded-2xl bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
            <Server className="kpi-icon-svg w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[400px]:w-4.5 min-[400px]:h-4.5 sm:w-5 sm:h-5 text-white stroke-2" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="kpi-title text-[9.5px] min-[360px]:text-[10px] min-[400px]:text-[11px] sm:text-xs font-semibold text-slate-500 leading-tight truncate">
              Total Vendor Balance
            </p>
            <div className="mt-0.5 sm:mt-1 flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2 min-w-0">
              <h3
                suppressHydrationWarning
                className="kpi-value text-[11.5px] min-[360px]:text-[13px] min-[400px]:text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none truncate"
              >
                {formatRupiah(totalVendorBalance)}
              </h3>
              <span className="kpi-badge inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-1 min-[360px]:px-1.5 py-0.2 min-[360px]:py-0.5 text-[7.5px] min-[360px]:text-[8px] min-[400px]:text-[9px] sm:text-[10px] font-bold text-emerald-600 leading-none shrink-0">
                ↑ +2.4%
              </span>
            </div>
            <p className="kpi-subtitle mt-0.5 sm:mt-1 text-[8px] min-[360px]:text-[8.5px] min-[400px]:text-[9.5px] sm:text-[11px] text-slate-400 font-normal leading-normal truncate">
              Saldo operasional seluruh provider
            </p>
          </div>
        </div>

        {/* Bottom Soft Blue Wave */}
        <WaveDecoration color1="#e0edfd" color2="#bfdbfe" />
      </div>

      {/* ============================================================ */}
      {/* 2. ACTIVE EXECUTION (HEXAGON BOLT CARD WITH PROGRESS BAR)    */}
      {/* ============================================================ */}
      <div className="kpi-card group relative flex flex-col justify-between overflow-hidden rounded-xl min-[360px]:rounded-2xl border border-slate-200/80 bg-white p-2 min-[360px]:p-2.5 min-[400px]:p-3 sm:p-4 md:p-4.5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 min-h-23 min-[360px]:min-h-25.5 sm:min-h-28.75 lg:min-h-29.5">
        <div className="kpi-head-row relative z-10 flex items-start gap-1.5 min-[360px]:gap-2 min-[400px]:gap-2.5 sm:gap-3.5">
          {/* Light Emerald Hexagon Icon */}
          <div className="kpi-icon-box flex h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 min-[400px]:h-9 min-[400px]:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg min-[360px]:rounded-xl sm:rounded-2xl bg-emerald-100/90 text-emerald-600">
            <div className="relative flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="kpi-icon-svg w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[400px]:w-4.5 min-[400px]:h-4.5 sm:w-5 sm:h-5 stroke-emerald-600 fill-emerald-600/10 stroke-[1.8]"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" />
              </svg>
              <Zap
                className="absolute text-emerald-600 fill-emerald-600"
                style={{ width: "45%", height: "45%" }}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="kpi-title text-[9.5px] min-[360px]:text-[10px] min-[400px]:text-[11px] sm:text-xs font-semibold text-slate-500 leading-tight truncate">
              Active Execution
            </p>
            <div className="mt-0.5 sm:mt-1">
              <h3
                suppressHydrationWarning
                className="kpi-value text-[11.5px] min-[360px]:text-[13px] min-[400px]:text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none truncate"
              >
                {activeExecutionCount} / {providers.length} Active
              </h3>
            </div>
            <p className="kpi-subtitle mt-0.5 sm:mt-1 text-[8px] min-[360px]:text-[8.5px] min-[400px]:text-[9.5px] sm:text-[11px] text-slate-400 font-normal leading-normal truncate">
              Provider siap untuk dispatch
            </p>
          </div>
        </div>

        {/* Bottom Progress Bar + Percentage */}
        <div className="relative z-10 mt-2 sm:mt-3 flex items-center gap-2 sm:gap-2.5">
          <div className="h-1.5 sm:h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  Math.max(activeExecutionPercentage, 0),
                  100
                )}%`,
              }}
            />
          </div>
          <span
            suppressHydrationWarning
            className="kpi-progress-text font-mono text-[8.5px] min-[360px]:text-[9.5px] sm:text-xs font-black text-slate-800 shrink-0"
          >
            {activeExecutionPercentage}%
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAINTENANCE ALERTS (ROSE ALERT CARD WITH SUBTLE WAVE)     */}
      {/* ============================================================ */}
      <div className="kpi-card group relative flex flex-col justify-between overflow-hidden rounded-xl min-[360px]:rounded-2xl border border-slate-200/80 bg-white p-2 min-[360px]:p-2.5 min-[400px]:p-3 sm:p-4 md:p-4.5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 min-h-23 min-[360px]:min-h-25.5 sm:min-h-28.75 lg:min-h-29.5">
        <div className="kpi-head-row relative z-10 flex items-start gap-1.5 min-[360px]:gap-2 min-[400px]:gap-2.5 sm:gap-3.5">
          {/* Light Rose Alert Triangle Icon */}
          <div className="kpi-icon-box flex h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 min-[400px]:h-9 min-[400px]:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg min-[360px]:rounded-xl sm:rounded-2xl bg-rose-100/90 text-rose-500">
            <AlertTriangle className="kpi-icon-svg w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[400px]:w-4.5 min-[400px]:h-4.5 sm:w-5 sm:h-5 text-rose-500 stroke-2" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="kpi-title text-[9.5px] min-[360px]:text-[10px] min-[400px]:text-[11px] sm:text-xs font-semibold text-slate-500 leading-tight truncate">
              Maintenance Alerts
            </p>
            <div className="mt-0.5 sm:mt-1">
              <h3
                suppressHydrationWarning
                className="kpi-value text-[11.5px] min-[360px]:text-[13px] min-[400px]:text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none truncate"
              >
                {maintenanceCount} Provider
              </h3>
            </div>
            <p className="kpi-subtitle mt-0.5 sm:mt-1 text-[8px] min-[360px]:text-[8.5px] min-[400px]:text-[9.5px] sm:text-[11px] text-slate-400 font-normal leading-normal truncate">
              {maintenanceCount === 0
                ? "Tidak ada maintenance aktif"
                : `${maintenanceCount} provider dalam perbaikan`}
            </p>
          </div>
        </div>

        {/* Bottom Soft Rose Wave */}
        <WaveDecoration color1="#ffe4e6" color2="#fecdd3" />
      </div>

      {/* ============================================================ */}
      {/* 4. PROVIDER HEALTH (EMERALD PULSE CARD WITH SUBTLE WAVE)     */}
      {/* ============================================================ */}
      <div className="kpi-card group relative flex flex-col justify-between overflow-hidden rounded-xl min-[360px]:rounded-2xl border border-slate-200/80 bg-white p-2 min-[360px]:p-2.5 min-[400px]:p-3 sm:p-4 md:p-4.5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 min-h-23 min-[360px]:min-h-25.5 sm:min-h-28.75 lg:min-h-29.5">
        <div className="kpi-head-row relative z-10 flex items-start gap-1.5 min-[360px]:gap-2 min-[400px]:gap-2.5 sm:gap-3.5">
          {/* Solid Emerald Activity Pulse Icon */}
          <div className="kpi-icon-box flex h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 min-[400px]:h-9 min-[400px]:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg min-[360px]:rounded-xl sm:rounded-2xl bg-emerald-400 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)]">
            <Activity className="kpi-icon-svg w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[400px]:w-4.5 min-[400px]:h-4.5 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="kpi-title text-[9.5px] min-[360px]:text-[10px] min-[400px]:text-[11px] sm:text-xs font-semibold text-slate-500 leading-tight truncate">
              Provider Health
            </p>
            <div className="mt-0.5 sm:mt-1">
              <h3
                suppressHydrationWarning
                className={`kpi-value text-[11.5px] min-[360px]:text-[13px] min-[400px]:text-sm sm:text-lg md:text-xl font-black tracking-tight leading-none truncate ${
                  aggregateHealth === "HEALTHY"
                    ? "text-emerald-600"
                    : aggregateHealth === "DEGRADED"
                    ? "text-amber-600"
                    : aggregateHealth === "DOWN"
                    ? "text-rose-600"
                    : "text-slate-600"
                }`}
              >
                {aggregateHealth}
              </h3>
            </div>
            <p className="kpi-subtitle mt-0.5 sm:mt-1 text-[8px] min-[360px]:text-[8.5px] min-[400px]:text-[9.5px] sm:text-[11px] text-slate-400 font-normal leading-normal truncate">
              {aggregateHealth === "HEALTHY"
                ? "Seluruh sistem dalam kondisi baik"
                : "Pemeriksaan sistem diperlukan"}
            </p>
          </div>
        </div>

        {/* Bottom Soft Emerald Wave */}
        <WaveDecoration color1="#d1fae5" color2="#a7f3d0" />
      </div>
    </section>
  );
}
