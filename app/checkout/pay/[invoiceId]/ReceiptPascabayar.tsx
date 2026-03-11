"use client";

import { useRef } from "react";
import { Download, Printer, CheckCircle2 } from "lucide-react";
import { toPng } from "html-to-image";

export default function ReceiptPascabayar({ order }: { order: any }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (receiptRef.current && order) {
      try {
        const dataUrl = await toPng(receiptRef.current, {
          cacheBust: true,
          backgroundColor: "#ffffff",
          pixelRatio: 3,
        });

        const link = document.createElement("a");
        link.download = `DanisPay-${order.order_id}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Gagal simpan gambar:", err);
        alert("Gagal menyimpan gambar, Bos. Coba lagi atau gunakan screenshot ya!");
      }
    }
  };

  if (!order || order.status !== "Berhasil") return null;

  // --- LOGIKA HITUNGAN REAL DARI DATABASE ---
  const totalBayar = (order.total_amount || 0) + (order.used_balance || 0);
  const tagihanMurni = order.raw_tagihan || 0;
  const biayaAdmin = totalBayar - tagihanMurni;

  return (
    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in duration-500">
      
      {/* --- AREA STRUK YANG DI-DOWNLOAD --- */}
      <div 
        ref={receiptRef}
        className="w-full max-w-md mx-auto bg-white text-slate-800 p-6 shadow-2xl border-t-8 border-blue-600 rounded-b-2xl font-mono text-sm relative overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-35deg] pointer-events-none">
          <CheckCircle2 size={250} />
        </div>

        <div className="text-center border-b-2 border-dashed border-slate-200 pb-4 mb-4">
          <h2 className="text-xl font-black tracking-tighter italic uppercase">
            DANISPAY <span className="text-blue-600">STORE</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
            Bukti Pembayaran Sah / Struk Digital
          </p>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span>TANGGAL</span> 
            <span className="font-bold text-right">{new Date(order.updated_at || order.created_at).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span>NO. INVOICE</span> 
            <span className="font-bold text-right text-blue-600">#{order.order_id}</span>
          </div>
          <div className="flex justify-between">
            <span>METODE</span> 
            <span className="font-bold text-right uppercase">{order.payment_method}</span>
          </div>
          
          <div className="border-t border-dashed border-slate-200 my-4"></div>

          <div className="space-y-3">
            <div>
              <p className="text-slate-400">PRODUK</p>
              <p className="font-bold uppercase text-[12px] leading-tight">
                {order.product_name}
              </p>
            </div>
            
            {/* MENAMPILKAN NAMA PELANGGAN DARI DB */}
            {order.customer_name && (
               <div>
                 <p className="text-slate-400 uppercase text-[9px]">Nama Pelanggan</p>
                 <p className="font-bold uppercase text-[12px]">{order.customer_name}</p>
               </div>
            )}

            <div>
              <p className="text-slate-400">NOMOR TUJUAN / ID PEL</p>
              <p className="font-bold text-[14px] tracking-widest">{order.game_id}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 mt-2">
              <p className="text-[10px] text-slate-500 font-black uppercase text-center border-b border-slate-200 pb-2 mb-2">Detail Tagihan</p>
              
              {/* DATA DI BAWAH INI SEKARANG DIAMBIL DARI DATABASE (TIDAK NEBAK) */}
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 uppercase">Tarif/Daya</span>
                <span className="font-bold">{order.segment_power || "-"}</span>
              </div>
              
              {order.stand_meter && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 uppercase">Stand Meter</span>
                  <span className="font-bold">{order.stand_meter}</span>
                </div>
              )}

              <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-slate-200">
                <span className="text-slate-500 uppercase">Tagihan Tagihan</span>
                <span className="font-bold">Rp {tagihanMurni.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 uppercase">Biaya Admin</span>
                <span className="font-bold">Rp {biayaAdmin.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {order.sn && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 uppercase">Serial Number / SN / Struk PLN</p>
                <p className="font-bold text-[11px] break-all text-emerald-600">{order.sn}</p>
              </div>
            )}
          </div>

          <div className="border-t-2 border-dashed border-slate-200 my-4 pt-4">
            <div className="flex justify-between items-center bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-200">
              <span className="font-bold italic uppercase">Total Lunas</span>
              <span className="text-lg font-black italic">
                Rp {totalBayar.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 pt-4 border-t border-dashed border-slate-200 text-[9px] text-slate-400 leading-relaxed uppercase font-bold italic">
          <p>Terima kasih telah bertransaksi</p>
          <p className="text-blue-600">Simpan struk ini sebagai bukti pembayaran</p>
        </div>
      </div>

      {/* ACTION BUTTONS TETAP SAMA */}
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto no-print">
        <button 
          onClick={() => window.print()}
          className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-all active:scale-95 shadow-md"
        >
          <Printer size={14} /> Cetak Struk
        </button>
        <button 
          onClick={handleDownloadImage}
          className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-black italic uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500 transition-all active:scale-95 shadow-md"
        >
          <Download size={14} /> Simpan Gambar
        </button>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}