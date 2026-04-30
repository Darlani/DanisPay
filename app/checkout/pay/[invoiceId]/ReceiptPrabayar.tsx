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
    ? { color: "text-amber-600", border: "border-amber-500", bg: "bg-amber-50", icon: <Zap size={12} /> }
    : isGame 
    ? { color: "text-indigo-600", border: "border-indigo-600", bg: "bg-indigo-50", icon: <Gamepad2 size={12} /> }
    : { color: "text-emerald-600", border: "border-emerald-600", bg: "bg-emerald-50", icon: <Smartphone size={12} /> };

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

  // DATA MURNI DATABASE
  const hargaProduk = order.price || 0;
  const biayaLayanan = order.unique_code || 0;
  const totalLunas = order.total_amount || 0;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full animate-in fade-in zoom-in duration-500">
      
      <div ref={receiptRef} className={`w-full max-w-md mx-auto bg-white text-slate-800 p-3 sm:p-5 shadow-2xl border-t-8 ${theme.border} rounded-b-2xl font-mono text-[11px] relative overflow-hidden`}>
        
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] rotate-[-35deg] pointer-events-none ${theme.color}`}>
          <CheckCircle2 size={200} />
        </div>

        {/* HEADER - ULTRA MEPEET */}
        <div className="text-center border-b border-dashed border-slate-200 pb-1.5 mb-2">
          <h2 className="text-base sm:text-lg font-black tracking-tighter italic uppercase">
            DANISPAY <span className={theme.color}>STORE</span>
          </h2>
          <div className={`flex items-center justify-center gap-1 text-[8px] font-bold uppercase ${theme.color}`}>
            {theme.icon} {isPln ? "Token Listrik" : isGame ? "Top Up Game" : "Pulsa/Data"}
          </div>
        </div>

        <div className="w-full text-left">
          {/* INFO HEADER - MEPEET */}
          <div className="space-y-0.5">
            <div className="flex justify-between items-center w-full">
              <span className="text-slate-400 uppercase text-[7.5px] tracking-widest">Tanggal</span> 
              <span className="font-bold text-slate-800 text-right text-[10px] sm:text-[11px]">{new Date(order.updated_at || order.created_at).toLocaleString('id-ID')}</span>
            </div>
            
            <div onClick={handleCopyInvoice} className="flex justify-between items-center w-full cursor-pointer group py-0 transition-all active:scale-95">
              <span className="text-slate-400 uppercase text-[7.5px] tracking-widest">No. Invoice</span> 
              <span className={`font-bold ${theme.color} flex items-center justify-end gap-1 text-[10px] sm:text-[11px]`}>
                {copied ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Copy size={10} className="text-slate-300 opacity-0 group-hover:opacity-100" />}
                #{order.order_id}
              </span>
            </div>
            
            <div className="flex justify-between items-center w-full">
              <span className="text-slate-400 uppercase text-[7.5px] tracking-widest">Metode</span> 
              <span className="font-bold text-slate-800 text-right uppercase text-[10px] sm:text-[11px]">{order.payment_method}</span>
            </div>
          </div>
          
          <div className="border-t border-dashed border-slate-200 my-1.5"></div>

          {/* --- INFO CENTER --- */}
          <div className="space-y-1 mb-2">
            <div className="text-center w-full">
              <span className="text-slate-400 uppercase block text-[7.5px] tracking-widest leading-none">Produk</span>
              <span className="font-bold text-slate-800 uppercase block leading-tight text-[11px] sm:text-[12px]">{order.product_name}</span>
            </div>
            
            {(isPln || (isGame && order.customer_name)) && (
              <div className="text-center w-full">
                <span className="text-slate-400 uppercase block text-[7.5px] tracking-widest leading-none">{isPln ? "Nama Pelanggan" : "Nickname"}</span>
                <span className="font-bold text-slate-800 uppercase block text-[11px] sm:text-[12px]">{isPln ? plnNama : order.customer_name}</span>
              </div>
            )}

            {(isPln || isGame) && (
              <div className="text-center w-full">
                <span className="text-slate-400 uppercase block text-[7.5px] tracking-widest leading-none">{isPln ? "ID Pelanggan" : "ID Player"}</span>
                <span className="font-black text-slate-900 block text-[13px] tracking-widest">{order.game_id}</span>
              </div>
            )}
          </div>

          {/* --- KOTAK DETAIL --- */}
          <div className={`${theme.bg} p-2 rounded-lg border ${theme.border} border-opacity-10 w-full`}>
            <div className="space-y-1">
              {isPln && (
                <>
                  <div className="flex justify-between items-center w-full text-[8.5px]">
                    <span className="text-slate-500 uppercase">Tarif/Daya</span>
                    <span className="font-bold text-slate-800">{plnTarifDaya}</span>
                  </div>
                  <div className="flex justify-between items-center w-full text-[8.5px]">
                    <span className="text-slate-500 uppercase">KWH</span>
                    <span className="font-bold text-slate-800">{plnKwh}</span>
                  </div>
                </>
              )}

              {isPulsaData && (
                <div className="flex justify-between items-center w-full text-[8.5px]">
                  <span className="text-slate-500 uppercase">Tujuan</span>
                  <span className="font-bold text-slate-800 tracking-widest">{order.game_id}</span>
                </div>
              )}
              
              <div className={`flex justify-between items-center w-full text-[8.5px] ${isPln || isPulsaData ? 'border-t border-slate-200 border-opacity-30 pt-1' : ''}`}>
                <span className="text-slate-500 uppercase">Harga</span>
                <span className="font-bold text-slate-800 text-[10px]">Rp {hargaProduk.toLocaleString('id-ID')}</span>
              </div>

              {biayaLayanan > 0 && (
                <div className="flex justify-between items-center w-full text-[8.5px]">
                  <span className="text-slate-500 uppercase">Layanan</span>
                  <span className="font-bold text-slate-800 text-[10px]">Rp {biayaLayanan.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          </div>

          {/* NOMOR TOKEN / SN - PRESS LAGI */}
          <div className="text-center py-2">
            <p className="text-slate-400 uppercase text-[7.5px] mb-0">{isPln ? "Nomor Token / Stroom" : "Serial Number / SN"}</p>
            <p className={`font-black ${isPln ? 'text-lg tracking-widest' : 'text-[10px]'} text-slate-900 bg-slate-50 py-2 rounded border border-dashed ${theme.border} border-opacity-30 break-all px-1.5`}>
              {formattedToken}
            </p>
          </div>
        </div>

        {/* TOTAL LUNAS - MEPEET */}
        <div className="border-t border-dashed border-slate-200 pt-2">
          <div className={`flex justify-between items-center ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white px-2 py-1.5 rounded-lg shadow-sm`}>
            <span className="font-bold italic uppercase text-[8px]">Total Lunas</span>
            <span className="text-sm sm:text-base font-black italic">Rp {totalLunas.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="text-center mt-2.5 pt-2 border-t border-dashed border-slate-200 text-[7px] text-slate-400 uppercase font-bold italic">
          <p className={theme.color}>Digital Tercepat & Terpercaya</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-row gap-1.5 w-full max-w-md mx-auto no-print px-1.5">
        <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-1.5 rounded-md font-black italic uppercase text-[8px] flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 shadow-sm"><Printer size={10} /> Cetak</button>
        <button onClick={handleDownloadImage} className={`flex-1 ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white py-1.5 rounded-md font-black italic uppercase text-[8px] flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 shadow-sm`}><Download size={10} /> Simpan</button>
      </div>

      <style jsx global>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
    </div>
  );
}