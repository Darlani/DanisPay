"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Calendar, ExternalLink, Sparkles, Tag } from "lucide-react";
import type { ContentSection, PublicContent } from "@/lib/cms/types";

interface PromoSectionProps {
  section: ContentSection;
  items: PublicContent[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function PromoSection({ section, items }: PromoSectionProps) {
  if (items.length === 0) return null;

  const layoutClass =
    section.layout === "list"
      ? "space-y-4"
      : section.layout === "grid-2"
        ? "grid gap-6 sm:grid-cols-2"
        : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="space-y-5" aria-labelledby={`promo-sec-${section.section_key}`}>
      {/* Section Header */}
      <div className="flex flex-col gap-1 border-b border-slate-800 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">
            <Sparkles size={11} />
            <span>{section.section_key.replace(/_/g, " ")}</span>
          </div>
          <h2 id={`promo-sec-${section.section_key}`} className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{section.subtitle}</p>
          )}
        </div>
        <span className="text-xs font-mono text-slate-500 uppercase">
          {items.length} penawaran
        </span>
      </div>

      {/* Items Container */}
      <div className={layoutClass}>
        {items.map((item) => {
          const formattedPublished = formatDate(item.published_at);
          const formattedEventEnd = formatDate(item.event_end_at);
          const hasCta = Boolean(item.cta_url && item.cta_url.trim());
          const ctaTarget = item.cta_target || "_self";
          const isBlank = ctaTarget === "_blank";

          if (section.layout === "list") {
            return (
              <article
                key={item.id}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-200 hover:border-slate-700 sm:flex-row sm:items-center"
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-800 sm:w-56">
                  {item.cover_image_url ? (
                    <Image
                      src={item.cover_image_url}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="230px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs font-bold uppercase text-slate-500">
                      Promo DaPay
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-400">
                      {item.category || item.type}
                    </span>
                    {formattedEventEnd && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <Calendar size={12} />
                        Hingga {formattedEventEnd}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white transition-colors group-hover:text-blue-400 line-clamp-1">
                    {item.title}
                  </h3>

                  {item.excerpt && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {item.excerpt}
                    </p>
                  )}

                  {hasCta && (
                    <div>
                      <a
                        href={item.cta_url || "#"}
                        target={ctaTarget}
                        rel={isBlank ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300"
                      >
                        <span>{item.cta_label || "Klaim Promo"}</span>
                        {isBlank ? <ExternalLink size={12} /> : <ArrowUpRight size={13} />}
                      </a>
                    </div>
                  )}
                </div>
              </article>
            );
          }

          // Default grid card
          return (
            <article
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl"
            >
              {/* Cover Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
                {item.cover_image_url ? (
                  <Image
                    src={item.cover_image_url}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-900 to-slate-950 p-4 text-center">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-600">
                      {item.category || "DaPay Promo"}
                    </span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-xs">
                    {item.category || item.type}
                  </span>
                  {item.is_featured && (
                    <span className="inline-flex rounded-md border border-amber-500/30 bg-amber-500/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
                      Featured
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    {formattedPublished && <span>{formattedPublished}</span>}
                    {formattedEventEnd && (
                      <span className="font-semibold text-amber-400">
                        s/d {formattedEventEnd}
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-base font-bold tracking-tight text-white transition-colors group-hover:text-blue-400">
                    {item.title}
                  </h3>

                  {item.excerpt && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {item.excerpt}
                    </p>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400"
                        >
                          <Tag size={9} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA Action */}
                <div className="pt-2 border-t border-slate-800/80">
                  {hasCta ? (
                    <a
                      href={item.cta_url || "#"}
                      target={ctaTarget}
                      rel={isBlank ? "noopener noreferrer" : undefined}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      <span>{item.cta_label || "Ambil Promo"}</span>
                      {isBlank ? <ExternalLink size={13} /> : <ArrowUpRight size={14} />}
                    </a>
                  ) : (
                    <Link
                      href="/"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors"
                    >
                      <span>Jelajahi Produk</span>
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
