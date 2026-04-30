"use client";

import { useRef, useState } from "react";
import { Download, Printer, CheckCircle2, Gamepad2, Smartphone, Zap, Copy } from "lucide-react";
import { toPng } from "html-to-image";

export default function ReceiptPrabayar({ order }: { order: any }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyInvoice = () => {
    if (order?.order_id) {
      navigator.clipboard.writeText(order.order_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadImage = async () => {
    if (receiptRef.current && order) {
      try {
        const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: "#ffffff", pixelRatio: 3 });
        const link = document.createElement("a");
        link.download = `DanisPay-${order.order_id}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        alert("Gagal menyimpan gambar, Bos!");
      }
    }
  };

  if (!order || order.status !== "Berhasil") return null;

  const cat = (order.category || "").toLowerCase();
  const productName = (order.product_name || "").toLowerCase();
  const isPln = productName.includes('pln');
  const isGame = cat.includes('game');
  const isPulsaData = !isPln && !isGame;

  const theme = isPln 
    ? { color: "text-amber-600", border: "border-amber-500", bg: "bg-amber-50", icon: <Zap className="size-3 sm:size-4" /> }
    : isGame 
    ? { color: "text-indigo-600", border: "border-indigo-600", bg: "bg-indigo-50", icon: <Gamepad2 className="size-3 sm:size-4" /> }
    : { color: "text-emerald-600", border: "border-emerald-600", bg: "bg-emerald-50", icon: <Smartphone className="size-3 sm:size-4" /> };

  let tokenUtama = order.sn || "";
  let plnNama = order.customer_name || "-";
  let plnTarifDaya = order.segment_power || "-";
  let plnKwh = "-";

  if (isPln && order.sn?.includes('/')) {
    const parts = order.sn.split('/');
    tokenUtama = parts[0];
    if (plnNama === "-") plnNama = parts[1] || "-";
    if (plnTarifDaya === "-") plnTarifDaya = `${parts[2]}/${parts[3]}`;
    plnKwh = parts.find((p: string) => p.toLowerCase().includes('kwh'))?.replace(/kwh:?/gi, '').trim() || "-";
  }
  const formattedToken = isPln ? (tokenUtama.replace(/[^0-9]/g, '').match(/.{1,4}/g)?.join('-') || tokenUtama) : order.sn;

  const hargaProduk = order.price || 0;
  const biayaLayanan = order.unique_code || 0;
  const totalLunas = order.total_amount || 0;

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 w-full animate-in fade-in zoom-in duration-500 px-4">
      
      <div 
        ref={receiptRef} 
        className={`w-full max-w-md mx-auto bg-white text-slate-800 p-3 sm:p-6 shadow-2xl border-t-8 ${theme.border} rounded-b-2xl font-mono text-[11px] relative overflow-hidden`}
      >
        
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] rotate-[-35deg] pointer-events-none ${theme.color}`}>
          <CheckCircle2 size={250} />
        </div>

        {/* HEADER */}
        <div className="text-center border-b border-dashed border-slate-200 pb-2 mb-2 sm:pb-4 sm:mb-4">
          <h2 className="text-base sm:text-xl font-black tracking-tighter italic uppercase leading-none">
            DANISPAY <span className={theme.color}>STORE</span>
          </h2>
          <div className={`flex items-center justify-center gap-1 text-[8px] sm:text-[9px] font-bold uppercase mt-1 ${theme.color}`}>
            {theme.icon} {isPln ? "Token Listrik" : isGame ? "Top Up Game" : "Pulsa/Data"}
          </div>
        </div>

        <div className="w-full text-left">
          {/* INFO HEADER */}
          <div className="space-y-0.5 sm:space-y-1.5">
            <div className="flex justify-between items-center w-full">
              <span className="text-slate-400 uppercase text-[7.5px] sm:text-[9px] tracking-widest leading-none">Tanggal</span> 
              <span className="font-bold text-slate-800 text-right text-[10px] sm:text-[13px]">{new Date(order.updated_at || order.created_at).toLocaleString('id-ID')}</span>
            </div>
            
            <div onClick={handleCopyInvoice} className="flex justify-between items-center w-full cursor-pointer group py-0 sm:py-0.5 transition-all active:scale-95">
              <span className="text-slate-400 uppercase text-[7.5px] sm:text-[9px] tracking-widest leading-none">No. Invoice</span> 
              <span className={`font-bold ${theme.color} flex items-center justify-end gap-1 text-[10px] sm:text-[13px]`}>
                {copied ? <CheckCircle2 className="size-2.5 sm:size-3 text-emerald-500" /> : <Copy className="size-2.5 sm:size-3 text-slate-300 opacity-0 group-hover:opacity-100" />}
                #{order.order_id}
              </span>
            </div>
            
            <div className="flex justify-between items-center w-full">
              <span className="text-slate-400 uppercase text-[7.5px] sm:text-[9px] tracking-widest leading-none">Metode</span> 
              <span className="font-bold text-slate-800 text-right uppercase text-[10px] sm:text-[13px]">{order.payment_method}</span>
            </div>
          </div>
          
          <div className="border-t border-dashed border-slate-200 my-2 sm:my-4"></div>

          {/* --- INFO CENTER --- */}
          <div className="space-y-2 sm:space-y-3 mb-2 sm:mb-4">
            <div className="text-center w-full">
              <span className="text-slate-400 uppercase block text-[7.5px] sm:text-[9px] tracking-widest">Produk</span>
              <span className="font-bold text-slate-800 uppercase block text-[11px] sm:text-[13px] mt-0.5">{order.product_name}</span>
            </div>
            
            {(isPln || (isGame && order.customer_name)) && (
              <div className="text-center w-full">
                <span className="text-slate-400 uppercase block text-[7.5px] sm:text-[9px] tracking-widest">{isPln ? "Nama Pelanggan" : "Nickname"}</span>
                <span className="font-bold text-slate-800 uppercase block text-[11px] sm:text-[13px] mt-0.5">{isPln ? plnNama : order.customer_name}</span>
              </div>
            )}

            {isPln && (
              <div className="text-center w-full">
                <span className="text-slate-400 uppercase block text-[7.5px] sm:text-[9px] tracking-widest">ID Pelanggan</span>
                <span className="font-black text-slate-900 block text-[11px] sm:text-[13px] tracking-widest mt-0.5">{order.game_id}</span>
              </div>
            )}
          </div>

          {/* --- KOTAK DETAIL (Seragam 10px / 12px) --- */}
          <div className={`${theme.bg} p-2.5 sm:p-4 rounded-xl border ${theme.border} border-opacity-10 w-full text-[10px] sm:text-[12px]`}>
            <div className="space-y-1.5 sm:space-y-2">
              
              {isPln && (
                <>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-500 uppercase">Tarif/Daya</span>
                    <span className="font-bold text-slate-800">{plnTarifDaya}</span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-500 uppercase">Jumlah Listrik</span>
                    <span className="font-bold text-slate-800">{plnKwh} KWH</span>
                  </div>
                </>
              )}

              {!isPln && (
                <>
                  <div className="flex justify-between items-start w-full">
                    <span className="text-slate-500 uppercase shrink-0">Serial Number</span>
                    <span className="font-bold text-slate-800 text-right break-all ml-4 uppercase">{formattedToken}</span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-500 uppercase">{isGame ? "ID Game" : "Nomor Tujuan"}</span>
                    <span className="font-bold text-slate-800 tracking-widest">{order.game_id}</span>
                  </div>
                </>
              )}
              
              <div className="border-t border-slate-200 border-opacity-30 pt-1.5 sm:pt-2 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center w-full">
                  <span className="text-slate-500 uppercase">Harga Produk</span>
                  <span className="font-bold text-slate-800">Rp {hargaProduk.toLocaleString('id-ID')}</span>
                </div>

                {biayaLayanan > 0 && (
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-500 uppercase">Biaya Layanan</span>
                    <span className="font-bold text-slate-800">Rp {biayaLayanan.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* NOMOR TOKEN (HANYA PLN) */}
          {isPln && (
            <div className="text-center py-3 sm:py-6">
              <p className="text-slate-400 uppercase text-[7.5px] sm:text-[9px] mb-0.5 sm:mb-1">Nomor Token / Stroom</p>
              <p className="font-black text-[14px] sm:text-[16px] tracking-widest text-slate-900 bg-slate-50 py-2.5 sm:py-4 rounded-lg border-2 border-dashed border-amber-400 border-opacity-30 break-all px-2 shadow-inner">
                {formattedToken}
              </p>
            </div>
          )}
        </div>

        {/* TOTAL LUNAS */}
        <div className={`border-t border-dashed border-slate-200 ${isPln ? 'pt-0' : 'pt-3 sm:pt-4'} mt-3`}>
          <div className={`flex justify-between items-center ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl shadow-lg`}>
            <span className="font-bold italic uppercase text-[8px] sm:text-[10px]">Total Lunas</span>
            <span className="text-sm sm:text-lg font-black italic">Rp {totalLunas.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="text-center mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-dashed border-slate-200 text-[7px] sm:text-[8px] text-slate-400 uppercase font-bold italic leading-relaxed">
          <p>Terima kasih telah bertransaksi di DanisPay</p>
          <p className={theme.color}>Layanan Digital Tercepat & Terpercaya</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-row gap-2 w-full max-w-md mx-auto no-print">
        <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-2 sm:py-2.5 rounded-xl font-black italic uppercase text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 shadow-md"><Printer size={14} /> Cetak</button>
        <button onClick={handleDownloadImage} className={`flex-1 ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white py-2 sm:py-2.5 rounded-xl font-black italic uppercase text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 shadow-md`}><Download size={14} /> Simpan</button>
      </div>

      <style jsx global>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
    </div>
  );
}