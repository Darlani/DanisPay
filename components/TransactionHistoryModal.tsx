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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
              <Search size={20} />
            </div>
            <h3 className="font-black italic uppercase text-slate-800 tracking-tighter text-lg">Lacak Pesanan</h3>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6">
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div className="relative">
              <input 
                type="text"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value.toUpperCase())}
                placeholder="CONTOH DANISH-0023212..."
                className="w-full bg-slate-50 border border-slate-200 p-4 pr-20 rounded-2xl focus:outline-none focus:border-blue-500 text-slate-800 font-bold placeholder:text-slate-300 transition-all"
              />
              <button 
                type="submit" 
                disabled={loading || !invoiceInput.trim() || !captchaToken}
                className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-5 rounded-xl font-black italic uppercase text-[10px] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : "CEK"}
              </button>
            </div>

            {/* --- WIDGET ANTI-BOT (TURNSTILE) --- */}
            <div className="flex justify-center pt-2">
              <Turnstile 
                siteKey="0x4AAAAAACkQAA6L_WPQSSms" // Testing key
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                options={{
                  theme: 'light',
                }}
              />
            </div>
          </form>

          <div className="mt-8 flex flex-col items-center justify-center min-h-55">
            {order ? (
              <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
                {/* AREA STRUK */}
                <div 
                  ref={receiptRef} 
                  className="bg-white p-8 rounded-3xl border border-slate-100 relative"
                >
                  <div className="flex flex-col items-center text-center mb-8">
                     <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-blue-100">
                        <Gamepad2 className="text-white" size={28} />
                     </div>
                     <p className="text-[10px] font-black italic text-slate-400 uppercase tracking-widest leading-none mb-1">Official Receipt</p>
                     <p className="text-sm font-black text-slate-900 uppercase italic">DanisPay Digital Store</p>
                  </div>

                  <div className="space-y-5">
                    <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status Pesanan</span>
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase italic ${
                        order.status?.toLowerCase() === 'berhasil' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-slate-900 uppercase italic leading-tight">{order.item_label}</h4>
                      <p className="text-[12px] font-bold text-blue-600">ID Order: #{order.order_id}</p>
                      <p className="text-[11px] font-medium text-slate-500 uppercase">ID Game: {order.game_id}</p>
                    </div>

                    <div className="pt-5 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Transaksi</p>
                      <p className="text-2xl font-black text-slate-900 italic">Rp {order.total_amount?.toLocaleString()}</p>
                    </div>

                    <div className="text-[9px] text-center text-slate-300 font-bold uppercase pt-4">
                      {new Date(order.created_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={handleDownloadImage}
                    className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3.5 rounded-2xl font-black uppercase italic text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <Download size={16} /> Simpan Gambar
                  </button>
                  <Link 
                    href={`/checkout/pay/${order.order_id}`}
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-2xl font-black uppercase italic text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Lihat Detail <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-10 animate-in fade-in">
                <AlertCircle className="mx-auto text-rose-500/20 mb-3" size={48} />
                <p className="text-xs font-bold text-slate-400 uppercase italic px-10 leading-relaxed">{error}</p>
              </div>
            ) : (
              <div className="text-center py-10 opacity-20">
                <ReceiptText size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Siap Melacak Pesananmu</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[9px] font-bold text-slate-300 uppercase italic tracking-widest">DanisPay - Safe & Fast Transaction</p>
        </div>
      </div>
    </div>
  );
}