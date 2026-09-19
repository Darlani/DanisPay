import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Tag, ArrowLeft, ArrowUpRight, Sparkles, Gift, Percent, AlertCircle, Layers } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { listSectionsByPage, resolveSectionContents } from "@/lib/cms/content-service";
import type { ContentSection } from "@/lib/cms/types";
import { type Locale, localizeHref } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/dictionaries";
import PromoSection from "./components/PromoSection";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Promo & Diskon Terkini - DaPay",
  description:
    "Dapatkan promo top-up game murah, diskon voucher, dan cashback transaksi harian di DaPay.",
};

interface BannerItem {
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

const PROMO_CATEGORY_KEYS = ["all", "game", "ppob", "entertainment", "affiliate"] as const;

export default async function PromoPage({
  searchParams,
  locale = "id",
}: {
  searchParams: Promise<{ category?: string }>;
  locale?: Locale;
}) {
  const resolvedParams = await searchParams;
  const currentCategory = (resolvedParams.category || "all").toLowerCase();
  const t = createTranslator(locale);

  let banners: BannerItem[] = [];
  let fetchError: string | null = null;

  // 1. Fetch CMS Promo Sections (Admin Curated, server-enforced max 6) with locale
  const sectionsResult = await listSectionsByPage("PROMO", true);
  const activeSections: ContentSection[] = sectionsResult.isError ? [] : sectionsResult.data;

  // 2. Targeted, deduplicated section datasets (each query applies DB filters, sort, display_limit, locale)
  const sectionData = await resolveSectionContents(activeSections, locale);

  try {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) {
      fetchError = t("promo.errorFetch");
    } else {
      banners = (data || []) as BannerItem[];
    }
  } catch {
    fetchError = t("promo.errorGeneric");
  }

  const filteredBanners = banners.filter((banner) => {
    if (currentCategory === "all") return true;
    const itemCat = (banner.category || "").toLowerCase().trim();
    return itemCat === currentCategory;
  });

  const hasAnyContent = Boolean(sectionData.length > 0 || filteredBanners.length > 0);

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 space-y-12">

        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            href={localizeHref("/", locale)}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg px-2 py-1 -ml-2"
          >
            <ArrowLeft size={14} />
            <span>{t("common.backToHome")}</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <Tag size={13} />
            <span>{t("promo.badge")}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            {t("promo.title")}
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-400">
            {t("promo.description")}
          </p>
        </header>

        {/* CMS Curated Sections (Top priority when configured) */}
        {sectionData.length > 0 && (
          <div className="space-y-12">
            {sectionData.map(({ section, items }) => (
              <PromoSection key={section.id} section={section} items={items} locale={locale} />
            ))}
          </div>
        )}

        {/* Legacy Banner Section: Visual Promotions */}
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
          <nav aria-label={t("promo.categoriesFilterAria")} className="flex flex-wrap items-center gap-2 pt-2">
            {PROMO_CATEGORY_KEYS.map((catKey) => {
              const isActive = currentCategory === catKey;
              const rawHref = catKey === "all" ? "/promo" : `/promo?category=${catKey}`;
              const href = localizeHref(rawHref, locale);
              const label = t(`promo.categories.${catKey}`, catKey);

              return (
                <Link
                  key={catKey}
                  href={href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-500"
                      : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  {label}
                </Link>
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
            <section aria-label="Daftar Promo Aktif" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {filteredBanners.map((banner) => {
                const rawDestination =
                  banner.href && banner.href.trim() && banner.href !== "#"
                    ? banner.href.trim()
                    : `/promotions/${banner.id}`;

                // Internal destinations get localized via localizeHref, external URLs remain untouched
                const destination = rawDestination.startsWith("/")
                  ? localizeHref(rawDestination, locale)
                  : rawDestination;

                return (
                  <article
                    key={banner.id}
                    className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {/* Banner Image Container */}
                    <div className="relative aspect-16/9 w-full bg-slate-950 overflow-hidden">
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
                    </div>

                    {/* Banner Content Body */}
                    <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                          {banner.alt}
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
                              <span>{t("promo.cashbackLabel", { cashback: banner.cashback })}</span>
                            </span>
                          )}
                          {banner.promo_code && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-300">
                              <Gift size={10} />
                              <span>{t("promo.codeLabel", { code: banner.promo_code })}</span>
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
          ) : !fetchError && currentCategory !== "all" ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
              {t("promo.noBannersInCategory", { category: currentCategory })}
              <Link href={localizeHref("/promo", locale)} className="ml-2 font-bold text-blue-400 underline">
                {t("promo.showAllCategories")}
              </Link>
            </div>
          ) : null}
        </section>

        {/* Global Empty State when zero CMS promos and zero banners exist */}
        {!hasAnyContent && !fetchError && (
          <section
            aria-label="Promo Kosong"
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 md:p-16 text-center shadow-xl backdrop-blur-xs"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/80 text-slate-400 shadow-md">
              <Tag size={28} />
            </div>

            <h2 className="mt-6 text-lg sm:text-xl font-bold text-white">
              {t("promo.emptyTitle")}
            </h2>

            <p className="mx-auto mt-2.5 max-w-md text-xs sm:text-sm leading-relaxed text-slate-400">
              {t("promo.emptyDesc")}
            </p>

            {currentCategory !== "all" && (
              <div className="mt-6">
                <Link
                  href={localizeHref("/promo", locale)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {t("promo.showAllCategories")}
                </Link>
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}
