"use client";
import { Briefcase } from "lucide-react";

export default function InterfaceProductivity({ product, selectedItemId, setSelectedItemId, accId, setAccId, formatRupiah }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 sticky top-24">
          <div className="w-full aspect-square bg-emerald-50 rounded-3xl flex items-center justify-center mb-4">
             <Briefcase size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black italic text-slate-800 uppercase text-center">{product.name}</h1>
          <div className="mt-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
             <p className="text-[10px] font-black text-emerald-700 uppercase text-center tracking-tighter">Productivity Tools</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h2 className="font-black text-xl italic mb-6 text-slate-800">Pilih Paket Langganan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.items.map((item: any) => (
              <button 
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`p-6 rounded-3xl border-2 text-left transition-all ${
                    selectedItemId === item.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'
                }`}
              >
                <p className="text-sm font-black text-slate-800">{item.label}</p>
                <p className="text-xs font-bold text-emerald-600 mt-1">{formatRupiah(item.price)}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h2 className="font-black text-xl italic mb-6 text-slate-800">Email Akun</h2>
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Email yang akan di-upgrade</p>
          <input 
            type="email" 
            value={accId} 
            onChange={(e) => setAccId(e.target.value)}
            placeholder="contoh: arlan@email.com" 
            className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold text-slate-700" 
          />
        </section>
      </div>
    </div>
  );
}