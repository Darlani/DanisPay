'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  Copy,
  FlaskConical,
  Receipt,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

/**
 * Canonical Counter Cart Receipt Data Contracts (Batch B & C2)
 */
export interface CounterCartReceiptLine {
  lineId: string;
  productId: string;
  sku?: string;
  productName: string;
  customerNo: string;
  quantity: number;
  modalUnitPrice: number;
  modalLineTotal: number;
  sellingPrice: number;
  salesLineTotal: number;
  estimatedMargin: number;
  cashbackPerUnit?: number;
  lineCashback?: number;
  simulatedSn: string;
  simulatedSns?: string[];
}

export interface CounterCartReceiptData {
  orderId: string;
  status: string;
  totalModal: number;
  totalSimulatedSales: number;
  totalEstimatedMargin: number;
  totalCashbackCoin: number;
  lines: CounterCartReceiptLine[];
  resolvedAt?: string;
  simulatedMemberType?: string;
  remainingBalance?: number;
  remainingCoin?: number;
  message?: string;
}

export type ReceiptPresentationMode = 'customer' | 'reseller';

export interface CounterCartReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: CounterCartReceiptData | null;
  allowSelection?: boolean;
  initialMode?: ReceiptPresentationMode;
}

/**
 * Resolves SNs per unit defensively:
 * 1. If simulatedSns exists and has items, use simulatedSns
 * 2. Else if simulatedSn exists, use [simulatedSn]
 * 3. Else fallback to empty array
 * Never invents new SNs on the client.
 */
export function resolveLineSns(line: { simulatedSn?: string; simulatedSns?: string[] }): string[] {
  if (Array.isArray(line.simulatedSns) && line.simulatedSns.length > 0) {
    return line.simulatedSns.filter((s) => typeof s === 'string' && s.trim().length > 0);
  }
  if (line.simulatedSn && typeof line.simulatedSn === 'string' && line.simulatedSn.trim().length > 0) {
    return [line.simulatedSn.trim()];
  }
  return [];
}

/**
 * Generates formatted plain text for copying to WhatsApp.
 * Strictly adheres to canonical specs:
 * - Mode 'customer':
 *   • Header: *BUKTI SIMULASI — STRUK PELANGGAN*
 *   • Strictly customer-safe fields only (no modal, margin, cashback, or balance)
 *   • Mandatory simulation disclaimer
 * - Mode 'reseller':
 *   • Header: *REKAP PEMBUKUAN KASIR*
 *   • Internal bookkeeping with modal, margin, and cashback
 * - Multi-unit SN formatting:
 *   • Qty 1: SN: SN...
 *   • Qty > 1:
 *     SN:
 *     • Unit 1: SN...
 *     • Unit 2: SN...
 * - Receives activeLinesOverride to guarantee zero leakage when a subset is selected.
 */
