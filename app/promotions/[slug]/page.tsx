export const revalidate = 60;

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
    <main className="min-h-screen bg-slate-950 text-white pb-20 animate-in fade-in duration-500">

      {/* HEADER GAMBAR: Hanya dirender untuk non-affiliate */}
      {!isAffiliate && (
        <div className="relative w-full h-[30vh] sm:h-[38vh] md:h-[48vh]">
          <Image src={banner.src} alt={banner.alt} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <Link
            href={localizeHref("/", locale)}
            className="absolute top-6 left-6 p-2.5 sm:p-3 bg-black/50 backdrop-blur-md rounded-full hover:bg-white/20 z-20 border border-white/10 group transition-colors"
            aria-label={t("promo.detail.backToHome")}
          >
            <ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform text-white" />
          </Link>
        </div>
      )}

      {/* HEADER BREADCRUMB ELEGAN: Khusus rute affiliate (menggantikan gambar header statis) */}
      {isAffiliate && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Link
              href={localizeHref("/", locale)}
              className="hover:text-white transition-colors flex items-center gap-1 text-slate-400"
            >
              <ChevronLeft size={16} />
              <span>{locale === "en" ? "Home" : "Beranda"}</span>
            </Link>
            <span className="text-slate-600">/</span>
            <Link
              href={localizeHref("/promo", locale)}
              className="hover:text-white transition-colors"
            >
              {locale === "en" ? "Promotions" : "Promo"}
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-blue-400 font-semibold">
              {locale === "en" ? "Affiliate Partner Program" : "Program Kemitraan Afiliasi"}
            </span>
          </nav>
        </div>
      )}

      {/* KONTEN UTAMA - Lebar dinamis & penyesuaian jarak vertikal */}
      <div className={`${isAffiliate ? "max-w-6xl pt-1 sm:pt-2" : "max-w-5xl -mt-16 sm:-mt-24"} mx-auto px-4 sm:px-6 relative z-10`}>

        {/* BADGE & JUDUL: Hanya dirender untuk non-affiliate agar tidak terjadi Double-Hero bertumpuk */}
        {!isAffiliate && (
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex gap-2.5">
              {banner.promo && (
                <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/30">
                  {banner.promo}
                </span>
              )}
              <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700">
                {banner.category}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-xl text-white">
              {banner.alt}
            </h1>
          </div>
        )}

        {/* LOGIKA GRID: Full Width untuk Affiliate, 2 Kolom untuk Lainnya */}
        {isAffiliate ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <AffiliateCard locale={locale} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-6 tracking-wider flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-blue-500 inline-block rounded-full"></span> {t("promo.detail.promoDesc")}
                </h3>

                <div className="prose prose-invert mb-10 text-slate-300">
                  {banner.description ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-base">{banner.description}</p>
                  ) : (
                    <p className="italic text-slate-500 text-sm">{t("promo.detail.emptyDesc")}</p>
                  )}
                </div>

                {/* KOMPONEN DINAMIS BERDASARKAN KATEGORI */}
                <div className="pt-4 border-t border-slate-800 mt-8">
                  {banner.category === "game" && <Game title={banner.alt} locale={locale} />}
                  {banner.category === "ppob" && <PPOB title={banner.alt} locale={locale} />}
                  {banner.category === "entertainment" && <Entertainment title={banner.alt} locale={locale} />}
                </div>
              </div>
            </div>

            {/* SIDEBAR - Hanya muncul jika bukan afiliasi */}
            <div className="space-y-4">
              <div className="bg-blue-600/10 border border-blue-500/20 p-5 sm:p-6 rounded-2xl">
                <div className="flex items-center gap-2.5 text-blue-400 mb-2 font-bold text-xs uppercase tracking-wider">
                  <Clock size={18} /> {t("promo.detail.limitedTime")}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t("promo.detail.limitedTimeDesc")}
                </p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-6 rounded-2xl">
                <div className="flex items-center gap-2.5 text-emerald-400 mb-2 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck size={18} /> {t("promo.detail.officialStore")}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
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