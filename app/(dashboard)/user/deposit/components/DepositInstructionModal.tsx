"use client";

import React, { useEffect, useRef } from "react";
import {
  AlertCircle,
  Copy,
  Download,
  Loader2,
  QrCode,
  RefreshCw,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  DepositInstruction,
  formatRupiah,
  toNumber,
} from "../types";

interface DepositInstructionModalProps {
  instruction: DepositInstruction | null;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  onRetryQris: () => Promise<void>;
  isProcessing: boolean;
  onCopy: (text: string, label: string) => void;
}

export default function DepositInstructionModal({
  instruction,
  onClose,
  onRefreshData,
  onRetryQris,
  isProcessing,
  onCopy,
}: DepositInstructionModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // ESC key and body scroll lock
  useEffect(() => {
    if (!instruction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [instruction, isProcessing, onClose]);

  if (!instruction) return null;

  const { payment, totalAmount, uniqueCode, qrisString, depositId } =
    instruction;
  const isQr = payment.isQr;
  const numericTotal = toNumber(totalAmount);

  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 500, 500);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QRIS-Deposit-${depositId.slice(0, 8)}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-instruction-title"
        className="relative flex flex-col w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200/90 bg-white shadow-2xl ring-1 ring-inset ring-white/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <QrCode size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="deposit-instruction-title"
                className="text-base sm:text-lg font-black tracking-tight text-slate-950 truncate"
              >
                Instruksi Pembayaran
              </h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                Lakukan transfer sesuai rincian berikut.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Tutup Instruksi Deposit"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* TOTAL TRANSFER HIGHLIGHT BOX */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Total Pembayaran Persis
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {formatRupiah(numericTotal)}
              </span>
              <button
                type="button"
                onClick={() => onCopy(totalAmount, "Total Pembayaran")}
                title="Salin Total Pembayaran"
                aria-label="Salin Total Pembayaran"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-2xs hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
              >
                <Copy size={13} />
              </button>
            </div>
            {/* Catatan: Di backend/database nilai ini adalah `uniqueCode` (kode unik verifikasi), ditampilkan sebagai "Biaya Layanan" pada UI */}
            {uniqueCode > 0 && (
              <p className="mt-1.5 text-[10.5px] font-semibold text-emerald-800">
                Termasuk biaya layanan:{" "}
                <span className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  +{uniqueCode}
                </span>
              </p>
            )}
          </div>

          {/* QRIS OR MANUAL TRANSFER */}
          {isQr ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                Pindai QRIS (Semua E-Wallet & Mobile Banking)
              </p>

              <div
                ref={qrRef}
                className="flex items-center justify-center rounded-2xl border-4 border-white bg-white p-3 shadow-md"
              >
                {qrisString ? (
                  <QRCodeSVG
                    value={qrisString}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="flex h-50 w-50 flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs font-semibold">
                      Memuat QR Code...
                    </span>
                  </div>
                )}
              </div>

              {qrisString ? (
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Unduh QR Code</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRetryQris}
                  disabled={isProcessing}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    size={13}
                    className={isProcessing ? "animate-spin" : ""}
                  />
                  <span>Muat Ulang QRIS</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Tujuan Transfer: {payment.name}
              </p>

              <div className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    Nomor Rekening / Akun
                  </p>
                  <p className="font-mono text-sm font-black text-slate-900">
                    {payment.accountNo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCopy(payment.accountNo, "Nomor Rekening")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                >
                  <Copy size={13} />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    Atas Nama Rekening
                  </p>
                  <p className="text-xs font-bold text-slate-900">
                    {payment.accountName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CRITICAL WARNING NOTE */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-xs font-medium text-amber-800">
            <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Penting:</p>
              <p className="text-[11px] leading-relaxed mt-0.5">
                Pastikan transfer nominal persis hingga 3 digit terakhir. Sistem
                akan otomatis memverifikasi dan menambahkan Saldo DaPay Anda dalam
                1-3 menit.
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isProcessing}
              className="flex h-10.5 w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-emerald-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isProcessing ? "animate-spin" : ""}
              />
              <span>Saya Sudah Bayar (Cek Saldo)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10.5 w-full sm:w-auto px-4 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

