"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CreditCard,
  Loader2,
  PlusCircle,
  QrCode,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  DepositPaymentMethod,
  formatRupiah,
  PRESET_AMOUNTS,
  toNumber,
} from "../types";

interface DepositCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: string, paymentMethodKey: string) => Promise<void>;
  paymentMethods: DepositPaymentMethod[];
  isLoadingMethods: boolean;
  isSubmitting: boolean;
}

export default function DepositCreateModal({
  isOpen,
  onClose,
  onSubmit,
  paymentMethods,
  isLoadingMethods,
  isSubmitting,
}: DepositCreateModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedMethodKey, setSelectedMethodKey] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Derived effective method key
  const effectiveMethodKey =
    selectedMethodKey || (paymentMethods.length > 0 ? paymentMethods[0].methodKey : "");

  // ESC key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    setAmount(numeric);
    setValidationError(null);
  };

  const handlePresetSelect = (val: number) => {
    setAmount(val.toString());
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = amount.trim();
    if (!/^(?:[1-9][0-9]*)$/.test(trimmed)) {
      setValidationError("Nominal deposit harus berupa bilangan bulat positif.");
      return;
    }

    const num = toNumber(trimmed);
    if (num < 10000) {
      setValidationError("Minimal deposit adalah Rp10.000.");
      return;
    }

    if (!effectiveMethodKey) {
      setValidationError("Silakan pilih metode pembayaran terlebih dahulu.");
      return;
    }

    const method = paymentMethods.find((m) => m.methodKey === effectiveMethodKey);
    if (method && method.minPrice) {
      const methodMin = toNumber(method.minPrice);
      if (num < methodMin) {
        setValidationError(
          `Minimal deposit melalui metode ${method.name} adalah ${formatRupiah(
            methodMin,
          )}.`,
        );
        return;
      }
    }

    await onSubmit(trimmed, effectiveMethodKey);
  };

  const numericAmount = toNumber(amount);
  const selectedMethod = paymentMethods.find(
    (m) => m.methodKey === effectiveMethodKey,
  );

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-deposit-title"
        className="relative flex flex-col w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200/90 bg-white shadow-2xl ring-1 ring-inset ring-white/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <PlusCircle size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="create-deposit-title"
                className="text-base sm:text-lg font-black tracking-tight text-slate-950 truncate"
              >
                Isi Saldo DaPay
              </h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                Deposit instan dan otomatis masuk ke Saldo DaPay.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup Formulir Deposit"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* 1. NOMINAL INPUT */}
          <div>
            <label
              htmlFor="deposit-amount-input"
              className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              Nominal Saldo (Rp)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                Rp
              </span>
              <input
                id="deposit-amount-input"
                type="text"
                inputMode="numeric"
                value={amount ? Number(amount).toLocaleString("id-ID") : ""}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="100.000"
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-11 pr-4 text-sm font-black text-slate-900 placeholder-slate-400 outline-hidden transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400 font-medium">
              Minimal deposit Rp10.000 (bebas biaya admin).
            </p>
          </div>

          {/* 2. PRESET CHIPS */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pilihan Cepat
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_AMOUNTS.map((val) => {
                const isSelected = numericAmount === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePresetSelect(val)}
                    disabled={isSubmitting}
                    className={`h-8 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer truncate ${
                      isSelected
                        ? "border border-blue-500 bg-blue-600 text-white shadow-2xs"
                        : "border border-slate-200/80 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {val >= 1000000
                      ? `${val / 1000000} Jt`
                      : `${val / 1000} Rb`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. METODE PEMBAYARAN */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Pilih Metode Pembayaran
            </p>

            {isLoadingMethods ? (
              <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50/60 py-8">
                <Loader2 size={20} className="animate-spin text-blue-600" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-xs text-slate-500">
                Tidak ada metode pembayaran yang tersedia saat ini.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {paymentMethods.map((method) => {
                  const isSelected = effectiveMethodKey === method.methodKey;
                  return (
                    <button
                      key={method.methodKey}
                      type="button"
                      onClick={() => {
                        setSelectedMethodKey(method.methodKey);
                        setValidationError(null);
                      }}
                      disabled={isSubmitting}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition active:scale-[0.99] cursor-pointer ${
                        isSelected
                          ? "border-blue-400 bg-blue-50/60 shadow-2xs ring-1 ring-blue-400/40"
                          : "border-slate-200/80 bg-white hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-700 shadow-2xs overflow-hidden">
                          {method.logoUrl ? (
                            <img
                              src={method.logoUrl}
                              alt={method.name}
                              className="h-6 w-6 object-contain"
                            />
                          ) : method.isQr ? (
                            <QrCode size={16} className="text-emerald-600" />
                          ) : (
                            <CreditCard size={16} className="text-blue-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {method.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {method.isQr
                              ? "QRIS Real-Time Otomatis"
                              : `${method.accountNo} (${method.accountName})`}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {method.minPrice && (
                          <span className="hidden xs:inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                            Min: {formatRupiah(method.minPrice)}
                          </span>
                        )}
                        <div
                          className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border transition ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* VALIDATION ERROR MESSAGE */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 animate-in fade-in">
              <AlertCircle size={14} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 4. SUMMARY ESTIMASI */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span>Nominal Saldo:</span>
              <span className="font-bold text-slate-900">
                {formatRupiah(numericAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Metode:</span>
              <span className="font-bold text-slate-900">
                {selectedMethod?.name || "-"}
              </span>
            </div>
            {/* Catatan: Di backend/database ini adalah kode unik verifikasi (`unique_code`), ditampilkan sebagai "Biaya Layanan" pada estimasi UI */}
            <div className="border-t border-blue-100/80 pt-1.5 flex items-center justify-between font-bold text-blue-950">
              <span>Biaya Layanan:</span>
              <span className="font-mono text-emerald-700">
                Otomatis dibuat server
              </span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting || numericAmount < 10000 || !effectiveMethodKey}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Memproses Permintaan...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Lanjutkan ke Pembayaran</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

