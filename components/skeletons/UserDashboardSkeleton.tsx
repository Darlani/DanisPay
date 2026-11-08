export default function UserDashboardSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* 1. Header Greeting Bar Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="space-y-2">
          <div className="h-7 w-48 sm:w-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-60 sm:w-80 rounded-md bg-slate-100 dark:bg-slate-800/70" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* 2. Top 2 Main Cards Grid: Saldo DaPay & Koin DaPay */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">

        {/* Card 1: Saldo DaPay Shimmer */}
        <div className="min-h-52 sm:min-h-60 rounded-3xl border border-blue-400/30 bg-linear-to-br from-[#1e3a8a]/70 via-[#1d4ed8]/70 to-[#312e81]/70 p-5 sm:p-6 text-white flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-white/30" />
                <div className="h-2.5 w-20 rounded bg-white/20" />
              </div>
            </div>
            <div className="h-5 w-20 rounded-full bg-white/20" />
          </div>

          <div className="space-y-2 my-4">
            <div className="h-3 w-28 rounded bg-white/20" />
            <div className="h-8 sm:h-10 w-48 rounded-xl bg-white/30" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-white/30" />
            <div className="h-10 rounded-xl bg-white/20" />
          </div>
        </div>

        {/* Card 2: Koin DaPay Shimmer */}
        <div className="min-h-52 sm:min-h-60 rounded-3xl border border-purple-200/80 dark:border-purple-900/40 bg-linear-to-br from-white via-purple-50/70 to-indigo-50/60 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 p-5 sm:p-6 flex flex-col justify-between shadow-xl border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-200/80 dark:bg-purple-900/40" />
              <div className="space-y-1.5">
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2.5 w-36 rounded bg-slate-100 dark:bg-slate-800/60" />
              </div>
            </div>
            <div className="h-5 w-20 rounded-full bg-purple-100 dark:bg-purple-900/30" />
          </div>

          <div className="space-y-2 my-4">
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 sm:h-10 w-36 rounded-xl bg-purple-200/60 dark:bg-purple-900/40" />
          </div>

          <div className="h-10 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/30" />
        </div>

      </div>

      {/* 3. 4 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-6 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-2.5 w-32 rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        ))}
      </div>

      {/* 4. Activity / Orders Section Shimmer */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="h-5 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
