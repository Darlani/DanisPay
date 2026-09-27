"use client";
import React, { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Smartphone, Gamepad2, Zap, LayoutGrid, ChevronLeft, ChevronRight, Compass } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

// 1. Mesin Icon
const getIconConfig = (slug: string) => {
  const s = slug ? slug.toLowerCase() : "";
  if (s.includes("game")) return {
    icon: <Gamepad2 size={14} />,
    color: "text-orange-500",
    bg: "bg-orange-500/20",
    border: "border-orange-500/30"
  };
  if (s.includes("pulsa")) return {
    icon: <Smartphone size={14} />,
    color: "text-blue-500",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30"
  };
  if (s.includes("tagihan") || s.includes("pascabayar")) return {
    icon: <Zap size={14} />,
    color: "text-yellow-500",
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/30"
  };
  return {
    icon: <LayoutGrid size={14} />,
    color: "text-slate-400",
    bg: "bg-slate-500/20",
    border: "border-slate-500/30"
  };
};

export const CATEGORY_DOM_ID_MAP: Record<string, string> = {
  "game": "game",
  "pulsa & data seluler": "pulsa",
  "tagihan prabayar": "prabayar",
  "tagihan pascabayar": "pascabayar",
  "voucher & gift card": "voucher",
  "entertainment & subscription": "entertainment",
  "e-wallet & saldo": "e-money",
  "marketplace": "marketplace",
  "social & konten": "social",
  "productivity & software": "productivity",
  "travel": "travel",
  "digital services": "digital",
};

export const CATEGORY_I18N_KEY_MAP: Record<string, string> = {
  "game": "categories.game",
  "pulsa & data seluler": "categories.pulsa",
  "tagihan prabayar": "categories.prabayar",
  "tagihan pascabayar": "categories.pascabayar",
  "voucher & gift card": "categories.voucher",
  "entertainment & subscription": "categories.entertainment",
  "e-wallet & saldo": "categories.emoney",
  "marketplace": "categories.marketplace",
  "social & konten": "categories.social",
  "productivity & software": "categories.productivity",
  "travel": "categories.travel",
  "digital services": "categories.digital",
};

export const getCategoryDomId = (slug: string): string => {
  const clean = slug ? slug.toLowerCase().trim() : "";
  return CATEGORY_DOM_ID_MAP[clean] || clean.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export interface CategoryShortcutItem {
  id: string | number;
  name: string;
  slug: string;
}

interface CategoryShortcutProps {
  categories: CategoryShortcutItem[];
  availableSectionIds?: string[];
}

export default function CategoryShortcut({ categories, availableSectionIds }: CategoryShortcutProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const handleScroll = (slug: string) => {
    const targetId = getCategoryDomId(slug);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Auto-close tray setelah user memilih kategori
    setIsOpen(false);
  };

  // Langsung pakai data dari props (hanya tampilkan jika section-nya ada di Landing Page bila filter tersedia)
  const rawMenus = categories || [];
  const activeMenus = availableSectionIds && availableSectionIds.length > 0
    ? rawMenus.filter((menu) => availableSectionIds.includes(getCategoryDomId(menu.slug)))
    : rawMenus;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: activeMenus.length > 3,
      align: "start",
      slidesToScroll: 1,
      containScroll: "trimSnaps",
    },
    [
      Autoplay({
        delay: 3000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  // Outside click & Escape keyboard handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Autoplay pause / resume lifecycle based on open state
  useEffect(() => {
    if (!emblaApi) return;
    const autoplay = emblaApi.plugins()?.autoplay;
    if (!autoplay) return;

    if (isOpen) {
      autoplay.play();
    } else {
      autoplay.stop();
    }
  }, [isOpen, emblaApi]);

  if (activeMenus.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed left-2 sm:left-4 bottom-24 md:bottom-auto md:top-[65%] z-40 flex items-center select-none"
    >
      <div className="flex items-center backdrop-blur-2xl bg-slate-900/90 border border-white/10 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.7)] rounded-full p-1 sm:p-1.5 transition-all duration-500 ease-in-out">
        {/* Tombol Toggle Shortcut */}
        <button
          ref={toggleBtnRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="category-shortcut-tray"
          aria-label={isOpen ? t("home.closeShortcut") : t("home.openShortcut")}
          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30 cursor-pointer shadow-xs active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400"
          title={isOpen ? t("home.closeShortcut") : t("home.openShortcut")}
        >
          <div className="p-1 rounded-full bg-blue-500 text-white flex items-center justify-center">
            <Compass size={13} className="transition-transform group-hover:rotate-45" />
          </div>
          <span>{t("home.shortcutLabel")}</span>
          {isOpen ? (
            <ChevronLeft size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-blue-400 animate-pulse" />
          )}
        </button>

        {/* Kontainer Carousel yang Mengembang & Menutup Secara Mulus */}
        <div
          id="category-shortcut-tray"
          role="region"
          aria-label={t("home.shortcutTrayAria", "Category Shortcuts Panel")}
          aria-hidden={!isOpen}
          className={`flex items-center transition-all duration-500 ease-in-out overflow-hidden ${
            isOpen
              ? "max-w-[80vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl opacity-100 ml-1.5 sm:ml-2"
              : "max-w-0 opacity-0 ml-0 pointer-events-none"
          }`}
        >
          <div className="relative flex-1 min-w-0 flex items-center overflow-hidden">
            {/* Subtle Left Fade */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-slate-900/90 to-transparent z-10" />

            {/* Embla Auto-Scroll Track (Per-item slide snap) */}
            <div className="overflow-hidden w-full cursor-grab active:cursor-grabbing" ref={emblaRef}>
              <div className="flex items-center gap-2">
                {activeMenus.map((menu) => {
                  const config = getIconConfig(menu.slug);
                  const cleanSlug = menu.slug ? menu.slug.toLowerCase().trim() : "";
                  const i18nKey = CATEGORY_I18N_KEY_MAP[cleanSlug];
                  const label = i18nKey ? t(i18nKey, menu.name) : menu.name;

                  return (
                    <button
                      key={menu.id}
                      type="button"
                      tabIndex={isOpen ? 0 : -1}
                      onClick={() => {
                        if (emblaApi && "clickAllowed" in emblaApi && typeof (emblaApi as { clickAllowed?: () => boolean }).clickAllowed === "function" && !(emblaApi as { clickAllowed: () => boolean }).clickAllowed()) return;
                        handleScroll(menu.slug);
                      }}
                      className={`shrink-0 min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-300 backdrop-blur-md border bg-slate-800/80 hover:bg-blue-600/30 hover:border-blue-400 group cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 ${config.border}`}
                    >
                      <div className={`${config.bg} ${config.color} p-1 rounded-full transition-transform group-hover:scale-110`}>
                        {config.icon}
                      </div>
                      <span className="text-[11px] sm:text-[12px] font-bold capitalize tracking-wide text-slate-200 group-hover:text-white transition-colors whitespace-nowrap">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtle Right Fade */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-900/90 to-transparent z-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
