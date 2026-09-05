"use client";

import React, { useMemo } from "react";
import { Server, Zap, AlertTriangle, HeartPulse } from "lucide-react";
import { ProviderData, formatRupiah } from "../types";

interface ProviderKpiCardsProps {
  providers: ProviderData[];
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
    if (down) return "DEGRADED";
    const degraded = providers.some((p) => p.health_status === "DEGRADED");
    if (degraded) return "DEGRADED";
    return "HEALTHY";
  }, [providers]);

  return (
    <section className="mb-4 sm:mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3.5 md:gap-4 xl:gap-5">
      {/* ============================================================ */}
      {/* 1. TOTAL VENDOR BALANCE (PREMIUM ROYAL GLASS CARD)           */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-blue-400/30 bg-gradient-to-br from-[#1e3a8a]/95 via-[#1d4ed8]/90 to-[#312e81]/95 p-2.5 xs:p-3 sm:p-4.5 md:p-5 text-white shadow-[0_12px_32px_rgba(30,58,138,0.22)] backdrop-blur-2xl ring-1 ring-inset ring-white/20 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(30,58,138,0.32)] min-h-24 xs:min-h-28 sm:min-h-32">
        {/* Specular Glare Rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Ambient Multi-Color Glass Glow Orbs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400/30 via-blue-400/20 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-indigo-500/30 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-white/15 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-blue-100 backdrop-blur-xs ring-1 ring-white/20">
              <Server size={9} className="shrink-0 text-cyan-300" />
              <span className="truncate">Vendor Balance</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-white/30 bg-white/15 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md">
            <Server className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
            {formatRupiah(totalVendorBalance)}
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-medium text-blue-100/80">
            Saldo operasional seluruh provider
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. ACTIVE EXECUTION (LUMINOUS EMERALD CARD)                  */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-emerald-200/90 bg-emerald-50/40 p-2.5 xs:p-3 sm:p-4.5 md:p-5 shadow-2xs transition-all duration-300 hover:shadow-xs hover:border-emerald-300 min-h-24 xs:min-h-28 sm:min-h-32">
        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-emerald-100/80 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">Active Execution</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-2xs">
            <Zap className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-emerald-950 leading-tight">
            {activeExecutionCount} / {providers.length} Active
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-emerald-700">
            {activeExecutionPercentage}% siap dispatch
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAINTENANCE ALERTS (REFINED ROSE CARD)                    */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-rose-200/90 bg-rose-50/40 p-2.5 xs:p-3 sm:p-4.5 md:p-5 shadow-2xs transition-all duration-300 hover:shadow-xs hover:border-rose-300 min-h-24 xs:min-h-28 sm:min-h-32">
        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-rose-100/80 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-rose-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
              <span className="truncate">Maintenance</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-rose-200 bg-rose-100 text-rose-700 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-rose-950 leading-tight">
            {maintenanceCount} Provider
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-rose-700">
            {maintenanceCount === 0 ? "Tidak ada perbaikan" : "Sedang perbaikan aktif"}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. PROVIDER HEALTH (LUMINOUS TEAL CARD)                      */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-white/90 to-emerald-50/70 p-2.5 xs:p-3 sm:p-4.5 md:p-5 shadow-2xs transition-all duration-300 hover:shadow-xs hover:border-teal-300 min-h-24 xs:min-h-28 sm:min-h-32">
        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-teal-100/90 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-teal-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
              <span className="truncate">Sistem Health</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-teal-200 bg-teal-100 text-teal-700 shadow-2xs">
            <HeartPulse className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-teal-950 leading-tight">
            {aggregateHealth}
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-teal-700">
            {aggregateHealth === "HEALTHY" ? "Semua sistem prima" : "Pemeriksaan sistem"}
          </p>
        </div>
      </div>
    </section>
  );
}

