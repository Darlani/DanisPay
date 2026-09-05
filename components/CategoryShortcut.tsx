"use client";
import { Smartphone, Gamepad2, Zap, LayoutGrid } from "lucide-react";

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
      <div className="flex flex-wrap justify-start items-center gap-2 sm:gap-3">
        {activeMenus.map((menu) => {
          const config = getIconConfig(menu.slug);
          return (
            <button
              key={menu.id}
              onClick={() => handleScroll(menu.slug)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 backdrop-blur-md border bg-slate-900/60 hover:bg-slate-800/80 group cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 ${config.border}`}
            >
              <div className={`${config.bg} ${config.color} p-1.5 rounded-full transition-transform group-hover:scale-110`}>
                {config.icon}
              </div>
              <span className="text-[13px] font-bold capitalize tracking-wide text-slate-300 group-hover:text-white transition-colors">
                {menu.name.toLowerCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}