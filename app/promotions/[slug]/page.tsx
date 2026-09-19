export const revalidate = 0; // Memaksa ambil data terbaru setiap klik

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Clock, ShieldCheck } from "lucide-react";

// IMPORT KOMPONEN
import Game from "./components/Game";
import PPOB from "./components/PPOB";
import Entertainment from "./components/entertainment";
import AffiliateCard from "./components/Affiliate";

// INISIALISASI SUPABASE & I18N
import { supabase } from "@/utils/supabaseClient";
import { type Locale, localizeHref } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/dictionaries";

export interface PromoPageProps {
  params: Promise<{ slug: string }>;
  locale?: Locale;
}

export async function generatePromoMetadata(
  { params }: { params: Promise<{ slug: string }> },
  locale: Locale = "id",
): Promise<Metadata> {
  const resolvedParams = await params;
  const currentSlug = resolvedParams.slug;
  const targetHref = `/promotions/${currentSlug}`;
  const t = createTranslator(locale);

  const isNumeric = /^\d+$/.test(currentSlug);
  let metaQuery = supabase.from("banners").select("alt, description");
  if (isNumeric) {
    metaQuery = metaQuery.or(`href.eq.${targetHref},id.eq.${currentSlug}`);
  } else {
    metaQuery = metaQuery.eq("href", targetHref);
  }
  const { data: banner } = await metaQuery.maybeSingle();

  if (!banner) {
    return {
      title: `404 - ${t("promo.detail.linkNotFound")}`,
    };
  }

  return {
    title: `${banner.alt} - DaPay`,
    description: banner.description || t("promo.detail.limitedTimeDesc"),
  };
}

export async function generateMetadata(props: PromoPageProps): Promise<Metadata> {
  return generatePromoMetadata(props, props.locale || "id");
}

export default async function PromoDetailPage({ params, locale = "id" }: PromoPageProps) {
  const resolvedParams = await params; 
  const currentSlug = resolvedParams.slug;
  const targetHref = `/promotions/${currentSlug}`;
  const t = createTranslator(locale);

  // Ambil data dari Supabase (support slug href maupun id)
  const isNumeric = /^\d+$/.test(currentSlug);
  let dataQuery = supabase.from("banners").select("*");
  if (isNumeric) {
    dataQuery = dataQuery.or(`href.eq.${targetHref},id.eq.${currentSlug}`);
  } else {
    dataQuery = dataQuery.eq("href", targetHref);
  }
  const { data: banner, error } = await dataQuery.maybeSingle();

  // Logika jika data tidak ketemu
  if (error || !banner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E14] text-white p-6 text-center">
        <h1 className="text-6xl font-black italic text-slate-800 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2 text-blue-500 underline">{targetHref}</h2>
        <p className="text-slate-400 mb-8">{t("promo.detail.linkNotFound")}</p>
        <Link
          href={localizeHref("/", locale)}
          className="px-6 py-3 bg-blue-600 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors"
        >
          {t("promo.detail.backToHome")}
        </Link>
      </div>
    );
  }

  const isAffiliate = banner.category === "affiliate";

  return (
    <main className="min-h-screen bg-[#0B0E14] text-white pb-20 animate-in fade-in duration-500">

      {/* HEADER GAMBAR */}
      <div className="relative w-full h-[35vh] md:h-[50vh]">
        <Image src={banner.src} alt={banner.alt} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-t from-[#0B0E14] via-[#0B0E14]/60 to-transparent" />
        <Link
          href={localizeHref("/", locale)}
          className="absolute top-6 left-6 p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 z-20 border border-white/10 group transition-colors"
          aria-label={t("promo.detail.backToHome")}
        >
          <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* KONTEN UTAMA - Lebar dinamis berdasarkan kategori */}
      <div className={`${isAffiliate ? "max-w-7xl" : "max-w-5xl"} mx-auto px-6 -mt-24 relative z-10`}>

        {/* BADGE & JUDUL */}
        <div className="flex flex-col gap-4 mb-8">
          {!isAffiliate && (
            <div className="flex gap-3">
              {banner.promo && (
                <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/40">
                  {banner.promo}
                </span>
              )}
              <span className="bg-[#1F2937] text-slate-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">
                {banner.category}
              </span>
            </div>
          )}

          <h1 className={`${isAffiliate ? "text-4xl md:text-7xl text-center md:text-left" : "text-3xl md:text-6xl"} font-black italic uppercase tracking-tighter leading-none drop-shadow-2xl`}>
            {banner.alt}
          </h1>
        </div>

        {/* LOGIKA GRID: Full Page untuk Affiliate, Grid untuk Lainnya */}
        {isAffiliate ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <AffiliateCard locale={locale} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#131823] p-8 rounded-[35px] border border-white/5 shadow-2xl">
                <h3 className="text-sm font-black italic uppercase text-slate-500 mb-6 tracking-[0.2em] flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-blue-600 inline-block"></span> {t("promo.detail.promoDesc")}
                </h3>

                <div className="prose prose-invert mb-10 text-slate-300">
                  {banner.description ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-lg">{banner.description}</p>
                  ) : (
                    <p className="italic text-slate-500">{t("promo.detail.emptyDesc")}</p>
                  )}
                </div>

                {/* KOMPONEN DINAMIS BERDASARKAN KATEGORI */}
                <div className="pt-4 border-t border-white/5 mt-10">
                  {banner.category === "game" && <Game title={banner.alt} locale={locale} />}
                  {banner.category === "ppob" && <PPOB title={banner.alt} locale={locale} />}
                  {banner.category === "entertainment" && <Entertainment title={banner.alt} locale={locale} />}
                </div>
              </div>
            </div>

            {/* SIDEBAR - Hanya muncul jika bukan afiliasi */}
            <div className="space-y-4">
              <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-[30px]">
                <div className="flex items-center gap-3 text-blue-400 mb-3 font-black text-xs uppercase tracking-widest">
                  <Clock size={20} /> {t("promo.detail.limitedTime")}
                </div>
                <p className="text-sm text-blue-200/80 leading-relaxed">
                  {t("promo.detail.limitedTimeDesc")}
                </p>
              </div>
              <div className="bg-[#131823] border border-white/5 p-6 rounded-[30px]">
                <div className="flex items-center gap-3 text-emerald-500 mb-3 font-black text-xs uppercase tracking-widest">
                  <ShieldCheck size={20} /> {t("promo.detail.officialStore")}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t("promo.detail.officialStoreDesc")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}