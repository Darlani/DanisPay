import type { Metadata } from "next";
import Link from "next/link";
import { Tag, ArrowLeft } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { listSectionsByPage, resolveSectionContents } from "@/lib/cms/content-service";
import type { ContentSection } from "@/lib/cms/types";
import { type Locale, localizeHref } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/dictionaries";
import PromoSection from "./components/PromoSection";
import PromoCatalogClient, { type BannerItem } from "./components/PromoCatalogClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Promo & Diskon Terkini - DaPay",
  description:
    "Dapatkan promo top-up game murah, diskon voucher, dan cashback transaksi harian di DaPay.",
};


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

  const hasAnyContent = Boolean(sectionData.length > 0 || banners.length > 0);

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

        {/* Client-Side Promo Visual Catalog with Instant 0ms Filter */}
        <PromoCatalogClient
          banners={banners}
          initialCategory={currentCategory}
          locale={locale}
          fetchError={fetchError}
        />

        {/* Global Empty State when zero CMS promos and zero banners exist */}
        {!hasAnyContent && !fetchError && (
          <section
            aria-label={t("promo.emptyTitle")}
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
