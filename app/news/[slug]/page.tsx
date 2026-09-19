import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, ExternalLink, ShieldCheck, Tag } from "lucide-react";
import { getPublicContentBySlug, listContents } from "@/lib/cms/content-service";
import { type Locale, localizeHref } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/dictionaries";
import NewsCard from "../components/NewsCard";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  locale?: Locale;
}

function formatDate(dateStr: string | null, locale: Locale) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

/**
 * Dynamic SEO metadata generator for /news/[slug]
 */
export async function generateNewsMetadata(
  { params }: { params: Promise<{ slug: string }> },
  locale: Locale = "id",
): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicContentBySlug(slug, locale);
  const t = createTranslator(locale);

  if (result.isError || !result.data) {
    return {
      title: t("news.notFoundTitle"),
      description: t("news.notFoundDesc"),
    };
  }

  const content = result.data;
  const title = `${content.title} - DaPay News`;
  const description = content.excerpt || t("news.description");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: content.published_at || undefined,
      images: content.cover_image_url ? [{ url: content.cover_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: content.cover_image_url ? [content.cover_image_url] : undefined,
    },
  };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateNewsMetadata(props, props.locale || "id");
}

/**
 * Safe Minimal Markdown Renderer:
 * Converts markdown text into structured React nodes without dangerouslySetInnerHTML.
 * Prevents any XSS injection vector.
 */
function SafeMarkdownBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n\s*\n/);

  return (
    <div className="space-y-5 text-slate-300 leading-relaxed sm:text-lg">
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Heading 3: ### Heading
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={pIdx} className="text-xl font-bold text-white mt-6 mb-2 tracking-tight">
              {trimmed.slice(4)}
            </h3>
          );
        }

        // Heading 2: ## Heading
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={pIdx} className="text-2xl font-black text-white mt-8 mb-3 tracking-tight border-b border-slate-800 pb-2">
              {trimmed.slice(3)}
            </h2>
          );
        }

        // Heading 1: # Heading
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={pIdx} className="text-3xl font-black text-white mt-8 mb-4 tracking-tight">
              {trimmed.slice(2)}
            </h1>
          );
        }

        // Bullet List: - item or * item
        const lines = trimmed.split("\n");
        const isBulletList = lines.every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "));
        if (isBulletList) {
          return (
            <ul key={pIdx} className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>
                  {line.trim().replace(/^[-*]\s+/, "")}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered List: 1. item
        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
        if (isNumberedList) {
          return (
            <ol key={pIdx} className="list-decimal list-inside space-y-1.5 pl-2 text-slate-300">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>
                  {line.trim().replace(/^\d+\.\s+/, "")}
                </li>
              ))}
            </ol>
          );
        }

        // Standard Paragraph with simple line break preservation
        return (
          <p key={pIdx} className="whitespace-pre-line text-slate-300">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default async function NewsDetailPage({ params, locale = "id" }: PageProps) {
  const { slug } = await params;
  const t = createTranslator(locale);

  // 1. Fetch eligible published article by slug with locale awareness
  const result = await getPublicContentBySlug(slug, locale);
  if (result.isError || !result.data) {
    notFound();
  }

  const content = result.data;
  const formattedDate = formatDate(content.published_at, locale);

  // 2. Fetch related/recent news for sidebar (excluding current article)
  const relatedResult = await listContents(
    {
      type: "NEWS",
      category: content.category || undefined,
      sortBy: "published_desc",
      limit: 4,
    },
    true, // Public only
    locale,
  );
  const relatedNews = (relatedResult.isError ? [] : relatedResult.data.items).filter(
    (item) => item.id !== content.id,
  );

  const hasValidCta = Boolean(content.cta_label?.trim() && content.cta_url?.trim());
  const localizedCtaUrl = content.cta_url ? localizeHref(content.cta_url, locale) : "#";

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 py-8 md:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 space-y-8">
        {/* Back navigation */}
        <div>
          <Link
            href={localizeHref("/news", locale)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg px-2 py-1 -ml-2"
          >
            <ArrowLeft size={14} />
            <span>{t("news.backToNews")}</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-400">
              {content.category || content.type}
            </span>
            {formattedDate && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar size={13} className="text-slate-500" />
                <time dateTime={content.published_at || undefined}>{formattedDate}</time>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            {content.title}
          </h1>

          {content.excerpt && (
            <p className="text-base sm:text-lg leading-relaxed text-slate-300 font-medium border-l-2 border-blue-500 pl-4 py-1">
              {content.excerpt}
            </p>
          )}
        </header>

        {/* Cover Image */}
        {content.cover_image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <Image
              src={content.cover_image_url}
              alt={content.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Article Body */}
          <article className="lg:col-span-8 space-y-8 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 md:p-10 shadow-xl backdrop-blur-xs">
            <SafeMarkdownBody body={content.body} />

            {/* Tags display */}
            {content.tags && content.tags.length > 0 && (
              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center gap-2">
                <Tag size={13} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-500">{t("news.topics")}</span>
                {content.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Call to Action Block */}
            {hasValidCta && (
              <div className="mt-8 rounded-2xl border border-blue-500/30 bg-linear-to-r from-blue-950/50 to-indigo-950/40 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-400">
                    {t("news.relatedAction")}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {t("news.relatedActionDesc")}
                  </p>
                </div>
                <a
                  href={localizedCtaUrl}
                  target={content.cta_target || "_self"}
                  rel={content.cta_target === "_blank" ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all shrink-0"
                >
                  <span>{content.cta_label}</span>
                  {content.cta_target === "_blank" ? (
                    <ExternalLink size={14} />
                  ) : (
                    <ArrowLeft size={14} className="rotate-180" />
                  )}
                </a>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Official Channel Trust Badge */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={16} />
                <span>{t("news.officialInfo")}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t("news.officialInfoDesc")}
              </p>
            </div>

            {/* Related News */}
            {relatedNews.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                  {t("news.relatedNews")}
                </h3>
                <div className="space-y-3">
                  {relatedNews.map((item) => (
                    <NewsCard key={item.id} content={item} layout="list" locale={locale} />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
