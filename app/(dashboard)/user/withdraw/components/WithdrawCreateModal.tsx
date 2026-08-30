"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpFromLine,
  Building2,
  CircleDollarSign,
  Loader2,
  WalletCards,
  X,
} from "lucide-react";
import {
  BANK_PRESETS,
  MIN_WITHDRAWAL,
  formatRupiah,
} from "../types";
import { withdrawService } from "../services/withdrawService";

interface WithdrawCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [50000, 100000, 250000, 500000, 1000000];

export default function WithdrawCreateModal({
  isOpen,
  onClose,
  availableBalance,
  onSuccess,
}: WithdrawCreateModalProps) {
  const [selectedBankCode, setSelectedBankCode] = useState<string>("bca");
  const [customBankName, setCustomBankName] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const numericAmount = Number(amountInput.replace(/\D/g, "") || "0");
  const isCustomBank = selectedBankCode === "other";
  const effectiveBankName = isCustomBank
    ? customBankName.trim()
    : BANK_PRESETS.find((b) => b.code === selectedBankCode)?.name || "";

  const remainingBalance = Math.max(0, availableBalance - numericAmount);

  const handlePresetClick = (amount: number) => {
    setAmountInput(amount.toString());
    setErrorMessage(null);
  };

  const handleWithdrawAll = () => {
    const maxWithdraw = Math.max(0, Math.floor(availableBalance));
    setAmountInput(maxWithdraw.toString());
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    // Client-side validations
    if (numericAmount < MIN_WITHDRAWAL) {
      setErrorMessage(`Minimal penarikan adalah ${formatRupiah(MIN_WITHDRAWAL)}.`);
      return;
    }

    if (numericAmount > availableBalance) {
      setErrorMessage(
        "Saldo DaPay Anda tidak mencukupi. Koin DaPay tidak dapat digunakan untuk penarikan.",
      );
      return;
    }

    if (!effectiveBankName) {
      setErrorMessage("Silakan pilih atau masukkan nama Bank / E-Wallet tujuan.");
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMessage("Nomor rekening atau nomor akun wajib diisi.");
      return;
    }

    if (!accountName.trim()) {
      setErrorMessage("Nama pemilik rekening wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      await withdrawService.submitWithdrawal({
        amount: numericAmount.toString(),
        bankName: effectiveBankName,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Submit withdrawal error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal memproses penarikan saldo. Silakan coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-create-title"
        className="relative flex flex-col w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200/90 bg-white shadow-2xl ring-1 ring-inset ring-white/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
              <ArrowUpFromLine size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="withdraw-create-title"
                className="text-base sm:text-lg font-black tracking-tight text-slate-950 truncate"
              >
                Tarik Saldo DaPay
              </h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                Pencairan dana ke rekening bank atau e-wallet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup Form Tarik Saldo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY (SCROLLABLE FORM) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* BALANCE ASSET INFO */}
          <div className="rounded-2xl border border-rose-400/30 bg-linear-to-br from-rose-500 via-rose-600 to-orange-500 p-3.5 text-white shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-xs">
                  <CircleDollarSign size={15} />
                </div>
                <div>
                  <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-rose-100">
                    Saldo DaPay Tersedia
                  </p>
                  <p className="text-base font-black tracking-tight text-white leading-tight">
                    {formatRupiah(availableBalance)}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center rounded-full bg-white/20 border border-white/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                Bisa Ditarik
              </span>
            </div>
          </div>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <p className="leading-relaxed font-medium">{errorMessage}</p>
            </div>
          )}

          {/* BANK / E-WALLET SELECTION */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              Pilih Bank / E-Wallet Tujuan
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {BANK_PRESETS.map((bank) => {
                const isSelected = selectedBankCode === bank.code;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      setSelectedBankCode(bank.code);
                      setErrorMessage(null);
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? "border-rose-600 bg-rose-50/50 shadow-2xs ring-1 ring-rose-500"
                        : "border-slate-200/90 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg">
                      {bank.logoUrl ? (
                        <img
                          src={bank.logoUrl}
                          alt={bank.name}
                          className="h-full w-full object-contain"
                        />
                      ) : bank.type === "bank" ? (
                        <Building2 size={16} className="text-blue-600" />
                      ) : (
                        <WalletCards size={16} className="text-slate-600" />
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[10px] font-bold truncate max-w-full ${
                        isSelected ? "text-rose-700" : "text-slate-700"
                      }`}
                    >
                      {bank.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {isCustomBank && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  placeholder="Ketik nama bank (misal: Bank Mega / Jago / Seabank)"
                  className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>
            )}
          </div>

          {/* NOMINAL WITHDRAWAL & PRESETS */}
          <div>
            <label
              htmlFor="withdraw-amount-input"
              className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              Nominal Penarikan
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                Rp
              </span>
              <input
                id="withdraw-amount-input"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value.replace(/\D/g, ""));
                  setErrorMessage(null);
                }}
                placeholder="10000"
                className="h-11 w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-4 text-sm font-black text-slate-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            {/* PRESET PILLS */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handlePresetClick(amt)}
                  className="rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[10.5px] font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
                >
                  {formatRupiah(amt)}
                </button>
              ))}
              <button
                type="button"
                onClick={handleWithdrawAll}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10.5px] font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95 cursor-pointer"
              >
                Tarik Semua
              </button>
            </div>
          </div>

          {/* ACCOUNT NUMBER & ACCOUNT NAME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="withdraw-account-number"
                className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Nomor Rekening / Akun
              </label>
              <input
                id="withdraw-account-number"
                type="text"
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Contoh: 1234567890"
                className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label
                htmlFor="withdraw-account-name"
                className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Nama Pemilik Rekening
              </label>
              <input
                id="withdraw-account-name"
                type="text"
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Nama sesuai buku tabungan"
                className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          {/* ESTIMATION SUMMARY BOX */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Tujuan Penarikan:</span>
              <span className="font-bold text-slate-900">
                {effectiveBankName || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Nominal Penarikan:</span>
              <span className="font-black text-slate-900">
                {formatRupiah(numericAmount)}
              </span>
            </div>
            <div className="border-t border-slate-200/80 pt-1.5 flex items-center justify-between font-bold">
              <span className="text-slate-700">Estimasi Sisa Saldo:</span>
              <span className="font-mono text-emerald-700 font-bold">
                {formatRupiah(remainingBalance)}
              </span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={
              isSubmitting ||
              numericAmount < MIN_WITHDRAWAL ||
              numericAmount > availableBalance ||
              !effectiveBankName ||
              !accountNumber.trim() ||
              !accountName.trim()
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-bold text-white shadow-md transition hover:bg-rose-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Memproses Pengajuan...</span>
              </>
            ) : (
              <>
                <ArrowUpFromLine size={15} />
                <span>Ajukan Penarikan Saldo</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

