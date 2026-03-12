"use client";

import { useRef } from "react";
import { Download, Printer, CheckCircle2, Gamepad2, Smartphone, Zap, Copy } from "lucide-react";
import { toPng } from "html-to-image";

import { useState } from "react"; // Tambahkan import useState

export default function ReceiptPrabayar({ order }: { order: any }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false); // State untuk feedback copy

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
  const sku = (order.sku || "").toLowerCase();
  
  const isPln = cat.includes('pln') || cat.includes('token') || sku.includes('pln');
  const isGame = cat.includes('game') || cat.includes('voucher');
  const isPulsaData = cat.includes('pulsa') || cat.includes('data') || cat.includes('internet');

  // --- 2. THEME CONFIG ---
  const theme = isPln 
    ? { color: "text-amber-600", border: "border-amber-500", bg: "bg-amber-50", icon: <Zap size={16} /> }
    : isGame 
    ? { color: "text-indigo-600", border: "border-indigo-600", bg: "bg-indigo-50", icon: <Gamepad2 size={16} /> }
    : { color: "text-emerald-600", border: "border-emerald-600", bg: "bg-emerald-50", icon: <Smartphone size={16} /> };

  // --- 3. PARSING DATA PLN TOKEN ---
  let plnToken = order.sn || "";
  let plnNama = order.customer_name || "-";
  let plnTarifDaya = order.segment_power || "-";

  // Jika SN dari Digiflazz formatnya (Token/Nama/Tarif/Daya)
  if (isPln && order.sn?.includes('/')) {
    const parts = order.sn.split('/');
    plnToken = parts[0];
    if (plnNama === "-") plnNama = parts[1] || "-";
    if (plnTarifDaya === "-") plnTarifDaya = `${parts[2]}/${parts[3]}`;
  }
  const formattedToken = isPln ? (plnToken.replace(/[^0-9]/g, '').match(/.{1,4}/g)?.join('-') || plnToken) : order.sn;

  return (
    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in duration-500">
      
      {/* AREA STRUK */}
      <div ref={receiptRef} className={`w-full max-w-md mx-auto bg-white text-slate-800 p-6 shadow-2xl border-t-8 ${theme.border} rounded-b-2xl font-mono text-sm relative overflow-hidden`}>
        
        {/* Watermark Logo */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-35deg] pointer-events-none ${theme.color}`}>
          <CheckCircle2 size={250} />
        </div>

        {/* HEADER */}
        <div className="text-center border-b-2 border-dashed border-slate-200 pb-4 mb-4">
          <h2 className="text-xl font-black tracking-tighter italic uppercase">
            DANISPAY <span className={theme.color}>STORE</span>
          </h2>
          <div className={`flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase mt-1 ${theme.color}`}>
            {theme.icon} {isPln ? "Struk Token Listrik" : isGame ? "Bukti Top Up Game" : "Bukti Pengisian Pulsa/Data"}
          </div>
        </div>

        {/* INFO TRANSAKSI UMUM */}
        <div className="space-y-1.5 text-[10px]">
          <div className="flex justify-between"><span>TANGGAL</span> <span className="font-bold text-right">{new Date(order.updated_at || order.created_at).toLocaleString('id-ID')}</span></div>
          <div 
          onClick={handleCopyInvoice}
          className="flex justify-between items-center cursor-pointer group hover:bg-slate-50 p-1 -m-1 rounded-lg transition-all active:scale-95"
          title="Klik untuk salin Invoice"
        >
          <span>NO. INVOICE</span> 
          <span className={`font-bold text-right ${theme.color} flex items-center gap-1.5`}>
            #{order.order_id}
            {copied ? (
              <CheckCircle2 size={12} className="text-emerald-500 animate-in zoom-in" />
            ) : (
              <Copy size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>
          <div className="flex justify-between"><span>METODE</span> <span className="font-bold text-right uppercase">{order.payment_method}</span></div>
          
          <div className="border-t border-dashed border-slate-200 my-3"></div>

          {/* DETAIL PRODUK */}
          <div className="space-y-3">
            <div>
            <p className="text-slate-400 uppercase text-[9px]">Produk / Item</p>
            <p className="font-bold uppercase text-[12px] leading-tight">
              {/* Hanya ambil dari database (product_name) agar anti-manipulasi */}
              {order.product_name}
            </p>
            </div>

            {/* --- LAYOUT 1: KHUSUS PLN (LENGKAP) --- */}
            {isPln && (
              <div className="space-y-3">
                <div className={`${theme.bg} p-3 rounded-xl border border-amber-100 space-y-2`}>
                  <div className="flex justify-between text-[11px]">
                    <p className="text-slate-500">ID PELANGGAN</p>
                    <p className="font-bold tracking-wider">{order.game_id}</p>
                  </div>
                  <div className="flex justify-between text-[11px] border-t border-amber-200/50 pt-1.5">
                    <p className="text-slate-500">NAMA PEL</p>
                    <p className="font-bold uppercase">{plnNama}</p>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <p className="text-slate-500">TARIF/DAYA</p>
                    <p className="font-bold uppercase">{plnTarifDaya}</p>
                  </div>
                </div>
                <div className="text-center py-2">
                  <p className="text-slate-400 uppercase text-[9px] mb-1">Nomor Token / Stroom</p>
                  <p className="font-black text-2xl tracking-[0.15em] text-slate-900 bg-amber-50 py-4 rounded-lg border-2 border-dashed border-amber-400 shadow-inner">
                    {formattedToken}
                  </p>
                </div>
              </div>
            )}

            {/* --- LAYOUT 2: KHUSUS GAME (NICKNAME + ID) --- */}
            {isGame && (
              <div className={`${theme.bg} p-3 rounded-xl border border-indigo-100 space-y-2`}>
                <div className="flex justify-between text-[11px]">
                  <p className="text-slate-500">ID PLAYER</p>
                  <p className="font-bold tracking-wider">{order.game_id}</p>
                </div>
                {order.customer_name && (
                  <div className="flex justify-between text-[11px] border-t border-indigo-200/50 pt-1.5">
                    <p className="text-slate-500">NICKNAME</p>
                    <p className="font-bold uppercase">{order.customer_name}</p>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-slate-400 uppercase text-[9px]">Status SN</p>
                  <p className="font-bold text-[13px] text-indigo-700 break-all">{order.sn}</p>
                </div>
              </div>
            )}

            {/* --- LAYOUT 3: KHUSUS PULSA & DATA (RINGKAS) --- */}
            {isPulsaData && (
              <div className={`${theme.bg} p-3 rounded-xl border border-emerald-100 space-y-3`}>
                <div className="flex justify-between text-[11px]">
                  <p className="text-slate-500">NOMOR TUJUAN</p>
                  <p className="font-bold text-[14px] tracking-widest">{order.game_id}</p>
                </div>
                <div className="pt-1">
                  <p className="text-slate-400 uppercase text-[9px]">Serial Number (SN)</p>
                  <p className="font-bold text-[13px] text-emerald-700 break-all">{order.sn || "Sukses Terisi"}</p>
                </div>
              </div>
            )}

          </div>

          {/* TOTAL BAYAR */}
          <div className="border-t-2 border-dashed border-slate-200 my-4 pt-4">
            <div className={`flex justify-between items-center ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white p-3 rounded-xl shadow-lg`}>
              <span className="font-bold italic uppercase text-[10px]">Total Lunas</span>
              <span className="text-lg font-black italic">
                Rp {(order.total_amount + (order.used_balance || 0)).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-6 pt-4 border-t border-dashed border-slate-200 text-[8px] text-slate-400 leading-relaxed uppercase font-bold italic">
          <p>Terima kasih telah bertransaksi di DanisPay</p>
          <p className={theme.color}>Layanan Digital Tercepat & Terpercaya</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto no-print px-2">
        <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all active:scale-95 shadow-md"><Printer size={14} /> Cetak</button>
        <button onClick={handleDownloadImage} className={`flex-1 ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all active:scale-95 shadow-md`}><Download size={14} /> Simpan</button>
      </div>

      <style jsx global>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
    </div>
  );
}