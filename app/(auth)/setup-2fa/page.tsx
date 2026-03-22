"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, ArrowRight } from "lucide-react";

export default function Setup2FAPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Jalankan saat halaman pertama kali dimuat
  useEffect(() => {
    const setupMFA = async () => {
      setLoading(true);
      try {
        // Meminta backend Supabase membuat secret & QR Code (Enrollment)
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
        });

        if (error) throw error;

        setFactorId(data.id);
        // Supabase mengembalikan format SVG murni, sangat ringan!
        setQrCode(data.totp.qr_code);
      } catch (err: any) {
        setErrorMsg("Gagal membuat kode keamanan: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    setupMFA();
  }, []);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      // Mengirim PIN ke backend Supabase untuk divalidasi (Challenge & Verify)
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: pin.trim(),
      });

      if (error) throw error;

      // Jika sukses, AAL naik ke AAL2. Langsung arahkan ke dashboard
      router.push("/admin");
    } catch (err: any) {
      setErrorMsg("KODE SALAH! Coba lagi, Bos.");
      setPin(""); // Kosongkan input jika salah
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-[40px] shadow-2xl w-full max-w-md">
        
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-3xl mb-4">
            <ShieldAlert className="text-amber-500" size={32} />
          </div>
          <h1 className="text-2xl text-white font-black italic uppercase">SETUP KEAMANAN</h1>
          <p className="text-slate-400 text-xs font-medium mt-1">Scan QR Code dengan Google Authenticator</p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
            <p className="text-rose-400 text-xs font-bold text-center">{errorMsg}</p>
          </div>
        )}

        {/* Area QR Code (DESAIN BARU - Pas, Bersih, Cepat) */}
        <div className="flex justify-center mb-6">
          {!qrCode ? (
            <div className="w-52 h-52 flex items-center justify-center bg-slate-900/50 rounded-[30px] border border-white/5">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : (
            <div 
              // Kontainer Putih Sempurna untuk Kontras Scan HP
              className="bg-white p-5 rounded-[30px] shadow-inner shadow-black/10 flex items-center justify-center relative group"
              style={{ width: "210px", height: "210px" }}
            >
              <div
                // Tampilan QR Code (SVG Sempurna)
                className="w-full h-full [&_svg]:w-full [&_svg]:h-full transition-transform duration-300 group-hover:scale-105"
                dangerouslySetInnerHTML={{ 
                  // Kita bersihkan dulu data:image text yang bocor tadi
                  __html: qrCode.includes('<svg') ? qrCode : ''
                }} 
              />
              <div className="absolute inset-0 bg-white rounded-[30px] -z-10 group-hover:blur-xl group-hover:opacity-10 transition-all duration-300"></div>
            </div>
          )}
        </div>

        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div>
            <label className="text-[10px] text-amber-500 font-bold tracking-widest uppercase block text-center mb-2">
              Input 6-Digit PIN dari Aplikasi
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              className="w-full bg-slate-900/50 border border-amber-500/30 text-white text-2xl tracking-[0.8em] text-center rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent block p-4 outline-none font-black"
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>

          <button
            type="submit"
            disabled={loading || pin.length < 6}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black italic uppercase py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "AKTIFKAN 2FA SEKARANG"}
          </button>
        </form>

      </div>
    </div>
  );
}