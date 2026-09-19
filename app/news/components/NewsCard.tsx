"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar } from "lucide-react";
import type { PublicContent } from "@/lib/cms/types";
import { useI18n } from "@/lib/i18n/context";
import { type Locale, localizeHref } from "@/lib/i18n/config";

interface NewsCardProps {
  content: PublicContent;
  layout?: "grid" | "list";
  locale?: Locale;
}

function formatDate(dateStr: string | null, locale: Locale) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function NewsCard({ content, layout = "grid", locale: propLocale }: NewsCardProps) {
  const { locale: contextLocale, t } = useI18n();
  const currentLocale = propLocale || contextLocale || "id";
  const formattedDate = formatDate(content.published_at, currentLocale);
  const detailHref = localizeHref(`/news/${content.slug}`, currentLocale);

  if (layout === "list") {
    return (
      <article className="group flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-200 hover:border-slate-700 sm:flex-row sm:items-center">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-800 sm:w-48">
          {content.cover_image_url ? (
            <Image
              src={content.cover_image_url}
              alt={content.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="200px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] font-mono uppercase text-slate-500">
              DaPay
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold uppercase text-blue-400">
              {content.category || content.type}
            </span>
            {formattedDate && (
              <>
                <span className="text-slate-600">•</span>
                <time className="text-slate-400" dateTime={content.published_at || undefined}>
                  {formattedDate}
                </time>
              </>
            )}
          </div>

          <h3 className="line-clamp-2 text-base font-bold text-white transition-colors group-hover:text-blue-400">
            <Link href={detailHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded">
              {content.title}
            </Link>
          </h3>

          {content.excerpt && (
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
              {content.excerpt}
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl">
      {/* Cover Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
        {content.cover_image_url ? (
          <Image
            src={content.cover_image_url}
            alt={content.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-900 to-slate-950 p-4 text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-600">
              {content.category || "DaPay News"}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="inline-flex rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-300 backdrop-blur-xs">
            {content.category || content.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        <div className="space-y-2">
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar size={12} className="text-slate-500" />
              <time dateTime={content.published_at || undefined}>{formattedDate}</time>
            </div>
          )}

          <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-white transition-colors group-hover:text-blue-400">
            <Link href={detailHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded">
              {content.title}
            </Link>
          </h3>

          {content.excerpt && (
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
              {content.excerpt}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/60">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 transition-colors group-hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
          >
            <span>{t("common.read")}</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
