import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { listContents, listSectionsByPage, resolveSectionContents } from "@/lib/cms/content-service";
import type { ContentSection, PublicContent } from "@/lib/cms/types";
import NewsHero from "./components/NewsHero";
import NewsCard from "./components/NewsCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Berita & Pengumuman - DaPay",
  description:
    "Informasi terbaru mengenai update sistem, fitur baru, dan event resmi DaPay.",
};

export default async function NewsPage() {
  // 1. Fetch active sections configured for NEWS page
  const sectionsResult = await listSectionsByPage("NEWS", true);
  const activeSections: ContentSection[] = sectionsResult.isError ? [] : sectionsResult.data;

  // 2. Concurrently resolve:
  //    - Hero NEWS candidate (strictly type=NEWS, ordered by featured -> priority -> published_at)
  //    - Fallback NEWS archive (top 12 latest NEWS items)
  //    - Targeted, deduplicated section datasets (each query applies DB filters, sort, and display_limit)
  const [heroResult, fallbackResult, sectionData] = await Promise.all([
    listContents(
      {
        type: "NEWS",
        sortBy: "priority_desc",
        limit: 1,
      },
      true, // Canonical public eligibility
    ),
    listContents(
      {
        type: "NEWS",
        sortBy: "published_desc",
        limit: 12,
      },
      true, // Canonical public eligibility
    ),
    resolveSectionContents(activeSections),
  ]);

  const heroItem: PublicContent | null =
    !heroResult.isError && heroResult.data.items.length > 0 ? heroResult.data.items[0] : null;

  const fallbackNews: PublicContent[] = !fallbackResult.isError ? fallbackResult.data.items : [];
  const remainingNewsFallback = heroItem
    ? fallbackNews.filter((item) => item.id !== heroItem.id)
    : fallbackNews;

  const hasAnyContent = Boolean(heroItem || sectionData.length > 0 || remainingNewsFallback.length > 0);

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 space-y-10">

        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg px-2 py-1 -ml-2"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-400">
            <Newspaper size={13} />
            <span>BERITA & PENGUMUMAN</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Kabar Terbaru DaPay
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-400">
            Informasi terbaru mengenai pembaruan layanan, fitur, dan pengumuman resmi DaPay.
          </p>
        </header>

        {hasAnyContent ? (
          <div className="space-y-12">
            {/* Hero Headline */}
            {heroItem && <NewsHero content={heroItem} />}

            {/* Configured Sections */}
            {sectionData.map(({ section, items }) => (
              <section key={section.id} className="space-y-5" aria-labelledby={`section-${section.section_key}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 id={`section-${section.section_key}`} className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {section.title}
                    </h2>
                    {section.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{section.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-500 uppercase">
                    {items.length} artikel
                  </span>
                </div>

                <div
                  className={
                    section.layout === "list"
                      ? "space-y-3"
                      : section.layout === "grid-2"
                        ? "grid gap-6 sm:grid-cols-2"
                        : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  }
                >
                  {items.map((item) => (
                    <NewsCard
                      key={item.id}
                      content={item}
                      layout={section.layout === "list" ? "list" : "grid"}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Fallback Grid when no section is configured or for remaining news */}
            {sectionData.length === 0 && remainingNewsFallback.length > 0 && (
              <section className="space-y-5" aria-label="Semua Artikel Berita">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Semua Berita
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Arsip informasi dan pengumuman terbaru.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {remainingNewsFallback.map((item) => (
                    <NewsCard key={item.id} content={item} layout="grid" />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Official Empty State */
          <section
            aria-label="Daftar Berita"
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 md:p-16 text-center shadow-xl backdrop-blur-xs"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/80 text-slate-400 shadow-md">
              <Newspaper size={28} />
            </div>

            <h2 className="mt-6 text-lg sm:text-xl font-bold text-white">
              Belum Ada Berita Terbaru
            </h2>

            <p className="mx-auto mt-2.5 max-w-md text-xs sm:text-sm leading-relaxed text-slate-400">
              Informasi dan pembaruan resmi terkait layanan DaPay akan ditampilkan di halaman ini ketika tersedia.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-blue-400" />
                <span>Diperbarui secara berkala</span>
              </div>
              <span className="hidden sm:inline text-slate-700">•</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Saluran Komunikasi Resmi</span>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Jelajahi Produk
              </Link>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
