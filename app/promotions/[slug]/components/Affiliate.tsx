"use client";

import { useState } from "react";
import { 
  HelpCircle, 
  ChevronDown, 
  UserPlus, 
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Coins,
  Share2,
  Users,
  Check,
  Sparkles,
  Zap,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { type Locale, localizeHref } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import AffiliateCalculator from "./AffiliateCalculator";

const FAQ_ID = [
  {
    q: "Berapa komisi yang saya dapatkan?",
    a: "Komisi dihitung dari profit murni setiap transaksi digital yang dilakukan oleh jaringan referral Anda. Anda memperoleh persentase komisi hingga 7% pada transaksi perdana teman Anda, dan komisi berkelanjutan hingga 5% untuk seluruh transaksi berikutnya seumur hidup tanpa batas waktu."
  },
  {
    q: "Kapan saya dapat menarik komisi saya?",
    a: "Komisi referral masuk secara OTOMATIS & REAL-TIME detik itu juga langsung ke Saldo DaPay Anda setiap kali pesanan referral berhasil. Anda tidak perlu menunggu tanggal 15 atau mengajukan request bulanan — saldo komisi langsung menyatu dan dapat ditarik (withdraw) kapan saja ke rekening bank (BCA, Mandiri, BRI, BNI) atau E-Wallet (DANA, OVO, GoPay) melalui menu Penarikan Saldo di dashboard."
  },
  {
    q: "Bagaimana cara untuk mendapatkan afiliasi baru?",
    a: "Sangat mudah! Bagikan link referral singkat Anda (format: dapay.id/ref/KODE_ANDA) ke teman terdekat atau media sosial seperti WhatsApp, Telegram, TikTok, dan Instagram. Siapapun yang mendaftar melalui link tersebut otomatis terkunci menjadi bawahan (downline) afiliasi Anda selamanya."
  },
  {
    q: "Bagaimana saya mendapatkan link dan kode referal?",
    a: "Anda hanya perlu mendaftar akun gratis di DaPay. Setelah login, kode unik dan link referral singkat Anda otomatis tersedia pada halaman Dashboard Akun di menu Afiliasi."
  },
  {
    q: "Bagaimana cara kerja link referal saya?",
    a: "Tautan singkat dapay.id/ref/KODE_ANDA akan otomatis memverifikasi kode Anda dan mengunci kolom referral saat calon mitra membuka formulir pendaftaran. Begitu pendaftaran selesai, sistem DaPay langsung mencatat mitra tersebut ke dalam jaringan Anda."
  },
  {
    q: "Bagaimana cara menjadi member khusus (Special Member)?",
    a: "Anda dapat melakukan upgrade status akun menjadi Special Member secara instan kapan saja melalui tombol 'Upgrade Member' di Dashboard Akun. Biaya upgrade sangat terjangkau, dipotong satu kali dari saldo DaPay Anda tanpa memerlukan syarat kuota transaksi bulanan."
  },
  {
    q: "Apa saja keuntungan menjadi Special Member?",
    a: "Sebagai Special Member, Anda menikmati keuntungan ganda (Double Cuan): (1) Mendapatkan Cashback Otomatis pada setiap transaksi produk digital pribadi Anda (Member Reguler tidak mendapat cashback), dan (2) Tetap menerima komisi referral penuh dari seluruh transaksi jaringan mitra Anda."
  },
  {
    q: "Ke mana saya bisa bertanya jika masih ada yang belum jelas?",
    a: "Kami menyediakan grup komunitas resmi mitra DaPay di WhatsApp. Anda dapat bergabung melalui link yang tersedia di dashboard atau halaman ini untuk berdiskusi, mendapatkan materi promosi, dan strategi optimasi cuan bersama tim kami."
  }
];

const FAQ_EN = [
  {
    q: "How much commission do I earn?",
    a: "Commissions are calculated from the net profit of every digital transaction completed by your referral network. You earn up to 7% commission on your invited friend's first transaction, and continuous 5% commission on all subsequent transactions for a lifetime with no expiration."
  },
  {
    q: "When can I withdraw my commission?",
    a: "Referral commissions are credited AUTOMATICALLY & IN REAL-TIME straight into your DaPay Balance the instant an order is marked successful. You do not need to wait until the 15th of the month or submit monthly requests — your commission immediately becomes part of your balance and can be withdrawn anytime to your bank account (BCA, Mandiri, BRI, BNI) or E-Wallet (DANA, OVO, GoPay) via the Withdraw menu on your dashboard."
  },
  {
    q: "How do I acquire new affiliates?",
    a: "It's easy! Share your short referral link (format: dapay.id/ref/YOUR_CODE) with friends or on social media such as WhatsApp, Telegram, TikTok, and Instagram. Anyone who signs up via your link is permanently attributed to your affiliate downline network."
  },
  {
    q: "How do I get my referral link and code?",
    a: "Simply sign up for a free DaPay account. Once logged in, your unique referral code and short sharing link are immediately accessible on your Account Dashboard under the Affiliate tab."
  },
  {
    q: "How does my referral link work?",
    a: "Your short link (dapay.id/ref/YOUR_CODE) automatically verifies your referral code and locks it into the registration form for incoming visitors. Once registration is complete, our system permanently links the new member under your network."
  },
  {
    q: "How do I become a Special Member?",
    a: "You can upgrade to Special Member status instantly at any time by clicking the 'Upgrade Member' button in your Account Dashboard. The upgrade fee is an affordable one-time deduction from your DaPay balance, with zero monthly quota requirements."
  },
  {
    q: "What are the benefits of becoming a Special Member?",
    a: "As a Special Member, you enjoy double earnings: (1) Earn Automatic Cashback on every digital transaction made from your own personal account (Regular members do not receive cashback), and (2) Continue receiving full referral commissions from your entire partner network."
  },
  {
    q: "Where can I ask questions if anything is unclear?",
    a: "We provide an official DaPay Partner Community on WhatsApp. You can join directly via the link in your dashboard or on this page to discuss strategies, access marketing assets, and get direct assistance from our team."
  }
];

export default function AffiliateSection({ locale }: { locale?: Locale }) {
  const { t, locale: contextLocale } = useI18n();
  const currentLocale = locale || contextLocale || "id";
  const isEnglish = currentLocale === "en";
  const faqData = isEnglish ? FAQ_EN : FAQ_ID;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="space-y-14 sm:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. HERO SECTION: Tech Grid Canvas & Ambient Aurora Glow */}
      <section
        aria-labelledby="affiliate-hero-title"
        className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-10 lg:p-14 shadow-2xl backdrop-blur-md"
      >
        {/* Subtle Tech Grid Pattern */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_65%,transparent_100%)] pointer-events-none"
        />

        {/* Ambient Aurora Glow Orbs */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/4 left-1/6 w-72 h-72 bg-indigo-500/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 right-1/6 w-72 h-72 bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              {t("promo.detail.affiliatePartnerProgram")}
            </span>
          </div>

          {/* Unified H1 Typography */}
          <h1 id="affiliate-hero-title" className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            {t("promo.detail.affiliateHeroTitle1")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500">
              {t("promo.detail.affiliateHeroTitle2")}
            </span>
            <span className="block text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-400 mt-2">
              {t("promo.detail.affiliateHeroWith")}{" "}
              <span className="text-white underline decoration-blue-500 underline-offset-8 decoration-2">
                {t("promo.detail.affiliateHeroBrand")}
              </span>
            </span>
          </h1>

          {/* Marketing Value Proposition */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl">
            {t("promo.detail.affiliateHeroDesc")}
          </p>

          {/* Live Trust Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium">
              <Zap size={13} className="text-blue-400" />
              <span>{isEnglish ? "Instant Auto-Payout" : "Pencairan Otomatis Real-Time"}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>{isEnglish ? "100% Free Registration" : "100% Bebas Biaya Pendaftaran"}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium">
              <Coins size={13} className="text-amber-400" />
              <span>{isEnglish ? "Lifetime Passive Income" : "Komisi Berjalan Seumur Hidup"}</span>
            </span>
          </div>

          {/* Call to Action Button */}
          <div className="pt-2">
            <Link
              href={localizeHref("/register", currentLocale)}
              className="inline-flex items-center gap-3 bg-white text-slate-950 px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl font-bold uppercase text-xs sm:text-sm tracking-wider transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 shadow-xl shadow-white/10 group"
            >
              <UserPlus size={18} className="text-blue-600" />
              <span>{t("promo.detail.affiliateRegisterNow")}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. TRUST & METRICS BAR */}
      <section aria-label={isEnglish ? "Key Partner Metrics" : "Statistik Utama Kemitraan"}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 text-center space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-blue-400">7% + 5%</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isEnglish ? "Revenue Share Rate" : "Bagi Hasil Komisi"}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isEnglish ? "7% on first order, 5% on all recurring orders" : "7% order perdana downline, 5% order berikutnya seumur hidup"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 text-center space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400">Rp 0</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isEnglish ? "Zero Capital" : "Bebas Modal Awal"}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isEnglish ? "No deposit or registration fees required" : "Mulai tanpa syarat deposit atau biaya registrasi"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 text-center space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-400">24/7</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isEnglish ? "Real-Time Crediting" : "Otomatis & Real-Time"}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isEnglish ? "Instant credit to DaPay Balance upon order completion" : "Komisi detik itu juga masuk langsung ke Saldo DaPay"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 text-center space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-amber-400">100%</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isEnglish ? "Instant Withdrawal" : "Pencairan Kapan Saja"}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isEnglish ? "Withdraw anytime to Bank or E-Wallet (DANA/OVO)" : "Tarik saldo kapan saja ke Bank atau E-Wallet"}
            </p>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE COMMISSION CALCULATOR */}
      <AffiliateCalculator locale={currentLocale} />

      {/* 4. 3-STEP JOURNEY */}
      <section aria-labelledby="affiliate-steps-heading" className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Zap size={14} />
            <span>{isEnglish ? "QUICK START" : "PANDUAN MUDAH"}</span>
          </div>
          <h2 id="affiliate-steps-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t("promo.detail.affiliateStepsTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t("promo.detail.affiliateStepsSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Step 1 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-7 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Share2 size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {t("promo.detail.affiliateStep1Title")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              {t("promo.detail.affiliateStep1Desc")}
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-7 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {t("promo.detail.affiliateStep2Title")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              {t("promo.detail.affiliateStep2Desc")}
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-7 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {t("promo.detail.affiliateStep3Title")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              {t("promo.detail.affiliateStep3Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* 5. 4 VALUE BENEFITS */}
      <section aria-label={isEnglish ? "Partner Benefits" : "Keunggulan Kemitraan"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-base font-bold text-white">
              {t("promo.detail.affiliateBenefit1Title")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              {t("promo.detail.affiliateBenefit1Desc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-bold text-white">
              {t("promo.detail.affiliateBenefit2Title")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              {t("promo.detail.affiliateBenefit2Desc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1">
              <Coins size={20} />
            </div>
            <h3 className="text-base font-bold text-white">
              {t("promo.detail.affiliateBenefit3Title")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              {t("promo.detail.affiliateBenefit3Desc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1">
              <Sparkles size={20} />
            </div>
            <h3 className="text-base font-bold text-white">
              {t("promo.detail.affiliateBenefit4Title")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              {t("promo.detail.affiliateBenefit4Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* 6. TIER COMPARISON MATRIX */}
      <section aria-labelledby="affiliate-tiers-heading" className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>{isEnglish ? "COMMISSION TIERS" : "JENJANG KEMITRAAN"}</span>
          </div>
          <h2 id="affiliate-tiers-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t("promo.detail.affiliateTierTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t("promo.detail.affiliateTierSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Regular Tier */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {t("promo.detail.affiliateTierReguler")}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isEnglish ? "Standard Partner Program" : "Mitra Standar DaPay"}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-semibold uppercase rounded-full border border-slate-700">
                  {isEnglish ? "Default" : "Otomatis"}
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-black tracking-tight text-blue-400">
                {t("promo.detail.affiliateTierRegulerRate")}
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800 font-normal">
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>{isEnglish ? "100% Free registration without fees" : "100% Gratis pendaftaran tanpa biaya"}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>{isEnglish ? "7% commission on first order, 5% on recurring orders" : "Komisi 7% transaksi perdana, 5% transaksi berikutnya seumur hidup"}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>{isEnglish ? "Instant & real-time crediting to DaPay Balance" : "Komisi masuk otomatis & real-time detik itu juga ke Saldo DaPay"}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>{isEnglish ? "Withdraw anytime to Bank & E-Wallet" : "Bebas tarik saldo kapan saja ke Bank & E-Wallet"}</span>
                </li>
              </ul>
            </div>

            <Link
              href={localizeHref("/register", currentLocale)}
              className="w-full text-center py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors"
            >
              {t("promo.detail.affiliateRegisterNow")}
            </Link>
          </div>

          {/* Special Tier */}
          <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl ring-1 ring-amber-500/20">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {t("promo.detail.affiliateTierSpecial")}
                  </h3>
                  <p className="text-xs text-amber-300 mt-0.5 font-medium">
                    {isEnglish ? "VIP Business Partner" : "Kemitraan Tingkat Lanjut"}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase rounded-full">
                  {t("promo.detail.affiliateTierSpecialBadge")}
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400">
                {t("promo.detail.affiliateTierSpecialRate")}
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200 pt-4 border-t border-slate-800 font-normal">
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>{isEnglish ? "Exclusive Automatic Cashback on personal purchases" : "Cashback Otomatis di Setiap Transaksi Pribadi"}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {isEnglish ? "Full lifetime network referral commissions remain active" : "Komisi Referral Jaringan Tetap Berjalan Penuh Seumur Hidup"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>{isEnglish ? "Instant one-time upgrade via Member Dashboard" : "Upgrade instan satu kali via Dashboard Member"}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>{isEnglish ? "Priority Support & WhatsApp partner community access" : "Prioritas Layanan & Akses WhatsApp Group Komunitas"}</span>
                </li>
              </ul>
            </div>

            <Link
              href={localizeHref("/register", currentLocale)}
              className="w-full text-center py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors shadow-md shadow-blue-600/30"
            >
              {t("promo.detail.affiliateRegisterNow")}
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION (Zero-Clipping Accessible CSS Grid Accordion) */}
      <section aria-labelledby="affiliate-faq-heading" className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-400 mb-1">
            <HelpCircle size={28} />
          </div>
          <h2 id="affiliate-faq-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t("promo.detail.affiliateFaqTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t("promo.detail.affiliateFaqSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-w-3xl mx-auto">
          {faqData.map((item, index) => (
            <div
              key={index}
              className={`border transition-colors duration-200 rounded-2xl overflow-hidden ${
                openFaq === index
                  ? "bg-slate-900/90 border-blue-500/40 shadow-lg shadow-blue-900/10"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <button
                id={`faq-btn-${index}`}
                aria-controls={`faq-panel-${index}`}
                aria-expanded={openFaq === index}
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer"
              >
                <span className={`font-semibold text-xs sm:text-sm pr-4 transition-colors ${
                  openFaq === index ? "text-blue-400" : "text-slate-200"
                }`}>
                  {index + 1}. {item.q}
                </span>
                <div className={`p-1.5 rounded-lg transition-transform duration-300 shrink-0 ${
                  openFaq === index ? "bg-blue-500 text-white rotate-180" : "bg-slate-800 text-slate-400"
                }`}>
                  <ChevronDown size={16} />
                </div>
              </button>

              {/* CSS Grid Animated Accordion: Zero text-clipping */}
              <div
                id={`faq-panel-${index}`}
                role="region"
                aria-labelledby={`faq-btn-${index}`}
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  openFaq === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="p-4 sm:p-5 pt-0 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-slate-800/80 font-normal">
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. WHATSAPP SUPPORT & COMMUNITY */}
      <section aria-labelledby="affiliate-community-heading">
        <div className="max-w-4xl mx-auto rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-md shadow-emerald-500/30 shrink-0">
              <MessageCircle size={28} />
            </div>
            <div className="space-y-1">
              <h3 id="affiliate-community-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {t("promo.detail.affiliateHelpTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-xl">
                {t("promo.detail.affiliateHelpDesc")}
              </p>
            </div>
          </div>
          <Link
            href="https://chat.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-600/30 group"
          >
            <span>{t("promo.detail.affiliateJoinCommunity")}</span>
            <ExternalLink size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </section>

    </div>
  );
}
