"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Lock, Mail, User, Ticket, Loader2, AlertCircle, 
  Sparkles, CheckCircle2, XCircle, Eye, EyeOff 
} from "lucide-react";
import MaintenancePage from "@/utils/MaintenancePage";
import { Turnstile } from '@marsidev/react-turnstile'; 

// ==========================================================
// BAGIAN 1: FORM PENDAFTARAN (Logika & Tampilan)
// ==========================================================
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- STATE SHOW/HIDE PASSWORD ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- STATE FOCUS PASSWORD (Untuk memunculkan 5 Syarat) ---
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: ""
  });

  // --- CEK MAINTENANCE ---
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await supabase.from('store_settings').select('is_maintenance').single();
        if (data?.is_maintenance) {
          const userEmail = localStorage.getItem("userEmail");
          if (userEmail !== "admin1@gmail.com") {
            setIsMaintenance(true);
          }
        }
      } catch (err) {
        console.error("Gagal cek status maintenance");
      } finally {
        setCheckingMaintenance(false);
      }
    };
    checkStatus();
  }, []);

  // --- CEK REFERRAL URL ---
  const refFromUrl = searchParams.get("ref");
  useEffect(() => {
    if (refFromUrl && refFromUrl !== "undefined" && refFromUrl !== "null") {
      setFormData((prev) => ({ 
        ...prev, 
        referralCode: refFromUrl.toUpperCase() 
      }));
    }
  }, [refFromUrl]);

  // ==========================================================
  // LOGIKA VALIDASI PASSWORD (5 SYARAT)
  // ==========================================================
  const pass = formData.password;
  const reqLength = pass.length >= 10;
  const reqNumber = /\d/.test(pass);
  const reqSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
  const reqNoSpace = pass.length > 0 && !/^\s|\s$/.test(pass);
  const reqUpperLower = /[a-z]/.test(pass) && /[A-Z]/.test(pass);

  // Lolos semua?
  const isPasswordValid = reqLength && reqNumber && reqSpecial && reqNoSpace && reqUpperLower;
  const isPasswordMatch = pass === formData.confirmPassword && formData.confirmPassword.length > 0;

  if (checkingMaintenance) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  // --- FUNGSI DAFTAR EMAIL/PASS ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (!captchaToken) {
      setLoading(false);
      return setErrorMsg("Tolong selesaikan verifikasi keamanan (Captcha)!");
    }
    
    if (!isPasswordValid) {
      setLoading(false);
      return setErrorMsg("Password belum memenuhi syarat keamanan!");
    }

    if (!isPasswordMatch) {
      setLoading(false);
      return setErrorMsg("Konfirmasi password tidak cocok!");
    }

    let finalReferral = formData.referralCode.trim().toUpperCase();

    if (finalReferral) {
      const { data: checkRef } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('referral_code', finalReferral)
        .maybeSingle();

      if (!checkRef) {
        setLoading(false);
        return setErrorMsg("KODE REFERRAL TIDAK VALID!");
      }
      finalReferral = checkRef.referral_code;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            referred_by: finalReferral || "", 
            member_type: "Reguler",
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        setSuccessMsg("Pendaftaran Berhasil! Silakan cek email / langsung login.");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mendaftar.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/user`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setErrorMsg("Gagal login dengan Google.");
      setSocialLoading(false);
    }
  };

  // Komponen Ceklis Bantuan Biar Rapi
  const CheckItem = ({ isValid, text }: { isValid: boolean, text: string }) => (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isValid ? "text-emerald-500" : "text-slate-500"}`}>
      {isValid ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 py-10 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-125 h-125 bg-emerald-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-125 h-125 bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[40px] shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-linear-to-br from-emerald-500 to-teal-700 rounded-3xl shadow-lg shadow-emerald-500/30 mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-3xl text-white font-black italic tracking-tighter uppercase mb-2">
            GABUNG <span className="text-emerald-500">SEKARANG</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">
            Buat akun member Danish Top Up
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
            <p className="text-rose-400 text-xs font-bold leading-relaxed">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
            <Sparkles className="text-emerald-500 shrink-0 mt-0.5" size={18} />
            <p className="text-emerald-400 text-xs font-bold leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* --- FORM UTAMA --- */}
        <form onSubmit={handleRegister} className="space-y-4">
          
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              required
              className="w-full bg-slate-900/50 border border-white/10 text-white text-sm rounded-2xl pl-12 p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-bold placeholder:text-slate-500 placeholder:uppercase"
              placeholder="Nama Lengkap"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="email"
              required
              className="w-full bg-slate-900/50 border border-white/10 text-white text-sm rounded-2xl pl-12 p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-bold placeholder:text-slate-500 placeholder:uppercase"
              placeholder="Email Aktif"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {/* PASSWORD UTAMA */}
          <div className="space-y-1">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                required
                onFocus={() => setIsPasswordFocused(true)}  // Muncul pas diklik
                onBlur={() => setIsPasswordFocused(false)}  // Hilang pas pindah
                className="w-full bg-slate-900/50 border border-white/10 text-white text-sm rounded-2xl pl-12 pr-12 p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-bold placeholder:text-slate-500 placeholder:uppercase relative z-20"
                placeholder="Buat Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              {/* Tombol Mata (Show/Hide) */}
              <button 
                type="button"
                onMouseDown={(e) => e.preventDefault()} // Cegah focus hilang pas klik mata
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-30"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* WIDGET 5 SYARAT (Animasi Halus Max-Height) */}
            <div 
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                isPasswordFocused && !isPasswordValid ? "max-h-[250px] opacity-100 translate-y-0 mt-2" : "max-h-0 opacity-0 -translate-y-2 mt-0"
              }`}
            >
              <div className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-3">
                <CheckItem isValid={reqLength} text="Minimal 10 Karakter" />
                <CheckItem isValid={reqUpperLower} text="Huruf Besar & Kecil" />
                <CheckItem isValid={reqNumber} text="Minimal 1 Angka" />
                <CheckItem isValid={reqSpecial} text="Karakter Spesial ($, !, @, dll)" />
                <CheckItem isValid={reqNoSpace} text="Tanpa spasi di awal/akhir" />
              </div>
            </div>
          </div>

          {/* KONFIRMASI PASSWORD */}
          <div className="space-y-2">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className={`w-full bg-slate-900/50 border text-white text-sm rounded-2xl pl-12 pr-12 p-4 outline-none focus:ring-2 font-bold placeholder:text-slate-500 placeholder:uppercase transition-all
                  ${formData.confirmPassword && !isPasswordMatch ? 'border-rose-500/50 focus:ring-rose-500' : 
                    formData.confirmPassword && isPasswordMatch ? 'border-emerald-500/50 focus:ring-emerald-500' : 'border-white/10 focus:ring-emerald-500'}`}
                placeholder="Ulangi Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
              {/* Tombol Mata 2 (Show/Hide) */}
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.confirmPassword && !isPasswordMatch && (
               <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider px-2">Password tidak cocok!</p>
            )}
             {formData.confirmPassword && isPasswordMatch && (
               <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider px-2 flex items-center gap-1">
                 <CheckCircle2 size={12}/> Password cocok
               </p>
            )}
          </div>

          {/* KODE REFERRAL */}
          <div className="relative group mt-2">
            <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              className={`w-full bg-slate-900/50 border border-white/10 text-white text-xs rounded-2xl pl-12 p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-bold uppercase tracking-widest border-dashed ${
                formData.referralCode && searchParams.get("ref") && searchParams.get("ref") !== "undefined" 
                ? "opacity-60 cursor-not-allowed" : ""
              }`}
              placeholder="KODE REFERRAL (OPSIONAL)"
              value={formData.referralCode || ""} 
              readOnly={!!searchParams.get("ref") && searchParams.get("ref") !== "undefined" && searchParams.get("ref") !== "null"}
              onChange={(e) => setFormData({...formData, referralCode: e.target.value.toUpperCase()})}
            />
          </div>

          <div className="flex justify-center pt-2">
            <Turnstile 
              siteKey="0x4AAAAAACkQAA6L_WPQSSms"
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              options={{ theme: 'dark' }} 
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.email.includes("@") || !isPasswordValid || !isPasswordMatch || !captchaToken}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic uppercase py-4 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "DAFTAR SEKARANG"}
          </button>
        </form>

        {/* --- LOGIN SOSMED --- */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold tracking-widest uppercase">
              <span className="bg-[#0B0E14] px-4 text-slate-500">Atau Masuk Dengan</span>
            </div>
          </div>
          
          <div className="mt-6 flex justify-center">
            <button 
              onClick={handleGoogleLogin}
              disabled={socialLoading}
              className="w-full bg-white text-slate-900 hover:bg-slate-100 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-white/5 disabled:opacity-50"
            >
              {socialLoading ? (
                 <Loader2 className="animate-spin text-slate-900" size={18} />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Lanjutkan dengan Google
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            SUDAH PUNYA AKUN? <a href="/login" className="text-emerald-500 hover:text-emerald-400 hover:underline transition-colors">LOGIN DISINI</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}