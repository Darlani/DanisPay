"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import type { PublicContent } from "@/lib/cms/types";

interface NewsHeroProps {
  content: PublicContent;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

export default function NewsHero({ content }: NewsHeroProps) {
  const formattedDate = formatDate(content.published_at);
  const detailHref = `/news/${content.slug}`;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-b from-slate-900/90 to-slate-950 p-6 md:p-10 shadow-2xl transition-all duration-300 hover:border-slate-700">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Text & Meta */}
        <div className="flex flex-col justify-between space-y-6 lg:col-span-7">
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400">
                <Sparkles size={12} />
                <span>Headline</span>
              </span>
              <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-400">
                {content.category || content.type}
              </span>
              {formattedDate && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar size={13} className="text-slate-500" />
                  <time dateTime={content.published_at || undefined}>{formattedDate}</time>
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              <Link
                href={detailHref}
                className="transition-colors hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
              >
                {content.title}
              </Link>
            </h2>

            {/* Excerpt */}
            {content.excerpt && (
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                {content.excerpt}
              </p>
            )}
          </div>

          {/* Read More Action */}
          <div>
            <Link
              href={detailHref}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-500 hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <span>Baca Selengkapnya</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right Column: Cover Image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 lg:col-span-5">
          {content.cover_image_url ? (
            <Image
              src={content.cover_image_url}
              alt={content.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-blue-950/40 via-slate-900 to-slate-950 p-6 text-center">
              <span className="font-mono text-sm font-bold uppercase tracking-widest text-slate-600">
                {content.category || "DaPay News"}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
