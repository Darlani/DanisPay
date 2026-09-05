"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  AlertCircle,
  MoreVertical,
  Layers,
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
}: ProviderDesktopTableProps) {
  const [activeMenuCode, setActiveMenuCode] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close active action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuCode(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="overflow-x-auto scrollbar-none sm:overflow-visible">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="py-2.5 sm:py-3.5 pl-3 sm:pl-4 pr-1 sm:pr-2 lg:pr-3 font-bold">
              Provider
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              Status
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              <span className="block text-slate-500">Koneksi</span>
              <span className="text-[8.5px] text-slate-400 font-normal">
                Provider
              </span>
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              <span className="block text-slate-500">Tayang</span>
              <span className="text-[8.5px] text-slate-400 font-normal">
                Di Etalase
              </span>
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              <span className="block text-slate-500">Sinkronisasi</span>
              <span className="text-[8.5px] text-slate-400 font-normal">
                Produk
              </span>
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              <span className="block text-slate-500">Sinkron</span>
              <span className="text-[8.5px] text-slate-400 font-normal">
                Otomatis
              </span>
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              <span className="block text-slate-500">Proses</span>
              <span className="text-[8.5px] text-slate-400 font-normal">
                Otomatis
              </span>
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              <span className="block text-slate-500">Maintenance</span>
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-right">
              <span className="block text-slate-500">Saldo</span>
              <span className="text-[8.5px] text-slate-400 font-normal">
                Operasional
              </span>
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-center">
              Health
            </th>
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold">
              Last Sync & Telemetri
            </th>
            <th className="py-2.5 sm:py-3.5 pl-1 sm:pl-2 pr-3 sm:pr-4 font-bold text-center">
              Aksi
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
                <td className="whitespace-nowrap py-2.5 sm:py-3 pl-3 sm:pl-4 pr-1 sm:pr-2 lg:pr-3 align-middle">
                  <div className="flex items-center gap-2.5">
                    <ProviderAvatar
                      code={p.code}
                      meta={brandMeta}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-[11.5px] sm:text-xs font-bold text-slate-900 leading-tight">
                        {p.name}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] text-slate-400 truncate max-w-35 sm:max-w-45">
                        {brandMeta.subtitle}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. STATUS (Ready / Standby) */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
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
                </td>

                {/* 3. KONEKSI PROVIDER (is_enabled) */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
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

                {/* 4. TAYANG DI ETALASE (is_storefront_visible) */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_storefront_visible ?? true}
                    disabled={!p.is_enabled || isMutating}
                    ariaLabel={`Tayang di etalase ${p.name}`}
                    onClick={() =>
                      void onToggle(
                        p.code,
                        "is_storefront_visible",
                        p.is_storefront_visible ?? true
                      )
                    }
                  />
                </td>

                {/* 5. SINKRONISASI PRODUK (is_catalog_enabled) */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_catalog_enabled}
                    disabled={catalogLocked || isMutating}
                    ariaLabel={`Sinkronisasi produk ${p.name}`}
                    onClick={() =>
                      void onToggle(
                        p.code,
                        "is_catalog_enabled",
                        p.is_catalog_enabled
                      )
                    }
                  />
                </td>

                {/* 6. SINKRON OTOMATIS */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderToggle
                    size="sm"
                    checked={p.is_catalog_enabled && p.is_enabled}
                    disabled={true}
                    ariaLabel={`Sinkronisasi otomatis ${p.name}`}
                    title="Sinkronisasi berkala sesuai jadwal otomatis vendor"
                  />
                </td>

                {/* 7. PROSES OTOMATIS (is_execution_enabled) */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
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

                {/* 8. MAINTENANCE (is_maintenance) */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
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

                {/* 9. SALDO OPERASIONAL */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-right align-middle">
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

                {/* 10. HEALTH */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-center align-middle">
                  <ProviderHealthBadge status={p.health_status} />
                </td>

                {/* 11. LAST SYNC & TELEMETRI */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-left align-middle">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-mono text-[10.5px] sm:text-[11px] font-semibold text-slate-700 leading-tight">
                        {p.last_sync_at ? formatDateTime(p.last_sync_at) : "-"}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {p.last_sync_status === "SUCCESS" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[9px] text-emerald-700 font-semibold">
                              Sukses (1.2s)
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
                            className="inline-flex items-center gap-1 text-[9px] text-rose-600 hover:text-rose-800 underline max-w-[120px] truncate cursor-pointer font-medium"
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
                  </div>
                </td>

                {/* 12. AKSI MENU */}
                <td className="whitespace-nowrap py-2.5 sm:py-3 pl-1 sm:pl-2 pr-3 sm:pr-4 text-center align-middle relative">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuCode(
                          activeMenuCode === p.code ? null : p.code
                        );
                      }}
                      aria-label={`Opsi untuk ${p.name}`}
                      className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <MoreVertical size={13} />
                    </button>

                    {/* ACTION DROPDOWN */}
                    {activeMenuCode === p.code && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-9 z-30 w-44 rounded-2xl border border-slate-200 bg-white shadow-2xl p-1 text-xs text-slate-700 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuCode(null);
                            void onRefreshBalance(p.code);
                          }}
                          disabled={isRefreshingBalance || cooldownSec > 0}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer font-medium"
                        >
                          <RefreshCw size={13} className="text-blue-600" />
                          <span>Periksa Saldo</span>
                        </button>

                        {hasCatalogSync && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuCode(null);
                              void onSyncCatalog(p.code);
                            }}
                            disabled={syncLocked}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer font-medium"
                          >
                            <Layers size={13} className="text-emerald-600" />
                            <span>Sinkron Katalog</span>
                          </button>
                        )}

                        {p.last_error && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuCode(null);
                              onSelectError({
                                code: p.code,
                                name: p.name,
                                error: p.last_error || "Unknown error",
                                time: p.last_sync_at,
                              });
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 text-rose-600 hover:text-rose-800 transition-colors cursor-pointer font-medium"
                          >
                            <AlertCircle size={13} />
                            <span>Lihat Log Error</span>
                          </button>
                        )}
                      </div>
                    )}
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

