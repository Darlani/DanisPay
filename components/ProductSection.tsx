'use client';

import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/context';
import DaPayHot from '@/components/dapay/DaPayHot';
import DaPayCheck from '@/components/dapay/DaPayCheck';

export interface BrandItem {
  id: number | string;
  name: string;
  slug: string;
  image_url: string | null;
  is_hot?: boolean;
  is_selected?: boolean;
}

interface ProductSectionProps {
  title: string;
  category: string;
  id?: string;
  brands?: BrandItem[];
  isLoading?: boolean;
  hasTopSection?: boolean;
}

export default function ProductSection({
  title,
  category,
  id,
  brands = [],
  isLoading = false,
  hasTopSection = false,
}: ProductSectionProps) {
  const { t, locale } = useI18n();
  const isPopular = category === 'popular';
  const initialLimit = isPopular ? 8 : 12;
  const [limit, setLimit] = useState(initialLimit);

  // Sembunyikan section total jika tidak loading dan tidak ada produk
  if (!isLoading && brands.length === 0) {
    return null;
  }

  const visibleProducts = brands.slice(0, limit);

  return (
    // Section Populer Sekarang dibuat lebih ke atas agar langsung terlihat di bawah banner
    <section
      id={id}
      className={`max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-20 ${
        isPopular
          ? hasTopSection
            ? 'pt-2 sm:pt-3 pb-2 sm:pb-3'
            : 'mt-1 sm:mt-1.5 pt-0 pb-2 sm:pb-3'
          : 'pt-6 pb-4'
      }`}
      style={{ scrollMarginTop: '120px' }}
    >
      {isPopular ? (
        /* Dark Premium Surface - Single Seamless Card with Audited Lekukan Top Edge */
        <div
          className="relative rounded-b-2xl sm:rounded-b-3xl bg-slate-900/90 border border-slate-800/90 pt-8 sm:pt-9 md:pt-10 pb-4 sm:pb-5 px-3.5 sm:px-5 md:px-6 shadow-2xl backdrop-blur-md overflow-hidden"
          style={{
            clipPath: 'polygon(0% 0px, 26.46% 0px, 27.71% 14px, 42.96% 14px, 43.90% 21px, 47.95% 21px, 50.00% 7px, 52.05% 21px, 56.10% 21px, 57.04% 14px, 72.29% 14px, 73.54% 0px, 100% 0px, 100% 100%, 0% 100%)'
          }}
        >
          {/* Integrated Glowing Laser Filament Top Border */}
          <div className="absolute top-0 inset-x-0 h-8 pointer-events-none select-none z-20">
            <svg
              viewBox="0 0 1000 38"
              preserveAspectRatio="none"
              className="w-full h-full block"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="popLaserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="26.46%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="73.54%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
                </linearGradient>
                <filter id="popLaserGlow" x="-10%" y="-50%" width="120%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
                </filter>
              </defs>
              {/* Outer Amber Halo */}
              <path
                d="M 0,0 L 264.6,0 L 277.1,14 L 429.6,14 L 439.0,21 L 479.5,21 L 500.0,7 L 520.5,21 L 561.0,21 L 570.4,14 L 722.9,14 L 735.4,0 L 1000,0"
                stroke="url(#popLaserGrad)"
                strokeWidth="3.2"
                filter="url(#popLaserGlow)"
                opacity="0.65"
              />
              {/* Sharp Laser Filament */}
              <path
                d="M 0,0 L 264.6,0 L 277.1,14 L 429.6,14 L 439.0,21 L 479.5,21 L 500.0,7 L 520.5,21 L 561.0,21 L 570.4,14 L 722.9,14 L 735.4,0 L 1000,0"
                stroke="url(#popLaserGrad)"
                strokeWidth="1.6"
              />
            </svg>
          </div>

          {/* Subtle Ambient Glows */}
          <div className="absolute -top-16 -left-16 w-56 sm:w-80 h-56 sm:h-80 bg-linear-to-br from-amber-500/15 via-orange-500/8 to-transparent rounded-full blur-3xl pointer-events-none select-none" />
          <div className="absolute -bottom-16 -right-16 w-56 sm:w-80 h-56 sm:h-80 bg-linear-to-tl from-amber-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none select-none" />

          {/* Top-Left Diagonal Gold/Amber Geometric Decoration */}
          <svg
            className="absolute top-0 left-0 w-44 sm:w-64 md:w-80 h-24 sm:h-36 md:h-44 pointer-events-none select-none opacity-40 sm:opacity-50"
            viewBox="0 0 380 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="goldGeom1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="60%" stopColor="#ea580c" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="goldLine1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="0,0 260,0 140,120 0,90" fill="url(#goldGeom1)" />
            <line x1="0" y1="20" x2="210" y2="170" stroke="url(#goldLine1)" strokeWidth="1.2" />
            <line x1="0" y1="45" x2="175" y2="185" stroke="url(#goldLine1)" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.6" />
          </svg>

          {/* Bottom-Right Subtle Diagonal Geometric Facet Detail (Desktop & Tablet) */}
          <svg
            className="hidden sm:block absolute bottom-0 right-0 w-52 sm:w-68 md:w-80 h-20 sm:h-30 md:h-36 pointer-events-none select-none opacity-30 sm:opacity-40"
            viewBox="0 0 350 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="goldGeom2" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                <stop offset="70%" stopColor="#d97706" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="goldLine2" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="350,140 160,140 250,50 350,70" fill="url(#goldGeom2)" />
            <line x1="350" y1="110" x2="170" y2="25" stroke="url(#goldLine2)" strokeWidth="1" />
            <line x1="350" y1="85" x2="220" y2="10" stroke="url(#goldLine2)" strokeWidth="0.75" strokeDasharray="5 3" opacity="0.6" />
          </svg>

          {/* Relative Content Layer */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between text-white mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                {isPopular ? (locale === 'en' ? 'Popular' : 'Populer') : title}
                {isLoading && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
              </h3>
            </div>

            {/* App-Icon Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4 md:gap-5 justify-items-center items-start">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <div key={`skel-pop-${i}`} className="flex flex-col items-center gap-2 animate-pulse w-full max-w-22">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl md:rounded-[22px] bg-slate-800/80 border border-slate-700/60" />
                    <div className="w-14 h-3 bg-slate-800/80 rounded" />
                  </div>
                ))
              ) : (
                visibleProducts.map((product, index) => {
                  const isHot = Boolean(product.is_hot);

                  return (
                    <Link
                      key={product.id || product.slug}
                      href={locale === "en" ? `/en/${product.slug}` : `/${product.slug}`}
                      className="group flex flex-col items-center text-center transition-transform duration-300 w-full max-w-22 sm:max-w-25 outline-none focus-visible:outline-none focus:outline-none"
                    >
                      {/* App-Icon Squircle Wrapper */}
                      <div className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl md:rounded-[22px] transition-all duration-300 group-hover:shadow-[0_4px_20px_rgba(220,38,38,0.22)] group-focus:shadow-[0_4px_20px_rgba(220,38,38,0.22)] group-focus-within:shadow-[0_4px_20px_rgba(220,38,38,0.22)] group-hover:scale-105 group-focus:scale-105 group-focus-within:scale-105">
                        {/* 2px Shared Gradient Ring Overlay (100% Synced with DaPayHot/DaPayCheck 135deg ribbon gradient) */}
                        <div
                          className="absolute inset-0 rounded-2xl md:rounded-[22px] p-0.5 pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
                          style={{
                            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 60%, #B91C1C 100%)',
                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            WebkitMaskComposite: 'xor',
                            maskComposite: 'exclude',
                          }}
                        />

                        {/* Inner Image Container (Strictly Rounded & Clipped, houses image & badges flush at top-0 left-0) */}
                        <div className="absolute inset-0 rounded-2xl md:rounded-[22px] overflow-hidden bg-slate-900 border border-slate-700/80 group-hover:border-transparent group-focus:border-transparent group-focus-within:border-transparent transition-colors duration-300">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 64px, (max-width: 768px) 72px, 80px"
                              priority={index < 8}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-400 font-bold text-xl">
                              {product.name?.charAt(0)}
                            </div>
                          )}

                          {/* 1. Reusable DaPayHot Badge (Data-Authoritative, cross-fades smoothly on hover/focus) */}
                          {isHot && (
                            <DaPayHot className="absolute top-0 left-0 z-10 transition-opacity duration-200 group-hover:opacity-0 group-focus:opacity-0 group-focus-within:opacity-0" />
                          )}

                          {/* 2. Reusable DaPayCheck Badge (Top-Left, Hover / Focus Visual Feedback) */}
                          <DaPayCheck className="absolute top-0 left-0 z-10 opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-focus-visible:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200" />
                        </div>
                      </div>

                      {/* Judul di Bawah Icon: Baseline Normal -> Hover/Fokus Bold with DaPayHot #EF4444 Accent */}
                      <p className="mt-2 text-[11px] sm:text-xs font-normal text-slate-200 group-hover:font-bold group-focus:font-bold group-focus-within:font-bold group-hover:text-[#EF4444] group-focus:text-[#EF4444] group-focus-within:text-[#EF4444] line-clamp-2 leading-tight transition-all duration-200">
                        {product.name}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Show All Button if > 8 items */}
            {!isLoading && brands.length > initialLimit && (
              <div className="mt-5 sm:mt-6 flex justify-center">
                <button
                  onClick={() => setLimit(limit === initialLimit ? brands.length : initialLimit)}
                  className="px-6 sm:px-8 py-2 sm:py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white hover:bg-slate-800/80 hover:border-amber-500/50 hover:text-amber-300 transition-all text-[12px] font-medium shadow-lg"
                >
                  {limit === initialLimit ? t("products.game.showAll") : t("products.game.showLess")}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Regular Category Grid */
        <>
          <div className="flex items-center justify-between text-white mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <LayoutGrid size={20} />
              </div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                {title}
                {isLoading && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={`skel-${i}`} className="aspect-3/4 bg-slate-800 rounded-xl animate-pulse border border-slate-700" />
              ))
            ) : (
              visibleProducts.map((product, index) => (
                <Link
                  key={product.id || product.slug}
                  // Pertahankan prefix locale aktif: /en/:slug atau /:slug
                  href={locale === "en" ? `/en/${product.slug}` : `/${product.slug}`}
                  className="group flex flex-col rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-slate-900"
                >
                  {/* Bagian Gambar (Atas) */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 768px) 33vw, 15vw"
                        priority={index < 6}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 font-bold text-3xl">
                        {product.name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Bagian Teks (Bawah) - Center & Background Berbeda */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-center items-center text-center bg-slate-800 border-t border-slate-700">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                      {product.name}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {!isLoading && brands.length > initialLimit && (
            // Turunkan margin top dari mt-10 ke mt-6 agar serasi
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setLimit(limit === initialLimit ? brands.length : initialLimit)}
                className="px-8 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 hover:border-blue-500 transition-all text-[12px] font-medium shadow-lg"
              >
                {limit === initialLimit ? t("products.game.showAll") : t("products.game.showLess")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
