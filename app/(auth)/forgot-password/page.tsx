"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Loader2, AlertCircle, ShieldCheck, ChevronLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Turnstile } from '@marsidev/react-turnstile'; 

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null); 

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      setErrorMsg("Tolong selesaikan verifikasi keamanan dulu, Bos!");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Gagal mengirim permintaan");

      setSuccessMsg(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-125 h-125 bg-emerald-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[40px] shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-linear-to-br from-blue-600 to-blue-800 rounded-3xl shadow-lg shadow-blue-500/30 mb-6">
              <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl text-white font-black italic tracking-tighter uppercase mb-2">
            LUPA <span className="text-blue-500">PASSWORD?</span>
          </h1>
          <p className="text-slate-400 text-[11px] font-medium tracking-widest uppercase mt-3 leading-relaxed">
            Jangan panik. Masukkan email akun Anda dan kami akan mengirimkan link untuk membuat password baru.
          </p>
        </div>

        {/* Pesan Sukses */}
        {successMsg ? (
          <div className="text-center animate-in zoom-in duration-500 py-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <h3 className="text-emerald-400 font-black text-lg uppercase tracking-widest mb-2">EMAIL TERKIRIM!</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-8">
              Silakan cek kotak masuk atau folder spam di email <span className="text-white font-bold">{email}</span>.
            </p>
            <Link href="/login" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black italic uppercase py-4 rounded-2xl transition-all transform active:scale-95 flex items-center justify-center gap-2">
              <ChevronLeft size={18} /> KEMBALI KE LOGIN
            </Link>
          </div>
        ) : (
          <>
            {/* Error Alert */}
            {errorMsg && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <p className="text-rose-400 text-xs font-bold leading-relaxed">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold tracking-widest uppercase ml-3">Email Akun Anda</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-900/50 border border-white/10 text-white text-sm rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block pl-12 p-4 placeholder-slate-600 transition-all outline-none font-medium"
                    placeholder="email@anda.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* POSISI WIDGET CAPTCHA */}
              <div className="flex justify-center pt-2">
                <Turnstile 
                  siteKey="0x4AAAAAACkQAA6L_WPQSSms" // Gunakan Site Key Bos
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: 'dark' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !captchaToken} 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase py-4 rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : !captchaToken ? (
                  "Verifikasi Keamanan..."
                ) : (
                  <>KIRIM LINK RESET <ArrowRight size={20} /></>
                )}
              </button>

              <div className="pt-4 text-center">
                <Link href="/login" className="inline-flex items-center justify-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">
                  <ChevronLeft size={14}/> Batal & Kembali
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
      
      <div className="absolute bottom-6 text-center w-full">
         <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">System by Danish Top Up</p>
      </div>
    </div>
  );
}