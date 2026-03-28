"use client";

import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";

export default function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/contact/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message })
      });

      if (res.ok) {
        setStatus("Pesan berhasil dikirim ke Admin!");
        setEmail("");
        setMessage("");
        setTimeout(() => {
          setStatus("");
          onClose();
        }, 3000);
      } else {
        setStatus("Gagal mengirim pesan. Coba lagi nanti.");
      }
    } catch (error) {
      setStatus("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-white mb-2">Hubungi Bantuan</h3>
        <p className="text-slate-400 text-sm mb-6">Kirimkan pertanyaan atau keluhan bos, kami balas ke email secepatnya!</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Bos</label>
            <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="contoh@gmail.com" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Pesan / Kendala</label>
            <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Tulis pesan bos di sini..." className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
          </div>
          <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {loading ? "Mengirim..." : "Kirim Pesan"}
          </button>
          {status && <p className="text-emerald-400 text-xs text-center mt-2">{status}</p>}
        </form>
      </div>
    </div>
  );
}