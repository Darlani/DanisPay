"use client";

import { useEffect, useState } from "react";
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import {
  fetchTesterSessionDeduplicated,
  broadcastSandboxSync,
  setCachedSandboxSession,
  type SandboxSessionData,
} from "@/components/sandbox/SandboxSessionControl";

export default function SandboxAccessActions() {
  const [data, setData] = useState<SandboxSessionData | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const refresh = async () => setData(await fetchTesterSessionDeduplicated(true));

  useEffect(() => {
    void refresh();
    const handleSync = () => { void refresh(); };
    window.addEventListener("sandboxSessionChanged", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("sandboxSessionChanged", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Check onboarding status for active sandbox session
  useEffect(() => {
    if (data?.authenticated && data.sandboxAccessState === "ACTIVE" && data.isSandboxActive && data.userId) {
      if (typeof window !== "undefined") {
        try {
          const seen = localStorage.getItem(`dapay_sandbox_onboarded_${data.userId}`);
          if (!seen) {
            setShowOnboarding(true);
          }
        } catch {
          // ignore localStorage failure
        }
      }
    }
  }, [data?.authenticated, data?.sandboxAccessState, data?.isSandboxActive, data?.userId]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    if (data?.userId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`dapay_sandbox_onboarded_${data.userId}`, "true");
      } catch {
        // ignore localStorage failure
      }
    }
  };

  const call = async (url: string) => {
    setPending(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(url, {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
      setMessage(body.message || (url.includes("convert") ? "Akun menjadi Member LIVE." : "Permintaan reaktivasi terkirim."));
      await refresh();
      window.dispatchEvent(new Event("sandboxSessionChanged"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Permintaan gagal.");
    } finally {
      setPending(false);
    }
  };

  const handleActivate = async () => {
    setPending(true);
    setErrorMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/tester/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({}),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        let msg = body.error || "Gagal mengaktifkan Sandbox.";
        if (body.code === "EMAIL_NOT_VERIFIED") {
          msg = "Email Anda belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu di menu Pengaturan Akun.";
        } else if (body.code === "ACCOUNT_BLOCKED") {
          msg = "Akun Anda sedang ditangguhkan atau diblokir. Hubungi Pusat Bantuan.";
        } else if (body.code === "MANAGEMENT_PERSONA_NOT_ELIGIBLE") {
          msg = "Akun Admin/Manager tidak dapat mengakses Sandbox Pelanggan. Gunakan Test Center di Panel Admin.";
        } else if (body.code === "SANDBOX_ACCESS_LOCKED_OR_REVOKED") {
          msg = "Akses Sandbox terkunci atau telah dicabut. Silakan ajukan reaktivasi melalui menu Bantuan.";
        }
        throw new Error(msg);
      }

      const nextData: SandboxSessionData = {
        authenticated: true,
        userId: data?.userId ?? null,
        isTester: true,
        sandboxAccessState: "ACTIVE",
        isSandboxActive: true,
        sandboxBalance: 1000000,
      };

      setCachedSandboxSession(nextData);
      broadcastSandboxSync(nextData);
      window.dispatchEvent(new Event("sandboxSessionChanged"));
      setShowConfirm(false);
      setShowOnboarding(true);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengaktifkan Sandbox.");
    } finally {
      setPending(false);
    }
  };

  if (!data?.authenticated) return null;

  return (
    <>
      {/* NONE state: Eligible for first-time activation */}
      {data.sandboxAccessState === null && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setErrorMessage(null);
              setShowConfirm(true);
            }}
            className="w-full rounded-xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 px-3 py-2.5 text-left text-xs font-bold text-amber-950 transition hover:border-amber-300 hover:shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FlaskConical size={14} className="text-amber-600 shrink-0" />
                Coba Sandbox
              </span>
              <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-amber-800">
                Simulasi
              </span>
            </div>
            <span className="mt-1 block text-[10px] font-normal text-amber-800/80 leading-tight">
              Pelajari transaksi digital dengan saldo virtual sandbox.
            </span>
          </button>

          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={pending}
                  className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <FlaskConical size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Mulai Coba Sandbox</h3>
                    <p className="text-[11px] text-slate-500">Mode Simulasi Tanpa Risiko</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100 mb-3.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Dapatkan Rp 1.000.000 saldo virtual sandbox secara gratis.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Transaksi simulasi tanpa pernah memotong saldo kas riil.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Terisolasi dari pembukuan dan pesanan operasional nyata.</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 mb-3.5">
                    <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={pending}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleActivate}
                    disabled={pending}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 size={14} className="animate-spin text-slate-950" />
                    ) : (
                      <FlaskConical size={14} />
                    )}
                    Aktifkan Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}


      {/* PENDING reactivation state */}
      {data.sandboxReactivationState === "PENDING" && (
        <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Permintaan reaktivasi Sandbox sedang menunggu persetujuan.
        </div>
      )}

      {/* LOCKED or REVOKED state */}
      {(data.sandboxAccessState === "LOCKED" || data.sandboxAccessState === "REVOKED") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void call("/api/tester/reactivation-request")}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Mengirim..." : "Minta Reaktivasi Sandbox"}
          <span className="mt-1 block text-[10px] font-normal">Persetujuan Admin/Manager diperlukan.</span>
          {message && <span className="mt-1 block text-[10px]">{message}</span>}
        </button>
      )}

      {/* PHASE 1C: SANDBOX ONBOARDING MODAL (ACTIVE & IN SANDBOX SESSION ONLY) */}
      {showOnboarding && data.sandboxAccessState === "ACTIVE" && data.isSandboxActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 md:p-6 shadow-2xl border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={handleDismissOnboarding}
              className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Tutup Onboarding"
            >
              <X size={18} />
            </button>

            {/* Prominent Labeling */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-300/80 shadow-2xs">
                <FlaskConical size={13} className="text-amber-600 shrink-0" />
                SANDBOX • SIMULASI
              </span>
            </div>

            <h2 className="text-base font-extrabold text-slate-950 tracking-tight">
              Selamat Datang di Sandbox DaPay
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Ruang belajar dan simulasi transaksi produk digital tanpa risiko finansial.
            </p>

            {/* Virtual Balance Card */}
            <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-amber-950 flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-600" />
                  Saldo Virtual Sandbox Diberikan
                </span>
                <span className="font-extrabold font-mono text-amber-800 text-sm">
                  Rp 1.000.000
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Saldo virtual disediakan untuk mencoba simulasi transaksi. Saldo ini sepenuhnya virtual, tidak dapat dicairkan (<span className="font-semibold">non-withdrawable</span>), dan tidak dapat dipindahkan ke saldo riil.
              </p>
            </div>

            {/* Simulation / No Real Money Feature Checklist */}
            <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-100">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-slate-900">Transaksi Simulasi:</strong> Berlatih transaksi pulsa dan data tanpa terhubung ke vendor riil.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-slate-900">Bebas Risiko Finansial:</strong> Saldo kas riil DaPay Anda tidak akan pernah terpotong.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-slate-900">Terisolasi Sempurna:</strong> Mutasi saldo virtual dan pesanan simulasi terpisah dari pembukuan riil.
                </span>
              </div>
            </div>

            {/* Recommended First Action & Dismiss */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleDismissOnboarding}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer"
              >
                Mulai Eksplorasi Sandbox →
              </button>
              <button
                type="button"
                onClick={handleDismissOnboarding}
                className="w-full py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer text-center"
              >
                Lewati & Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
