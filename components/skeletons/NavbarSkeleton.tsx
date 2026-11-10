export default function NavbarSkeleton() {
  return (
    <nav className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-20 py-3 flex items-center justify-between gap-3 sm:gap-4">
        {/* SISI KIRI: Logo DaPay Placeholder */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-7 sm:h-8 w-24 sm:w-28 rounded-lg bg-slate-800/80 border border-slate-800/80 animate-pulse" />
        </div>

        {/* SISI TENGAH: Search Bar Placeholder */}
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-xs lg:max-w-sm xl:max-w-md mx-2 sm:mx-3 md:mx-3 lg:mx-4 xl:mx-6">
          <div className="h-9 sm:h-10 w-full rounded-xl bg-slate-950/60 border border-slate-800/80 animate-pulse" />
        </div>

        {/* SISI KANAN: Action Items Placeholder */}
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-2 lg:gap-3 shrink-0">
          {/* Language Switcher pill */}
          <div className="h-8 w-11 sm:w-12 rounded-lg bg-slate-800/80 border border-slate-800/80 animate-pulse" />

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <div className="h-8 w-16 rounded-lg bg-slate-800/60 animate-pulse" />
            <div className="h-8 w-16 rounded-lg bg-slate-800/60 animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-slate-800/60 animate-pulse" />
          </div>

          {/* Auth Button Placeholder (Monochromatic Neutral Slate) */}
          <div className="h-8 sm:h-9 w-20 sm:w-24 rounded-xl bg-slate-800/80 border border-slate-800/80 animate-pulse" />
        </div>
      </div>
    </nav>
  );
}
