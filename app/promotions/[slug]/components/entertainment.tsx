import { Zap, Star, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Game({ title }: { title: string }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
          <Zap className="text-yellow-400" size={20} />
          <p className="text-sm text-slate-300 font-medium">Proses Instan 1-3 Menit</p>
        </div>
        <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
          <Star className="text-blue-400" size={20} />
          <p className="text-sm text-slate-300 font-medium">Layanan Aktif 24/7</p>
        </div>
      </div>
      <div className="space-y-6">
        <p className="text-slate-400 text-lg leading-relaxed">
          Dapatkan harga spesial untuk top-up <span className="text-white font-bold">{title.replace("Promo ", "")}</span>. 
        </p>
        <Link href="/">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-2xl flex items-center gap-3 uppercase italic tracking-widest text-sm transition-all hover:scale-105">
            <ShieldCheck size={22} /> Ambil Promo Sekarang
          </button>
        </Link>
      </div>
    </div>
  );
}