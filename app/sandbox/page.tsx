"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Award,
  AlertTriangle,
  Loader2,
  BookOpen,
  Smartphone,
  Wifi,
  Zap,
  Wallet,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import PublicSandboxFaqAccordion from "@/components/sandbox/PublicSandboxFaqAccordion";
import { CURATED_SANDBOX_PRODUCTS } from "@/lib/sandbox/curated-catalog";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  const isSecure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

function getOrCreateAnonymousId(): string {
  if (typeof document === "undefined") return "";
  const existing = getCookie("dapay_anon_id");
  if (existing && UUID_REGEX.test(existing)) {
    return existing.toLowerCase();
  }

  let newId: string;
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    newId = crypto.randomUUID();
  } else {
    newId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  newId = newId.toLowerCase();
  setCookie("dapay_anon_id", newId, COOKIE_MAX_AGE_SECONDS);
  return newId;
}

interface AttributionData {
  src: string;
  med: string;
  camp: string;
  ref: string;
  rfr: string;
  ts: number;
  first_src?: string | null;
  first_ts?: number | null;
}

function syncAttributionCookie(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source")?.trim() || "";
  const utmMedium = urlParams.get("utm_medium")?.trim() || "";
  const utmCampaign = urlParams.get("utm_campaign")?.trim() || "";
  const refParam = urlParams.get("ref")?.trim() || "";

  // Safe referrer domain extraction (hostname only, no full URL/query parameters)
  let referrerHost = "";
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.hostname && refUrl.hostname !== window.location.hostname) {
        referrerHost = refUrl.hostname.slice(0, 128);
      }
    } catch {
      // ignore invalid referrer
    }
  }

  // Check existing dapay_attr cookie
  const existingRaw = getCookie("dapay_attr");
  let existing: AttributionData | null = null;
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw);
      const now = Date.now();
      const ts = Number(parsed.ts);
      if (
        Number.isFinite(ts) &&
        ts <= now + 60000 &&
        ts >= now - ATTRIBUTION_WINDOW_MS
      ) {
        existing = parsed;
      }
    } catch {
      existing = null;
    }
  }

  const hasCampaignParams = Boolean(
    utmSource || utmMedium || utmCampaign || refParam
  );
  const now = Date.now();

  if (existing) {
    // Model: LAST-TOUCH WITH FIRST-TOUCH FALLBACK
    if (!hasCampaignParams) {
      return;
    }

    const updated: AttributionData = {
      src: utmSource || (referrerHost ? "referral" : existing.src || "direct"),
      med: utmMedium || (referrerHost ? "referral" : existing.med || "none"),
      camp: utmCampaign || "none",
      ref: refParam || "",
      rfr: referrerHost || existing.rfr || "",
      ts: now,
      first_src: existing.first_src || existing.src || "direct",
      first_ts: existing.first_ts || existing.ts || now,
    };

    setCookie("dapay_attr", JSON.stringify(updated), COOKIE_MAX_AGE_SECONDS);
  } else {
    const currentSrc = utmSource || (referrerHost ? "referral" : "direct");
    const currentMed = utmMedium || (referrerHost ? "referral" : "none");
    const currentCamp = utmCampaign || "none";

    const initial: AttributionData = {
      src: currentSrc,
      med: currentMed,
      camp: currentCamp,
      ref: refParam,
      rfr: referrerHost,
      ts: now,
      first_src: currentSrc,
      first_ts: now,
    };

    setCookie("dapay_attr", JSON.stringify(initial), COOKIE_MAX_AGE_SECONDS);
  }
}

// 4 Curated preview products for concrete educational demonstrations
const TEASER_SKUS = [
  "SIM-PULSA-TSEL-10K",
  "SIM-DATA-TSEL-5GB",
  "SIM-PLN-20K",
  "SIM-DANA-20K",
];

