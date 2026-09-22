"use client";
import React, { useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Smartphone, Gamepad2, Zap, LayoutGrid, ChevronLeft, ChevronRight, Play } from "lucide-react";

// 1. Mesin Icon
const getIconConfig = (slug: string) => {
  const s = slug ? slug.toLowerCase() : '';
  if (s.includes('game')) return {
    icon: <Gamepad2 size={14} />,
    color: 'text-orange-500',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30'
  };
  if (s.includes('pulsa')) return {
    icon: <Smartphone size={14} />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30'
  };
  if (s.includes('tagihan') || s.includes('pascabayar')) return {
    icon: <Zap size={14} />,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30'
  };
  return {
    icon: <LayoutGrid size={14} />,
    color: 'text-slate-400',
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/30'
  };
};

export const CATEGORY_DOM_ID_MAP: Record<string, string> = {
  'game': 'game',
  'pulsa & data seluler': 'pulsa',
  'tagihan prabayar': 'prabayar',
  'tagihan pascabayar': 'pascabayar',
  'voucher & gift card': 'voucher',
  'entertainment & subscription': 'entertainment',
  'e-wallet & saldo': 'e-money',
  'marketplace': 'marketplace',
  'social & konten': 'social',
  'productivity & software': 'productivity',
  'travel': 'travel',
  'digital services': 'digital',
};

export const getCategoryDomId = (slug: string): string => {
  const clean = slug ? slug.toLowerCase().trim() : '';
  return CATEGORY_DOM_ID_MAP[clean] || clean.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
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
  const [isOpen, setIsOpen] = useState(false);

  const handleScroll = (slug: string) => {
    const targetId = getCategoryDomId(slug);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Langsung pakai data dari props (hanya tampilkan jika section-nya ada di Landing Page bila filter tersedia)
  const rawMenus = categories || [];
  const activeMenus = availableSectionIds && availableSectionIds.length > 0
    ? rawMenus.filter((menu) => availableSectionIds.includes(getCategoryDomId(menu.slug)))
    : rawMenus;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: activeMenus.length > 3,
      align: 'start',
      slidesToScroll: 1,
      containScroll: 'trimSnaps',
    },
    [
      Autoplay({
        delay: 3000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  if (activeMenus.length === 0) return null;

  return (
    <div className="fixed left-2 sm:left-4 top-[65%] z-40 flex items-center select-none">
      <div className="flex items-center backdrop-blur-2xl bg-slate-900/90 border border-white/10 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.7)] rounded-full p-1 sm:p-1.5 transition-all duration-500 ease-in-out">
        {/* Tombol Toggle Shortcut */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30 cursor-pointer shadow-xs active:scale-95"
          title={isOpen ? "Tutup Shortcut" : "Buka Shortcut"}
        >
          <div className="p-1 rounded-full bg-blue-500 text-white flex items-center justify-center">
            <Play size={11} fill="currentColor" className="ml-0.5" />
          </div>
          <span>Shortcut</span>
          {isOpen ? (
            <ChevronLeft size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-blue-400 animate-pulse" />
          )}
        </button>

        {/* Kontainer Carousel yang Mengembang & Menutup Secara Mulus */}
        <div
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
                  return (
                    <button
                      key={menu.id}
                      onClick={() => {
                        if (emblaApi && typeof (emblaApi as any).clickAllowed === 'function' && !(emblaApi as any).clickAllowed()) return;
                        handleScroll(menu.slug);
                      }}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 backdrop-blur-md border bg-slate-800/80 hover:bg-blue-600/30 hover:border-blue-400 group cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 ${config.border}`}
                    >
                      <div className={`${config.bg} ${config.color} p-1 rounded-full transition-transform group-hover:scale-110`}>
                        {config.icon}
                      </div>
                      <span className="text-[11px] sm:text-[12px] font-bold capitalize tracking-wide text-slate-200 group-hover:text-white transition-colors whitespace-nowrap">
                        {menu.name.toLowerCase()}
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