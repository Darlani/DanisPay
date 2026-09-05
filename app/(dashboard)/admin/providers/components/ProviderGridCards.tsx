"use client";

import React from "react";
import { RefreshCw, Layers } from "lucide-react";
import {
  ProviderData,
  ToggleField,
  formatRupiah,
  BRAND_METRICS,
  PROVIDER_SYNC_CAPABILITIES,
} from "../types";
import ProviderAvatar from "./ProviderAvatar";
import ProviderToggle from "./ProviderToggle";
import ProviderHealthBadge from "./ProviderHealthBadge";

interface ProviderGridCardsProps {
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
}

export default function ProviderGridCards({
  providers,
  mutatingCode,
  refreshingBalanceCode,
  syncingCatalogCode,
  getCooldownSeconds,
  onToggle,
  onRefreshBalance,
  onSyncCatalog,
}: ProviderGridCardsProps) {
  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {providers.map((p) => {
        const isMutating = mutatingCode?.startsWith(`${p.code}:`);
        const isRefreshingBalance = refreshingBalanceCode === p.code;
        const isSyncingCatalog = syncingCatalogCode === p.code;
        const cooldownSec = getCooldownSeconds(p.code);
        const execLocked = !p.is_enabled || !p.is_configured || p.is_maintenance;
        const catalogLocked = !p.is_enabled;
        const hasCatalogSync = Boolean(PROVIDER_SYNC_CAPABILITIES[p.code]);
        const syncLocked =
          !p.is_enabled ||
          !p.is_catalog_enabled ||
          p.is_maintenance ||
          isSyncingCatalog;
        const brandMeta = BRAND_METRICS[p.code] || {
          initial: p.name.charAt(0).toUpperCase(),
          gradient: "from-blue-600 to-indigo-600 text-white shadow-blue-500/20",
          subtitle: p.description || "Vendor digital goods",
        };

        return (
          <div
            key={p.code}
            className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            {/* Top: Avatar, Name, Status, Health */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ProviderAvatar code={p.code} meta={brandMeta} size="lg" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base tracking-tight">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500">{brandMeta.subtitle}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {p.is_configured ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Standby
                  </span>
                )}
                <ProviderHealthBadge status={p.health_status} />
              </div>
            </div>

            {/* Operational Balance Row */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Saldo Operasional
                </span>
                <div className="font-mono text-base font-bold text-slate-900 tracking-tight">
                  {formatRupiah(p.balance)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onRefreshBalance(p.code)}
                disabled={isRefreshingBalance || cooldownSec > 0}
                aria-label={`Refresh balance ${p.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw
                  size={14}
                  className={`text-slate-500 ${
                    isRefreshingBalance ? "animate-spin text-blue-600" : ""
                  }`}
                />
              </button>
            </div>

            {/* Toggle Controls Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60">
                <span className="text-slate-700 font-medium">Koneksi</span>
                <ProviderToggle
                  checked={p.is_enabled}
                  disabled={isMutating}
                  onClick={() =>
                    void onToggle(p.code, "is_enabled", p.is_enabled)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60">
                <span className="text-slate-700 font-medium">Live</span>
                <ProviderToggle
                  checked={p.is_storefront_visible ?? true}
                  disabled={!p.is_enabled || isMutating}
                  onClick={() =>
                    void onToggle(
                      p.code,
                      "is_storefront_visible",
                      p.is_storefront_visible ?? true
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60">
                <span className="text-slate-700 font-medium">Auto Sync</span>
                <ProviderToggle
                  checked={p.is_catalog_enabled}
                  disabled={catalogLocked || isMutating}
                  onClick={() =>
                    void onToggle(
                      p.code,
                      "is_catalog_enabled",
                      p.is_catalog_enabled
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60">
                <span className="text-slate-700 font-medium">Proses</span>
                <ProviderToggle
                  checked={p.is_execution_enabled}
                  disabled={execLocked || isMutating}
                  onClick={() =>
                    void onToggle(
                      p.code,
                      "is_execution_enabled",
                      p.is_execution_enabled
                    )
                  }
                />
              </div>
            </div>

            {/* Bottom: Maintenance & Action buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ProviderToggle
                  checked={p.is_maintenance}
                  disabled={isMutating}
                  variant="amber"
                  onClick={() =>
                    void onToggle(
                      p.code,
                      "is_maintenance",
                      p.is_maintenance
                    )
                  }
                />
                <span className="text-xs text-slate-500 font-medium">
                  Maint
                </span>
              </div>

              {hasCatalogSync && (
                <button
                  type="button"
                  onClick={() => void onSyncCatalog(p.code)}
                  disabled={syncLocked}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Layers size={13} />
                  <span>Sync Katalog</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

