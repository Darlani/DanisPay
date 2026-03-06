"use client";
import { Plane, ArrowLeft, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InterfaceTravel(props: any) {
  const { product, accId, setAccId, handleCheckout, totalPrice, formatRupiah, backTarget } = props;
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      {/* TOMBOL KEMBALI STANDAR */}
      <button 
        onClick={() => router.push(backTarget)} 
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-black uppercase text-[10px] tracking-widest italic"
      >
        <ArrowLeft size={16} /> Kembali ke {product.name}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* SISI KIRI: INFO PRODUK */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-[30px] shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
               <img src={product.img} alt={product.name} className="object-cover w-full h-full" />
            </div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-800">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2 py-1 px-3 bg-blue-50 rounded-full w-fit">
               <ShieldCheck size={12} className="text-blue-600" />
               <span className="text-[10px] font-bold text-blue-600 uppercase">Official Partner</span>
            </div>
          </div>
        </div>

        {/* SISI KANAN: FORM PEMESANAN */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[35px] shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200">
                <Plane size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase italic text-slate-800">Data Pemesan</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Pastikan nomor aktif untuk pengiriman tiket</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-xs font-black uppercase italic text-slate-500 ml-2">Nomor HP / WhatsApp</label>
              <input 
                type="text" 
                placeholder="Contoh: 08123456789"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700"
                value={accId}
                onChange={(e) => setAccId(e.target.value)}
              />
            </div>
          </div>

          {/* PEMBAYARAN */}
          <div className="bg-slate-900 p-6 rounded-[35px] text-white flex items-center justify-between shadow-2xl shadow-blue-900/20">
            <div>
              <p className="text-[10px] font-bold uppercase opacity-60">Total Pembayaran</p>
              <p className="text-xl font-black italic">{formatRupiah(totalPrice)}</p>
            </div>
            <button 
              onClick={handleCheckout}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase italic text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/40"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}