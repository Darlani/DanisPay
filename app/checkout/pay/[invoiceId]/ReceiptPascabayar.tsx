"use client";

import { useRef, useState } from "react"; // Tambah useState
import { Download, Printer, CheckCircle2, Copy } from "lucide-react"; // Tambah Copy
import { toPng } from "html-to-image";

export default function ReceiptPascabayar({ order }: { order: any }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false); // State feedback

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
  const biayaLayanan = order.unique_code || 0;

  // Ekstrak langsung dari JSON
  let tagihanPLN = order.raw_tagihan || 0;
  let dendaPLN = 0;
  let adminPLN = 0;
  let periode = "";
  
  try {
    if (order.desc) {
      const parsedDesc = typeof order.desc === 'string' ? JSON.parse(order.desc) : order.desc;
      if (parsedDesc?.detail && parsedDesc.detail.length > 0) {
        const detailJson = parsedDesc.detail[0];
        
        // Ambil nilai sesuai request Bos
        tagihanPLN = parseInt(detailJson.nilai_tagihan) || tagihanPLN;
        dendaPLN = parseInt(detailJson.denda) || 0;
        adminPLN = parseInt(detailJson.admin) || 0;
        
        // Format periode otomatis (202604 -> April 2026)
        const rawPeriode = detailJson.periode;
        if (rawPeriode && rawPeriode.length === 6) {
          const year = rawPeriode.substring(0, 4);
          const month = parseInt(rawPeriode.substring(4, 6)) - 1;
          const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
          periode = `${months[month]} ${year}`;
        } else {
          periode = rawPeriode || "";
        }
      }
    }
  } catch (e) {
    console.error("Gagal parse desc:", e);
  }

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

<div className="space-y-4 text-[11px]">
          {/* --- INFO HEADER TRANSAKSI --- */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">TANGGAL</span> 
              <span className="font-bold text-slate-800">{new Date(order.updated_at || order.created_at).toLocaleString('id-ID')}</span>
            </div>
            <div 
              onClick={handleCopyInvoice}
              className="flex items-center justify-between cursor-pointer group hover:bg-slate-50 p-1 -mx-1 rounded transition-all active:scale-95"
              title="Klik untuk salin Invoice"
            >
              <span className="text-slate-500">NO. INVOICE</span> 
              <span className="font-bold text-blue-600 flex items-center gap-1.5">
                {copied ? (
                  <CheckCircle2 size={12} className="text-emerald-500 animate-in zoom-in" />
                ) : (
                  <Copy size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                #{order.order_id}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">METODE</span> 
              <span className="font-bold text-slate-800 uppercase">{order.payment_method}</span>
            </div>
          </div>
          
          <div className="border-t border-dashed border-slate-200"></div>

          {/* --- INFO PELANGGAN & PRODUK --- */}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-slate-400 text-[9px] uppercase tracking-widest">Produk</p>
              <p className="font-bold uppercase text-[12px] text-slate-800 leading-tight">
                {order.product_name}
              </p>
            </div>
            
            {order.customer_name && (
               <div className="text-center space-y-1">
                 <p className="text-slate-400 text-[9px] uppercase tracking-widest">Nama Pelanggan</p>
                 <p className="font-bold uppercase text-[13px] text-slate-800">{order.customer_name}</p>
               </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-slate-400 text-[9px] uppercase tracking-widest">Nomor Tujuan / ID Pel</p>
              <p className="font-black text-[15px] text-slate-900 tracking-widest">{order.game_id}</p>
            </div>

            {/* --- KOTAK DETAIL TAGIHAN --- */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-500 font-black uppercase text-center tracking-widest mb-3">Detail Tagihan</p>
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 uppercase">Tarif/Daya</span>
                  <span className="font-bold text-slate-800">{order.segment_power || "-"}</span>
                </div>

                {periode && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 uppercase">Bulan/Tahun</span>
                    <span className="font-bold text-slate-800 uppercase">{periode}</span>
                  </div>
                )}
                
                {order.stand_meter && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 uppercase">Stand Meter</span>
                    <span className="font-bold text-slate-800">{order.stand_meter}</span>
                  </div>
                )}
              </div>

              {/* PEMISAH BAGIAN BIAYA AGAR RAPI */}
              <div className="border-t border-slate-200 mt-3 pt-3 space-y-2.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 uppercase">Rp Tagihan PLN</span>
                  <span className="font-bold text-slate-800">Rp {tagihanPLN.toLocaleString('id-ID')}</span>
                </div>

                {dendaPLN > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-rose-500 font-bold uppercase tracking-wider">Denda</span>
                    <span className="font-bold text-rose-600">Rp {dendaPLN.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 uppercase">Biaya Admin</span>
                  <span className="font-bold text-slate-800">Rp {adminPLN.toLocaleString('id-ID')}</span>
                </div>

                {biayaLayanan > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 uppercase">Biaya Layanan</span>
                    <span className="font-bold text-slate-800">Rp {biayaLayanan.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* --- KOTAK SERIAL NUMBER --- */}
            {order.sn && (
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Serial Number / SN / Struk PLN</p>
                <p className="font-bold text-[12px] break-all text-emerald-600 tracking-wide">{order.sn}</p>
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