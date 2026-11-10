"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankName: string;
  isManual?: boolean;
  accountNo?: string;
  accountName?: string;
}

export default function PaymentInstructionsModal({
  isOpen,
  onClose,
  bankName,
  isManual = false,
  accountNo = "-",
  accountName = "-",
}: PaymentInstructionsModalProps) {
  const { t } = useI18n();
  const [openSection, setOpenSection] = useState<"atm" | "ib" | "mb" | null>("atm");

  if (!isOpen) return null;

  const toggleSection = (section: "atm" | "ib" | "mb") => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const cleanBank = bankName ? bankName.replace(/^VA\s*/i, "").replace(/^Transfer\s*(Bank)?\s*/i, "").trim() : "Bank";
  const displayName = isManual
    ? `Bank ${cleanBank}`
    : bankName.toUpperCase().includes("VA")
    ? bankName
    : `VA ${cleanBank}`;

  const modalTitle = isManual
    ? `Cara Transfer ${displayName}`
    : t("checkout.howToPayTitle", { method: displayName });

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-101 bg-[#0d1424] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-800 text-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {modalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content / Accordions */}
        <div className="p-5 space-y-3 overflow-y-auto">
          {/* Accordion 1: Transfer Melalui ATM */}
          <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("atm")}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-blue-400 hover:bg-slate-850/60 transition-colors cursor-pointer"
            >
              <span>{t("checkout.atmTransfer")}</span>
              {openSection === "atm" ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>
            {openSection === "atm" && (
              <div className="p-4 pt-0 border-t border-slate-800/80 text-xs text-slate-300 space-y-2">
                {isManual ? (
                  <ol className="list-decimal list-outside pl-4 space-y-1.5 leading-relaxed">
                    <li>Masukkan kartu ATM dan 6 digit PIN Anda</li>
                    <li>
                      Pilih menu <strong className="text-white">Transfer</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Ke Rekening {cleanBank}</strong> (atau pilih Transfer Antar Bank jika menggunakan bank berbeda)
                    </li>
                    <li>
                      Masukkan nomor rekening tujuan:{" "}
                      <strong className="text-blue-300 font-mono text-sm">{accountNo}</strong>
                      {accountName !== "-" && (
                        <span> (a.n. <strong className="text-white">{accountName}</strong>)</span>
                      )}
                    </li>
                    <li>
                      Masukkan nominal transfer <strong className="text-white">tepat sesuai total tagihan</strong>
                    </li>
                    <li>Periksa kembali data nama penerima dan nominal, lalu konfirmasi transaksi</li>
                    <li>Transaksi telah selesai, mohon disimpan struk fisik bukti pembayarannya.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-outside pl-4 space-y-1.5 leading-relaxed">
                    <li>
                      Menu <strong className="text-white">Lainnya</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Transfer</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Rekening Tabungan</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Ke Rekening {displayName.replace(/VA\s*/i, "")}</strong>
                    </li>
                    <li>Input nomor virtual account</li>
                    <li>Input nominal transfer</li>
                    <li>Konfirmasi pemindahbukuan</li>
                    <li>Transaksi telah selesai, mohon disimpan bukti pembayarannya.</li>
                  </ol>
                )}
              </div>
            )}
          </div>

          {/* Accordion 2: Internet Banking */}
          <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("ib")}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-blue-400 hover:bg-slate-850/60 transition-colors cursor-pointer"
            >
              <span>{t("checkout.internetBanking")}</span>
              {openSection === "ib" ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>
            {openSection === "ib" && (
              <div className="p-4 pt-0 border-t border-slate-800/80 text-xs text-slate-300 space-y-2">
                {isManual ? (
                  <ol className="list-decimal list-outside pl-4 space-y-1.5 leading-relaxed">
                    <li>Login ke situs resmi Internet Banking Anda</li>
                    <li>
                      Pilih menu <strong className="text-white">Transfer Dana</strong> &rarr;{" "}
                      <strong className="text-white">Transfer ke Rekening Bank</strong>
                    </li>
                    <li>
                      Pilih bank tujuan <strong className="text-white">{cleanBank}</strong> dan masukkan nomor rekening tujuan:{" "}
                      <strong className="text-blue-300 font-mono text-sm">{accountNo}</strong>
                    </li>
                    <li>
                      Masukkan nominal transfer <strong className="text-white">tepat sesuai total yang tertera</strong>
                    </li>
                    <li>Masukkan kode otentikasi token perbankan Anda</li>
                    <li>Konfirmasi transaksi dan simpan bukti transfer digital.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-outside pl-4 space-y-1.5 leading-relaxed">
                    <li>
                      Menu <strong className="text-white">Transfer</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Tambah Rekening Favorit</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Antar Rekening {displayName.replace(/VA\s*/i, "")}</strong>
                    </li>
                    <li>
                      Bila menggunakan desktop untuk menambah rekening: menu{" "}
                      <strong className="text-white">Transaksi</strong>, lalu{" "}
                      <strong className="text-white">Atur Rekening Tujuan</strong>,{" "}
                      <strong className="text-white">Tambah Rekening Tujuan</strong>
                    </li>
                    <li>Masukan nama dan nomor virtual account</li>
                    <li>Input kode otentikasi token</li>
                    <li>Rekening tujuan berhasil ditambahkan</li>
                    <li>
                      Kembali ke menu <strong className="text-white">Transfer</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Transfer Antar Rekening {displayName.replace(/VA\s*/i, "")}</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Rekening Tujuan</strong>
                    </li>
                    <li>Pilih rekening debet dan input nominal transfer</li>
                    <li>Input kode otentikasi token</li>
                    <li>Transaksi telah selesai, mohon disimpan bukti pembayarannya.</li>
                  </ol>
                )}
              </div>
            )}
          </div>

          {/* Accordion 3: Mobile Banking */}
          <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("mb")}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-blue-400 hover:bg-slate-850/60 transition-colors cursor-pointer"
            >
              <span>{t("checkout.mobileBanking")}</span>
              {openSection === "mb" ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>
            {openSection === "mb" && (
              <div className="p-4 pt-0 border-t border-slate-800/80 text-xs text-slate-300 space-y-2">
                {isManual ? (
                  <ol className="list-decimal list-outside pl-4 space-y-1.5 leading-relaxed">
                    <li>Buka dan login ke aplikasi Mobile Banking Anda</li>
                    <li>
                      Pilih menu <strong className="text-white">Transfer</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Antar Rekening {cleanBank}</strong> atau{" "}
                      <strong className="text-white">Transfer Antar Bank</strong>
                    </li>
                    <li>
                      Masukkan nomor rekening tujuan:{" "}
                      <strong className="text-blue-300 font-mono text-sm">{accountNo}</strong>
                      {accountName !== "-" && (
                        <span> (a.n. <strong className="text-white">{accountName}</strong>)</span>
                      )}
                    </li>
                    <li>
                      Masukkan jumlah transfer <strong className="text-white">persis sesuai total tagihan</strong>
                    </li>
                    <li>Masukkan PIN transaksi dan periksa nama penerima sebelum konfirmasi</li>
                    <li>Transaksi berhasil, simpan tangkapan layar (screenshot) sebagai bukti transfer.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-outside pl-4 space-y-1.5 leading-relaxed">
                    <li>
                      Menu <strong className="text-white">Transfer</strong>
                    </li>
                    <li>
                      Pilih <strong className="text-white">Antar Rekening {displayName.replace(/VA\s*/i, "")}</strong> dan{" "}
                      <strong className="text-white">Input Rekening Baru</strong>
                    </li>
                    <li>Input rekening pengirim</li>
                    <li>Input nomor virtual account di rekening tujuan</li>
                    <li>Input nominal transfer</li>
                    <li>Input password dan konfirmasi transaksi</li>
                    <li>Transaksi telah selesai, mohon disimpan bukti pembayarannya.</li>
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
