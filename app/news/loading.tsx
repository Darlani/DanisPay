export default function NewsLoading() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 py-8 md:py-12 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 space-y-10">
        {/* Back Link Skeleton */}
        <div className="h-6 w-28 rounded-lg bg-slate-800" />

        {/* Page Header Skeleton */}
        <header className="space-y-3">
          <div className="h-6 w-32 rounded-full bg-blue-500/20" />
          <div className="h-9 w-64 sm:w-80 rounded-xl bg-slate-800" />
          <div className="h-4 max-w-md rounded bg-slate-800/80" />
        </header>

        {/* Hero Card Skeleton */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 md:p-10 shadow-2xl">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-7">
              <div className="flex gap-2">
                <div className="h-5 w-24 rounded-full bg-amber-500/20" />
                <div className="h-5 w-20 rounded-full bg-blue-500/20" />
              </div>
              <div className="h-8 w-3/4 rounded-xl bg-slate-800" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-slate-800/80" />
                <div className="h-4 w-5/6 rounded bg-slate-800/60" />
              </div>
              <div className="h-10 w-36 rounded-xl bg-blue-600/40 mt-4" />
            </div>
            <div className="aspect-video w-full rounded-2xl bg-slate-800 lg:col-span-5" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="space-y-5">
          <div className="h-7 w-48 rounded-lg bg-slate-800" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-lg"
              >
                <div className="aspect-video w-full bg-slate-800" />
                <div className="p-5 space-y-3">
                  <div className="h-3.5 w-24 rounded bg-slate-800" />
                  <div className="h-5 w-5/6 rounded bg-slate-800" />
                  <div className="h-3.5 w-full rounded bg-slate-800/70" />
                  <div className="h-3.5 w-2/3 rounded bg-slate-800/50" />
                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="h-4 w-28 rounded bg-blue-500/30" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