export function generateWhatsAppReceiptText(
  receipt: CounterCartReceiptData,
  activeLinesOverride?: CounterCartReceiptLine[],
  mode: ReceiptPresentationMode = 'customer'
): string {
  const linesToRender = activeLinesOverride ?? receipt.lines;
  if (linesToRender.length === 0) return '';

  const isFull = linesToRender.length === receipt.lines.length;
  const totalModal = isFull
    ? receipt.totalModal
    : linesToRender.reduce((acc, l) => acc + (l.modalLineTotal || 0), 0);
  const totalSales = isFull
    ? receipt.totalSimulatedSales
    : linesToRender.reduce((acc, l) => acc + (l.salesLineTotal || 0), 0);
  const totalMargin = isFull
    ? receipt.totalEstimatedMargin
    : linesToRender.reduce((acc, l) => acc + (l.estimatedMargin || 0), 0);
  const totalCashback = isFull
    ? receipt.totalCashbackCoin
    : linesToRender.reduce((acc, l) => acc + (l.lineCashback || 0), 0);

  const dateObj = receipt.resolvedAt ? new Date(receipt.resolvedAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeDisplay = `${dateStr} ${timeStr} WIB`;

  if (mode === 'customer') {
    const linesFormatted = linesToRender
      .map((line, idx) => {
        const qtyLine = line.quantity > 1 ? `\nQty: ${line.quantity}` : `\nQty: 1`;
        const sns = resolveLineSns(line);
        let snSection = 'SN: -';
        if (sns.length > 1) {
          snSection = `SN:\n${sns.map((s, i) => `• Unit ${i + 1}: ${s}`).join('\n')}`;
        } else if (sns.length === 1) {
          snSection = `SN: ${sns[0]}`;
        }

        return `${idx + 1}. ${line.productName}
Tujuan: ${line.customerNo}${qtyLine}
${snSection}
Harga: Rp${line.salesLineTotal.toLocaleString('id-ID')}`;
      })
      .join('\n\n────────────────────\n\n');

    return `*BUKTI SIMULASI — STRUK PELANGGAN*

Status: BERHASIL
Simulasi Sandbox DaPay — Bukan transaksi riil

Invoice: #${receipt.orderId}
Waktu: ${timeDisplay}

────────────────────

${linesFormatted}

────────────────────

*TOTAL PEMBAYARAN: Rp${totalSales.toLocaleString('id-ID')}*

*Struk simulasi untuk latihan konter/reseller. Bukan bukti pembayaran riil.*`;
  }

  // Reseller Mode (Internal Cashier Bookkeeping)
  const marginSign = totalMargin > 0 ? '+' : totalMargin < 0 ? '-' : '';
  const formattedMargin = `${marginSign}Rp${Math.abs(totalMargin).toLocaleString('id-ID')}`;

  const linesFormatted = linesToRender
    .map((line, idx) => {
      const lineMarginSign = line.estimatedMargin > 0 ? '+' : line.estimatedMargin < 0 ? '-' : '';
      const lineFormattedMargin = `${lineMarginSign}Rp${Math.abs(line.estimatedMargin).toLocaleString('id-ID')}`;
      const qtyLine = line.quantity > 1 ? `\nQty: ${line.quantity}` : `\nQty: 1`;

      const sns = resolveLineSns(line);
      let snSection = 'SN Simulasi: -';
      if (sns.length > 1) {
        snSection = `SN Simulasi:\n${sns.map((s, i) => `• Unit ${i + 1}: ${s}`).join('\n')}`;
      } else if (sns.length === 1) {
        snSection = `SN Simulasi: ${sns[0]}`;
      }

      return `${idx + 1}. ${line.productName}
Tujuan: ${line.customerNo}${qtyLine}
${snSection}
Modal: Rp${line.modalLineTotal.toLocaleString('id-ID')} | Jual: Rp${line.salesLineTotal.toLocaleString('id-ID')}
Margin: ${lineFormattedMargin}`;
    })
    .join('\n\n────────────────────\n\n');

  const cashbackSection =
    totalCashback > 0
      ? `\nReward Koin Sandbox: +${totalCashback.toLocaleString('id-ID')} Koin`
      : '';

  return `*REKAP PEMBUKUAN KASIR*

Status: BERHASIL
Simulasi Sandbox DaPay — Catatan Usaha

Invoice: #${receipt.orderId}
Waktu: ${timeDisplay}

────────────────────

${linesFormatted}

────────────────────

Total Modal Simulasi: Rp${totalModal.toLocaleString('id-ID')}
Total Penjualan Simulasi: Rp${totalSales.toLocaleString('id-ID')}
Total Perkiraan Margin: ${formattedMargin}${cashbackSection}

Simulasi Sandbox DaPay — Bukan transaksi riil.`;
}

/**
 * Pure Presentational Counter Cart Receipt Modal.
 * Renders the execution outcome with dual presentation modes:
 * 1. 'customer': Struk Pelanggan (strict privacy: zero modal, margin, cashback, or balance)
 * 2. 'reseller': Rekap Kasir (internal bookkeeping with full financial auditability)
 * Supports optional selection mode (allowSelection=true) for Order History integration.
 */
export default function CounterCartReceiptModal({
  isOpen,
  onClose,
  receipt,
  initialMode = 'reseller',
}: CounterCartReceiptModalProps) {
  const [presentationMode, setPresentationMode] = useState<ReceiptPresentationMode>(initialMode);
  const [isCopiedReceipt, setIsCopiedReceipt] = useState<boolean>(false);
  const [isHandoffSuccess, setIsHandoffSuccess] = useState<boolean>(false);

  // Track modal session to initialize selection and mode when modal opens
  const [prevSessionKey, setPrevSessionKey] = useState<string>('');
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());

  const currentSessionKey = isOpen && receipt ? `${receipt.orderId}_${initialMode}` : '';
  if (currentSessionKey !== prevSessionKey) {
    setPrevSessionKey(currentSessionKey);
    if (isOpen && receipt) {
      setSelectedLineIds(new Set(receipt.lines.map((l) => l.lineId)));
      setPresentationMode(initialMode);
      setIsCopiedReceipt(false);
      setIsHandoffSuccess(false);
    }
  }

  // Active lines filtered by selectedLineIds
  const activeLines = useMemo(() => {
    if (!receipt) return [];
    return receipt.lines.filter((l) => selectedLineIds.has(l.lineId));
  }, [receipt, selectedLineIds]);

  // Distinct customer numbers in activeLines for single-customer isolation
  const distinctCustomerNos = useMemo(() => {
    const set = new Set<string>();
    for (const line of activeLines) {
      const clean = (line.customerNo || '').trim();
      if (clean) set.add(clean);
    }
    return set;
  }, [activeLines]);

  const isMultipleCustomersSelected = distinctCustomerNos.size > 1;

  if (!isOpen || !receipt) return null;

  const isFullBatch = activeLines.length === receipt.lines.length;

  // Dynamic totals based strictly on activeLines
  const totalModal = isFullBatch
    ? receipt.totalModal
    : activeLines.reduce((acc, l) => acc + (l.modalLineTotal || 0), 0);

  const totalSales = isFullBatch
    ? receipt.totalSimulatedSales
    : activeLines.reduce((acc, l) => acc + (l.salesLineTotal || 0), 0);

  const totalMargin = isFullBatch
    ? receipt.totalEstimatedMargin
    : activeLines.reduce((acc, l) => acc + (l.estimatedMargin || 0), 0);

  const totalCashback = isFullBatch
    ? receipt.totalCashbackCoin
    : activeLines.reduce((acc, l) => acc + (l.lineCashback || 0), 0);

  const totalQuantity = activeLines.reduce((acc, l) => acc + l.quantity, 0);

  // Customer WhatsApp handler: opens WhatsApp with prefilled text (direct handoff)
  const handleCustomerWhatsApp = () => {
    if (activeLines.length === 0 || isMultipleCustomersSelected || !receipt) return;
    const text = generateWhatsAppReceiptText(receipt, activeLines, 'customer');
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encodedText}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    setIsHandoffSuccess(true);
    setTimeout(() => {
      setIsHandoffSuccess(false);
    }, 2500);
  };

  // Reseller WhatsApp handler: clipboard only (internal bookkeeping)
  const handleResellerCopyWhatsApp = async () => {
    if (activeLines.length === 0 || !receipt) return;
    const text = generateWhatsAppReceiptText(receipt, activeLines, 'reseller');
    let copied = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setIsCopiedReceipt(true);
      setTimeout(() => {
        setIsCopiedReceipt(false);
      }, 2500);
    }
  };

  const formattedDate = (() => {
    const d = receipt.resolvedAt ? new Date(receipt.resolvedAt) : new Date();
    return `${d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })} ${d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })} WIB`;
  })();

  const handleToggleLine = (lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-cart-receipt-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg my-auto rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header: Badges, Title, Close Button */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-amber-900 border border-amber-300">
                <FlaskConical size={10} className="text-amber-700" />
                SIMULASI SANDBOX
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-900 border border-emerald-300">
                <CheckCircle2 size={10} className="text-emerald-700" />
                BERHASIL
              </span>
            </div>
            <h3
              id="counter-cart-receipt-title"
              className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2 pt-0.5"
            >
              <Receipt size={20} className="text-amber-600 shrink-0" />
              <span>
                {presentationMode === 'customer'
                  ? 'BUKTI TRANSAKSI SIMULASI • STRUK PELANGGAN'
                  : 'REKAP PEMBUKUAN KASIR'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Simulasi Sandbox DaPay — Bukan transaksi riil
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Struk"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audience Segmented Control Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold border border-slate-200/80">
          <button
            type="button"
            onClick={() => setPresentationMode('customer')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
              presentationMode === 'customer'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt size={14} className={presentationMode === 'customer' ? 'text-amber-600' : 'text-slate-400'} />
            <span>Struk Pelanggan</span>
          </button>
          <button
            type="button"
            onClick={() => setPresentationMode('reseller')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
              presentationMode === 'reseller'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FlaskConical size={14} className={presentationMode === 'reseller' ? 'text-amber-600' : 'text-slate-400'} />
            <span>Rekap Kasir</span>
          </button>
        </div>

        {/* Metadata Strip: Invoice & Timestamp */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 text-xs border border-slate-200/80">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              No. Invoice
            </span>
            <span className="font-mono font-bold text-slate-800">
              #{receipt.orderId}
            </span>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Waktu Transaksi
            </span>
            <span className="font-mono text-slate-700 text-[11px]">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Selection Toolbar (Rendered whenever multiple lines exist) */}
        {receipt.lines.length > 1 && (
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                <span>{presentationMode === 'customer' ? 'Pilih Pelanggan untuk Struk:' : 'Pilih Transaksi:'}</span>
                <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-900">
                  {selectedLineIds.size} dari {receipt.lines.length} terpilih
                </span>
              </span>
              <div className="flex items-center gap-2 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setSelectedLineIds(new Set(receipt.lines.map((l) => l.lineId)))}
                  disabled={selectedLineIds.size === receipt.lines.length}
                  className="font-bold text-blue-600 hover:text-blue-800 disabled:opacity-40 transition cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedLineIds(new Set())}
                  disabled={selectedLineIds.size === 0}
                  className="font-bold text-rose-600 hover:text-rose-800 disabled:opacity-40 transition cursor-pointer"
                >
                  Hapus Semua
                </button>
              </div>
            </div>

            {/* Interactive selection pills with destination */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {receipt.lines.map((line, idx) => {
                const isSelected = selectedLineIds.has(line.lineId);
                return (
                  <button
                    key={line.lineId || idx}
                    type="button"
                    onClick={() => handleToggleLine(line.lineId)}
                    aria-label={`Pilih transaksi ${line.productName} (${line.customerNo})`}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] border transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] border shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-black'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate max-w-35 sm:max-w-47.5 font-bold">{line.productName}</span>
                      <span className="text-[10px] font-mono opacity-80 truncate">
                        Tujuan: {line.customerNo}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Warning banner when multiple distinct customers are selected in Customer mode */}
            {presentationMode === 'customer' && isMultipleCustomersSelected && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-100/80 p-2.5 text-xs text-amber-950 border border-amber-300/90 animate-in fade-in duration-100">
                <AlertCircle size={15} className="text-amber-700 shrink-0" />
                <span className="font-semibold leading-snug">
                  Untuk struk pelanggan, pilih transaksi dari 1 pelanggan saja.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Itemized Lines Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
            <span>Rincian Produk ({activeLines.length} Baris):</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Total {totalQuantity} Item
            </span>
          </div>

          {activeLines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center space-y-3 my-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Receipt size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800">Belum Ada Transaksi Dipilih</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pilih minimal satu transaksi dari bilah pilihan di atas untuk menampilkan rincian struk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLineIds(new Set(receipt.lines.map((l) => l.lineId)))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-600 transition cursor-pointer shadow-xs"
              >
                <span>Pilih Semua Transaksi</span>
              </button>
            </div>
          ) : (
            <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {activeLines.map((line, idx) => {
                const lineMarginSign =
                  line.estimatedMargin > 0 ? '+' : line.estimatedMargin < 0 ? '-' : '';
                const formattedLineMargin = `${lineMarginSign}Rp ${Math.abs(
                  line.estimatedMargin
                ).toLocaleString('id-ID')}`;

                const sns = resolveLineSns(line);

                return (
                  <div
                    key={line.lineId || idx}
                    className="rounded-2xl border border-slate-200/90 bg-white p-3.5 text-xs space-y-2.5 shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Product Name & Qty */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-black text-slate-900 text-xs sm:text-sm leading-snug">
                            {line.productName}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Tujuan: <span className="font-bold text-slate-800">{line.customerNo}</span>
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200 font-mono">
                        Qty: {line.quantity}
                      </span>
                    </div>

                    {/* Simulated SN Display (Per-Unit or Single) */}
                    {sns.length > 1 ? (
                      <div className="rounded-xl bg-slate-50 px-2.5 py-2 border border-slate-200/80 space-y-1.5 text-[11px]">
                        <span className="text-slate-500 font-medium block">
                          SN ({sns.length} Unit):
                        </span>
                        <div className="space-y-1 pl-1 font-mono text-[10.5px]">
                          {sns.map((sn, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between text-slate-800"
                            >
                              <span className="text-slate-500">Unit {sIdx + 1}:</span>
                              <span className="font-bold select-all">{sn}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 border border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500 font-medium">SN:</span>
                        <span className="font-mono font-bold text-slate-800 select-all truncate text-[10.5px]">
                          {sns[0] || '-'}
                        </span>
                      </div>
                    )}

                    {/* Line Financials: Conditional based on presentationMode */}
                    {presentationMode === 'customer' ? (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10.5px] text-slate-500 block">Harga</span>
                          <span className="font-bold text-slate-900 font-mono">
                            Rp {line.salesLineTotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                        {line.quantity > 1 && (
                          <div className="text-right">
                            <span className="text-[10.5px] text-slate-400 block">Harga Satuan</span>
                            <span className="font-mono text-[11px] text-slate-600">
                              @Rp {line.sellingPrice.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10.5px] text-slate-500 block">
                            Modal: Rp {line.modalLineTotal.toLocaleString('id-ID')} | Jual: Rp {line.salesLineTotal.toLocaleString('id-ID')}
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            Rp {line.salesLineTotal.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10.5px] text-slate-500 block">Perkiraan Margin</span>
                          <span
                            className={`font-black font-mono text-xs ${
                              line.estimatedMargin > 0
                                ? 'text-emerald-700'
                                : line.estimatedMargin < 0
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {formattedLineMargin}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Financial Summary Box: Conditional based on presentationMode */}
        {presentationMode === 'customer' ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Total Tagihan ({activeLines.length} Transaksi, {totalQuantity} Item):</span>
              <span className="font-mono text-slate-800 font-bold">
                Rp {totalSales.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-950">TOTAL PEMBAYARAN:</span>
              <span className="font-mono font-black text-base text-slate-950">
                Rp {totalSales.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300/80 bg-linear-to-b from-amber-50/40 via-white to-amber-50/20 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Total Modal Simulasi:</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {totalModal.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Total Penjualan Simulasi:</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {totalSales.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-amber-200/80">
              <span className="font-bold text-slate-900">Total Perkiraan Margin:</span>
              <span
                className={`font-mono font-black text-sm ${
                  totalMargin > 0
                    ? 'text-emerald-700'
                    : totalMargin < 0
                    ? 'text-amber-800'
                    : 'text-slate-700'
                }`}
              >
                {totalMargin > 0 ? '+' : ''}
                Rp {totalMargin.toLocaleString('id-ID')}
              </span>
            </div>

            {totalCashback > 0 && (
              <div className="flex items-center justify-between pt-1 text-violet-900 font-bold bg-violet-50/80 -mx-1 px-2.5 py-1.5 rounded-xl border border-violet-200/80">
                <span className="inline-flex items-center gap-1 text-[11px]">
                  <Sparkles size={12} className="text-violet-600" />
                  Reward Koin Sandbox:
                </span>
                <span className="font-mono text-xs text-violet-700 font-black">
                  +{totalCashback.toLocaleString('id-ID')} Koin
                </span>
              </div>
            )}
          </div>
        )}

        {/* Sandbox Notice */}
        <p className="text-[10.5px] text-slate-400 italic text-center leading-relaxed">
          {presentationMode === 'customer'
            ? '*Struk simulasi untuk latihan konter/reseller. Bukan bukti pembayaran riil.'
            : '*Simulasi Sandbox DaPay — Bukan transaksi riil. Catatan pembukuan internal konter.'}
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {presentationMode === 'customer' ? (
            <button
              type="button"
              onClick={handleCustomerWhatsApp}
              disabled={activeLines.length === 0 || isMultipleCustomersSelected}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {isHandoffSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-200 animate-in zoom-in-50 duration-100" />
                  <span>WhatsApp Dibuka 🚀</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>
                    {activeLines.length === 0
                      ? 'Pilih Transaksi untuk Kirim Struk'
                      : isMultipleCustomersSelected
                      ? 'Pilih 1 Pelanggan Saja'
                      : 'Kirim Struk Pelanggan (WhatsApp)'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResellerCopyWhatsApp}
              disabled={activeLines.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {isCopiedReceipt ? (
                <>
                  <CheckCheck size={16} className="text-emerald-200 animate-in zoom-in-50 duration-100" />
                  <span>Tersalin! ✅</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>
                    {activeLines.length === 0
                      ? 'Pilih Transaksi untuk Salin Struk'
                      : activeLines.length === receipt.lines.length
                      ? 'Salin Rekap Kasir (WhatsApp)'
                      : `Salin Rekap Terpilih (${activeLines.length} Transaksi)`}
                  </span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer text-center"
          >
            Selesai & Mulai Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}
