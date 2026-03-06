"use client";

import { useRef } from "react";
import { Download, Printer, CheckCircle2 } from "lucide-react";
import { toPng } from "html-to-image";

export default function ReceiptPrabayar({ order }: { order: any }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (receiptRef.current && order) {
      try {
        const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: "#ffffff", pixelRatio: 3 });
        const link = document.createElement("a");
        link.download = `DaPay-${order.order_id}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        alert("Gagal menyimpan gambar, Bos!");
      }
    }
  };

  if (!order || order.status !== "Berhasil") return null;

  // Cek apakah ini produk PLN Token
  const isPlnToken = order.sku?.toLowerCase().includes('pln') || order.product_name?.toLowerCase().includes('pln');

  // ==========================================
  // LOGIKA PEMBEDAH DATA PLN ASLI (TIDAK MENGARANG)
  // ==========================================
  let plnToken = "PROSES...";
  let plnNama = "-";
  let plnTarifDaya = "-";
  let plnKwh = "-";

  if (isPlnToken && order.sn) {
    // Kalau Digiflazz ngirim format gabungan: TOKEN/NAMA/TARIF/DAYA/KWH
    if (order.sn.includes('/')) {
      const parts = order.sn.split('/');
      plnToken = parts[0] || order.sn;
      plnNama = parts[1] || "-";
      plnTarifDaya = `${parts[2] || ''} / ${parts[3] || ''}`;
      plnKwh = parts[4] || "-";
    } else {
      // Kalau SN murni cuma 20 digit token, coba cari dari kolom JSON (jika Bos sediakan di backend)
      plnToken = order.sn;
      plnNama = order.customer_name || order.desc?.nama || "-";
      plnTarifDaya = order.desc?.daya ? `${order.desc?.tarif || ''} / ${order.desc?.daya}` : "-";
      plnKwh = order.desc?.kwh || "-";
    }
  }

  // Format 20 Digit Token jadi ada spasinya tiap 4 angka (1234-5678-9012-3456)
  const formattedToken = plnToken !== "PROSES..." 
    ? (plnToken.replace(/[^0-9]/g, '').match(/.{1,4}/g)?.join('-') || plnToken)
    : plnToken;

  return (
    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in duration-500">
      
      {/* AREA STRUK */}
      <div ref={receiptRef} className="w-full max-w-md mx-auto bg-white text-slate-800 p-6 shadow-2xl border-t-8 border-amber-500 rounded-b-2xl font-mono text-sm relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-35deg] pointer-events-none">
          <CheckCircle2 size={250} />
        </div>

        <div className="text-center border-b-2 border-dashed border-slate-200 pb-4 mb-4">
          <h2 className="text-xl font-black tracking-tighter italic uppercase">
            DANISPAY <span className="text-amber-500">STORE</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
            {isPlnToken ? "Bukti Pembelian Token Listrik" : "Bukti Top Up Sukses"}
          </p>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between"><span>TANGGAL</span> <span className="font-bold text-right">{new Date(order.created_at).toLocaleString('id-ID')}</span></div>
          <div className="flex justify-between"><span>NO. INVOICE</span> <span className="font-bold text-right text-amber-500">#{order.order_id}</span></div>
          <div className="flex justify-between"><span>METODE</span> <span className="font-bold text-right uppercase">{order.payment_method}</span></div>
          
          <div className="border-t border-dashed border-slate-200 my-4"></div>

          <div className="space-y-3">
            <div>
              <p className="text-slate-400">ITEM PEMBELIAN</p>
              <p className="font-bold uppercase text-[12px] leading-tight">
                {/* Logika Anti-Double: Jika nama & label sama, tampilkan satu saja Bos! */}
                {order.product_name === order.item_label 
                  ? order.product_name 
                  : `${order.product_name} - ${order.item_label}`}
              </p>
            </div>
            <div>
              <p className="text-slate-400">{isPlnToken ? "NO METER / ID PELANGGAN" : "ID PLAYER / TUJUAN"}</p>
              <p className="font-bold text-[14px] tracking-widest">{order.game_id}</p>
            </div>

            {/* ========================================== */}
            {/* AREA KHUSUS TOKEN PLN (DATA REAL) */}
            {/* ========================================== */}
            {isPlnToken && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2 my-3">
                <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-amber-200/50 pb-2">
                  <div>
                    <p className="text-amber-700/70">NAMA PELANGGAN</p>
                    <p className="font-bold text-amber-900 truncate uppercase">{plnNama}</p> 
                  </div>
                  <div className="text-right">
                    <p className="text-amber-700/70">TARIF/DAYA</p>
                    <p className="font-bold text-amber-900 uppercase">{plnTarifDaya}</p>
                  </div>
                  <div>
                    <p className="text-amber-700/70">JML KWH</p>
                    <p className="font-bold text-amber-900">{plnKwh}</p>
                  </div>
                </div>
                
                <div className="text-center pt-1">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">STROOM / TOKEN</p>
                  <p className="font-black text-xl tracking-[0.2em] text-slate-900 bg-white py-2 rounded-lg border-2 border-dashed border-amber-300">
                    {formattedToken}
                  </p>
                </div>
              </div>
            )}
            {/* ========================================== */}

            {/* Tampilan SN Default untuk Game/Pulsa (Bukan PLN) */}
            {!isPlnToken && order.sn && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 uppercase">Serial Number (SN) / Bukti Trx</p>
                <p className="font-bold text-[11px] break-all text-emerald-600">{order.sn}</p>
              </div>
            )}
          </div>

          <div className="border-t-2 border-dashed border-slate-200 my-4 pt-4">
            <div className="flex justify-between items-center bg-amber-500 text-white p-3 rounded-xl shadow-lg shadow-amber-200">
              <span className="font-bold italic">TOTAL BAYAR</span>
              <span className="text-lg font-black italic">Rp {(order.total_amount + (order.used_balance || 0)).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 pt-4 border-t border-dashed border-slate-200 text-[9px] text-slate-400 leading-relaxed uppercase font-bold italic">
          <p>Terima kasih telah bertransaksi</p>
          <p className="text-amber-500">Simpan struk ini sebagai referensi top up</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto no-print">
        <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500 transition-all active:scale-95 shadow-md"><Printer size={14} /> Cetak Struk</button>
        <button onClick={handleDownloadImage} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500 transition-all active:scale-95 shadow-md"><Download size={14} /> Simpan Gambar</button>
      </div>

      <style jsx global>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
    </div>
  );
}