export default function PublicSandboxPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const hasFiredLandingRef = useRef(false);

  // Initial landing page view telemetry (Strictly once per lifecycle, StrictMode-guarded)
  useEffect(() => {
    if (hasFiredLandingRef.current) return;
    hasFiredLandingRef.current = true;

    try {
      const anonId = getOrCreateAnonymousId();
      syncAttributionCookie();

      // Fire sandbox_landing_view non-blocking
      fetch("/api/tester/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "sandbox_landing_view",
          anonymousId: anonId,
        }),
        credentials: "include",
      }).catch(() => {
        // Silently swallow telemetry error
      });
    } catch {
      // Telemetry initialization must never crash page
    }
  }, []);

  const handleCtaClick = async (location: "hero" | "bottom") => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const targetHref = session ? "/user" : "/login";

      // Best-effort telemetry dispatch before navigation
      try {
        const anonId = getOrCreateAnonymousId();
        await Promise.race([
          fetch("/api/tester/telemetry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventName: "sandbox_cta_click",
              anonymousId: anonId,
              metadata: {
                cta_location: location,
                target_href: targetHref,
              },
            }),
            credentials: "include",
            keepalive: true,
          }),
          new Promise((resolve) => setTimeout(resolve, 300)),
        ]);
      } catch {
        // Silently swallow error - CTA navigation must never be blocked
      }

      router.push(targetHref);
    } catch {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Resolve preview items from curated catalog
  const teaserProducts = TEASER_SKUS.map(
    (sku) => CURATED_SANDBOX_PRODUCTS.find((p) => p.sku === sku)
  ).filter(Boolean);

  const getProductCategoryIcon = (category?: string) => {
    switch (category) {
      case "pulsa":
        return <Smartphone size={16} className="text-amber-400" />;
      case "data":
        return <Wifi size={16} className="text-sky-400" />;
      case "pln":
        return <Zap size={16} className="text-emerald-400" />;
      case "emoney":
        return <Wallet size={16} className="text-violet-400" />;
      default:
        return <ShoppingBag size={16} className="text-amber-400" />;
    }
  };

  return (
    <>
      <title>Sandbox DaPay — Simulasi Bisnis Produk Digital</title>
      <meta
        name="description"
        content="Pelajari alur transaksi dan perkiraan margin produk digital melalui Sandbox DaPay menggunakan saldo virtual yang terpisah dari saldo kas LIVE."
      />

      <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-amber-500/30 selection:text-amber-200">
        {/* ================================================================== */}
        {/* 1. HERO SECTION                                                    */}
        {/* ================================================================== */}
        <section className="relative overflow-hidden pt-8 sm:pt-14 pb-10 sm:pb-16 border-b border-slate-800/80">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-linear-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-12 text-center">
            {/* Prominent Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-400 mb-4 sm:mb-6 shadow-xs">
              <FlaskConical size={14} className="text-amber-400 shrink-0" />
              <span>SANDBOX DAPAY • SIMULASI RESELLER DIGITAL</span>
            </div>

            {/* Headline & Subtitle */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight max-w-4xl mx-auto">
              Coba Simulasi Jual Pulsa & Produk Digital{" "}
              <span className="bg-linear-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Tanpa Modal Riil
              </span>
            </h1>

            <p className="mt-3.5 sm:mt-5 text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Latihan transaksi pulsa, paket data, dan token PLN menggunakan Saldo Virtual Sandbox. Pahami alur transaksi dan perkiraan margin sebelum menggunakan modal riil.
            </p>

            {/* CTAs */}
            <div className="mt-6 sm:mt-7 flex flex-col xs:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => handleCtaClick("hero")}
                disabled={isLoading}
                aria-label="Mulai Simulasi Gratis sekarang"
                className="w-full xs:flex-1 min-h-12 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>Mulai Simulasi Gratis</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("cara-kerja")}
                className="w-full xs:flex-1 min-h-12 flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              >
                <BookOpen size={16} className="text-amber-400" />
                <span>Pelajari Cara Kerja</span>
              </button>
            </div>

            {/* Supporting Micro-copy & Registration Expectation */}
            <div className="mt-3.5 space-y-1 text-center">
              <p className="text-[11px] font-semibold text-amber-400/90">
                Simulasi gratis • Saldo LIVE tidak digunakan
              </p>
              <p className="text-[10.5px] text-slate-400 max-w-md mx-auto leading-snug">
                Daftar akun gratis untuk mengaktifkan Sandbox dan mendapatkan saldo virtual Rp 1.000.000.
              </p>
            </div>

            {/* 3 Trust Highlights */}
            <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-left">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 sm:p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white">Rp 1.000.000 Saldo Virtual</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Disediakan gratis untuk berlatih simulasi transaksi produk.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 sm:p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white">Terisolasi 100%</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Sandbox tidak menggunakan saldo kas LIVE Anda.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 sm:p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white">Satu Akun Terpadu</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Beralih ke LIVE kapan saja dengan identitas akun yang sama.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 2. CONTOH PRODUK & PERKIRAAN MARGIN (TEASER PREVIEW)               */}
        {/* ================================================================== */}
        <section className="py-10 sm:py-14 border-b border-slate-800/80 bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Contoh Produk & Perkiraan Margin
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Produk Digital yang Bisa Anda Simulasikan
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Pelajari contoh harga modal simulasi dan perkiraan selisih harga jual di konter retail.
              </p>
            </div>

            {/* 4 Concrete Product Preview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {teaserProducts.map((prod) => {
                if (!prod) return null;
                const margin = prod.suggestedSellingPrice - prod.demoPrice;
                return (
                  <div
                    key={prod.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          {getProductCategoryIcon(prod.category)}
                          {prod.categoryLabel}
                        </span>
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                          Simulasi
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Modal Simulasi:</span>
                        <span className="font-mono text-slate-200">
                          Rp {prod.demoPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Contoh Jual:</span>
                        <span className="font-mono text-slate-200">
                          Rp {prod.suggestedSellingPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800 font-bold">
                        <span className="text-emerald-400">Perkiraan Margin:</span>
                        <span className="font-mono text-emerald-400">
                          +Rp {margin.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Single Educational Transaction Margin Illustration */}
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 max-w-2xl mx-auto text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-400" />
                  Contoh Ilustrasi Perhitungan Margin
                </span>
                <span className="text-[9.5px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  1 Transaksi
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sebagai contoh, pada produk Telkomsel Pulsa 10K: Modal demo Rp 10.500 dengan contoh harga jual konter Rp 12.000 menghasilkan perkiraan margin +Rp 1.500 per transaksi simulasi.
              </p>
              <p className="mt-2 text-[10px] text-amber-300/80 italic">
                *Perkiraan margin bersifat ilustratif untuk latihan bisnis, bukan jaminan keuntungan riil.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 3. CARA KERJA SANDBOX (3-STEP CONCISE WORKFLOW)                     */}
        {/* ================================================================== */}
        <section id="cara-kerja" className="py-10 sm:py-14 border-b border-slate-800/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Alur Praktis 3 Langkah
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Bagaimana Cara Kerja Sandbox?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Mulai dari aktivasi demo gratis hingga siap bertransaksi riil.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                      01
                    </span>
                    <ShoppingBag size={16} className="text-slate-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Daftar & Aktifkan Demo</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Daftar akun gratis dalam 1 menit. Langsung terima Rp 1.000.000 saldo virtual untuk mencoba sistem tanpa deposit riil.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                      02
                    </span>
                    <FlaskConical size={16} className="text-slate-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Latihan Transaksi & Margin</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Praktekkan pembelian pulsa, paket data, dan token PLN ke nomor simulasi. Pelajari alur pesanan instan dan perkiraan marginnya.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-xs">
                      03
                    </span>
                    <CheckCircle2 size={16} className="text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-amber-400">Siap? Beralih ke LIVE</h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Setelah memahami sistem dan merasa cocok, Anda dapat langsung beralih ke Member LIVE menggunakan akun yang sama.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 4. APA YANG BISA DIPELAJARI? (MANFAAT PEMBELAJARAN)                 */}
        {/* ================================================================== */}
        <section className="py-10 sm:py-14 border-b border-slate-800/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Manfaat Pembelajaran
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Apa yang Bisa Anda Pelajari?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Membangun pemahaman operasional praktis sebelum melayani pembeli riil.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-2.5">
                  <ShoppingBag size={16} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">Eksplorasi Produk Reseller</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Mengetahui ragam nominal pulsa, paket kuota, dan token PLN yang paling diminati pembeli konter di Indonesia.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-2.5">
                  <TrendingUp size={16} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">Kalkulasi Perkiraan Margin</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Melihat gambaran selisih harga modal demo dengan contoh harga jual untuk menentukan perkiraan margin yang wajar.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-2.5">
                  <ShieldCheck size={16} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">Praktek Alur Tanpa Cemas</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Membiasakan diri dengan langkah input nomor tujuan, pengecekan rincian produk, hingga verifikasi status pesanan berhasil.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-2.5">
                  <Award size={16} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">Pahami Manfaat Akun</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Mencoba simulasi akun Reguler dan Spesial untuk memahami keuntungan cashback dan komisi jaringan referral secara langsung.
                </p>
              </div>
            </div>

            {/* Crucial Statutory Disclaimer Box */}
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-4.5 flex items-start gap-3 text-xs text-amber-300/90 leading-relaxed">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Catatan Penting:</strong> DaPay Sandbox adalah sarana edukasi dan simulasi. Perkiraan margin bersifat ilustratif untuk latihan bisnis, bukan jaminan keuntungan riil di dunia nyata.
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 5. REGULAR VS SPECIAL (BENEFIT COMPARISON)                          */}
        {/* ================================================================== */}
        <section className="py-10 sm:py-14 border-b border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Transparansi Manfaat Akun
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Perbandingan Member: Reguler vs Spesial
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Pahami perbedaan skema reward yang berlaku sesuai kebijakan bisnis DaPay.
              </p>
            </div>

            {/* Stacked responsive cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Regular Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-300 border border-slate-700">
                      Standar
                    </span>
                    <span className="text-xs text-slate-400">Tipe Awal</span>
                  </div>

                  <h3 className="text-base font-black text-white">Member Reguler</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Cocok untuk pemula yang ingin mulai bertransaksi tanpa syarat target bulanan.
                  </p>

                  <div className="mt-4 space-y-2.5 pt-3.5 border-t border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Harga Promo Produk</span>
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 size={14} /> Termasuk
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Komisi Referral Teman</span>
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 size={14} /> Termasuk
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Cashback Transaksi</span>
                      <span className="flex items-center gap-1 font-bold text-slate-500">
                        <XCircle size={14} /> Tidak Ada
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
                  Nikmati kemudahan transaksi dasar & peluang komisi referral.
                </div>
              </div>

              {/* Special Card */}
              <div className="rounded-2xl border border-amber-500/40 bg-linear-to-b from-amber-500/10 via-slate-900/80 to-slate-900/50 p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-linear-to-l from-amber-500 to-orange-500 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950 rounded-bl-xl shadow-xs">
                  Ekstra Keuntungan
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-400 border border-amber-500/30">
                      Mitra Utama
                    </span>
                    <span className="text-xs text-amber-400 font-semibold">Tipe Spesial</span>
                  </div>

                  <h3 className="text-base font-black text-white">Member Spesial</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Dirancang untuk konter aktif yang menginginkan reward tambahan per transaksi.
                  </p>

                  <div className="mt-4 space-y-2.5 pt-3.5 border-t border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Harga Promo Produk</span>
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 size={14} /> Termasuk
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Komisi Referral Teman</span>
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 size={14} /> Termasuk
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Cashback Transaksi</span>
                      <span className="flex items-center gap-1 font-bold text-amber-400">
                        <CheckCircle2 size={14} /> Koin Sandbox
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-amber-300/80 text-center">
                  Cashback transaksi diberikan dalam bentuk Koin reward.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 6. FAQ (9 ACCORDION QUESTIONS PRESERVED)                           */}
        {/* ================================================================== */}
        <section className="py-10 sm:py-14 border-b border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Pusat Bantuan & Informasi
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Pertanyaan yang Sering Diajukan
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Jawaban resmi seputar ketentuan, saldo virtual, dan operasional Sandbox DaPay.
              </p>
            </div>

            <PublicSandboxFaqAccordion />
          </div>
        </section>

        {/* ================================================================== */}
        {/* 7. FINAL CTA BANNER                                                */}
        {/* ================================================================== */}
        <section className="py-10 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 text-center">
            <div className="rounded-3xl border border-amber-500/30 bg-linear-to-b from-amber-500/15 via-slate-900/80 to-slate-900/60 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400 mb-4 border border-amber-500/30">
                <Sparkles size={14} />
                <span>Mulai Tanpa Modal Riil</span>
              </div>

              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                Siap Memulai Langkah Pertama Bisnis Digital Anda?
              </h2>

              <p className="mt-3 text-xs sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
                Simulasi gratis untuk mengenal cara kerja DaPay. Aktivasi menggunakan akun DaPay dan saldo virtual Sandbox.
              </p>

              <div className="mt-6 sm:mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => handleCtaClick("bottom")}
                  disabled={isLoading}
                  className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-6 sm:px-8 py-3.5 text-xs sm:text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Mulai Simulasi Gratis</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <p className="mt-4 text-[11px] text-slate-400">
                Membutuhkan akun terdaftar dengan email terverifikasi. Bukan untuk akun Admin/Manager.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
