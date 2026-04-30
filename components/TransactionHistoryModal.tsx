"use client";

import { useState, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  Search, X, ReceiptText, Clock, 
  CheckCircle2, XCircle, Loader2, AlertCircle, 
  ChevronRight, Download, Gamepad2 
} from "lucide-react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { Turnstile } from '@marsidev/react-turnstile'; // Import Captcha

export default function TransactionHistoryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [invoiceInput, setInvoiceInput] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null); // State Token Captcha
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceInput.trim()) return;

    // WAJIB VERIFIKASI CAPTCHA
    if (!captchaToken) {
      alert("Tolong selesaikan verifikasi keamanan dulu, Bos!");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("order_id, item_label, game_id, total_amount, status, created_at")
        .eq("order_id", invoiceInput.trim())
        .single();

      if (fetchError || !data) {
        setError("Invoice tidak ditemukan. Cek lagi kodenya, Bos!");
      } else {
        setOrder(data);
      }
    } catch (err) {
      setError("Gangguan sistem.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (receiptRef.current && order) {
      try {
        const dataUrl = await toPng(receiptRef.current, { 
          cacheBust: true,
          backgroundColor: "#ffffff",
          pixelRatio: 2,
        });
        
        const link = document.createElement("a");
        link.download = `DanisPay-${order.order_id}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Gagal download:", err);
      }
    }
  };

  const handleClose = () => {
    setInvoiceInput("");
    setOrder(null);
    setError("");
    setCaptchaToken(null); // Reset captcha saat tutup
    onClose();
  };

  if (!isOpen) return null;

return (
    <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Container: Bottom sheet di Mobile, Centered Modal di Tablet/PC */}
      <div className="bg-white w-full h-[90vh] sm:h-auto sm:max-w-lg rounded-t-4xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Search size={20} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Lacak Pesanan</h3>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* CONTENT (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div className="relative">
              <input 
                type="text"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value.toUpperCase())}
                placeholder="Contoh: DANISH-0023212"
                className="w-full bg-slate-50 border border-slate-200 p-4 pr-24 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-800 font-semibold placeholder:text-slate-400 transition-all"
              />
              <button 
                type="submit" 
                disabled={loading || !invoiceInput.trim() || !captchaToken}
                className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Cari"}
              </button>
            </div>

            {/* WIDGET ANTI-BOT */}
            <div className="flex justify-center pt-2">
              <Turnstile 
                siteKey="0x4AAAAAACkQAA6L_WPQSSms" 
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: 'light' }}
              />
            </div>
          </form>

          {/* AREA HASIL PENCARIAN */}
          <div className="mt-8 flex flex-col items-center justify-center min-h-50">
            {order ? (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* AREA STRUK INVOICE */}
                <div ref={receiptRef} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative">
                  
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
                      <Gamepad2 className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Official Receipt</p>
                      <p className="text-base font-bold text-slate-900">DanisPay Digital</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-4">
                      <span className="text-xs font-semibold text-slate-500">Status Pesanan</span>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
                        order.status?.toLowerCase() === 'berhasil' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-2 py-2">
                      <p className="text-xs font-semibold text-slate-500">Produk</p>
                      <h4 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{order.item_label}</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm mt-1">
                        <p className="font-medium text-slate-600"><span className="text-slate-400">ID Order:</span> {order.order_id}</p>
                        <p className="font-medium text-slate-600"><span className="text-slate-400">ID Game:</span> {order.game_id}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Total Transaksi</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">Rp {order.total_amount?.toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    <div className="text-xs text-center text-slate-400 font-medium pt-6">
                      {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>

                {/* TOMBOL AKSI (Mobile: Tumpuk, Tablet/PC: Bersebelahan) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  <button 
                    onClick={handleDownloadImage}
                    className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
                  >
                    <Download size={18} /> Simpan Gambar
                  </button>
                  <Link 
                    href={`/checkout/pay/${order.order_id}`}
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98]"
                  >
                    Lihat Detail <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8 animate-in fade-in">
                <AlertCircle className="mx-auto text-rose-500 mb-3" size={40} strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-600 px-6">{error}</p>
              </div>
            ) : (
              <div className="text-center py-8 opacity-40">
                <ReceiptText size={56} className="mx-auto text-slate-400 mb-4" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-slate-500">Masukkan nomor invoice untuk melacak</p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center shrink-0">
          <p className="text-xs font-semibold text-slate-400 tracking-wide">DanisPay - Safe & Fast Transaction</p>
        </div>

</div>
    </div>
  );
}