"use client";

import { useRef } from "react";
import { Download, Printer, CheckCircle2, Gamepad2, Smartphone, Zap } from "lucide-react";
import { toPng } from "html-to-image";

export default function ReceiptPrabayar({ order }: { order: any }) {
  const receiptRef = useRef<HTMLDivElement>(null);

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

  // --- LOGIKA PENENTUAN KATEGORI ---
  const cat = order.category?.toLowerCase() || "";
  const isPln = cat.includes('pln') || order.sku?.toLowerCase().includes('pln');
  const isGame = cat.includes('game');
  const isPulsa = cat.includes('pulsa') || cat.includes('data');

  // --- THEME CONFIG (WARNA & ICON) ---
  const theme = isPln 
    ? { color: "text-amber-500", border: "border-amber-500", bg: "bg-amber-50", icon: <Zap size={18} /> }
    : isGame 
    ? { color: "text-indigo-600", border: "border-indigo-600", bg: "bg-indigo-50", icon: <Gamepad2 size={18} /> }
    : { color: "text-emerald-600", border: "border-emerald-600", bg: "bg-emerald-50", icon: <Smartphone size={18} /> };

  // --- LOGIKA PEMBEDAH DATA ---
  let mainLabel = "Bukti Top Up Sukses";
  let targetLabel = "NOMOR TUJUAN";
  let snLabel = "Serial Number (SN)";

  if (isPln) {
    mainLabel = "Bukti Pembelian Token";
    targetLabel = "ID PELANGGAN / METER";
    snLabel = "Nomor Stroom / Token";
  } else if (isGame) {
    mainLabel = "Bukti Top Up Game";
    targetLabel = "ID PLAYER / SERVER";
    snLabel = "ID Transaksi";
  } else if (isPulsa) {
    mainLabel = "Bukti Pengisian Pulsa";
    targetLabel = "NOMOR HANDPHONE";
  }

  // --- FORMAT KHUSUS PLN TOKEN ---
  let plnToken = order.sn || "";
  let plnNama = order.customer_name || "-";
  let plnTarifDaya = order.segment_power || "-";
  let plnKwh = "-";

  if (isPln && order.sn?.includes('/')) {
    const parts = order.sn.split('/');
    plnToken = parts[0];
    if (plnNama === "-") plnNama = parts[1] || "-";
    plnKwh = parts[4] || "-";
  }
  const formattedToken = isPln ? (plnToken.replace(/[^0-9]/g, '').match(/.{1,4}/g)?.join('-') || plnToken) : order.sn;

  return (
    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in duration-500">
      
      {/* AREA STRUK */}
      <div ref={receiptRef} className={`w-full max-w-md mx-auto bg-white text-slate-800 p-6 shadow-2xl border-t-8 ${theme.border} rounded-b-2xl font-mono text-sm relative overflow-hidden`}>
        {/* Background Watermark */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-35deg] pointer-events-none ${theme.color}`}>
          <CheckCircle2 size={250} />
        </div>

        <div className="text-center border-b-2 border-dashed border-slate-200 pb-4 mb-4">
          <h2 className="text-xl font-black tracking-tighter italic uppercase">
            DANISPAY <span className={theme.color}>STORE</span>
          </h2>
          <div className={`flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase mt-1 ${theme.color}`}>
            {theme.icon} {mainLabel}
          </div>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between"><span>TANGGAL</span> <span className="font-bold text-right">{new Date(order.updated_at || order.created_at).toLocaleString('id-ID')}</span></div>
          <div className="flex justify-between"><span>NO. INVOICE</span> <span className={`font-bold text-right ${theme.color}`}>#{order.order_id}</span></div>
          <div className="flex justify-between"><span>METODE</span> <span className="font-bold text-right uppercase">{order.payment_method}</span></div>
          
          <div className="border-t border-dashed border-slate-200 my-4"></div>

          <div className="space-y-3">
            <div>
              <p className="text-slate-400 uppercase text-[9px]">Produk / Item</p>
              <p className="font-bold uppercase text-[12px] leading-tight">
                {order.product_name} {order.item_label && `- ${order.item_label}`}
              </p>
            </div>

            {/* DETAIL TUJUAN BERDASARKAN KATEGORI */}
            <div className={`${theme.bg} p-3 rounded-xl border border-slate-100 space-y-2`}>
              <div className="flex justify-between">
                <p className="text-slate-500 uppercase text-[9px]">{targetLabel}</p>
                <p className="font-bold text-[12px] tracking-wider">{order.game_id}</p>
              </div>

              {/* KHUSUS GAME: TAMPILKAN NICKNAME JIKA ADA */}
              {isGame && order.customer_name && (
                <div className="flex justify-between border-t border-slate-200/50 pt-2">
                  <p className="text-slate-500 uppercase text-[9px]">NICKNAME</p>
                  <p className="font-bold text-[12px] uppercase">{order.customer_name}</p>
                </div>
              )}

              {/* KHUSUS PLN: TAMPILKAN DATA PELANGGAN */}
              {isPln && (
                <>
                  <div className="flex justify-between border-t border-slate-200/50 pt-2">
                    <p className="text-slate-500 uppercase text-[9px]">NAMA</p>
                    <p className="font-bold text-[12px] uppercase">{plnNama}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-slate-500 uppercase text-[9px]">TARIF/DAYA</p>
                    <p className="font-bold text-[12px] uppercase">{plnTarifDaya}</p>
                  </div>
                </>
              )}
            </div>

            {/* AREA SN / TOKEN UTAMA */}
            <div className="text-center space-y-1 py-1">
                <p className="text-slate-400 uppercase text-[9px]">{snLabel}</p>
                {isPln ? (
                  <p className="font-black text-xl tracking-[0.2em] text-slate-900 bg-amber-50 py-3 rounded-lg border-2 border-dashed border-amber-300">
                    {formattedToken}
                  </p>
                ) : (
                  <p className={`font-bold text-[14px] break-all p-3 rounded-lg ${theme.bg} border border-slate-100`}>
                    {order.sn}
                  </p>
                )}
            </div>
          </div>

          <div className="border-t-2 border-dashed border-slate-200 my-4 pt-4">
            <div className={`flex justify-between items-center ${isPln ? 'bg-amber-500' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white p-3 rounded-xl shadow-lg`}>
              <span className="font-bold italic uppercase text-[10px]">Total Bayar</span>
              <span className="text-lg font-black italic">
                Rp {(order.total_amount + (order.used_balance || 0)).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 pt-4 border-t border-dashed border-slate-200 text-[9px] text-slate-400 leading-relaxed uppercase font-bold italic">
          <p>Terima kasih telah bertransaksi</p>
          <p className={theme.color}>DanisPay - Pemuas Kebutuhan Digital Bosku</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto no-print">
        <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all active:scale-95 shadow-md"><Printer size={14} /> Cetak</button>
        <button onClick={handleDownloadImage} className={`flex-1 ${isPln ? 'bg-amber-600' : isGame ? 'bg-indigo-600' : 'bg-emerald-600'} text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all active:scale-95 shadow-md`}><Download size={14} /> Simpan</button>
      </div>

      <style jsx global>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
    </div>
  );
}