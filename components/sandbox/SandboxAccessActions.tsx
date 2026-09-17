"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
  Sparkles,
  Clock,
  RotateCcw,
  UserCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import {
  fetchTesterSessionDeduplicated,
  broadcastSandboxSync,
  setCachedSandboxSession,
  type SandboxSessionData,
} from "@/components/sandbox/SandboxSessionControl";
import SandboxReactivationModal from "@/components/sandbox/SandboxReactivationModal";

type ExtendedSandboxSessionData = Omit<SandboxSessionData, "sandboxReactivationState"> & {
  sandboxAccessReason?: string | null;
  sandboxReactivationState?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | null;
  sandboxReactivationReason?: string | null;
  sandboxReactivationRequestedAt?: string | null;
};

function getLockType(reason?: string | null): "conversion" | "inactivity" | "other" {
  if (!reason) return "other";
  const lower = reason.toLowerCase();
  if (lower.includes("convert") || lower.includes("member live")) return "conversion";
  if (
    lower.includes("auto-lock") ||
    lower.includes("aktivitas") ||
    lower.includes("inactivity") ||
    lower.includes("inaktif")
  ) {
    return "inactivity";
  }
  return "other";
}

export default function SandboxAccessActions() {
  const router = useRouter();
  const [data, setData] = useState<ExtendedSandboxSessionData | null>(null);
  const [pending, setPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const [reactivationLockType, setReactivationLockType] = useState<"conversion" | "inactivity" | "other" | "revoked">("other");

  const refresh = async () => setData((await fetchTesterSessionDeduplicated(true)) as ExtendedSandboxSessionData | null);

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

  const handleStartExploration = () => {
    setShowOnboarding(false);
    if (data?.userId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`dapay_sandbox_onboarded_${data.userId}`, "true");
      } catch {
        // ignore localStorage failure
      }
    }
    router.push("/user?tab=catalog");
  };

  const openReactivation = (type: "conversion" | "inactivity" | "other" | "revoked") => {
    setReactivationLockType(type);
    setShowReactivationModal(true);
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

      const nextData: ExtendedSandboxSessionData = {
        authenticated: true,
        userId: data?.userId ?? null,
        isTester: true,
        sandboxAccessState: "ACTIVE",
        isSandboxActive: true,
        sandboxBalance: 1000000,
      };

      setCachedSandboxSession(nextData as SandboxSessionData);
      broadcastSandboxSync(nextData as SandboxSessionData);
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

  const lockType = getLockType(data.sandboxAccessReason);

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

      {/* 1. PENDING REACTIVATION: Waiting for manager review */}
      {data.sandboxReactivationState === "PENDING" && (
        <div className="w-full rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-left">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
              <Clock size={14} className="text-amber-600 shrink-0" />
              Menunggu Persetujuan
            </span>
            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-900">
              Dalam Antrean
            </span>
          </div>
          <p className="text-[11px] text-amber-900/85 leading-relaxed">
            Permohonan reaktivasi Sandbox Anda telah terkirim dan sedang ditinjau oleh Admin/Manager.
          </p>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-800/80">
            <ShieldCheck size={12} className="shrink-0 text-amber-600" />
            <span>Akun & saldo kas riil Anda tetap aman.</span>
          </div>
        </div>
      )}

      {/* 2. REJECTED REACTIVATION: Show manager notice & allow re-apply */}
      {data.sandboxReactivationState === "REJECTED" &&
        (data.sandboxAccessState === "LOCKED" || data.sandboxAccessState === "REVOKED") && (
          <div className="w-full rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                <AlertCircle size={14} className="text-rose-600 shrink-0" />
                Pengajuan Ditolak
              </span>
              <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-900">
                Ditolak
              </span>
            </div>
            <p className="text-[11px] text-rose-900/85 leading-relaxed">
              {data.sandboxReactivationReason ? (
                <>
                  <span className="font-semibold text-rose-950">Catatan Manajemen:</span>{" "}
                  &ldquo;{data.sandboxReactivationReason}&rdquo;
                </>
              ) : (
                "Permohonan reaktivasi sebelumnya belum disetujui oleh manajemen."
              )}
            </p>
            <button
              type="button"
              onClick={() =>
                openReactivation(
                  data.sandboxAccessState === "REVOKED"
                    ? "revoked"
                    : lockType
                )
              }
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer"
            >
              <RotateCcw size={12} />
              Ajukan Ulang Reaktivasi
            </button>
          </div>
        )}

      {/* 3. LOCKED: Reason-specific cards (only if not pending and not rejected) */}
      {data.sandboxAccessState === "LOCKED" &&
        data.sandboxReactivationState !== "PENDING" &&
        data.sandboxReactivationState !== "REJECTED" && (
          <>
            {/* 3A. LOCKED VIA CONVERSION: Member LIVE */}
            {lockType === "conversion" && (
              <div className="w-full rounded-xl border border-sky-200 bg-linear-to-r from-sky-50 to-blue-50 p-3 text-left">
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                    <UserCheck size={14} className="text-sky-600 shrink-0" />
                    Member LIVE Aktif
                  </span>
                  <span className="rounded-full bg-sky-200/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-sky-900">
                    Graduated
                  </span>
                </div>
                <p className="text-[11px] text-sky-900/85 leading-relaxed">
                  Akun Anda telah aktif sebagai Member LIVE. Akses simulasi Sandbox dialihkan, namun Anda dapat mengajukan pembukaan kembali untuk belajar atau simulasi.
                </p>
                <button
                  type="button"
                  onClick={() => openReactivation("conversion")}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-bold text-white shadow-xs hover:bg-sky-700 transition cursor-pointer"
                >
                  <FlaskConical size={12} />
                  Ajukan Akses Sandbox
                  <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* 3B. LOCKED VIA INACTIVITY: 7 days inactive */}
            {lockType === "inactivity" && (
              <div className="w-full rounded-xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-3 text-left">
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Clock size={14} className="text-amber-600 shrink-0" />
                    Akses Terkunci
                  </span>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-900">
                    7 Hari Inaktif
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/85 leading-relaxed">
                  Akses simulasi Sandbox terkunci otomatis karena tidak ada aktivitas selama 7 hari. Data dan riwayat simulasi Anda tetap tersimpan.
                </p>
                <button
                  type="button"
                  onClick={() => openReactivation("inactivity")}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-linear-to-r from-amber-500 to-orange-500 px-3 py-2 text-[11px] font-bold text-slate-950 shadow-xs hover:from-amber-600 hover:to-orange-600 transition cursor-pointer"
                >
                  <RotateCcw size={12} />
                  Buka Kembali Akses
                  <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* 3C. LOCKED VIA OTHER: Generic locked state */}
            {lockType === "other" && (
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <RotateCcw size={14} className="text-slate-600 shrink-0" />
                    Akses Terkunci
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-700">
                    Terkunci
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {data.sandboxAccessReason || "Akses lingkungan simulasi Sandbox Anda saat ini terkunci."}
                </p>
                <button
                  type="button"
                  onClick={() => openReactivation("other")}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-white shadow-xs hover:bg-slate-900 transition cursor-pointer"
                >
                  <RotateCcw size={12} />
                  Minta Reaktivasi Sandbox
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
          </>
        )}

      {/* 4. REVOKED: Administratively revoked access */}
      {data.sandboxAccessState === "REVOKED" &&
        data.sandboxReactivationState !== "PENDING" &&
        data.sandboxReactivationState !== "REJECTED" && (
          <div className="w-full rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                Akses Dicabut
              </span>
              <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-900">
                Revoked
              </span>
            </div>
            <p className="text-[11px] text-rose-900/85 leading-relaxed">
              {data.sandboxAccessReason ? (
                <>
                  <span className="font-semibold text-rose-950">Alasan:</span> &ldquo;{data.sandboxAccessReason}&rdquo;
                </>
              ) : (
                "Akses Sandbox telah dinonaktifkan secara administratif oleh manajemen DaPay."
              )}
            </p>
            <button
              type="button"
              onClick={() => openReactivation("revoked")}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-[11px] font-bold text-rose-800 shadow-2xs hover:bg-rose-50 transition cursor-pointer"
            >
              <RotateCcw size={12} />
              Ajukan Peninjauan Akses
              <ArrowRight size={12} />
            </button>
          </div>
        )}

      {/* PHASE 4B: REACTIVATION MODAL */}
      <SandboxReactivationModal
        isOpen={showReactivationModal}
        onClose={() => setShowReactivationModal(false)}
        onSuccess={() => void refresh()}
        lockType={reactivationLockType}
      />

      {/* PHASE 1C: SANDBOX ONBOARDING MODAL (ACTIVE & IN SANDBOX SESSION ONLY) */}
      {showOnboarding && data.sandboxAccessState === "ACTIVE" && data.isSandboxActive && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sandbox-welcome-title"
          aria-describedby="sandbox-welcome-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 md:p-6 shadow-2xl border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleDismissOnboarding}
              className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Tutup panduan selamat datang"
            >
              <X size={18} />
            </button>

            {/* PART 1 — STATUS */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-300/80 shadow-2xs">
                <FlaskConical size={13} className="text-amber-600 shrink-0" />
                SANDBOX SUDAH AKTIF
              </span>
            </div>

            <h2 id="sandbox-welcome-title" className="text-base font-extrabold text-slate-950 tracking-tight">
              Selamat, Sandbox Anda Sudah Aktif!
            </h2>
            <p id="sandbox-welcome-desc" className="text-xs text-slate-500 mt-1 leading-normal">
              Gunakan saldo virtual untuk mencoba simulasi transaksi produk digital.
            </p>

            {/* PART 2 — VIRTUAL BALANCE / SAFETY */}
            <div className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-600" />
                  Saldo Virtual
                </span>
                <span className="font-extrabold font-mono text-amber-900 text-sm">
                  Rp 1.000.000
                </span>
              </div>
              <p className="text-[11px] text-amber-900/85 leading-relaxed">
                Saldo ini hanya untuk latihan. Saldo kas LIVE Anda tidak digunakan dan tidak terpengaruh.
              </p>
              <p className="text-[10px] text-amber-800/75 mt-1 font-medium">
                *Saldo Virtual tidak dapat diuangkan.
              </p>
            </div>

            {/* PART 3 — FIRST STEP */}
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                  01
                </span>
                <h3 className="font-bold text-slate-900 text-xs">
                  Langkah Pertama: Coba Satu Transaksi Contoh
                </h3>
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                Pilih satu produk di katalog dan lakukan simulasi pertama Anda. Di katalog tersedia panduan <strong>&ldquo;Mulai dari sini&rdquo;</strong>.
              </p>
            </div>

            {/* ACTIONS */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleStartExploration}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span>Mulai Coba Produk</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleDismissOnboarding}
                className="w-full py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer text-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
