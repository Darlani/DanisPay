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

export default function CategoryShortcut({ categories }: { categories: any[] }) {
  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Langsung pakai data dari props (Filter sudah dilakukan di page.tsx/backend)
  const activeMenus = categories || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
      <div className="flex flex-wrap justify-start items-center gap-2 sm:gap-3">
        {activeMenus.map((menu) => {
          const config = getIconConfig(menu.slug);
          return (
            <button
              key={menu.id}
              onClick={() => handleScroll(menu.slug.includes('pulsa') ? 'pulsa' : menu.slug.includes('tagihan') ? 'prabayar' : 'game')}
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