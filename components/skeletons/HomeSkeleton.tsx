export default function HomeSkeleton() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200">
      {/* 1. Hero Banner Carousel Skeleton */}
      <div className="w-full bg-[#080D1A] py-6 sm:py-8 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-20 space-y-6">
          {/* Main Banner Shimmer */}
          <div className="relative aspect-16/7 sm:aspect-16/6 w-full rounded-3xl bg-slate-800/60 overflow-hidden border border-slate-800 animate-pulse">
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            <div className="absolute bottom-6 left-6 space-y-2 max-w-md">
              <div className="h-5 w-24 rounded-full bg-slate-700/80" />
              <div className="h-7 w-64 rounded-xl bg-slate-700/60" />
              <div className="h-4 w-48 rounded-lg bg-slate-700/40" />
            </div>
          </div>

          {/* Quick Category Shortcut Pills Shimmer */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-2 custom-scrollbar">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-9 w-28 sm:w-32 rounded-xl bg-slate-800/80 border border-slate-800 shrink-0 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Popular Products Section Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-20 py-8 sm:py-10 space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="space-y-1.5">
              <div className="h-6 w-44 rounded-lg bg-slate-800 animate-pulse" />
              <div className="h-3.5 w-60 rounded-md bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-4 w-20 rounded bg-slate-800/60 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 pt-1">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 sm:p-3.5 space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-3.5 w-3/4 rounded bg-slate-800" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-800/70" />
                  </div>
                </div>
                <div className="h-2 w-full rounded bg-slate-800/50" />
              </div>
            ))}
          </div>
        </section>

        {/* 3. Catalog Section Secondary Shimmer */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="space-y-1.5">
              <div className="h-6 w-36 rounded-lg bg-slate-800 animate-pulse" />
              <div className="h-3.5 w-52 rounded-md bg-slate-800/60 animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 pt-1">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 sm:p-3.5 space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-3.5 w-3/4 rounded bg-slate-800" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-800/70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
