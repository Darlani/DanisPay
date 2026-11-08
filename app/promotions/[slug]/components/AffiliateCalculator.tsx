"use client";

import { useState, useId } from "react";
import { Calculator, TrendingUp, Users, ArrowRight, Sparkles, ShoppingBag, Coins } from "lucide-react";
import Link from "next/link";
import { type Locale, localizeHref } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

interface AffiliateCalculatorProps {
  locale?: Locale;
}

export default function AffiliateCalculator({ locale }: AffiliateCalculatorProps) {
  const { t, locale: contextLocale } = useI18n();
  const currentLocale = locale || contextLocale || "id";
  const isEnglish = currentLocale === "en";

  const friendsInputId = useId();
  const txInputId = useId();
  const personalTxInputId = useId();

  // Slider state
  const [friendsCount, setFriendsCount] = useState<number>(25);
  const [txPerMonth, setTxPerMonth] = useState<number>(4);
  const [personalTx, setPersonalTx] = useState<number>(10);
  const [selectedTier, setSelectedTier] = useState<"regular" | "special">("regular");

  // Rata-rata komisi referral riil DaPay per transaksi (~5-7% dari profit murni produk)
  const AVG_REFERRAL_COMMISSION_PER_TX = 500;
  // Rata-rata cashback eksklusif Special Member per transaksi pribadi
  const AVG_SPECIAL_CASHBACK_PER_TX = 1500;

  const totalMonthlyDownlineTx = friendsCount * txPerMonth;
  const referralIncomeMonthly = totalMonthlyDownlineTx * AVG_REFERRAL_COMMISSION_PER_TX;

  // Untuk Special Member, tambahkan cashback belanja pribadi
  const personalCashbackMonthly = selectedTier === "special" ? personalTx * AVG_SPECIAL_CASHBACK_PER_TX : 0;
  const totalMonthlyIncome = referralIncomeMonthly + personalCashbackMonthly;
  const totalYearlyIncome = totalMonthlyIncome * 12;

  const formatCurrency = (val: number) => {
    if (isEnglish) {
      return `IDR ${val.toLocaleString("en-US")}`;
    }
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Posisi progress bar slider
  const friendsProgress = ((friendsCount - 5) / (200 - 5)) * 100;
  const txProgress = ((txPerMonth - 1) / (20 - 1)) * 100;
  const personalProgress = ((personalTx - 1) / (30 - 1)) * 100;

  return (
    <section aria-labelledby="affiliate-calc-heading" className="space-y-6">
      {/* Header Kalkulator */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
          <Calculator size={14} className="text-blue-400" />
          <span>{isEnglish ? "PROFIT SIMULATOR" : "SIMULASI PENGHASILAN"}</span>
        </div>
        <h3 id="affiliate-calc-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {t("promo.detail.affiliateCalcTitle")}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {t("promo.detail.affiliateCalcSubtitle")}
        </p>
      </div>

      {/* Main Container Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-7 lg:p-8 shadow-2xl backdrop-blur-md">

        {/* Tier Selector Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {isEnglish ? "Select Simulation Tier:" : "Pilih Jenjang Simulasi:"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTier("regular")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTier === "regular"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {t("promo.detail.affiliateTierReguler")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier("special")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedTier === "special"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles size={13} className="text-amber-300" />
                {t("promo.detail.affiliateTierSpecial")}
              </button>
            </div>
          </div>

          {/* Tier Description Badge */}
          <div className="text-xs">
            {selectedTier === "special" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
                <Sparkles size={14} className="text-amber-400 shrink-0" />
                {isEnglish
                  ? "Double Benefit: Network Commission + Personal Purchases Cashback!"
                  : "Double Cuan: Komisi Referral Jaringan + Cashback Belanja Sendiri!"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 font-medium">
                <Coins size={14} className="text-blue-400 shrink-0" />
                {isEnglish ? "Standard Referral Commission on all invited members" : "Komisi referral seumur hidup dari semua mitra terdaftar"}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Kolom Kiri: Range Sliders (7 Kolom) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Slider 1: Jumlah Teman */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label htmlFor={friendsInputId} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-200">
                  <Users size={16} className="text-blue-400" />
                  <span>{t("promo.detail.affiliateCalcFriends")}</span>
                </label>
                <span className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 font-bold text-blue-400 text-sm">
                  {friendsCount} {isEnglish ? "Friends" : "Teman"}
                </span>
              </div>
              <div className="relative">
                <input
                  id={friendsInputId}
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={friendsCount}
                  onChange={(e) => setFriendsCount(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, rgb(59, 130, 246) ${friendsProgress}%, rgb(30, 41, 59) ${friendsProgress}%)`
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-hidden"
                  aria-label={t("promo.detail.affiliateCalcFriends")}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>5 {isEnglish ? "friends" : "orang"}</span>
                <span>100 {isEnglish ? "friends" : "orang"}</span>
                <span>200+ {isEnglish ? "friends" : "orang"}</span>
              </div>
            </div>

            {/* Slider 2: Rata-rata Transaksi Bulanan Teman */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label htmlFor={txInputId} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-200">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <span>{t("promo.detail.affiliateCalcMonthlyTx")}</span>
                </label>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-bold text-emerald-400 text-sm">
                  {txPerMonth}x {isEnglish ? "/ month" : "/ bulan"}
                </span>
              </div>
              <div className="relative">
                <input
                  id={txInputId}
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={txPerMonth}
                  onChange={(e) => setTxPerMonth(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, rgb(16, 185, 129) ${txProgress}%, rgb(30, 41, 59) ${txProgress}%)`
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-hidden"
                  aria-label={t("promo.detail.affiliateCalcMonthlyTx")}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>1x ({isEnglish ? "Casual" : "Santai"})</span>
                <span>10x ({isEnglish ? "Active" : "Aktif"})</span>
                <span>20x ({isEnglish ? "Power User" : "Super Aktif"})</span>
              </div>
            </div>

            {/* Slider 3: Belanja Pribadi (Hanya muncul jika Special Member) */}
            {selectedTier === "special" && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <label htmlFor={personalTxInputId} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-300">
                    <ShoppingBag size={16} className="text-amber-400" />
                    <span>{t("promo.detail.affiliateCalcPersonalTx")}</span>
                  </label>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 font-bold text-amber-300 text-sm">
                    {personalTx}x {isEnglish ? "/ month" : "/ bulan"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    id={personalTxInputId}
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={personalTx}
                    onChange={(e) => setPersonalTx(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, rgb(245, 158, 11) ${personalProgress}%, rgb(30, 41, 59) ${personalProgress}%)`
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-hidden"
                    aria-label={t("promo.detail.affiliateCalcPersonalTx")}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>1x ({isEnglish ? "Personal" : "Pribadi"})</span>
                  <span>15x ({isEnglish ? "Daily" : "Rutin"})</span>
                  <span>30x ({isEnglish ? "Reseller" : "Jualan"})</span>
                </div>
              </div>
            )}

            {/* Formula Breakdown Indicator */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">{t("promo.detail.affiliateCalcReferralCommission")}:</span>
                <span className="text-slate-300 font-medium">
                  {friendsCount} teman × {txPerMonth} tx × Rp {AVG_REFERRAL_COMMISSION_PER_TX.toLocaleString("id-ID")} = {formatCurrency(referralIncomeMonthly)}
                </span>
              </div>
              {selectedTier === "special" && (
                <div className="flex items-center justify-between text-[11px] text-amber-400/90 pt-1 border-t border-slate-800">
                  <span className="font-mono">{t("promo.detail.affiliateCalcPersonalCashback")}:</span>
                  <span className="font-semibold">
                    {personalTx} tx × Rp {AVG_SPECIAL_CASHBACK_PER_TX.toLocaleString("id-ID")} = {formatCurrency(personalCashbackMonthly)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Output Proyeksi Pendapatan (5 Kolom) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/80 p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-inner">
            <div className="space-y-6">
              {/* Estimasi Komisi Bulanan */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {selectedTier === "special"
                    ? t("promo.detail.affiliateCalcTotalIncome")
                    : t("promo.detail.affiliateCalcEstMonthly")}
                </p>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-emerald-400">
                  {formatCurrency(totalMonthlyIncome)}
                  <span className="text-xs font-medium text-slate-400 ml-2">
                    {isEnglish ? "/ month" : "/ bulan"}
                  </span>
                </div>
              </div>

              {/* Estimasi Komisi Tahunan */}
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {t("promo.detail.affiliateCalcEstYearly")}
                </p>
                <div className="text-xl sm:text-2xl font-black tracking-tight text-blue-400">
                  {formatCurrency(totalYearlyIncome)}
                  <span className="text-xs font-medium text-slate-400 ml-2">
                    {isEnglish ? "/ year" : "/ tahun"}
                  </span>
                </div>
              </div>

              {/* Catatan Penarikan */}
              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                {t("promo.detail.affiliateCalcNote")}
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-6">
              <Link
                href={localizeHref("/register", currentLocale)}
                className="w-full inline-flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white py-3.5 px-6 rounded-xl font-bold uppercase text-xs tracking-wider transition-all hover:shadow-lg hover:shadow-blue-600/30 group"
              >
                <span>{t("promo.detail.affiliateRegisterNow")}</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
