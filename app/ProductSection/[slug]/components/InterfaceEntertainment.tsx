"use client";
import { MonitorPlay, Mail } from "lucide-react";

export default function InterfaceEntertainment({ product, selectedItemId, setSelectedItemId, accId, setAccId, formatRupiah }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-1">
        {/* POSISI: Cukup pakai 'sticky' saja, buang 'relative' nya Bos! */}
        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-center overflow-hidden group sticky top-24">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="w-24 h-24 bg-rose-600 rounded-4xl mx-auto flex items-center justify-center text-white shadow-xl shadow-rose-900/20 mb-6 group-hover:scale-110 transition-transform relative z-10">
            <MonitorPlay size={48} />
          </div>
          
          <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter relative z-10">{product.name}</h1>
          <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em] mt-2 relative z-10">Premium Subscription</p>
        </div>
      </div>
      {/* ... sisa kode ke bawah sama ... */}
      <div className="lg:col-span-2 space-y-6">
         <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <h2 className="font-black text-xl italic mb-6">Pilih Durasi Langganan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {product.items.map((item: any) => (
                  <button key={item.id} onClick={() => setSelectedItemId(item.id)} className={`p-6 rounded-3xl border-2 flex items-center justify-between transition-all ${selectedItemId === item.id ? 'border-rose-500 bg-rose-50' : 'border-slate-50 bg-slate-50/50 hover:border-rose-200'}`}>
                     <div className="text-left"><p className="font-black text-slate-800 text-sm uppercase">{item.label}</p></div>
                     <p className="font-black text-rose-600 italic">{formatRupiah(item.price)}</p>
                  </button>
               ))}
            </div>
         </section>
      </div>
    </div>
  );
}