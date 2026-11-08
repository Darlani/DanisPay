export default function InvoiceReceiptSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 font-sans tracking-tight">
      <div className="bg-white w-full max-w-md mx-auto rounded-4xl shadow-xl p-6 sm:p-8 space-y-5 text-center relative overflow-hidden border border-slate-100 animate-pulse">

        {/* 1. Header & Order ID Shimmer */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-200" />
            <div className="h-5 w-44 rounded-lg bg-slate-200" />
          </div>
          <div className="h-3 w-28 rounded bg-slate-100 mx-auto" />
        </div>

        {/* 2. Countdown Timer Box Shimmer */}
        <div className="rounded-2xl p-4 bg-slate-100/80 border border-slate-200/60 space-y-1.5">
          <div className="h-2.5 w-24 rounded bg-slate-200 mx-auto" />
          <div className="h-7 w-32 rounded-lg bg-slate-200 mx-auto" />
        </div>

        {/* 3. QR / Payment Box Shimmer */}
        <div className="p-4 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center space-y-3">
          <div className="w-48 h-48 rounded-2xl bg-slate-200/80" />
          <div className="h-3 w-40 rounded bg-slate-200" />
        </div>

        {/* 4. Total Amount Highlight Box */}
        <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-3.5 space-y-1">
          <div className="h-2.5 w-20 rounded bg-blue-200 mx-auto" />
          <div className="h-6 w-36 rounded-lg bg-blue-200 mx-auto" />
        </div>

        {/* 5. Order Detail Rows Shimmer */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 text-left">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* 6. Footer Button Shimmer */}
        <div className="pt-2">
          <div className="h-11 w-full rounded-2xl bg-slate-200" />
        </div>

      </div>
    </div>
  );
}
