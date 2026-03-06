"use client";
import { Globe, Server } from "lucide-react";

export default function InterfaceDigitalService({ product, accId, setAccId, selectedItemId, setSelectedItemId, formatRupiah }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white text-center sticky top-24">
          <Globe className="mx-auto mb-4 text-blue-400" size={48} />
          <h1 className="font-black text-xl italic uppercase tracking-widest">{product.name}</h1>
          <p className="text-[10px] text-slate-500 mt-2 uppercase">High Performance Service</p>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h2 className="font-black text-xl italic mb-6 text-slate-800">1. Konfigurasi Layanan</h2>
          <div className="grid grid-cols-1 gap-4">
            {product.items.map((item: any) => (
              <button 
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`p-6 rounded-3xl border-2 flex items-center justify-between transition-all ${
                    selectedItemId === item.id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="text-left">
                  <p className="font-black text-slate-800 uppercase text-sm">{item.label}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Managed Service</p>
                </div>
                <p className="font-black text-blue-600">{formatRupiah(item.price)}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
           <h2 className="font-black text-xl italic mb-4 text-slate-800">2. Detail Target</h2>
           <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Hostname / IP / Username</label>
           <div className="relative">
             <Server className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
                type="text" 
                value={accId} 
                onChange={(e) => setAccId(e.target.value)}
                placeholder="Contoh: server-gaming-01" 
                className="w-full bg-slate-50 p-5 pl-14 rounded-2xl border-2 border-slate-100 outline-none focus:border-blue-600 font-mono font-bold text-slate-700" 
            />
           </div>
        </section>
      </div>
    </div>
  );
}