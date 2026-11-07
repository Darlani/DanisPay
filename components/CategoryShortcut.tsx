"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Flame,
  Gamepad2,
  Ticket,
  Tv,
  Smartphone,
  Zap,
  FileText,
  Wallet,
  ShoppingBag,
  Users,
  Briefcase,
  Plane,
  Globe,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

// 1. Konfigurasi Ikon & Aksen Warna Tiap Kategori
const getIconConfig = (slug: string) => {
  const s = slug ? slug.toLowerCase().trim() : "";
  if (s.includes("popular") || s.includes("populer")) return {
    icon: <Flame size={13} className="shrink-0" />,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
  };
  if (s.includes("game")) return {
    icon: <Gamepad2 size={13} className="shrink-0" />,
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
  };
  if (s.includes("voucher") || s.includes("gift")) return {
    icon: <Ticket size={13} className="shrink-0" />,
    color: "text-pink-400",
    bg: "bg-pink-500/15",
    border: "border-pink-500/30",
  };
  if (s.includes("entertainment") || s.includes("subscription")) return {
    icon: <Tv size={13} className="shrink-0" />,
    color: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
  };
  if (s.includes("pulsa") || s.includes("data")) return {
    icon: <Smartphone size={13} className="shrink-0" />,
    color: "text-sky-400",
    bg: "bg-sky-500/15",
    border: "border-sky-500/30",
  };
  if (s.includes("prabayar")) return {
    icon: <Zap size={13} className="shrink-0" />,
    color: "text-yellow-400",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
  };
  if (s.includes("pascabayar") || s.includes("tagihan")) return {
    icon: <FileText size={13} className="shrink-0" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
  };
  if (s.includes("wallet") || s.includes("saldo") || s.includes("money") || s.includes("e-money")) return {
    icon: <Wallet size={13} className="shrink-0" />,
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
  };
  if (s.includes("marketplace")) return {
    icon: <ShoppingBag size={13} className="shrink-0" />,
    color: "text-teal-400",
    bg: "bg-teal-500/15",
    border: "border-teal-500/30",
  };
  if (s.includes("social") || s.includes("konten") || s.includes("sosial")) return {
    icon: <Users size={13} className="shrink-0" />,
    color: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
  };
  if (s.includes("productivity") || s.includes("software") || s.includes("produktivitas")) return {
    icon: <Briefcase size={13} className="shrink-0" />,
    color: "text-indigo-400",
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/30",
  };
  if (s.includes("travel") || s.includes("perjalanan")) return {
    icon: <Plane size={13} className="shrink-0" />,
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
  };
  if (s.includes("digital")) return {
    icon: <Globe size={13} className="shrink-0" />,
    color: "text-violet-400",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
  };
  return {
    icon: <LayoutGrid size={13} className="shrink-0" />,
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    border: "border-slate-500/30",
  };
};

export const CATEGORY_DOM_ID_MAP: Record<string, string> = {
  "popular": "popular",
  "populer": "popular",
  "game": "game",
  "pulsa & data seluler": "pulsa",
  "pulsa": "pulsa",
  "tagihan prabayar": "prabayar",
  "prabayar": "prabayar",
  "tagihan pascabayar": "pascabayar",
  "pascabayar": "pascabayar",
  "voucher & gift card": "voucher",
  "voucher": "voucher",
  "entertainment & subscription": "entertainment",
  "entertainment": "entertainment",
  "e-wallet & saldo": "e-money",
  "e-wallet": "e-money",
  "e-money": "e-money",
  "marketplace": "marketplace",
  "social & konten": "social",
  "social": "social",
  "productivity & software": "productivity",
  "productivity": "productivity",
  "travel": "travel",
  "digital services": "digital",
  "digital": "digital",
};

