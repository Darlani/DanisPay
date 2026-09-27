"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { BrandItem } from "./ProductSection";

interface FavoriteSectionProps {
  allBrands: BrandItem[];
  favoriteSlugs: string[];
  onToggleFavorite: (slug: string) => void;
  isLoading?: boolean;
}

export default function FavoriteSection({
  allBrands,
  favoriteSlugs,
  onToggleFavorite,
  isLoading = false,
}: FavoriteSectionProps) {
  const { t, locale } = useI18n();

  // Ambil data brand lengkap yang terdaftar dalam favoriteSlugs
  const favoriteBrands = allBrands.filter((b) => favoriteSlugs.includes(b.slug));

  return (
    <section
      id="favorit-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-20 pt-3 pb-4"
      style={{ scrollMarginTop: "120px" }}
    >
      {/* Header Seksi */}
      <div className="flex items-center justify-between text-white mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-rose-500/20 border border-rose-500/40 p-1.5 rounded-lg text-rose-400">
            <Heart size={20} className="fill-rose-500 text-rose-500" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-1.5 leading-tight">
              {t("home.favoritesTitle")}
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {t("home.favoritesCount", { count: favoriteBrands.length })}
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-none mt-0.5">
              {t("home.favoritesSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Produk Favorit */}
      {favoriteBrands.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4 md:gap-5 justify-items-center items-start">
          {favoriteBrands.map((product) => (
            <div
              key={product.id || product.slug}
              className="group relative flex flex-col items-center text-center transition-transform duration-300 w-full max-w-[88px] sm:max-w-[100px]"
            >
              {/* Tombol Hapus Favorit Cepat (Icon Hati Pojok Atas) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(product.slug);
                }}
                className="absolute -top-1 -right-1 z-30 p-1 rounded-full bg-slate-900/90 border border-rose-500/50 text-rose-400 hover:text-white hover:bg-rose-600 shadow-md transition-all active:scale-90"
                title={t("home.removeFavorite")}
                aria-label={t("home.removeFavorite")}
              >
                <Heart size={11} className="fill-rose-500" />
              </button>

              <Link
                href={locale === "en" ? `/en/${product.slug}` : `/${product.slug}`}
                className="flex flex-col items-center w-full"
              >
                {/* App-Icon Squircle */}
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl md:rounded-[22px] overflow-hidden bg-slate-900 border border-slate-700/80 group-hover:border-rose-400 group-hover:shadow-[0_8px_25px_rgba(244,63,94,0.35)] group-hover:scale-105 transition-all duration-300">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, (max-width: 768px) 72px, 80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold bg-slate-800">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {/* Subtle Gloss Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10 pointer-events-none" />
                </div>

                {/* Teks Nama Produk di Luar Icon */}
                <span className="text-[11px] sm:text-xs font-semibold text-slate-200 group-hover:text-rose-400 mt-2 text-center line-clamp-2 leading-tight transition-colors">
                  {product.name}
                </span>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <Sparkles size={18} className="text-amber-400" />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            {t("home.noFavoritesDesc")}
          </p>
        </div>
      )}
    </section>
  );
}
