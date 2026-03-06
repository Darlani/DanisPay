"use client";
import { ShoppingBag } from "lucide-react";

export default function InterfaceMarketplace({ product, accId, setAccId, selectedItemId, setSelectedItemId, formatRupiah }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 sticky top-24 text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg mb-4">
            <ShoppingBag size={40} />
          </div>
          <h1 className="mt-4 font-black text-lg text-orange-600 uppercase italic">{product.name}</h1>
          <p className="text-xs font-bold text-slate-400">Marketplace Service</p>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
           <h2 className="font-black text-xl italic mb-6 text-slate-800">1. Pilih Barang / Paket</h2>
           <div className="grid grid-cols-1 gap-3">
               {product.items.map((item: any) => (
                   <button key={item.id} onClick={() => setSelectedItemId(item.id)}
                       className={`p-4 rounded-2xl border-2 text-left flex justify-between items-center ${
                           selectedItemId === item.id ? 'border-orange-500 bg-orange-50' : 'border-slate-100'
                       }`}>
                       <span className="font-bold text-slate-700">{item.label}</span>
                       <span className="font-black text-orange-600">{formatRupiah(item.price)}</span>
                   </button>
               ))}
           </div>
        </section>

        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h2 className="font-black text-xl italic mb-6 text-slate-800">2. Link Produk / Catatan</h2>
          <textarea 
            value={accId}
            onChange={(e) => setAccId(e.target.value)}
            placeholder="Tempelkan link produk atau tuliskan detail barang (Warna, Ukuran) di sini..."
            className="w-full h-32 bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 outline-none focus:border-orange-500 font-medium text-slate-700 resize-none"
          />
          <p className="text-[10px] text-slate-400 mt-2 italic">*Admin akan memproses pesanan sesuai catatan yang diberikan.</p>
        </section>
      </div>
    </div>
  );
}