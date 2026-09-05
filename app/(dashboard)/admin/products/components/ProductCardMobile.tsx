"use client";
import React from "react";
import { Edit3, Trash2, Lock, Unlock, Loader2, Check } from "lucide-react";

export interface ProductFinancials {
  hargaJualAsli: number;
  diskonPersen: number;
  nominalDiskon: number;
  hargaSetelahDiskon: number;
  cbNominal: number;
  profitBersih: number;
  textShare: string;
}

export interface ProductItem {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  cost?: number | null;
  margin_item?: number | null;
  discount?: number | null;
  cashback?: number | null;
  promo_label?: string | null;
  sub_brand?: string | null;
  provider?: string | null;
  is_active?: boolean | null;
  stock?: number | null;
  lock_margin?: boolean | null;
  is_storefront_eligible?: boolean | null;
  categories?: { name?: string } | null;
  brands?: { name?: string } | null;
}

export interface ProductCardMobileProps {
  item: ProductItem;
  financials: ProductFinancials;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (item: ProductItem) => void;
  onDelete: (id: string, name: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onToggleLock: (id: string, currentLock: boolean) => void;
  onQuickUpdate: (id: string, field: string, value: string | number | boolean) => void;
  quickEditing: { id: string; field: string } | null;
  quickValue: string | number;
  setQuickEditing: (val: { id: string; field: string } | null) => void;
  setQuickValue: (val: string | number) => void;
  isTogglingActive: boolean;
}

function ProductCardMobile({
  item,
  financials,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleLock,
  onQuickUpdate,
  quickEditing,
  quickValue,
  setQuickEditing,
  setQuickValue,
  isTogglingActive,
}: ProductCardMobileProps) {
  const isEditingPromo = quickEditing?.id === item.id && quickEditing?.field === "promo_label";
  const isActive = item.is_active ?? true;
  const isStockCritical = (item.stock ?? 0) <= 5;
  const isStockLow = (item.stock ?? 0) <= 10;
  const isLowProfit = financials.profitBersih < 1000 || financials.cbNominal > financials.profitBersih;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-3.5 space-y-3 ${
        !isActive
          ? "bg-slate-50/80 border-slate-200 opacity-80"
          : isStockCritical
          ? "bg-rose-50/40 border-rose-200"
          : isSelected
          ? "bg-blue-50/50 border-blue-300 shadow-sm"
          : "bg-white border-slate-200 shadow-xs"
      }`}
    >
      {/* HEADER: Selection, Provider, Status, Lock */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2.5">
          {/* Accessible Touch Checkbox */}
          <label
            className="min-w-11 min-h-11 -ml-2 -my-2 flex items-center justify-center cursor-pointer"
            aria-label={`Pilih produk ${item.name}`}
          >
            <input
              type="checkbox"
              className="w-5 h-5 accent-rose-500 cursor-pointer rounded"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              aria-label={`Pilih produk ${item.name}`}
            />
          </label>

          {/* Provider Badge */}
          <span
            className={`text-[9px] font-bold px-2 py-1 rounded-md border tracking-wider ${
              item.provider === "UNIPLAY"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : item.provider === "MANUAL"
                ? "bg-slate-100 text-slate-700 border-slate-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {item.provider || "DIGIFLAZZ"}
          </span>

          {/* Sub Brand */}
          {item.sub_brand && (
            <span className="text-[7px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md truncate max-w-22.5">
              {item.sub_brand}
            </span>
          )}
        </div>

        {/* Lock Margin & Active Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleLock(item.id, Boolean(item.lock_margin))}
            className={`min-w-11 min-h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              item.lock_margin
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : "bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-600"
            }`}
            aria-label={item.lock_margin ? "Buka gembok margin" : "Kunci margin"}
            title={item.lock_margin ? "Margin Dikunci (LOCK)" : "Margin Bebas (UNLOCK)"}
          >
            {item.lock_margin ? <Lock size={15} strokeWidth={2.5} /> : <Unlock size={15} />}
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              disabled={isTogglingActive}
              onClick={() => onToggleActive(item.id, isActive)}
              className={`min-h-8 px-2.5 flex items-center justify-center rounded-xl text-[8px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                isTogglingActive
                  ? "opacity-50 cursor-wait bg-slate-100 text-slate-400 border border-slate-200"
                  : isActive
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 active:scale-95"
                  : "bg-slate-200 text-slate-600 border border-slate-300 active:scale-95"
              }`}
              aria-label={isActive ? "Nonaktifkan produk" : "Aktifkan produk"}
              title={isActive ? "Klik untuk Nonaktifkan" : "Klik untuk Aktifkan"}
            >
              {isTogglingActive ? (
                <Loader2 size={12} className="animate-spin" />
              ) : isActive ? (
                "AKTIF"
              ) : (
                "NONAKTIF"
              )}
            </button>
            {isActive ? (
              item.is_storefront_eligible ? (
                <span className="text-[6.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-1 py-0.2 rounded leading-tight">
                  TAYANG
                </span>
              ) : (
                <span className="text-[6.5px] font-bold text-amber-600 bg-amber-50 border border-amber-200/80 px-1 py-0.2 rounded leading-tight" title="Provider belum Live">
                  OFFLINE
                </span>
              )
            ) : null}
          </div>
        </div>
      </div>

      {/* IDENTITY: Name, SKU, Category/Brand, Stock */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-[12px] font-black text-slate-900 tracking-tight leading-snug wrap-break-word uppercase">
              {item.name}
            </h4>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
              {item.categories?.name || "-"} / {item.brands?.name || "-"}
            </p>
          </div>

          {/* Stock Badge */}
          <span
            className={`text-[8px] font-black px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap shrink-0 ${
              isStockCritical
                ? "bg-rose-600 text-white animate-pulse"
                : isStockLow
                ? "bg-rose-100 text-rose-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isStockCritical ? `⚠️ KRITIS: ${item.stock}` : `STOK: ${item.stock}`}
          </span>
        </div>

        {/* SKU & Promo Label Row */}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[8px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
            SKU: {item.sku || "-"}
          </span>

          {isEditingPromo ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                className="bg-amber-500 text-white px-2 py-1 rounded text-xs font-semibold outline-none w-24 uppercase"
                value={quickValue}
                onChange={(e) => setQuickValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onQuickUpdate(item.id, "promo_label", quickValue);
                  } else if (e.key === "Escape") {
                    setQuickEditing(null);
                  }
                }}
                aria-label="Edit label promo"
              />
              <button
                type="button"
                onClick={() => onQuickUpdate(item.id, "promo_label", quickValue)}
                className="min-h-11 min-w-11 flex items-center justify-center p-1 bg-amber-600 text-white rounded cursor-pointer"
                aria-label="Simpan label promo"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuickEditing({ id: item.id, field: "promo_label" });
                setQuickValue(item.promo_label || "");
              }}
              className="text-[7px] font-black uppercase px-2 py-1 rounded border transition-colors cursor-pointer min-h-8 flex items-center"
              aria-label="Ubah label promo"
              title="Ketuk untuk ubah promo label"
            >
              {item.promo_label ? (
                <span className="bg-amber-100 text-amber-700 border-amber-200 px-1.5 py-0.5 rounded">
                  🏷️ {item.promo_label}
                </span>
              ) : (
                <span className="text-slate-400 font-medium bg-slate-100 border-slate-200 px-1.5 py-0.5 rounded">
                  + Label Promo
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* FINANCIAL METRICS GRID (2x2) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50/90 rounded-xl p-2.5 border border-slate-100 text-[9px]">
        {/* Modal (Cost) */}
        <div className="flex flex-col">
          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Modal</span>
          <span className="font-bold text-rose-600">Rp {item.cost?.toLocaleString() || "0"}</span>
        </div>

        {/* Harga Jual */}
        <div className="flex flex-col">
          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Harga Jual</span>
          <div className="flex items-baseline gap-1">
            {financials.diskonPersen > 0 && (
              <span className="text-[7px] text-slate-400 line-through">
                Rp {financials.hargaJualAsli.toLocaleString()}
              </span>
            )}
            <span className={`font-black ${financials.diskonPersen > 0 ? "text-emerald-600" : "text-slate-900"}`}>
              Rp {financials.hargaSetelahDiskon.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Margin */}
        <div className="flex flex-col pt-1 border-t border-slate-200/60">
          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Margin</span>
          <span className="font-black text-emerald-600 flex items-center gap-1">
            {item.margin_item ?? 0}%
            <span className="text-[7px] text-slate-400 font-medium">
              (Rp {(financials.hargaJualAsli - (item.cost || 0)).toLocaleString()})
            </span>
          </span>
        </div>

        {/* Net Profit */}
        <div className="flex flex-col pt-1 border-t border-slate-200/60">
          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Net Profit</span>
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`font-black ${isLowProfit ? "text-rose-600" : "text-blue-600"}`}>
              Rp {financials.profitBersih.toLocaleString()}
            </span>
            {isLowProfit && (
              <span className="text-[6px] font-black uppercase px-1 rounded bg-rose-600 text-white">
                {financials.cbNominal > financials.profitBersih ? "CB BOCOR!" : "LOW"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS (Min 44px Touch Targets) */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="min-h-11 px-4 flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[9px] font-black transition-all active:scale-95 cursor-pointer"
          aria-label={`Edit data produk ${item.name}`}
        >
          <Edit3 size={13} /> EDIT
        </button>

        <button
          type="button"
          onClick={() => onDelete(item.id, item.name)}
          className="min-h-11 px-4 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[9px] font-black transition-all active:scale-95 cursor-pointer"
          aria-label={`Hapus produk ${item.name}`}
        >
          <Trash2 size={13} /> HAPUS
        </button>
      </div>
    </div>
  );
}

export default React.memo(ProductCardMobile, (prevProps, nextProps) => {
  // Check if item reference or direct visual properties changed
  if (prevProps.item !== nextProps.item) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isTogglingActive !== nextProps.isTogglingActive) return false;
  if (prevProps.financials !== nextProps.financials) return false;

  // Check quick editing state for this card
  const prevIsEditing = prevProps.quickEditing?.id === prevProps.item.id;
  const nextIsEditing = nextProps.quickEditing?.id === nextProps.item.id;
  if (prevIsEditing !== nextIsEditing) return false;
  if (nextIsEditing && prevProps.quickValue !== nextProps.quickValue) return false;

  return true;
});
