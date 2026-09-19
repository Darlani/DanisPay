import { Zap, Star, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type Locale, localizeHref } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/dictionaries";

export default function Game({ title, locale = "id" }: { title: string; locale?: Locale }) {
  const t = createTranslator(locale);
  const productName = title.replace(/^Promo\s+/i, "");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
          <Zap className="text-yellow-400" size={20} />
          <p className="text-sm text-slate-300 font-medium">{t("promo.detail.instantProcess")}</p>
        </div>
        <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
          <Star className="text-blue-400" size={20} />
          <p className="text-sm text-slate-300 font-medium">{t("promo.detail.activeService247")}</p>
        </div>
      </div>
      <div className="space-y-6">
        <p className="text-slate-400 text-lg leading-relaxed">
          {t("promo.detail.specialPriceFor", { product: productName })}
        </p>
        <Link href={localizeHref("/", locale)}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-2xl flex items-center gap-3 uppercase italic tracking-widest text-sm transition-all hover:scale-105">
            <ShieldCheck size={22} /> {t("promo.detail.claimPromoNow")}
          </button>
        </Link>
      </div>
    </div>
  );
}