export const CATEGORY_I18N_KEY_MAP: Record<string, string> = {
  "popular": "home.popularTitleShort",
  "populer": "home.popularTitleShort",
  "game": "categories.game",
  "pulsa & data seluler": "categories.pulsa",
  "pulsa": "categories.pulsa",
  "tagihan prabayar": "categories.prabayar",
  "prabayar": "categories.prabayar",
  "tagihan pascabayar": "categories.pascabayar",
  "pascabayar": "categories.pascabayar",
  "voucher & gift card": "categories.voucher",
  "voucher": "categories.voucher",
  "entertainment & subscription": "categories.entertainment",
  "entertainment": "categories.entertainment",
  "e-wallet & saldo": "categories.emoney",
  "e-wallet": "categories.emoney",
  "e-money": "categories.emoney",
  "marketplace": "categories.marketplace",
  "social & konten": "categories.social",
  "social": "categories.social",
  "productivity & software": "categories.productivity",
  "productivity": "categories.productivity",
  "travel": "categories.travel",
  "digital services": "categories.digital",
  "digital": "categories.digital",
};

export const getCategoryDomId = (slug: string): string => {
  const clean = slug ? slug.toLowerCase().trim() : "";
  return CATEGORY_DOM_ID_MAP[clean] || clean.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export interface CategoryShortcutItem {
  id: string | number;
  name: string;
  slug: string;
  titleKey?: string;
  domId?: string;
}

export interface CatalogSectionInfo {
  id: string;
  title: string;
  titleKey?: string;
  category?: string;
}

interface CategoryShortcutProps {
  categories?: CategoryShortcutItem[];
  availableSectionIds?: string[];
  sections?: CatalogSectionInfo[];
}

export default function CategoryShortcut({
  categories,
  availableSectionIds,
  sections,
}: CategoryShortcutProps) {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isManualScrollRef = useRef(false);
  const manualScrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeId, setActiveId] = useState<string>("");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 1. Bangun daftar chip navigasi kategori
  const activeChips: CategoryShortcutItem[] = React.useMemo(() => {
    // Jika sections diteruskan langsung dari landing page (sudah terurut visual)
    if (sections && sections.length > 0) {
      return sections.map((sec) => ({
        id: sec.id,
        name: sec.title,
        slug: sec.category || sec.id,
        titleKey: sec.titleKey,
        domId: sec.id,
      }));
    }

    const items: CategoryShortcutItem[] = [];

    // Jika tersedia section populer, tambahkan Populer sebagai chip pertama
    if (availableSectionIds && availableSectionIds.includes("popular")) {
      items.push({
        id: "popular",
        name: "Populer",
        slug: "popular",
        titleKey: "home.popularTitleShort",
        domId: "popular",
      });
    }

    if (categories && categories.length > 0) {
      const filtered = availableSectionIds && availableSectionIds.length > 0
        ? categories.filter((c) => availableSectionIds.includes(getCategoryDomId(c.slug)))
        : categories;

      for (const cat of filtered) {
        const domId = getCategoryDomId(cat.slug);
        items.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          titleKey: CATEGORY_I18N_KEY_MAP[cat.slug.toLowerCase().trim()],
          domId,
        });
      }
    }

    return items;
  }, [sections, categories, availableSectionIds]);

  const defaultActiveId = activeChips[0]?.domId || String(activeChips[0]?.id || "");
  const currentActiveId = activeId || defaultActiveId;

  // 2. Evaluasi status tombol scroll panah kiri / kanan
  const updateScrollButtons = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateScrollButtons();
    track.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons, { passive: true });

    return () => {
      track.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons, activeChips]);

  // 3. ScrollSpy: Deteksi seksi yang sedang aktif di viewport pengguna
  useEffect(() => {
    if (typeof window === "undefined" || activeChips.length === 0) return;

    const handleWindowScroll = () => {
      if (isManualScrollRef.current) return;

      const triggerOffset = 150; // Ambang batas jarak dari atas layar (Navbar ~60px + Bar ~48px + margin)
      let currentActiveId = "";
      let minDistance = Infinity;

      for (const chip of activeChips) {
        const domId = chip.domId || getCategoryDomId(chip.slug);
        const element = document.getElementById(domId);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        // Bila seksi berada dalam area pandang pengguna
        if (rect.top <= triggerOffset + 60 && rect.bottom > triggerOffset) {
          currentActiveId = domId;
          break;
        }

        // Simpan jarak terdekat sebagai cadangan
        const dist = Math.abs(rect.top - triggerOffset);
        if (dist < minDistance && rect.bottom > triggerOffset) {
          minDistance = dist;
          currentActiveId = domId;
        }
      }

      if (currentActiveId && currentActiveId !== activeId) {
        setActiveId(currentActiveId);
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    handleWindowScroll(); // Jalankan sekali saat mount

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      if (manualScrollTimerRef.current) clearTimeout(manualScrollTimerRef.current);
    };
  }, [activeChips, activeId]);

  // 4. Auto-center chip yang aktif di dalam horizontal track bila berada di luar pandang
  useEffect(() => {
    if (!currentActiveId) return;
    const btn = chipRefs.current.get(currentActiveId);
    const track = trackRef.current;
    if (!btn || !track) return;

    const trackRect = track.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    if (btnRect.left < trackRect.left + 40 || btnRect.right > trackRect.right - 40) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentActiveId]);

  // 5. Handler Klik Chip Kategori
  const handleChipClick = (targetId: string) => {
    setActiveId(targetId);
    isManualScrollRef.current = true;

    if (manualScrollTimerRef.current) clearTimeout(manualScrollTimerRef.current);
    manualScrollTimerRef.current = setTimeout(() => {
      isManualScrollRef.current = false;
    }, 800);

    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleArrowScroll = (direction: "left" | "right") => {
    const track = trackRef.current;
    if (!track) return;
    const scrollAmount = direction === "left" ? -240 : 240;
    track.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (activeChips.length === 0) return null;

  return (
    <nav
      aria-label={t("home.categoryNavAria", "Navigasi Kategori")}
      className="sticky top-14.5 sm:top-16 z-30 w-full bg-slate-900/95 backdrop-blur-md border-y border-slate-800/80 shadow-md shadow-black/25 transition-all"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-20 relative flex items-center">
        {/* Tombol Panah Kiri (Desktop) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleArrowScroll("left")}
            aria-label={t("home.scrollLeftAria", "Gulir kategori ke kiri")}
            className="hidden md:flex absolute left-2 sm:left-4 lg:left-16 z-20 w-7 h-7 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-md items-center justify-center transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Subtle Fade Kiri */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-4 sm:left-6 md:left-8 lg:left-20 top-0 bottom-0 w-8 bg-linear-to-r from-slate-900/95 to-transparent z-10" />
        )}

        {/* Horizontal Chip Rail (Native Touch-Swipe & Keyboard Accessible) */}
        <div
          ref={trackRef}
          className="w-full flex items-center gap-2 overflow-x-auto py-2.5 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {activeChips.map((chip) => {
            const domId = chip.domId || getCategoryDomId(chip.slug);
            const isActive = currentActiveId === domId;
            const config = getIconConfig(chip.slug);
            const label = chip.titleKey ? t(chip.titleKey, chip.name) : chip.name;

            return (
              <button
                key={chip.id}
                ref={(el) => {
                  if (el) chipRefs.current.set(domId, el);
                  else chipRefs.current.delete(domId);
                }}
                type="button"
                onClick={() => handleChipClick(domId)}
                aria-current={isActive ? "true" : undefined}
                className={`group shrink-0 h-9 min-h-9 flex items-center gap-2 px-3 sm:px-3.5 rounded-full border transition-all duration-200 cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-400/80 shadow-md shadow-blue-500/25 font-bold"
                    : "bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60 hover:border-slate-600 font-medium"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                    isActive
                      ? "bg-white/20 text-white scale-105"
                      : `${config.bg} ${config.color} group-hover:scale-105`
                  }`}
                >
                  {config.icon}
                </div>
                <span className="text-[12px] sm:text-[13px] capitalize tracking-wide whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subtle Fade Kanan */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-4 sm:right-6 md:right-8 lg:right-20 top-0 bottom-0 w-8 bg-linear-to-l from-slate-900/95 to-transparent z-10" />
        )}

        {/* Tombol Panah Kanan (Desktop) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleArrowScroll("right")}
            aria-label={t("home.scrollRightAria", "Gulir kategori ke kanan")}
            className="hidden md:flex absolute right-2 sm:right-4 lg:right-16 z-20 w-7 h-7 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-md items-center justify-center transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </nav>
  );
}
