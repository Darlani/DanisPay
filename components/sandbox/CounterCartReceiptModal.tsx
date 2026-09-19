'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Image as ImageIcon,
  Loader2,
  Printer,
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
export type PrintPaperWidth = '58mm' | '80mm';

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
 * Helper to draw a rounded rectangle on a CanvasRenderingContext2D.
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Native HTML5 Canvas 2D image receipt generator.
 * Returns a PNG Blob formatted cleanly according to presentation mode.
 * Strictly enforces privacy boundaries:
 * - 'customer': zero wholesale modal, margin, cashback coin, or wallet balance.
 * - 'reseller': includes internal modal, margin, and cashback coin. Zero historical balance.
 */
export async function generateReceiptImageBlob(
  receipt: CounterCartReceiptData,
  linesToRender: CounterCartReceiptLine[],
  mode: ReceiptPresentationMode
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas image generation is only supported in browser environments.');
  }

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
  const totalQuantity = linesToRender.reduce((acc, l) => acc + l.quantity, 0);

  const dateObj = receipt.resolvedAt ? new Date(receipt.resolvedAt) : new Date();
  const timeDisplay = `${dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;

  // Layout metrics
  const canvasWidth = 720;
  const padding = 36;
  const contentWidth = canvasWidth - padding * 2; // 648

  // Measure item heights dynamically
  const itemHeights: number[] = linesToRender.map((line) => {
    const sns = resolveLineSns(line);
    let snHeight = 0;
    if (sns.length === 1) {
      snHeight = 24;
    } else if (sns.length > 1) {
      snHeight = 20 + sns.length * 18;
    }
    // Base card: padding (24) + title (20) + dest/qty (20) + snHeight + finance (26)
    return 24 + 20 + 20 + snHeight + 26;
  });

  const itemsTotalHeight = itemHeights.reduce((sum, h) => sum + h + 12, 0);
  const summaryHeight = mode === 'customer' ? 84 : totalCashback > 0 ? 152 : 124;

  // Exact deterministic section heights:
  // topSectionHeight: badges (34) + title block (66) + divider (12) + meta box (54) + section header (12) = 178
  const topSectionHeight = 178;
  const summaryToDisclaimerGap = 20;
  const bottomPaddingAfterDisclaimer = 32; // Compact breathing space (28-40px rule)
  const totalCanvasHeight =
    padding +
    topSectionHeight +
    itemsTotalHeight +
    4 +
    summaryHeight +
    summaryToDisclaimerGap +
    bottomPaddingAfterDisclaimer;

  const scale = 2; // 2x for sharp retina rendering
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = totalCanvasHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not obtain 2D canvas context.');
  }

  ctx.scale(scale, scale);

  // Background & Outer Card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, totalCanvasHeight);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, 12, 12, canvasWidth - 24, totalCanvasHeight - 24, 20);
  ctx.stroke();

  let curY = padding;

  // Badges
  // 1. SIMULASI SANDBOX
  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = 1;
  drawRoundRect(ctx, padding, curY, 134, 22, 11);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#92400e';
  ctx.fillText('SIMULASI SANDBOX', padding + 14, curY + 15);

  // 2. BERHASIL
  ctx.fillStyle = '#d1fae5';
  ctx.strokeStyle = '#6ee7b7';
  drawRoundRect(ctx, padding + 142, curY, 80, 22, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#065f46';
  ctx.fillText('BERHASIL', padding + 156, curY + 15);

  curY += 34;

  // Header Titles
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#0f172a';
  if (mode === 'customer') {
    ctx.fillText('BUKTI TRANSAKSI SIMULASI', padding, curY + 18);
    curY += 26;
    ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#059669';
    ctx.fillText('STRUK PELANGGAN • DAPAY SANDBOX', padding, curY + 12);
  } else {
    ctx.fillText('REKAP PEMBUKUAN KASIR', padding, curY + 18);
    curY += 26;
    ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('CATATAN INTERNAL KONTER • DAPAY SANDBOX', padding, curY + 12);
  }
  curY += 18;

  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Simulasi Sandbox DaPay — Bukan transaksi riil', padding, curY + 10);
  curY += 22;

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, curY);
  ctx.lineTo(padding + contentWidth, curY);
  ctx.stroke();
  curY += 12;

  // Metadata Card (Invoice & Waktu)
  ctx.fillStyle = '#f8fafc';
  drawRoundRect(ctx, padding, curY, contentWidth, 42, 10);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.font = 'bold 12px monospace, system-ui, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(`INVOICE: #${receipt.orderId}`, padding + 14, curY + 26);

  ctx.textAlign = 'right';
  ctx.font = '11.5px monospace, system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(timeDisplay, padding + contentWidth - 14, curY + 26);
  ctx.textAlign = 'left';

  curY += 54;

  // Section Header
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Rincian Produk (${linesToRender.length} Baris)`, padding, curY);

  ctx.textAlign = 'right';
  ctx.font = '11.5px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Total ${totalQuantity} Item`, padding + contentWidth, curY);
  ctx.textAlign = 'left';

  curY += 12;

  // Render each line item card
  linesToRender.forEach((line, idx) => {
    const cardH = itemHeights[idx];
    const cardY = curY;

    ctx.fillStyle = '#f8fafc';
    drawRoundRect(ctx, padding, cardY, contentWidth, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    let innerY = cardY + 14;

    // Index badge + Product name
    ctx.fillStyle = '#0f172a';
    drawRoundRect(ctx, padding + 12, innerY, 18, 18, 9);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px monospace, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(idx + 1), padding + 21, innerY + 13);
    ctx.textAlign = 'left';

    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(line.productName, padding + 38, innerY + 14);

    innerY += 24;

    // Customer Destination & Qty
    ctx.font = '11.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Tujuan: ${line.customerNo}`, padding + 14, innerY + 11);

    ctx.textAlign = 'right';
    ctx.font = 'bold 11.5px monospace, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(`Qty: ${line.quantity}x`, padding + contentWidth - 14, innerY + 11);
    ctx.textAlign = 'left';

    innerY += 20;

    // SN info
    const sns = resolveLineSns(line);
    if (sns.length === 1) {
      ctx.fillStyle = '#ecfdf5';
      drawRoundRect(ctx, padding + 14, innerY, contentWidth - 28, 22, 6);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.stroke();

      ctx.font = 'bold 10.5px monospace, sans-serif';
      ctx.fillStyle = '#047857';
      ctx.fillText(`SN: ${sns[0]}`, padding + 22, innerY + 15);
      innerY += 26;
    } else if (sns.length > 1) {
      const snBoxH = 18 + sns.length * 17;
      ctx.fillStyle = '#f1f5f9';
      drawRoundRect(ctx, padding + 14, innerY, contentWidth - 28, snBoxH, 6);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`SN (${sns.length} Unit):`, padding + 22, innerY + 14);

      sns.forEach((sn, sIdx) => {
        const rowY = innerY + 18 + (sIdx + 1) * 16 - 2;
        ctx.font = '10px monospace, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`• Unit ${sIdx + 1}:`, padding + 26, rowY);
        ctx.font = 'bold 10.5px monospace, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(sn, padding + 86, rowY);
      });
      innerY += snBoxH + 6;
    }

    // Financial row
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding + 14, innerY);
    ctx.lineTo(padding + contentWidth - 14, innerY);
    ctx.stroke();
    innerY += 6;

    if (mode === 'customer') {
      ctx.font = '11.5px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(
        line.quantity > 1
          ? `@Rp ${line.sellingPrice.toLocaleString('id-ID')}`
          : 'Harga Jual',
        padding + 14,
        innerY + 14
      );

      ctx.textAlign = 'right';
      ctx.font = 'bold 13px monospace, system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`Rp ${line.salesLineTotal.toLocaleString('id-ID')}`, padding + contentWidth - 14, innerY + 14);
      ctx.textAlign = 'left';
    } else {
      ctx.font = '11px monospace, system-ui, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(
        `Modal: Rp ${line.modalLineTotal.toLocaleString('id-ID')} | Jual: Rp ${line.salesLineTotal.toLocaleString('id-ID')}`,
        padding + 14,
        innerY + 14
      );

      ctx.textAlign = 'right';
      const margin = line.estimatedMargin;
      const marginSign = margin > 0 ? '+' : margin < 0 ? '-' : '';
      ctx.font = 'bold 11.5px monospace, system-ui, sans-serif';
      ctx.fillStyle = margin > 0 ? '#047857' : margin < 0 ? '#b91c1c' : '#475569';
      ctx.fillText(
        `Margin: ${marginSign}Rp ${Math.abs(margin).toLocaleString('id-ID')}`,
        padding + contentWidth - 14,
        innerY + 14
      );
      ctx.textAlign = 'left';
    }

    curY += cardH + 12;
  });

  curY += 4;

  // Summary Box
  if (mode === 'customer') {
    ctx.fillStyle = '#f8fafc';
    drawRoundRect(ctx, padding, curY, contentWidth, summaryHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Total Tagihan (${linesToRender.length} Transaksi, ${totalQuantity} Item):`, padding + 16, curY + 28);

    ctx.textAlign = 'right';
    ctx.font = 'bold 13px monospace, system-ui, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(`Rp ${totalSales.toLocaleString('id-ID')}`, padding + contentWidth - 16, curY + 28);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(padding + 16, curY + 42);
    ctx.lineTo(padding + contentWidth - 16, curY + 42);
    ctx.stroke();

    ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('TOTAL PEMBAYARAN:', padding + 16, curY + 64);

    ctx.textAlign = 'right';
    ctx.font = 'bold 17px monospace, system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`Rp ${totalSales.toLocaleString('id-ID')}`, padding + contentWidth - 16, curY + 65);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#fffbeb';
    drawRoundRect(ctx, padding, curY, contentWidth, summaryHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#fcd34d';
    ctx.stroke();

    let sY = curY + 24;

    // Modal
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Total Modal Simulasi:', padding + 16, sY);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12.5px monospace, system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`Rp ${totalModal.toLocaleString('id-ID')}`, padding + contentWidth - 16, sY);
    ctx.textAlign = 'left';

    sY += 22;

    // Sales
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Total Penjualan Simulasi:', padding + 16, sY);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12.5px monospace, system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`Rp ${totalSales.toLocaleString('id-ID')}`, padding + contentWidth - 16, sY);
    ctx.textAlign = 'left';

    sY += 24;

    // Margin
    ctx.strokeStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(padding + 16, sY - 14);
    ctx.lineTo(padding + contentWidth - 16, sY - 14);
    ctx.stroke();

    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Total Perkiraan Margin:', padding + 16, sY);
    ctx.textAlign = 'right';
    const marginSign = totalMargin > 0 ? '+' : totalMargin < 0 ? '-' : '';
    ctx.font = 'bold 14px monospace, system-ui, sans-serif';
    ctx.fillStyle = totalMargin > 0 ? '#047857' : totalMargin < 0 ? '#b91c1c' : '#334155';
    ctx.fillText(`${marginSign}Rp ${Math.abs(totalMargin).toLocaleString('id-ID')}`, padding + contentWidth - 16, sY);
    ctx.textAlign = 'left';

    if (totalCashback > 0) {
      sY += 28;
      ctx.fillStyle = '#f5f3ff';
      drawRoundRect(ctx, padding + 14, sY - 16, contentWidth - 28, 28, 8);
      ctx.fill();
      ctx.strokeStyle = '#ddd6fe';
      ctx.stroke();

      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#5b21b6';
      ctx.fillText('Reward Koin Sandbox:', padding + 24, sY + 2);
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace, system-ui, sans-serif';
      ctx.fillStyle = '#6d28d9';
      ctx.fillText(`+${totalCashback.toLocaleString('id-ID')} Koin`, padding + contentWidth - 24, sY + 2);
      ctx.textAlign = 'left';
    }
  }

  curY += summaryHeight + summaryToDisclaimerGap;

  // Disclaimer Footer
  ctx.textAlign = 'center';
  ctx.font = 'italic 11px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  const disclaimer =
    mode === 'customer'
      ? '*Struk simulasi untuk latihan konter/reseller. Bukan bukti pembayaran riil.'
      : '*Simulasi Sandbox DaPay — Bukan transaksi riil. Catatan pembukuan internal konter.';
  ctx.fillText(disclaimer, canvasWidth / 2, curY);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob from canvas'));
      }
    }, 'image/png');
  });
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
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isImageShareSuccess, setIsImageShareSuccess] = useState<boolean>(false);
  const [imageShareSuccessLabel, setImageShareSuccessLabel] = useState<string>('GAMBAR DIUNDUH ✓');
  const [isTextHandoffSuccess, setIsTextHandoffSuccess] = useState<boolean>(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [printPaperWidth, setPrintPaperWidth] = useState<PrintPaperWidth>('80mm');
  const [isPrintSuccess, setIsPrintSuccess] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track modal session to initialize selection and mode when modal opens
  const [prevSessionKey, setPrevSessionKey] = useState<string>('');
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());

  const currentSessionKey = isOpen && receipt ? `${receipt.orderId}_${initialMode}` : '';
  if (currentSessionKey !== prevSessionKey) {
    setPrevSessionKey(currentSessionKey);
    if (isOpen && receipt) {
      setSelectedLineIds(new Set(receipt.lines.map((l) => l.lineId)));
      setPresentationMode(initialMode);
      setIsGeneratingImage(false);
      setIsImageShareSuccess(false);
      setImageShareSuccessLabel('GAMBAR DIUNDUH ✓');
      setIsTextHandoffSuccess(false);
      setShareNotice(null);
      setIsPrintSuccess(false);
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

  const triggerDownload = (blob: Blob, fileName: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShareNotice(
      'Browser ini tidak mendukung pengiriman gambar langsung. Gambar sudah diunduh. Silakan lampirkan gambar ke WhatsApp.'
    );
    setImageShareSuccessLabel('GAMBAR DIUNDUH ✓');
    setIsImageShareSuccess(true);
    setTimeout(() => {
      setIsImageShareSuccess(false);
    }, 2500);
  };

  const handleShareImage = async (mode: ReceiptPresentationMode) => {
    if (!receipt || activeLines.length === 0 || isGeneratingImage) return;
    if (mode === 'customer' && isMultipleCustomersSelected) return;

    setShareNotice(null);
    setIsGeneratingImage(true);

    try {
      const blob = await generateReceiptImageBlob(receipt, activeLines, mode);
      const fileName =
        mode === 'customer'
          ? `struk-pelanggan-${receipt.orderId}.png`
          : `rekap-kasir-${receipt.orderId}.png`;

      let shared = false;

      // Check if Web Share API with files is supported
      if (
        typeof navigator !== 'undefined' &&
        typeof File !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function'
      ) {
        try {
          const imageFile = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [imageFile] })) {
            await navigator.share({
              files: [imageFile],
              title: mode === 'customer' ? 'Struk Pelanggan' : 'Rekap Kasir',
            });
            shared = true;
            setImageShareSuccessLabel('SIAP DIBAGIKAN ✓');
            setIsImageShareSuccess(true);
            setTimeout(() => {
              setIsImageShareSuccess(false);
            }, 2500);
          }
        } catch (shareErr: unknown) {
          if ((shareErr as Error)?.name === 'AbortError') {
            // User cancelled the share dialog; do nothing
            return;
          }
          // Other share error; proceed to download fallback below
          shared = false;
        }
      }

      if (!shared) {
        triggerDownload(blob, fileName);
      }
    } catch {
      // If canvas generation completely fails, do not silently fallback to text. Set notice.
      setShareNotice('Gagal menyiapkan gambar struk. Silakan coba lagi atau gunakan kirim teks.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleWhatsAppText = (mode: ReceiptPresentationMode) => {
    if (!receipt || activeLines.length === 0) return;
    if (mode === 'customer' && isMultipleCustomersSelected) return;

    const text = generateWhatsAppReceiptText(receipt, activeLines, mode);
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encodedText}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    setIsTextHandoffSuccess(true);
    setTimeout(() => {
      setIsTextHandoffSuccess(false);
    }, 2500);
  };

  const handlePrint = () => {
    if (!receipt || activeLines.length === 0) return;
    if (presentationMode === 'customer' && isMultipleCustomersSelected) return;

    if (typeof window !== 'undefined') {
      window.print();
      setIsPrintSuccess(true);
      setTimeout(() => {
        setIsPrintSuccess(false);
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

  const printContent = (
    <div
      id="dapay-print-receipt"
      className="hidden print:block"
      data-paper-width={printPaperWidth}
      aria-hidden="true"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${printPaperWidth === '58mm' ? '58mm' : '80mm'} auto;
            margin: 0mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
            height: auto !important;
          }
          body > *:not(#dapay-print-receipt) {
            display: none !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }
          #dapay-print-receipt {
            display: block !important;
            position: static !important;
            width: ${printPaperWidth === '58mm' ? '58mm' : '80mm'} !important;
            max-width: ${printPaperWidth === '58mm' ? '58mm' : '80mm'} !important;
            padding: ${printPaperWidth === '58mm' ? '2mm 1.5mm' : '3mm 2.5mm'} !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: ${printPaperWidth === '58mm' ? '10px' : '11.5px'} !important;
            line-height: 1.35 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-item-line {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-dashed-divider {
            border-top: 1px dashed #000000 !important;
            margin: 4px 0 !important;
          }
          .print-solid-divider {
            border-top: 1px solid #000000 !important;
            margin: 4px 0 !important;
          }
        }
      `,
        }}
      />

      {presentationMode === 'customer' ? (
        <div className="print-content-customer" style={{ color: '#000000' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: printPaperWidth === '58mm' ? '12px' : '14px',
                textTransform: 'uppercase',
              }}
            >
              BUKTI TRANSAKSI SIMULASI
            </div>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: printPaperWidth === '58mm' ? '10px' : '11.5px',
                marginTop: '1px',
              }}
            >
              STRUK PELANGGAN • DAPAY SANDBOX
            </div>
            <div
              style={{
                fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
                color: '#333333',
                marginTop: '2px',
              }}
            >
              Simulasi Sandbox DaPay — Bukan transaksi riil
            </div>
          </div>

          <div className="print-dashed-divider" />

          {/* Meta */}
          <div style={{ fontSize: printPaperWidth === '58mm' ? '9.5px' : '11px', margin: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{receipt.orderId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Waktu:</span>
              <span style={{ fontFamily: 'monospace' }}>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Status:</span>
              <span style={{ fontWeight: 'bold' }}>BERHASIL</span>
            </div>
          </div>

          <div className="print-dashed-divider" />

          {/* Product Lines */}
          <div style={{ margin: '4px 0' }}>
            {activeLines.map((line, idx) => {
              const sns = resolveLineSns(line);
              return (
                <div key={line.lineId || idx} className="print-item-line" style={{ marginBottom: '6px' }}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: printPaperWidth === '58mm' ? '10.5px' : '12px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {idx + 1}. {line.productName}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: printPaperWidth === '58mm' ? '9px' : '10px',
                    }}
                  >
                    <span style={{ wordBreak: 'break-all' }}>Tujuan: {line.customerNo}</span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>Qty: {line.quantity}x</span>
                  </div>

                  {/* Multi-unit SN */}
                  {sns.length > 1 ? (
                    <div
                      style={{
                        fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
                        fontFamily: 'monospace',
                        margin: '2px 0 2px 4px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>SN ({sns.length} Unit):</div>
                      {sns.map((sn, sIdx) => (
                        <div key={sIdx} style={{ wordBreak: 'break-all' }}>
                          {sIdx + 1}. {sn}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        margin: '1px 0',
                      }}
                    >
                      SN: {sns[0] || '-'}
                    </div>
                  )}

                  {/* Price & Subtotal */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: printPaperWidth === '58mm' ? '9.5px' : '11px',
                      marginTop: '2px',
                    }}
                  >
                    <span>
                      {line.quantity > 1 ? `@Rp ${line.sellingPrice.toLocaleString('id-ID')}` : 'Harga'}
                    </span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      Rp {line.salesLineTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="print-solid-divider" />

          {/* Summary */}
          <div style={{ margin: '4px 0', fontSize: printPaperWidth === '58mm' ? '9.5px' : '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Item:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{totalQuantity}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: printPaperWidth === '58mm' ? '11px' : '13px',
                marginTop: '2px',
              }}
            >
              <span>TOTAL PEMBAYARAN:</span>
              <span style={{ fontFamily: 'monospace' }}>Rp {totalSales.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="print-dashed-divider" />

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
              color: '#444444',
              marginTop: '6px',
              lineHeight: 1.25,
            }}
          >
            <div>*Struk simulasi untuk latihan konter/reseller.</div>
            <div>Bukan bukti pembayaran riil.</div>
          </div>
        </div>
      ) : (
        <div className="print-content-reseller" style={{ color: '#000000' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: printPaperWidth === '58mm' ? '12px' : '14px',
                textTransform: 'uppercase',
              }}
            >
              REKAP PEMBUKUAN KASIR
            </div>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: printPaperWidth === '58mm' ? '10px' : '11.5px',
                marginTop: '1px',
              }}
            >
              CATATAN INTERNAL KONTER • DAPAY SANDBOX
            </div>
            <div
              style={{
                fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
                color: '#333333',
                marginTop: '2px',
              }}
            >
              Simulasi Sandbox DaPay — Bukan transaksi riil
            </div>
          </div>

          <div className="print-dashed-divider" />

          {/* Meta */}
          <div style={{ fontSize: printPaperWidth === '58mm' ? '9.5px' : '11px', margin: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{receipt.orderId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Waktu:</span>
              <span style={{ fontFamily: 'monospace' }}>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Status:</span>
              <span style={{ fontWeight: 'bold' }}>BERHASIL</span>
            </div>
          </div>

          <div className="print-dashed-divider" />

          {/* Product Lines */}
          <div style={{ margin: '4px 0' }}>
            {activeLines.map((line, idx) => {
              const sns = resolveLineSns(line);
              const marginSign = line.estimatedMargin > 0 ? '+' : '';
              return (
                <div key={line.lineId || idx} className="print-item-line" style={{ marginBottom: '6px' }}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: printPaperWidth === '58mm' ? '10.5px' : '12px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {idx + 1}. {line.productName}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: printPaperWidth === '58mm' ? '9px' : '10px',
                    }}
                  >
                    <span style={{ wordBreak: 'break-all' }}>Tujuan: {line.customerNo}</span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>Qty: {line.quantity}x</span>
                  </div>

                  {/* Multi-unit SN */}
                  {sns.length > 1 ? (
                    <div
                      style={{
                        fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
                        fontFamily: 'monospace',
                        margin: '2px 0 2px 4px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>SN ({sns.length} Unit):</div>
                      {sns.map((sn, sIdx) => (
                        <div key={sIdx} style={{ wordBreak: 'break-all' }}>
                          {sIdx + 1}. {sn}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        margin: '1px 0',
                      }}
                    >
                      SN: {sns[0] || '-'}
                    </div>
                  )}

                  {/* Modal, Jual, Margin */}
                  <div
                    style={{
                      fontSize: printPaperWidth === '58mm' ? '9px' : '10.5px',
                      fontFamily: 'monospace',
                      marginTop: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Modal: Rp {line.modalLineTotal.toLocaleString('id-ID')}</span>
                      <span>Jual: Rp {line.salesLineTotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span>Margin:</span>
                      <span>
                        {marginSign}Rp {line.estimatedMargin.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="print-solid-divider" />

          {/* Summary */}
          <div style={{ margin: '4px 0', fontSize: printPaperWidth === '58mm' ? '9.5px' : '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Item:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{totalQuantity}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Modal Simulasi:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                Rp {totalModal.toLocaleString('id-ID')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Penjualan Simulasi:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                Rp {totalSales.toLocaleString('id-ID')}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: printPaperWidth === '58mm' ? '10.5px' : '12px',
                marginTop: '2px',
              }}
            >
              <span>Total Perkiraan Margin:</span>
              <span style={{ fontFamily: 'monospace' }}>
                {totalMargin > 0 ? '+' : ''}Rp {totalMargin.toLocaleString('id-ID')}
              </span>
            </div>
            {totalCashback > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: printPaperWidth === '58mm' ? '9.5px' : '11px',
                  marginTop: '2px',
                }}
              >
                <span>Reward Koin Sandbox:</span>
                <span style={{ fontFamily: 'monospace' }}>+{totalCashback.toLocaleString('id-ID')} Koin</span>
              </div>
            )}
          </div>

          <div className="print-dashed-divider" />

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              fontSize: printPaperWidth === '58mm' ? '8.5px' : '9.5px',
              color: '#444444',
              marginTop: '6px',
              lineHeight: 1.25,
            }}
          >
            <div>*Simulasi Sandbox DaPay — Bukan transaksi riil.</div>
            <div>Catatan pembukuan internal konter.</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
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
            onClick={() => {
              setPresentationMode('customer');
              setShareNotice(null);
              setIsImageShareSuccess(false);
              setIsTextHandoffSuccess(false);
            }}
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
            onClick={() => {
              setPresentationMode('reseller');
              setShareNotice(null);
              setIsImageShareSuccess(false);
              setIsTextHandoffSuccess(false);
            }}
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

        {/* Share Notice Banner (e.g. download fallback on desktop) */}
        {shareNotice && (
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-2.5 text-xs text-blue-900 border border-blue-200 animate-in fade-in duration-150">
            <AlertCircle size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{shareNotice}</span>
          </div>
        )}

        {/* Print Paper Width Selector (58mm / 80mm) */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
            <Printer size={13} className="text-slate-500" />
            <span>Ukuran Cetak:</span>
          </span>
          <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 border border-slate-300/60 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setPrintPaperWidth('58mm')}
              className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                printPaperWidth === '58mm'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58 mm
            </button>
            <button
              type="button"
              onClick={() => setPrintPaperWidth('80mm')}
              className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                printPaperWidth === '80mm'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80 mm
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {presentationMode === 'customer' ? (
            <>
              {/* Print Customer CTA */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={activeLines.length === 0 || isMultipleCustomersSelected}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isPrintSuccess ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-400 animate-in zoom-in-50 duration-100" />
                    <span>Cetak Dibuka ✓</span>
                  </>
                ) : (
                  <>
                    <Printer size={15} />
                    <span>
                      {activeLines.length === 0
                        ? 'Pilih Transaksi untuk Cetak'
                        : isMultipleCustomersSelected
                        ? 'Pilih 1 Pelanggan Saja'
                        : 'Cetak Struk'}
                    </span>
                  </>
                )}
              </button>

              {/* Primary Customer CTA: Image via Web Share / Download */}
              <button
                type="button"
                onClick={() => handleShareImage('customer')}
                disabled={activeLines.length === 0 || isMultipleCustomersSelected || isGeneratingImage}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Menyiapkan Gambar...</span>
                  </>
                ) : isImageShareSuccess ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-200 animate-in zoom-in-50 duration-100" />
                    <span>{imageShareSuccessLabel}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={15} />
                    <span>
                      {activeLines.length === 0
                        ? 'Pilih Transaksi untuk Kirim Gambar'
                        : isMultipleCustomersSelected
                        ? 'Pilih 1 Pelanggan Saja'
                        : 'Kirim Gambar ke WhatsApp'}
                    </span>
                  </>
                )}
              </button>

              {/* Secondary Customer CTA: WhatsApp Text Prefill */}
              <button
                type="button"
                onClick={() => handleWhatsAppText('customer')}
                disabled={activeLines.length === 0 || isMultipleCustomersSelected || isGeneratingImage}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 py-2.5 text-xs font-bold text-emerald-800 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isTextHandoffSuccess ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-700 animate-in zoom-in-50 duration-100" />
                    <span>WhatsApp Dibuka ✓</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>
                      {activeLines.length === 0
                        ? 'Pilih Transaksi'
                        : isMultipleCustomersSelected
                        ? 'Pilih 1 Pelanggan Saja'
                        : 'Kirim Teks ke WhatsApp'}
                    </span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Print Reseller CTA */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={activeLines.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isPrintSuccess ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-400 animate-in zoom-in-50 duration-100" />
                    <span>Cetak Dibuka ✓</span>
                  </>
                ) : (
                  <>
                    <Printer size={15} />
                    <span>
                      {activeLines.length === 0
                        ? 'Pilih Transaksi untuk Cetak'
                        : activeLines.length === receipt.lines.length
                        ? 'Cetak Rekap Kasir'
                        : `Cetak Rekap Terpilih (${activeLines.length})`}
                    </span>
                  </>
                )}
              </button>

              {/* Primary Reseller CTA: Image Recap via Web Share / Download */}
              <button
                type="button"
                onClick={() => handleShareImage('reseller')}
                disabled={activeLines.length === 0 || isGeneratingImage}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Menyiapkan Rekap Gambar...</span>
                  </>
                ) : isImageShareSuccess ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-200 animate-in zoom-in-50 duration-100" />
                    <span>{imageShareSuccessLabel}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={15} />
                    <span>
                      {activeLines.length === 0
                        ? 'Pilih Transaksi untuk Kirim Rekap'
                        : activeLines.length === receipt.lines.length
                        ? 'Kirim Rekap Gambar ke WhatsApp'
                        : `Kirim Rekap Gambar (${activeLines.length} Transaksi)`}
                    </span>
                  </>
                )}
              </button>

              {/* Secondary Reseller CTA: WhatsApp Text Prefill (NOT clipboard only) */}
              <button
                type="button"
                onClick={() => handleWhatsAppText('reseller')}
                disabled={activeLines.length === 0 || isGeneratingImage}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 py-2.5 text-xs font-bold text-emerald-800 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isTextHandoffSuccess ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-700 animate-in zoom-in-50 duration-100" />
                    <span>WhatsApp Dibuka ✓</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>
                      {activeLines.length === 0
                        ? 'Pilih Transaksi'
                        : activeLines.length === receipt.lines.length
                        ? 'Kirim Rekap Teks ke WhatsApp'
                        : `Kirim Rekap Teks (${activeLines.length} Transaksi)`}
                    </span>
                  </>
                )}
              </button>
            </>
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

    {mounted && typeof document !== 'undefined' ? createPortal(printContent, document.body) : null}
  </>
);
}
