"use client";
import { TicketPercent, ShieldCheck, ChevronRight } from "lucide-react";

export default function InterfaceVoucher({ product, selectedItemId, setSelectedItemId, accId, setAccId, formatRupiah, waNumber, setWaNumber, handleCheckout, isReadyToCheckout }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-orange-100 text-center sticky top-24">
          <div className="w-20 h-20 bg-linear-to-br from-orange-400 to-red-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg mb-4">
            <TicketPercent size={40} />
          </div>
          <h1 className="text-xl font-black italic uppercase text-slate-800">{product.name}</h1>
          <div className="mt-4 flex items-center justify-center gap-2 text-orange-600 font-black text-[9px] uppercase tracking-widest">
            <ShieldCheck size={12} /> Kode Lisensi Resmi
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* PILIH NOMINAL */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h2 className="font-black text-xl italic mb-6 text-slate-800">1. Pilih Nominal Voucher</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product.items.map((item: any) => (
              <button 
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`p-5 rounded-3xl border-2 transition-all flex justify-between items-center ${
                  selectedItemId === item.id ? 'border-orange-500 bg-orange-50/50' : 'border-slate-50 bg-slate-50/30 hover:border-orange-200'
                }`}
              >
                <span className="font-black text-xs text-slate-700">{item.label}</span>
                <span className="font-bold text-[11px] text-orange-600">{formatRupiah(item.price)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* INPUT KONTAK */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h2 className="font-black text-xl italic mb-4 text-slate-800">2. Kirim ke WhatsApp</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 italic">
            *Kode voucher akan dikirimkan otomatis ke nomor ini.
          </p>
          <input 
            type="text" 
            value={waNumber} 
            onChange={(e) => setWaNumber(e.target.value)}
            placeholder="Nomor WhatsApp (08xxx)" 
            className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 outline-none focus:border-orange-500 font-bold text-slate-700" 
          />
        </section>
      </div>
    </div>
  );
}