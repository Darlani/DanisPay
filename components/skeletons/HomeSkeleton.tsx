export default function HomeSkeleton() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200">
      {/* 1. Continuous Dark Hero Stage Wireframe (Monochromatic Dark Palette) */}
      <div className="hero-stage-container w-full bg-[#080D1A] relative overflow-hidden">
        {/* Banner Shimmer Stage */}
        <section className="relative z-10 w-full max-w-full overflow-hidden pt-3 pb-0 sm:pt-4 md:pt-5 bg-[#080D1A]">
          <div className="relative flex flex-col items-center w-full">
            <div className="overflow-hidden w-full flex items-center justify-center relative px-2 sm:px-4">
              {/* Left Ambient Side Slide Preview (Desktop only) */}
              <div
                aria-hidden="true"
                className="hidden md:block absolute left-[-15%] lg:left-[-10%] top-1/2 -translate-y-1/2 w-[42%] h-[75%] rounded-3xl md:rounded-[40px] bg-slate-900/60 border border-slate-800/40 blur-[2px] opacity-40 pointer-events-none"
              />

              {/* Central Active Banner Shimmer (1:1 Sesuai Aspect Ratio BannerCarousel) */}
              <div className="relative aspect-3/2 md:aspect-auto md:h-67.5 2xl:h-72.5 max-w-156.25 mx-auto w-full rounded-3xl md:rounded-[40px] overflow-hidden bg-slate-900/90 border border-slate-800/80 shadow-2xl animate-pulse">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent" />
              </div>

              {/* Right Ambient Side Slide Preview (Desktop only) */}
              <div
                aria-hidden="true"
                className="hidden md:block absolute right-[-15%] lg:right-[-10%] top-1/2 -translate-y-1/2 w-[42%] h-[75%] rounded-3xl md:rounded-[40px] bg-slate-900/60 border border-slate-800/40 blur-[2px] opacity-40 pointer-events-none"
              />
            </div>

            {/* Banner Floating Dots Navigation Shimmer */}
            <div className="flex items-center justify-center gap-1.5 pt-3 pb-1" aria-hidden="true">
              <div className="h-1.5 w-6 rounded-full bg-slate-800 animate-pulse" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-800/60" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-800/60" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-800/60" />
            </div>
          </div>
        </section>

        {/* Divider Gap-Filling Wireframe (Tinggi & Margin 1:1 Presisi dengan BannerPopularDivider) */}
        <div
          aria-hidden="true"
          className="relative w-full max-w-full overflow-hidden pointer-events-none -mt-1 sm:-mt-1.5 md:-mt-2 lg:-mt-2.5 mb-0 h-[48px] sm:h-[60px] md:h-[72px] 2xl:h-[76px] flex items-center justify-center"
        >
          {/* Subtle horizontal guide line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-800/60" />
          {/* Central U-cradle wireframe notch */}
          <div className="relative w-48 sm:w-64 md:w-80 h-3 sm:h-3.5 rounded-t-xl bg-slate-900/70 border-t border-x border-slate-800/80" />
        </div>
      </div>

      {/* 2. Seksi Populer Sekarang Wireframe (1:1 Presisi dengan PopularFrameSvg & 8 Squircle App-Icons) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-20 pt-4 sm:pt-5 md:pt-6 lg:pt-8 pb-2 sm:pb-3">
        {/* Frame Kontur Populer Wireframe (Dimensi, Padding, & Aspek Rasio Identik) */}
        <div className="relative w-full min-h-[225px] sm:min-h-[190px] md:min-h-[195px] lg:min-h-[210px] xl:min-h-0 xl:aspect-[2030/440] rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/50 p-3 sm:p-4 md:p-5 flex flex-col justify-between">
          {/* Header Title Shimmer Pill */}
          <div className="flex items-center justify-between px-1 sm:px-1.5 md:px-2">
            <div className="h-4 sm:h-5 md:h-6 w-20 sm:w-24 md:w-28 rounded-lg bg-slate-800/80 animate-pulse" />
          </div>

          {/* App-Icon Grid: Vertically Centered in Frame Body */}
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-8 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 justify-items-center items-start w-full px-0.5 sm:px-1">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-1 sm:gap-1.5 animate-pulse w-full max-w-18 sm:max-w-19 md:max-w-20 lg:max-w-22 xl:max-w-24"
                >
                  {/* Squircle App-Icon Box */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-17 xl:h-17 rounded-xl sm:rounded-2xl md:rounded-[20px] lg:rounded-[22px] bg-slate-800/80 border border-slate-800/80" />
                  {/* Label text pill */}
                  <div className="w-10 sm:w-12 md:w-14 h-2.5 sm:h-3 bg-slate-800/80 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seksi Katalog Produk Reguler Wireframe (Header Icon Kotak + Grid 6 Kolom Kartu Vertikal) */}
      {[1, 2].map((sectionIdx) => (
        <section
          key={sectionIdx}
          className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-20 pt-6 pb-4"
        >
          {/* Header Shimmer */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-800/80 animate-pulse" />
              <div className="h-5 sm:h-6 w-36 sm:w-44 rounded-lg bg-slate-800/80 animate-pulse" />
            </div>
          </div>

          {/* Grid 6 Kolom Kartu Produk (Atas Gambar Square, Bawah Label Kotak) */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="flex flex-col rounded-xl overflow-hidden border border-slate-800/80 bg-slate-900/80 shadow-md animate-pulse"
              >
                {/* Gambar (Atas) - Shimmer Aspect Square */}
                <div className="relative aspect-square w-full bg-slate-800/80" />
                {/* Teks Label (Bawah) - Shimmer Bar */}
                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-center items-center bg-slate-800/60 border-t border-slate-800/80">
                  <div className="h-3 w-3/4 rounded bg-slate-800/80" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
