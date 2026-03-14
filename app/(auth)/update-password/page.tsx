"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  // Mencegah hidrasi error karena pengecekan window
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("Password minimal 6 karakter, Bos!");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok!");
      return;
    }

    setLoading(true);

    try {
      // Supabase otomatis tahu user mana yang di-update berdasarkan sesi dari link email
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Tendang kembali ke halaman login setelah 3 detik
      setTimeout(() => {
        router.push("/login");
      }, 3000);

    } catch (err: any) {
      // Biasanya error jika link sudah kadaluarsa atau sudah pernah dipakai
      setErrorMsg(err.message || "Sesi tidak valid atau kadaluarsa. Silakan minta link reset baru.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-125 h-125 bg-emerald-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[40px] shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-3xl shadow-lg shadow-emerald-500/30 mb-6 transform hover:scale-105 transition-transform duration-500">
              <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl text-white font-black italic tracking-tighter uppercase mb-2">
            BUAT <span className="text-emerald-400">PASSWORD BARU</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">
            Amankan kembali akun anda
          </p>
        </div>

        {/* Notifikasi Sukses */}
        {success ? (
          <div className="text-center space-y-6 animate-in zoom-in duration-500">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
              <CheckCircle2 className="text-emerald-400 mx-auto mb-4" size={48} />
              <p className="text-white text-sm font-bold">Password Berhasil Diubah!</p>
              <p className="text-slate-400 text-xs mt-2">Mengarahkan ke halaman login...</p>
            </div>
            <Link href="/login" className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-black italic uppercase py-4 rounded-2xl transition-all">
              Login Sekarang
            </Link>
          </div>
        ) : (
          /* Form Input Password Baru */
          <form onSubmit={handleUpdatePassword} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <p className="text-rose-400 text-xs font-bold leading-relaxed">{errorMsg}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold tracking-widest uppercase ml-3">Password Baru</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-slate-900/50 border border-white/10 text-white text-sm rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block pl-12 pr-12 p-4 placeholder-slate-600 transition-all outline-none font-medium"
                  placeholder="Minimal 6 Karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold tracking-widest uppercase ml-3">Ulangi Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full bg-slate-900/50 border border-white/10 text-white text-sm rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block pl-12 pr-12 p-4 placeholder-slate-600 transition-all outline-none font-medium"
                  placeholder="Ketik ulang password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic uppercase py-4 rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>SIMPAN PASSWORD <ArrowRight size={20} /></>
              )}
            </button>
          </form>
        )}
      </div>
      
      <div className="absolute bottom-6 text-center w-full">
         <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">System by Danish Top Up</p>
      </div>
    </div>
  );
}