"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Sparkles,
  Gift,
  Percent,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { type Locale, localizeHref } from "@/lib/i18n/config";

export interface BannerItem {
  id: number | string;
  src: string;
  alt: string;
  promo?: string | null;
  href?: string | null;
  category?: string | null;
  description?: string | null;
  promo_code?: string | null;
  cashback?: string | null;
  is_active?: boolean;
}

const PROMO_CATEGORY_KEYS = [
  "all",
  "game",
  "ppob",
  "entertainment",
  "affiliate",
] as const;

interface PromoCatalogClientProps {
  banners: BannerItem[];
  initialCategory?: string;
  locale?: Locale;
  fetchError?: string | null;
}

export default function PromoCatalogClient({
  banners,
  initialCategory = "all",
  locale: propLocale,
  fetchError,
}: PromoCatalogClientProps) {
  const { t, locale: ctxLocale } = useI18n();
  const locale = propLocale || ctxLocale || "id";

  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return (initialCategory || "all").toLowerCase().trim();
  });

  const handleCategorySelect = (catKey: string) => {
    setActiveCategory(catKey);
    if (typeof window !== "undefined") {
      const rawHref = catKey === "all" ? "/promo" : `/promo?category=${catKey}`;
      const href = localizeHref(rawHref, locale);
      window.history.replaceState(null, "", href);
    }
  };

  const filteredBanners = useMemo(() => {
    if (activeCategory === "all") return banners;
    return banners.filter(
      (banner) => (banner.category || "").toLowerCase().trim() === activeCategory
    );
  }, [banners, activeCategory]);

  return (
    <section className="space-y-5" aria-label={t("promo.visualCatalogTitle")}>
      <div className="flex flex-col gap-1 border-b border-slate-800 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">
            <Layers size={11} />
            <span>{t("promo.visualCatalogBadge")}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {t("promo.visualCatalogTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {t("promo.visualCatalogDesc")}
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 uppercase">
          {t("promo.activeBannersCount", { count: filteredBanners.length })}
        </span>
      </div>

      {/* Category Filter Tabs */}
      <nav
        aria-label={t("promo.categoriesFilterAria")}
        className="flex flex-wrap items-center gap-2 pt-2"
      >
        {PROMO_CATEGORY_KEYS.map((catKey) => {
          const isActive = activeCategory === catKey;
          const label = t(`promo.categories.${catKey}`, catKey);

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => handleCategorySelect(catKey)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-500 font-bold"
                  : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* Error Alert */}
      {fetchError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-300">
          <AlertCircle size={16} className="shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Promo Grid */}
      {!fetchError && filteredBanners.length > 0 ? (
        <section
          aria-label={t("promo.activePromosList")}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2"
        >
          {filteredBanners.map((banner) => {
            const rawDestination =
              banner.href && banner.href.trim() && banner.href !== "#"
                ? banner.href.trim()
                : `/promotions/${banner.id}`;

            const destination = rawDestination.startsWith("/")
              ? localizeHref(rawDestination, locale)
              : rawDestination;

            return (
              <article
                key={banner.id}
                className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.99]"
              >
                {/* Banner Image Container */}
                <Link
                  href={destination}
                  className="block relative aspect-16/9 w-full bg-slate-950 overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label={banner.alt || "Promo DaPay"}
                >
                  <Image
                    src={banner.src}
                    alt={banner.alt || "Promo DaPay"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent opacity-60" />

                  {/* Badge Promo di atas gambar */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {banner.promo && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                        <Sparkles size={11} />
                        <span>{banner.promo}</span>
                      </span>
                    )}
                    {banner.category && (
                      <span className="inline-flex items-center rounded-lg bg-slate-950/80 backdrop-blur-xs border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                        {banner.category}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Banner Content Body */}
                <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white transition-colors group-hover:text-blue-400 line-clamp-2">
                      <Link
                        href={destination}
                        className="hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                      >
                        {banner.alt}
                      </Link>
                    </h3>

                    {banner.description && (
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {banner.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Extras (Cashback & Promo Code) */}
                  {(banner.cashback || banner.promo_code) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {banner.cashback && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          <Percent size={10} />
                          <span>
                            {t("promo.cashbackLabel", {
                              cashback: banner.cashback,
                            })}
                          </span>
                        </span>
                      )}
                      {banner.promo_code && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-300">
                          <Gift size={10} />
                          <span>
                            {t("promo.codeLabel", {
                              code: banner.promo_code,
                            })}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <Link
                      href={destination}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      aria-label={`${t("promo.viewPromo")} ${banner.alt || "DaPay"}`}
                    >
                      <span>{t("promo.viewPromo")}</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : !fetchError && activeCategory !== "all" ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
          {t("promo.noBannersInCategory", { category: activeCategory })}
          <button
            type="button"
            onClick={() => handleCategorySelect("all")}
            className="ml-2 font-bold text-blue-400 underline cursor-pointer hover:text-blue-300"
          >
            {t("promo.showAllCategories")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
