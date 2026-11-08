export default function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-800 dark:text-slate-100 pb-24">
      {/* 1. Header Banner / Cover Hero Skeleton */}
      <div className="w-full h-44 sm:h-64 bg-slate-900 relative overflow-hidden border-b border-slate-800 animate-pulse">
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        <div className="max-w-6xl mx-auto px-4 h-full flex items-end pb-6 sm:pb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-slate-700/80 shrink-0 shadow-lg" />
            <div className="space-y-2">
              <div className="h-6 sm:h-8 w-48 sm:w-64 rounded-xl bg-slate-800" />
              <div className="h-3.5 w-32 rounded-md bg-slate-800/70" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

          {/* Left Column (Product Info & How-to-Order Box) */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 animate-pulse">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
                <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800/60" />
                <div className="h-3 w-4/6 rounded bg-slate-100 dark:bg-slate-800/60" />
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          </div>

          {/* Right Column (Steps: Nominal -> Account ID -> Payment) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Nominal Selection Box */}
            <div className="bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 animate-pulse">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-500" />
                <div className="h-5 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Category Pills Shimmer */}
              <div className="flex gap-2 overflow-hidden">
                <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-24 rounded-full bg-slate-100 dark:bg-slate-800/60" />
                <div className="h-8 w-24 rounded-full bg-slate-100 dark:bg-slate-800/60" />
              </div>

              {/* Nominal Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-20 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 p-3 flex flex-col justify-between"
                  >
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700/70" />
                    <div className="h-3 w-1/2 rounded bg-slate-200/80 dark:bg-slate-700/50" />
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Account ID Input Box */}
            <div className="bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 animate-pulse">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-500" />
                <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60" />
                <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60" />
              </div>
            </div>

            {/* Step 3: Payment Methods Box */}
            <div className="bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 animate-pulse">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-500" />
                <div className="h-5 w-44 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50"
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
