"use client";
import { ThumbsUp, Link } from "lucide-react";

export default function InterfaceSosmed({ product, accId, setAccId, selectedItemId, setSelectedItemId, formatRupiah }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-pink-100 sticky top-24">
          <img src={product.img} className="w-full rounded-3xl shadow-md mb-4" alt={product.name} />
          <h1 className="font-black text-center text-pink-600 text-xl italic uppercase">SOSMED BOOSTER</h1>
          <p className="text-center text-[10px] text-slate-400 uppercase mt-2">Grow your audience fast</p>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h2 className="font-black text-xl italic mb-6 text-slate-800">1. Pilih Layanan</h2>
          <div className="space-y-3">
            {product.items.map((item: any) => (
              <label key={item.id} className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                selectedItemId === item.id ? 'border-pink-500 bg-pink-50' : 'border-slate-50 hover:bg-slate-50'
              }`}>
                <input type="radio" name="sosmed" className="hidden" onClick={() => setSelectedItemId(item.id)} />
                <div className="flex items-center gap-3">
                    <ThumbsUp size={18} className={selectedItemId === item.id ? "text-pink-600" : "text-slate-300"} />
                    <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                </div>
                <span className="font-black text-pink-600">{formatRupiah(item.price)}</span>
              </label>
            ))}
          </div>
        </section>
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h2 className="font-black text-xl italic mb-6 text-slate-800">2. Link Target / Username</h2>
          <div className="relative">
            <Link className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
                type="text" 
                value={accId} 
                onChange={(e) => setAccId(e.target.value)}
                placeholder="https://instagram.com/username..." 
                className="w-full bg-slate-50 p-5 pl-14 rounded-2xl border-2 border-slate-100 focus:border-pink-500 outline-none font-medium" 
            />
          </div>
          <p className="mt-2 text-[10px] text-slate-400 italic">*Pastikan akun TIDAK DI-PRIVATE saat proses berlangsung.</p>
        </section>
      </div>
    </div>
  );
}