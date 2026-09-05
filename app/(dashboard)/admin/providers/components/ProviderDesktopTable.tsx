"use client";

import React from "react";
import {
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  ProviderData,
  ToggleField,
  SelectedError,
  formatRupiah,
  formatDateTime,
  BRAND_METRICS,
  PROVIDER_SYNC_CAPABILITIES,
} from "../types";
import ProviderAvatar from "./ProviderAvatar";
import ProviderToggle from "./ProviderToggle";
import ProviderHealthBadge from "./ProviderHealthBadge";

interface ProviderDesktopTableProps {
  providers: ProviderData[];
  mutatingCode: string | null;
  refreshingBalanceCode: string | null;
  syncingCatalogCode: string | null;
  getCooldownSeconds: (code: string) => number;
  onToggle: (
    code: string,
    field: ToggleField,
    currentValue: boolean
  ) => Promise<void>;
  onRefreshBalance: (code: string) => Promise<void>;
  onSyncCatalog: (code: string) => Promise<void>;
  onSelectError: (err: SelectedError) => void;
  isSandboxMode?: boolean;
}

export default function ProviderDesktopTable({
  providers,
  mutatingCode,
  refreshingBalanceCode,
  syncingCatalogCode,
  getCooldownSeconds,
  onToggle,
  onRefreshBalance,
  onSyncCatalog,
  onSelectError,
  isSandboxMode = false,
}: ProviderDesktopTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-215 table-fixed text-left text-xs">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="py-2.5 sm:py-3.5 px-3 font-bold text-center">
              Provider
            </th>
            <th className="px-1 py-2.5 sm:py-3.5 font-bold text-center">
              Status
            </th>
            <th className="px-1 py-2.5 sm:py-3.5 font-bold text-center">
              Koneksi
            </th>
            <th className="px-1 py-2.5 sm:py-3.5 font-bold text-center">
              Live
            </th>
            <th className="px-1 py-2.5 sm:py-3.5 font-bold text-center">
              Auto Sync
            </th>
            <th className="px-1 py-2.5 sm:py-3.5 font-bold text-center">
              <span className="inline-flex items-center gap-1 justify-center">
                Proses
                {isSandboxMode && (
                  <span
                    className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-800"
                    title="Mode Sandbox Toko Aktif: Dispatch riil dilewati"
                  >
                    sim
                  </span>
                )}
              </span>
            </th>
            <th className="px-1 py-2.5 sm:py-3.5 font-bold text-center">
              Maint
            </th>
            <th className="px-1 py-2.5 sm:py-3.5 font-bold text-center">
              Sync
            </th>
            <th className="px-2 py-2.5 sm:py-3.5 font-bold text-center">
              Saldo
            </th>
            <th className="py-2.5 sm:py-3.5 px-3 font-bold text-center">
              Last Sync
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {providers.map((p) => {
            const isMutating = mutatingCode?.startsWith(`${p.code}:`);
            const isRefreshingBalance = refreshingBalanceCode === p.code;
            const isSyncingCatalog = syncingCatalogCode === p.code;
            const cooldownSec = getCooldownSeconds(p.code);
            const execLocked =
              !p.is_enabled || !p.is_configured || p.is_maintenance;
            const catalogLocked = !p.is_enabled;
            const hasCatalogSync = Boolean(
              PROVIDER_SYNC_CAPABILITIES[p.code]
            );
            const syncLocked =
              !p.is_enabled ||
              !p.is_catalog_enabled ||
              p.is_maintenance ||
              isSyncingCatalog;
            const brandMeta = BRAND_METRICS[p.code] || {
              initial: p.name.charAt(0).toUpperCase(),
              gradient:
                "from-blue-600 to-indigo-600 text-white shadow-blue-500/20",
              subtitle: p.description || "Vendor digital goods",
            };

            return (
              <tr
                key={p.code}
                className="group transition hover:bg-slate-50/80"
              >
                {/* 1. PROVIDER IDENTIFIER */}
                <td className="whitespace-nowrap py-2.5 sm:py-3 pl-3 sm:pl-4 pr-2 align-middle">
                  <div className="flex items-center gap-2.5">
                    <ProviderAvatar
                      code={p.code}
                      meta={brandMeta}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] sm:text-xs font-bold text-slate-900 leading-tight truncate">
                        {p.name}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] text-slate-400 truncate">
                        {brandMeta.subtitle}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. STATUS + HEALTH (GABUNGAN) */}
                <td className="whitespace-nowrap px-1 py-2.5 sm:py-3 text-center align-middle">
                  <div className="flex flex-col items-center justify-center gap-1">
                    {p.is_configured ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-emerald-700 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-amber-700 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Standby
                      </span>
                    )}
                    <ProviderHealthBadge status={p.health_status} />
                  </div>
                </td>

                {/* 3. KONEKSI (is_enabled) */}
                <td className="whitespace-nowrap px-1 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_enabled}
                    disabled={isMutating}
                    ariaLabel={`Koneksi provider ${p.name}`}
                    onClick={() =>
                      void onToggle(p.code, "is_enabled", p.is_enabled)
                    }
                  />
                </td>

                {/* 4. LIVE (is_storefront_visible) */}
                <td className="whitespace-nowrap px-1 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_storefront_visible ?? true}
                    disabled={!p.is_enabled || isMutating}
                    ariaLabel={`Tayang etalase live ${p.name}`}
                    onClick={() =>
                      void onToggle(
                        p.code,
                        "is_storefront_visible",
                        p.is_storefront_visible ?? true
                      )
                    }
                  />
                </td>

                {/* 5. AUTO SYNC (is_catalog_enabled) */}
                <td className="whitespace-nowrap px-1 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_catalog_enabled}
                    disabled={catalogLocked || isMutating}
                    ariaLabel={`Auto sync katalog ${p.name}`}
                    onClick={() =>
                      void onToggle(
                        p.code,
                        "is_catalog_enabled",
                        p.is_catalog_enabled
                      )
                    }
                  />
                </td>

                {/* 6. PROSES (is_execution_enabled) */}
                <td className="whitespace-nowrap px-1 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_execution_enabled}
                    disabled={execLocked || isMutating}
                    ariaLabel={`Proses otomatis dispatch ${p.name}`}
                    onClick={() =>
                      void onToggle(
                        p.code,
                        "is_execution_enabled",
                        p.is_execution_enabled
                      )
                    }
                  />
                </td>

                {/* 7. MAINT (is_maintenance) */}
                <td className="whitespace-nowrap px-1 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_maintenance}
                    disabled={isMutating}
                    variant="amber"
                    ariaLabel={`Mode maintenance ${p.name}`}
                    onClick={() =>
                      void onToggle(
                        p.code,
                        "is_maintenance",
                        p.is_maintenance
                      )
                    }
                  />
                </td>

                {/* 8. SYNC MANUAL (DI ANTARA MAINT DAN SALDO) */}
                <td className="whitespace-nowrap px-1 py-2.5 sm:py-3 text-center align-middle">
                  {hasCatalogSync ? (
                    <button
                      type="button"
                      onClick={() => void onSyncCatalog(p.code)}
                      disabled={syncLocked}
                      title={
                        !p.is_enabled
                          ? "Aktifkan koneksi provider terlebih dahulu"
                          : !p.is_catalog_enabled
                          ? "Aktifkan Auto Sync terlebih dahulu"
                          : p.is_maintenance
                          ? "Provider sedang dalam mode maintenance"
                          : isSyncingCatalog
                          ? "Sedang menyinkronkan data katalog produk..."
                          : `Tarik data katalog produk dari ${p.name}`
                      }
                      aria-label={`Sinkronisasi produk ${p.name}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-[10px] font-bold text-blue-700 shadow-2xs hover:bg-blue-100 hover:border-blue-300 transition active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw
                        size={10}
                        className={
                          isSyncingCatalog
                            ? "animate-spin text-blue-600"
                            : "text-blue-600"
                        }
                      />
                      <span>{isSyncingCatalog ? "Sync..." : "Sync"}</span>
                    </button>
                  ) : (
                    <span
                      className="text-[11px] text-slate-300 font-medium select-none"
                      title="Provider ini tidak mendukung sinkronisasi katalog via API"
                    >
                      -
                    </span>
                  )}
                </td>

                {/* 9. SALDO OPERASIONAL */}
                <td className="whitespace-nowrap px-2 py-2.5 sm:py-3 text-right align-middle">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <span className="font-mono text-[11.5px] sm:text-xs font-black text-slate-900 tracking-tight">
                      {formatRupiah(p.balance)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onRefreshBalance(p.code)}
                      disabled={isRefreshingBalance || cooldownSec > 0}
                      title={
                        cooldownSec > 0
                          ? `Tunggu ${cooldownSec} detik`
                          : `Periksa saldo terkini dari ${p.name}`
                      }
                      aria-label={`Refresh balance ${p.name}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition active:scale-95 cursor-pointer shadow-2xs disabled:opacity-40"
                    >
                      <RefreshCw
                        size={11}
                        className={
                          isRefreshingBalance
                            ? "animate-spin text-blue-600"
                            : "text-slate-400"
                        }
                      />
                    </button>
                  </div>
                </td>

                {/* 10. LAST SYNC & TELEMETRI (RATA KANAN) */}
                <td className="whitespace-nowrap py-2.5 sm:py-3 pl-1.5 pr-2.5 sm:pr-3 text-right align-middle">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <div className="min-w-0 text-right">
                      <div className="font-mono text-[10.5px] sm:text-[11px] font-semibold text-slate-700 leading-tight">
                        {p.last_sync_at ? formatDateTime(p.last_sync_at) : "-"}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {p.last_sync_status === "SUCCESS" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[9px] text-emerald-700 font-semibold">
                              Sukses
                            </span>
                          </>
                        ) : p.last_error ? (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectError({
                                code: p.code,
                                name: p.name,
                                error: p.last_error || "Unknown error",
                                time: p.last_sync_at,
                              })
                            }
                            className="inline-flex items-center justify-end gap-1 text-[9px] text-rose-600 hover:text-rose-800 underline max-w-32.5 truncate cursor-pointer font-medium"
                          >
                            <AlertCircle
                              size={9}
                              className="shrink-0 text-rose-500"
                            />
                            <span className="truncate">
                              Err: {p.last_error}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400">
                            Belum ada data
                          </span>
                        )}
                      </div>
                    </div>
                    <Clock size={12} className="text-slate-400 shrink-0" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

