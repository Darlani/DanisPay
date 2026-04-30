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

  // --- 1. DETEKSI KATEGORI ---
  const cat = (order.category || "").toLowerCase();
  const productName = (order.product_name || "").toLowerCase();
  const isPln = productName.includes('pln');
  const isGame = cat.includes('game');
  const isPulsaData = !isPln && !isGame;

  // --- 2. THEME CONFIG ---
  const theme = isPln 
    ? { color: "text-amber-600", border: "border-amber-500", bg: "bg-amber-50", icon: <Zap size={16} /> }
    : isGame 
    ? { color: "text-indigo-600", border: "border-indigo-600", bg: "bg-indigo-50", icon: <Gamepad2 size={16} /> }
    : { color: "text-emerald-600", border: "border-emerald-600", bg: "bg-emerald-50", icon: <Smartphone size={16} /> };

  // --- 3. PARSING DATA ---
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

  const totalLunas = order.total_amount || 0;
  const biayaLayanan = order.unique_code || 0;
  const hargaProduk = order.price || 0;

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 w-full animate-in fade-in zoom-in duration-500">
      
      <div ref={receiptRef} className={`w-full max-w-md mx-auto bg-white text-slate-800 p-4 sm:p-6 shadow-2xl border-t-8 ${theme.border} rounded-b-2xl font-mono text-sm relative overflow-hidden`}>
        
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-35deg] pointer-events-none ${theme.color}`}>
          <CheckCircle2 size={250} />
        </div>

        <div className="text-center border-b-2 border-dashed border-slate-200 pb-3 mb-3 sm:pb-4 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-black tracking-tighter italic uppercase">
            DANISPAY <span className={theme.color}>STORE</span>
          </h2>
          <div className={`flex items-center justify-center gap-1.5 text-[8px] sm:text-[9px] font-bold uppercase mt-1 ${theme.color}`}>
            {theme.icon} {isPln ? "Struk Token Listrik" : isGame ? "Bukti Top Up Game" : "Bukti Pengisian Pulsa/Data"}
          </div>
        </div>

        <div className="w-full text-left">
          {/* INFO HEADER */}
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex justify-between items-center w-full">
              <span className="text-slate-500 uppercase block text-[8px] sm:text-[9px] tracking-widest">Tanggal</span> 
              <span className="font-bold text-slate-800 text-right block text-[11px] sm:text-[13px]">{new Date(order.updated_at || order.created_at).toLocaleString('id-ID')}</span>
            </div>
            
            <div onClick={handleCopyInvoice} className="flex justify-between items-center w-full cursor-pointer group hover:bg-slate-50 py-1 -my-1 rounded-md transition-all active:scale-95">
              <span className="text-slate-500 uppercase block text-[8px] sm:text-[9px] tracking-widest">No. Invoice</span> 
              <span className={`font-bold ${theme.color} flex items-center justify-end gap-1.5 text-[11px] sm:text-[13px]`}>
                {copied ? <CheckCircle2 size={13} className="text-emerald-500 animate-in zoom-in" /> : <Copy size={13} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                #{order.order_id}
              </span>
            </div>
            
            <div className="flex justify-between items-center w-full">
              <span className="text-slate-500 uppercase block text-[8px] sm:text-[9px] tracking-widest">Metode</span> 
              <span className="font-bold text-slate-800 text-right uppercase block text-[11px] sm:text-[13px]">{order.payment_method}</span>
            </div>
          </div>
          
          <div className="border-t border-dashed border-slate-200 my-3 sm:my-4"></div>

          {/* --- INFO CENTER (RATA TENGAH) --- */}
          <div className="space-y-3 mb-4">
            <div className="text-center space-y-1 w-full">
              <span className="text-slate-500 uppercase block text-[8px] sm:text-[9px] tracking-widest">Produk / Item</span>
              <span className="font-bold text-slate-800 uppercase block leading-tight text-[11px] sm:text-[12px]">{order.product_name}</span>
            </div>
            
            {/* Nama Pelanggan: Hanya muncul di PLN & Game (Nickname) */}
            {(isPln || (isGame && order.customer_name)) && (
              <div className="text-center space-y-1 w-full">
                <span className="text-slate-500 uppercase block text-[8px] sm:text-[9px] tracking-widest">{isPln ? "Nama Pelanggan" : "Nickname Player"}</span>
                <span className="font-bold text-slate-800 uppercase block text-[11px] sm:text-[13px]">{isPln ? plnNama : order.customer_name}</span>
              </div>
            )}

            {/* Nomor ID: Hanya muncul di PLN & Game (Center) */}
            {(isPln || isGame) && (
              <div className="text-center space-y-1 w-full">
                <span className="text-slate-500 uppercase block text-[8px] sm:text-[9px] tracking-widest">{isPln ? "ID Pelanggan" : "ID Player"}</span>
                <span className="font-black text-slate-900 block text-[13px] sm:text-[15px] tracking-widest">{order.game_id}</span>
              </div>
            )}
          </div>

          {/* --- KOTAK DETAIL (RATA KANAN KIRI) --- */}
          <div className={`${theme.bg} p-3 sm:p-4 rounded-xl border ${theme.border} border-opacity-20 w-full text-left`}>
            <p className={`text-[9px] sm:text-[10px] ${theme.color} font-black uppercase text-center border-b border-slate-200 border-opacity-50 pb-2 mb-2 sm:mb-3`}>Detail Transaksi</p>
            
            <div className="space-y-2">
              {isPln && (
                <>
                  <div className="flex justify-between items-center w-full text-[9px] sm:text-[10px]">
                    <span className="text-slate-500 uppercase">Tarif/Daya</span>
                    <span className="font-bold text-slate-800 text-right text-[11px] sm:text-[12px]">{plnTarifDaya}</span>
                  </div>
                  <div className="flex justify-between items-center w-full text-[9px] sm:text-[10px]">
                    <span className="text-slate-500 uppercase">KWH Didapat</span>
                    <span className="font-bold text-slate-800 text-right text-[11px] sm:text-[12px]">{plnKwh}</span>
                  </div>
                </>
              )}

              {isPulsaData && (
                <div className="flex justify-between items-center w-full text-[9px] sm:text-[10px]">
                  <span className="text-slate-500 uppercase">Nomor Tujuan</span>
                  <span className="font-bold text-slate-800 text-right text-[11px] sm:text-[12px] tracking-widest">{order.game_id}</span>
                </div>
              )}
              
              <div className={`flex justify-between items-center w-full text-[9px] sm:text-[10px] ${isPln || isPulsaData ? 'border-t border-slate-200 border-opacity-50 pt-2' : ''}`}>
                <span className="text-slate-500 uppercase">Harga</span>
                <span className="font-bold text-slate-800 text-right text-[11px] sm:text-[12px]">Rp {hargaProduk.toLocaleString('id-ID')}</span>
              </div>

              {biayaLayanan > 0 && (
                <div className="flex justify-between items-center w-full text-[9px] sm:text-[10px]">
                  <span className="text-slate-500 uppercase">Biaya Layanan</span>
                  <span className="font-bold text-slate-800 text-right text-[11px] sm:text-[12px]">Rp {biayaLayanan.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          </div>

          {/* NOMOR TOKEN / SN */}
          <div className="text-center py-4">
            <p className="text-slate-400 uppercase text-[8px] sm:text-[9px] mb-1">{isPln ? "Nomor Token / Stroom" : "Serial Number / SN"}</p>
            <p className={`font-black ${isPln ? 'text-xl sm:text-2xl tracking-[0.15em]' : 'text-[12px] sm:text-[13px]'} text-slate-900 bg-slate-50 py-3 sm:py-4 rounded-lg border-2 border-dashed ${theme.border} border-opacity-50 shadow-inner break-all px-2`}>
              {formattedToken}
            </p>
          </div>
        </div>

        {/* TOTAL LUNAS */}
        <div className="border-t-2 border-dashed border-slate-200 my-3 sm:my-4 pt-3 sm:pt-4">
          <div className={`flex justify-between items-center ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white p-2.5 sm:p-3 rounded-xl shadow-lg`}>
            <span className="font-bold italic uppercase block text-[11px] sm:text-[13px]">Total Lunas</span>
            <span className="text-base sm:text-lg font-black italic">Rp {totalLunas.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="text-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-dashed border-slate-200 text-[7px] sm:text-[8px] text-slate-400 leading-relaxed uppercase font-bold italic">
          <p>Terima kasih telah bertransaksi di DanisPay</p>
          <p className={theme.color}>Layanan Digital Tercepat & Terpercaya</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto no-print px-2">
        <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-2 sm:py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all active:scale-95 shadow-md"><Printer size={14} /> Cetak</button>
        <button onClick={handleDownloadImage} className={`flex-1 ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white py-2 sm:py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all active:scale-95 shadow-md`}><Download size={14} /> Simpan</button>
      </div>

      <style jsx global>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
    </div>
  );
}