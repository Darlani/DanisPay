'use client';

import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/context';
import DaPayHot from '@/components/dapay/DaPayHot';
import DaPayCheck from '@/components/dapay/DaPayCheck';
import PopularFrameSvg from '@/components/dapay/PopularFrameSvg';

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
            : 'mt-0 pt-0 pb-2 sm:pb-3'
          : 'pt-6 pb-4'
      }`}
      style={{ scrollMarginTop: '120px' }}
    >
      {isPopular ? (
        /* Vector SVG Container Populer (100% Sesuai Spesifikasi HTML/SVG User) */
        <PopularFrameSvg className="select-none">
          {/* Header: Title "Populer" Murni (Tanpa Icon Api, Tanpa Tombol Ekstra) */}
          <div className="flex items-center justify-between text-white shrink-0 px-1 sm:px-1.5 md:px-2">
            <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 sm:gap-2">
              {isPopular ? (locale === 'en' ? 'Popular' : 'Populer') : title}
              {isLoading && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />}
            </h3>
          </div>

          {/* App-Icon Grid Container: Vertically centered in the frame body */}
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-8 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 justify-items-center items-start w-full px-0.5 sm:px-1">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <div key={`skel-pop-${i}`} className="flex flex-col items-center gap-1 sm:gap-1.5 animate-pulse w-full max-w-18 sm:max-w-19 md:max-w-20 lg:max-w-22 xl:max-w-24">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-[68px] xl:h-[68px] rounded-xl sm:rounded-2xl md:rounded-[20px] lg:rounded-[22px] bg-slate-800/80 border border-slate-700/60" />
                    <div className="w-10 sm:w-12 md:w-14 h-2.5 sm:h-3 bg-slate-800/80 rounded" />
                  </div>
                ))
              ) : (
                visibleProducts.map((product, index) => {
                  const isHot = Boolean(product.is_hot);

                  return (
                    <Link
                      key={product.id || product.slug}
                      href={locale === "en" ? `/en/${product.slug}` : `/${product.slug}`}
                      className="group flex flex-col items-center text-center transition-transform duration-300 w-full max-w-18 sm:max-w-19 md:max-w-20 lg:max-w-22 xl:max-w-24 outline-none focus-visible:outline-none focus:outline-none"
                    >
                      {/* App-Icon Squircle Wrapper */}
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-[68px] xl:h-[68px] rounded-xl sm:rounded-2xl md:rounded-[20px] lg:rounded-[22px] transition-all duration-300 group-hover:shadow-[0_4px_20px_rgba(220,38,38,0.22)] group-focus:shadow-[0_4px_20px_rgba(220,38,38,0.22)] group-focus-within:shadow-[0_4px_20px_rgba(220,38,38,0.22)] group-hover:scale-105 group-focus:scale-105 group-focus-within:scale-105">
                        {/* 2px Shared Gradient Ring Overlay (100% Synced with DaPayHot/DaPayCheck 135deg ribbon gradient) */}
                        <div
                          className="absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-[20px] lg:rounded-[22px] p-0.5 pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
                          style={{
                            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 60%, #B91C1C 100%)',
                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            WebkitMaskComposite: 'xor',
                            maskComposite: 'exclude',
                          }}
                        />

                        {/* Inner Image Container (Strictly Rounded & Clipped, houses image & badges flush at top-0 left-0) */}
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-[20px] lg:rounded-[22px] overflow-hidden bg-slate-900 border border-slate-700/80 group-hover:border-transparent group-focus:border-transparent group-focus-within:border-transparent transition-colors duration-300">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 44px, (max-width: 768px) 56px, 68px"
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
                      <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-normal text-slate-200 group-hover:font-bold group-focus:font-bold group-focus-within:font-bold group-hover:text-[#EF4444] group-focus:text-[#EF4444] group-focus-within:text-[#EF4444] line-clamp-2 leading-tight transition-all duration-200 w-full px-0.5">
                        {product.name}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </PopularFrameSvg>
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
