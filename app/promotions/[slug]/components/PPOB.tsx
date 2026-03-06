import { Receipt, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";

// Pastikan ada { title } di dalam kurung fungsi
export default function PPOB({ title }: { title: string }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-3xl flex gap-5 items-start">
        <div className="p-3 bg-yellow-500/20 rounded-2xl shrink-0">
          <Receipt className="text-yellow-400" size={28} />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-1 text-yellow-400">Cashback Menantimu!</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Gunakan promo <span className="text-white font-bold">{title}</span> ini untuk pembayaran PLN, PDAM, atau BPJS. 
            Cashback akan otomatis masuk ke saldo akun Anda.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <Link href="/">
          <button className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-10 rounded-2xl transition-all hover:scale-105 flex items-center gap-3 shadow-[0_20px_40px_-10px_rgba(202,138,4,0.4)] uppercase italic tracking-widest text-sm">
            <Wallet size={20} />
            Bayar Tagihan Sekarang
            <ArrowRight size={20} />
          </button>
        </Link>
      </div>
    </div>
  );
}