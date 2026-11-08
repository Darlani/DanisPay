export default function PromoLoading() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 py-8 md:py-12 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 space-y-10">
        {/* Back Link Skeleton */}
        <div className="h-6 w-28 rounded-lg bg-slate-800" />

        {/* Page Header Skeleton */}
        <header className="space-y-3">
          <div className="h-6 w-32 rounded-full bg-amber-500/20" />
          <div className="h-9 w-64 sm:w-80 rounded-xl bg-slate-800" />
          <div className="h-4 max-w-md rounded bg-slate-800/80" />
        </header>

        {/* Category Filter Pills Skeleton */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 sm:w-24 rounded-xl bg-slate-800" />
          ))}
        </div>

        {/* Promo Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg"
            >
              <div className="aspect-16/9 w-full bg-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-4/5 rounded bg-slate-800" />
                <div className="h-3.5 w-full rounded bg-slate-800/70" />
                <div className="flex gap-2 pt-1">
                  <div className="h-4 w-20 rounded bg-emerald-500/20" />
                  <div className="h-4 w-24 rounded bg-amber-500/20" />
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="h-9 w-full rounded-xl bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
