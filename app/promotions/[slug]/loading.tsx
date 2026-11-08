export default function PromoDetailLoading() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 py-8 md:py-12 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 space-y-8">
        {/* Back Link Skeleton */}
        <div className="h-6 w-32 rounded-lg bg-slate-800" />

        {/* Header Skeleton */}
        <header className="space-y-4">
          <div className="h-5 w-28 rounded-full bg-amber-500/20" />
          <div className="h-9 w-full sm:w-3/4 rounded-xl bg-slate-800" />
          <div className="h-4 w-1/2 rounded bg-slate-800/70" />
        </header>

        {/* Banner/Card Skeleton */}
        <div className="aspect-16/9 w-full rounded-2xl bg-slate-800" />

        {/* Details Box Skeleton */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="h-6 w-48 rounded-lg bg-slate-800" />
          <div className="h-4 w-full rounded bg-slate-800/80" />
          <div className="h-4 w-5/6 rounded bg-slate-800/70" />
          <div className="h-10 w-full sm:w-48 rounded-xl bg-blue-600/40 mt-4" />
        </div>
      </div>
    </main>
  );
}
