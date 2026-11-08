export default function NewsDetailLoading() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 py-8 md:py-12 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 space-y-8">
        {/* Back Link Skeleton */}
        <div className="h-6 w-32 rounded-lg bg-slate-800" />

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex gap-2">
            <div className="h-5 w-24 rounded-full bg-blue-500/20" />
            <div className="h-5 w-28 rounded-full bg-slate-800" />
          </div>
          <div className="h-10 w-full sm:w-5/6 rounded-xl bg-slate-800" />
          <div className="h-5 w-2/3 rounded-lg bg-slate-800/70" />
        </header>

        {/* Cover Image Skeleton */}
        <div className="aspect-video w-full rounded-2xl bg-slate-800" />

        {/* Body Paragraphs Skeleton */}
        <div className="space-y-4 pt-4">
          <div className="h-4 w-full rounded bg-slate-800/80" />
          <div className="h-4 w-full rounded bg-slate-800/80" />
          <div className="h-4 w-4/5 rounded bg-slate-800/70" />
          <div className="h-4 w-full rounded bg-slate-800/80" />
          <div className="h-4 w-3/4 rounded bg-slate-800/60" />
        </div>
      </div>
    </main>
  );
}
