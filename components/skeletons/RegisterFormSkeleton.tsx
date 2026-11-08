export default function RegisterFormSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 py-10 relative overflow-hidden font-sans">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-125 h-125 bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-125 h-125 bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[40px] shadow-2xl w-full max-w-md relative z-10 animate-pulse">
        {/* Header Shimmer */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 mb-6" />
          <div className="h-8 w-56 rounded-xl bg-slate-800 mb-2" />
          <div className="h-3 w-40 rounded bg-slate-800/70" />
        </div>

        {/* Inputs Shimmer */}
        <div className="space-y-4">
          <div className="h-14 w-full rounded-2xl bg-slate-800/60 border border-white/5" />
          <div className="h-14 w-full rounded-2xl bg-slate-800/60 border border-white/5" />
          <div className="h-14 w-full rounded-2xl bg-slate-800/60 border border-white/5" />
          <div className="h-14 w-full rounded-2xl bg-slate-800/60 border border-white/5" />
          <div className="h-14 w-full rounded-2xl bg-emerald-600/30 border border-emerald-500/20 mt-6" />
        </div>

        {/* Footer Link Shimmer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center flex flex-col items-center gap-2">
          <div className="h-3 w-32 rounded bg-slate-800/60" />
          <div className="h-3.5 w-24 rounded bg-slate-800/80" />
        </div>
      </div>
    </div>
  );
}
