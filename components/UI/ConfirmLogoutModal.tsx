"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { supabase, clearSupabaseLocalAuth } from "@/utils/supabaseClient";

const emptySubscribe = () => () => {};

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function ConfirmLogoutModal({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmLogoutModalProps) {
  const { t } = useI18n();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [stageClasses, setStageClasses] = useState<string[]>([]);
  const [isHoveringConfirm, setIsHoveringConfirm] = useState<boolean>(false);
  const [isHoveringCancel, setIsHoveringCancel] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isCardShaking, setIsCardShaking] = useState<boolean>(false);

  const isCanceling = stageClasses.some((c) => c.startsWith("cancel-"));
  const isCancelLaptop = stageClasses.includes("cancel-laptop");
  const isBusy = isSigningOut || isCanceling;

  const handleClose = useCallback(() => {
    if (isBusy || stageClasses.length > 0) return;
    setIsCardShaking(false);
    setIsHoveringConfirm(false);
    setIsHoveringCancel(false);

    // Tahap 1 (0ms): Pintu membanting rapat 0deg
    setStageClasses(["cancel-close"]);

    // Tahap 2 (220ms): Kursi & Meja muncul, orang membalikkan badan dan duduk di kursi
    setTimeout(() => {
      setStageClasses((prev) => [...prev, "cancel-sit"]);
    }, 220);

    // Tahap 3 (600ms): Layar laptop membuka ke -72deg, cahaya cyan menyala, tangan mengetik
    setTimeout(() => {
      setStageClasses((prev) => [...prev, "cancel-laptop"]);
    }, 600);

    // Tahap 4 (1500ms): Modal mulai fade out
    setTimeout(() => {
      setStageClasses((prev) => [...prev, "cancel-fadeout"]);
    }, 1500);

    // Tahap 5 (1750ms): Unmount modal dan reset
    setTimeout(() => {
      onClose();
      setStageClasses([]);
      setIsHoveringConfirm(false);
      setIsHoveringCancel(false);
      setIsSigningOut(false);
    }, 1750);
  }, [isBusy, stageClasses, onClose]);

  // Handle ESC key to close with closing door animation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !isClient || typeof document === "undefined") {
    return null;
  }

  const handleConfirm = async () => {
    if (isBusy || stageClasses.length > 0) return;
    setIsSigningOut(true);
    setIsHoveringConfirm(false);
    setIsHoveringCancel(false);
    setStageClasses(["clicked"]);

    // 1. Eksekusi pembersihan auth Supabase di latar belakang detik ini juga (0ms).
    // Proses jaringan/token berjalan paralel selama animasi pintu 2.6s, sehingga
    // saat animasi selesai, auth sudah 100% bersih tanpa menambah loading halaman kedua.
    const purgeAuthPromise = (async () => {
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch {
        // ignore
      }
      await clearSupabaseLocalAuth();
    })();

    // Tahap 1 -> Anim1 (300ms): Pintu mulai jeda menutup (delay 0.25s, durasi 0.1s -> pintu tertutup rapat di 650ms)
    setTimeout(() => {
      setStageClasses((prev) => [...prev, "anim1"]);
    }, 300);

    // Tahap 2 -> Anim2 (1000ms): Ada jeda 350ms setelah pintu tertutup (650ms - 1000ms hanya terlihat pintu).
    // Setelah jeda, BARU hentakan shake (srek!), flash kilat, dan orang kelempar terjun bebas ke bawah persis referensi
    setTimeout(() => {
      setStageClasses((prev) => [...prev, "anim2"]);
      setIsCardShaking(true);
    }, 1000);

    // Hentikan getaran setelah 240ms getaran keras
    setTimeout(() => {
      setIsCardShaking(false);
    }, 1240);

    // Tahap 3 -> Logged Out (2600ms): Pintu & kusen menciut lenyap (scale 0)
    setTimeout(() => {
      setStageClasses((prev) => [...prev, "logged-out"]);
    }, 2600);

    // Tahap 4 -> Modal Fade Out (2750ms): Modal mulai memudar halus
    setTimeout(() => {
      setStageClasses((prev) => [...prev, "cancel-fadeout"]);
    }, 2750);

    // Tahap Akhir (2950ms): Tunggu pembersihan auth selesai lalu panggil onConfirm()
    setTimeout(async () => {
      try {
        await purgeAuthPromise;
        await onConfirm();
      } catch (err) {
        console.error("Logout confirm error:", err);
      } finally {
        onClose();
        setStageClasses([]);
        setIsSigningOut(false);
        setIsCardShaking(false);
      }
    }, 2950);
  };

  const stageClassNames = [
    "tivotal-stage",
    stageClasses.length === 0 && isHoveringConfirm ? "hover" : "",
    stageClasses.length === 0 && isHoveringCancel ? "hover-cancel" : "",
    ...stageClasses,
  ]
    .filter(Boolean)
    .join(" ");

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-logout-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          handleClose();
        }
      }}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white p-5 sm:p-6 shadow-2xl shadow-red-950/30 animate-in zoom-in-95 overflow-hidden transition-all duration-300 ${
          isCardShaking ? "modal-card-shake" : ""
        } ${stageClasses.includes("cancel-fadeout") ? "opacity-0 scale-95" : ""}`}
      >
        {/* Tombol Tutup (X) */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isBusy}
          aria-label={t("common.closeAria", "Tutup")}
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-50 cursor-pointer z-20"
        >
          <X size={18} />
        </button>

        {/* Konten Utama */}
        <div className="flex flex-col items-center text-center">
          {/* TIVOTAL ANIMATION STAGE (PERSIS REFERENSI & MASKING LANTAI CELAH PINTU) */}
          <div
            className="relative w-full mb-2 flex items-center justify-center"
            style={{ height: "82px" }}
          >
            <div className={stageClassNames}>
              {/* WORK CHAIR (SVG) */}
              <svg className="work-chair" viewBox="0 0 32 40">
                <rect x="24" y="6" width="4.5" height="18" rx="2" fill="#475569" />
                <rect x="6" y="21" width="22" height="4.5" rx="2" fill="#64748b" />
                <rect x="15" y="25.5" width="3.5" height="9.5" fill="#334155" />
                <path d="M5 37h23" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="5" cy="38" r="1.5" fill="#1e293b" />
                <circle cx="28" cy="38" r="1.5" fill="#1e293b" />
              </svg>

              {/* WORK DESK & PROFILE LAPTOP (SVG) */}
              <svg className="work-desk" viewBox="0 0 48 40">
                {/* Table Surface */}
                <rect x="2" y="17" width="44" height="3" rx="1" fill="#475569" />
                {/* Table Legs */}
                <rect x="5" y="20" width="3.5" height="18" rx="1" fill="#334155" />
                <rect x="40" y="20" width="3.5" height="18" rx="1" fill="#334155" />

                {/* LAPTOP LOWER CHASSIS (Base / Keyboard) */}
                <rect x="18" y="14.5" width="15" height="2.5" rx="0.8" fill="#94a3b8" />
                <rect x="20" y="14.5" width="12" height="0.8" fill="#cbd5e1" />

                {/* CYAN SCREEN LIGHT BEAM */}
                <polygon className="laptop-glow-beam" points="23,1 39,2 39,18 23,15" fill="url(#cyanGlowModal)" />

                {/* LAPTOP LID (SCREEN) IN SIDE PROFILE */}
                <g className="laptop-lid-group">
                  <rect x="18" y="12.5" width="14.5" height="2.2" rx="0.8" fill="#0284c7" />
                  <rect x="19" y="13.5" width="13" height="0.8" rx="0.4" fill="#38bdf8" />
                </g>

                <defs>
                  <linearGradient id="cyanGlowModal" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Door Frame SVG */}
              <svg className="door-frame" viewBox="0 0 100 100">
                <path d="M93.4 86.3H58.6c-1.9 0-3.4-1.5-3.4-3.4V17.1c0-1.9 1.5-3.4 3.4-3.4h34.8c1.9 0 3.4 1.5 3.4 3.4v65.8c0 1.9-1.5 3.4-3.4 3.4z" />
                <path className="flash" d="M40.5 43.7L26.6 31.4l-2.5 6.7zM41.9 50.4l-19.5-4-1.4 6.3zM40 57.4l-17.7 3.9 3.9 5.7z" />
              </svg>

              {/* Door SVG (Vibrant DaPay Red, 3D Rotates on Frame Edge) */}
              <svg className="door" viewBox="0 0 100 100">
                <path d="M93.4 86.3H58.6c-1.9 0-3.4-1.5-3.4-3.4V17.1c0-1.9 1.5-3.4 3.4-3.4h34.8c1.9 0 3.4 1.5 3.4 3.4v65.8c0 1.9-1.5 3.4-3.4 3.4z" />
                <circle cx="66" cy="50" r="3.7" />
              </svg>

              {/* Person SVG (White Figure on Dark Slate Theme) */}
              <svg className="person" viewBox="0 0 100 100">
                <circle cx="52.1" cy="32.4" r="6.4" />
                <path d="M50.7 62.8c-1.2 2.5-3.6 5-7.2 4-3.2-.9-4.9-3.5-4-7.8.7-3.4 3.1-13.8 4.1-15.8 1.7-3.4 1.6-4.6 7-3.7 4.3.7 4.6 2.5 4.3 5.4-.4 3.7-2.8 15.1-4.2 17.9z" />
                <g className="arm1">
                  <path d="M55.5 56.5l-6-9.5c-1-1.5-.6-3.5.9-4.4 1.5-1 3.7-1.1 4.6.4l6.1 10c1 1.5.3 3.5-1.1 4.4-1.5.9-3.5.5-4.5-.9z" />
                  <path d="M69.4 59.9L58.1 58c-1.7-.3-2.9-1.9-2.6-3.7.3-1.7 1.9-2.9 3.7-2.6l11.4 1.9c1.7.3 2.9 1.9 2.6 3.7-.4 1.7-2 2.9-3.8 2.6z" />
                </g>
                <g className="arm2">
                  <path d="M34.2 43.6L45 40.3c1.7-.6 3.5.3 4 2 .6 1.7-.3 4-2 4.5l-10.8 2.8c-1.7.6-3.5-.3-4-2-.6-1.6.3-3.4 2-4z" />
                  <path d="M27.1 56.2L32 45.7c.7-1.6 2.6-2.3 4.2-1.6 1.6.7 2.3 2.6 1.6 4.2L33 58.8c-.7 1.6-2.6 2.3-4.2 1.6-1.7-.7-2.4-2.6-1.7-4.2z" />
                </g>
                <g className="leg1">
                  <path d="M52.1 73.2s-7-5.7-7.9-6.5c-.9-.9-1.2-3.5-.1-4.9 1.1-1.4 3.8-1.9 5.2-.9l7.9 7c1.4 1.1 1.7 3.5.7 4.9-1.1 1.4-4.4 1.5-5.8.4z" />
                  <path d="M52.6 84.4l-1-12.8c-.1-1.9 1.5-3.6 3.5-3.7 2-.1 3.7 1.4 3.8 3.4l1 12.8c.1 1.9-1.5 3.6-3.5 3.7-2 0-3.7-1.5-3.8-3.4z" />
                </g>
                <g className="leg2">
                  <path d="M37.8 72.7s1.3-10.2 1.6-11.4 2.4-2.8 4.1-2.6c1.7.2 3.6 2.3 3.4 4l-1.8 11.1c-.2 1.7-1.7 3.3-3.4 3.1-1.8-.2-4.1-2.4-3.9-4.2z" />
                  <path d="M29.5 82.3l9.6-10.9c1.3-1.4 3.6-1.5 5.1-.1 1.5 1.4.4 4.9-.9 6.3l-8.5 9.6c-1.3 1.4-3.6 1.5-5.1.1-1.4-1.3-1.5-3.5-.2-5z" />
                </g>
              </svg>
            </div>
          </div>

          {/* Judul (Layer z-10 di depan orang yang jatuh) */}
          <h2
            id="confirm-logout-title"
            className={`relative z-10 text-base sm:text-lg font-bold tracking-tight leading-snug mb-5 transition-colors duration-300 ${
              isCancelLaptop ? "text-sky-400" : "text-white"
            }`}
          >
            {isCancelLaptop
              ? t("auth.stayActiveTitle", "Tetap Lanjut di DaPay ✨")
              : t("auth.confirmSignOutTitle")}
          </h2>

          {/* Tombol Aksi (Layer z-10 di depan orang yang jatuh) */}
          <div className="relative z-10 grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={handleClose}
              onMouseEnter={() => {
                if (stageClasses.length === 0 && !isBusy) {
                  setIsHoveringCancel(true);
                }
              }}
              onMouseLeave={() => {
                setIsHoveringCancel(false);
              }}
              disabled={isBusy}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition active:scale-95 disabled:opacity-80 cursor-pointer ${
                isCanceling
                  ? "border-sky-500/50 bg-sky-950/40 text-sky-300 shadow-sm shadow-sky-500/20"
                  : "border-slate-700/80 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white"
              }`}
            >
              {isCanceling ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 size={14} className="animate-spin text-sky-400" />
                  <span>{t("auth.backToShopping", "Kembali Berbelanja...")}</span>
                </span>
              ) : (
                <span>{t("auth.cancelSignOut", "Batal")}</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              onMouseEnter={() => {
                if (stageClasses.length === 0 && !isBusy) {
                  setIsHoveringConfirm(true);
                }
              }}
              onMouseLeave={() => {
                setIsHoveringConfirm(false);
              }}
              disabled={isBusy}
              className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-red-600 via-rose-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-md shadow-red-600/25 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSigningOut ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t("auth.signingOutProgress")}</span>
                </>
              ) : (
                <>
                  <span>{t("auth.proceedSignOut")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TIVOTAL EXACT CSS TRANSFORMS & KEYFRAMES */}
      <style jsx>{`
        .tivotal-stage {
          position: relative;
          width: 160px;
          height: 75px;
          perspective: 100px;
          margin: 0 auto;
        }

        .tivotal-stage :global(svg) {
          display: block;
          position: absolute;
        }

        .tivotal-stage :global(.door-frame) {
          width: 60px;
          height: 60px;
          z-index: 3;
          left: 53px;
          bottom: 8px;
          fill: #475569;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .tivotal-stage :global(.door-frame .flash) {
          opacity: 0;
          fill: #fbbf24;
        }

        /* WORKSPACE ELEMENTS (KURSI, MEJA & LAPTOP) */
        .tivotal-stage :global(.work-desk) {
          position: absolute;
          left: 8px;
          bottom: 8px;
          width: 48px;
          height: 40px;
          z-index: 6;
          opacity: 0;
          transform: translateY(14px) scale(0.9);
          transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .tivotal-stage :global(.work-chair) {
          position: absolute;
          left: 45px;
          bottom: 8px;
          width: 32px;
          height: 40px;
          z-index: 3;
          opacity: 0;
          transform: translateY(14px) scale(0.9);
          transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .tivotal-stage :global(.laptop-lid-group) {
          transform-origin: 18px 15px;
          transform: rotate(0deg);
          transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.25, 1);
        }

        .tivotal-stage :global(.laptop-glow-beam) {
          opacity: 0;
          transition: opacity 0.35s ease 0.15s;
        }

        /* 1. STATE IDLE (Pintu sedikit terbuka 20deg persis referensi asli Tivotal) */
        .tivotal-stage {
          --door-transform: rotateY(20deg);
          --door-duration: 0.2s;
          --door-delay: 0s;

          --person-transform: none;
          --person-duration: 0.1s;
          --body-duration: 0.1s;

          --arm1-transform: none;
          --arm2-transform: none;
          --leg1-transform: none;
          --leg2-transform: none;
        }

        .tivotal-stage :global(.door) {
          width: 60px;
          height: 60px;
          z-index: 5;
          left: 53px;
          bottom: 8px;
          transform-style: preserve-3d;
          transform: var(--door-transform);
          transform-origin: 100% 50%;
          transition: transform var(--door-duration) ease var(--door-delay);
          fill: #dc2626;
        }

        .tivotal-stage :global(.door path) {
          fill: #dc2626;
          stroke: #991b1b;
          stroke-width: 3.5;
        }

        .tivotal-stage :global(.door circle) {
          fill: #fbbf24;
          stroke: #d97706;
          stroke-width: 1;
        }

        .tivotal-stage :global(.person) {
          fill: #f8fafc;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
          z-index: 4;
          width: 60px;
          height: 60px;
          left: 32px;
          bottom: 8px;
          transform: var(--person-transform);
          transition: var(--person-duration) cubic-bezier(0.2, 0.1, 0.8, 0.9);
        }

        .tivotal-stage :global(.arm1),
        .tivotal-stage :global(.arm2),
        .tivotal-stage :global(.leg1),
        .tivotal-stage :global(.leg2) {
          transition: var(--body-duration) ease-in-out;
        }

        .tivotal-stage :global(.arm1) {
          transform: var(--arm1-transform);
          transform-origin: 52% 45%;
        }

        .tivotal-stage :global(.arm2) {
          transform: var(--arm2-transform);
          transform-origin: 47% 43%;
        }

        .tivotal-stage :global(.leg1) {
          transform: var(--leg1-transform);
          transform-origin: 47% 64.5%;
        }

        .tivotal-stage :global(.leg2) {
          transform: var(--leg2-transform);
          transform-origin: 43% 63%;
        }

        /* 2. STATE HOVER (Saat kursor menyentuh tombol "Ya, Keluar": Pintu membuka ke 28deg, orang maju) */
        .tivotal-stage.hover {
          --door-transform: rotateY(28deg);
          --person-transform: translateX(4px);
          --arm1-transform: rotate(-5deg);
          --arm2-transform: rotate(5deg);
          --leg1-transform: rotate(-10deg);
          --leg2-transform: rotate(20deg);
        }

        /* 2b. STATE HOVER BATAL (Saat kursor menyentuh tombol "Batal": Orang mundur, pintu tertutup rapat 0deg) */
        .tivotal-stage.hover-cancel {
          --door-transform: rotateY(0deg);
          --door-duration: 0.25s;

          --person-transform: translateX(-6px);
          --person-duration: 0.2s;

          --arm1-transform: rotate(6deg);
          --arm2-transform: rotate(-6deg);
          --leg1-transform: rotate(12deg);
          --leg2-transform: rotate(-15deg);
        }

        /* 3. STATE CLICKED (Saat tombol "Ya, Keluar" diklik: Pintu membuka 45deg, orang sprint lari masuk) */
        .tivotal-stage.clicked {
          --door-transform: rotateY(45deg);
          --person-transform: translateX(35px);
          --person-duration: 0.3s;
          --body-duration: 0.3s;

          --arm1-transform: translateX(-4px) translateY(-2px) rotate(120deg);
          --arm2-transform: translateX(4px) rotate(-110deg);
          --leg1-transform: translateX(-3px) rotate(80deg);
          --leg2-transform: translateX(4px) rotate(-60deg);
        }

        /* 4. STATE ANIM1 (300ms: Pintu mulai jeda menutup dengan delay 0.25s, orang bersiap) */
        .tivotal-stage.anim1 {
          --door-transform: none;
          --door-duration: 0.1s;
          --door-delay: 0.25s;

          --person-duration: 0.4s;
          --arm1-transform: rotate(60deg);
          --arm2-transform: rotate(-45deg);
          --leg1-transform: rotate(-5deg);
          --leg2-transform: rotate(10deg);
        }

        /* 5. STATE ANIM2 (1000ms: Pintu tertutup rapat, hentakan shake, flash menyala, orang terjun lurus & berputar di udara) */
        .tivotal-stage.anim2 {
          animation: shake 0.2s linear;
          --person-duration: 1.4s;
          --body-duration: 0.4s;

          --arm1-transform: rotate(-60deg);
          --arm2-transform: rotate(30deg);
          --leg1-transform: rotate(-30deg);
          --leg2-transform: rotate(20deg);
        }

        .tivotal-stage.anim2 :global(.flash) {
          animation: flash 0.3s linear;
        }

        .tivotal-stage.anim2 :global(.person) {
          /* Tetap di sumbu X pintu (tanpa geser ke kanan), jatuh lurus ke bawah dulu, baru muter 360deg di udara */
          z-index: 1;
          animation: plungeAndSpin 1.4s cubic-bezier(0.5, 0.05, 0.8, 1) forwards;
        }

        /* 6. STATE LOGGED-OUT (2400ms: Pintu & kusen menciut lenyap) */
        .tivotal-stage.logged-out :global(.door),
        .tivotal-stage.logged-out :global(.door-frame) {
          --door-duration: 0.1s;
          --door-delay: 0s;
          transform: translateX(10px) scale(0);
        }

        /* 7. CANCEL ANIMATION SEQUENCE (Saat Klik Batal: Pintu menutup, balik badan & duduk di kursi, buka laptop) */
        /* Tahap 1: Pintu menutup rapat 0deg */
        .tivotal-stage.cancel-close {
          --door-transform: rotateY(0deg);
          --door-duration: 0.22s;
        }

        /* Tahap 2: Pintu bergeser, kursi & meja muncul, orang membalikkan badan dan duduk di kursi */
        .tivotal-stage.cancel-sit :global(.door) {
          transform: translateX(26px) rotateY(0deg);
        }
        .tivotal-stage.cancel-sit :global(.door-frame) {
          transform: translateX(26px);
        }
        .tivotal-stage.cancel-sit :global(.work-desk),
        .tivotal-stage.cancel-sit :global(.work-chair) {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .tivotal-stage.cancel-sit :global(.person) {
          transform: translateX(0px) translateY(7px) scaleX(-1);
          --person-duration: 0.35s;
          --body-duration: 0.35s;

          /* Kaki menekuk duduk santai */
          --leg1-transform: rotate(-35deg);
          --leg2-transform: rotate(-45deg);

          /* Tangan bersiap di depan keyboard */
          --arm1-transform: rotate(-35deg) translateX(-2px);
          --arm2-transform: rotate(-50deg) translateX(2px);
        }

        /* Tahap 3: Layar laptop membuka ke -72deg, cahaya cyan menyala, tangan mengetik */
        .tivotal-stage.cancel-laptop :global(.laptop-lid-group) {
          transform: rotate(-72deg);
        }
        .tivotal-stage.cancel-laptop :global(.laptop-glow-beam) {
          opacity: 0.95;
        }
        .tivotal-stage.cancel-laptop :global(.person) {
          --arm1-transform: rotate(-30deg) translateX(-2px);
          --arm2-transform: rotate(-45deg) translateX(2px);
        }

        @keyframes modalCardShake {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
          15% {
            transform: translate(-5px, 2px) rotate(-1.5deg);
          }
          30% {
            transform: translate(5px, -2px) rotate(1.5deg);
          }
          50% {
            transform: translate(-4px, 1px) rotate(-1deg);
          }
          70% {
            transform: translate(4px, -1px) rotate(1deg);
          }
          85% {
            transform: translate(-2px, 1px) rotate(-0.4deg);
          }
        }

        .modal-card-shake {
          animation: modalCardShake 0.24s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes shake {
          0%,
          100% {
            transform: rotate(-1deg);
          }
          50% {
            transform: rotate(2deg);
          }
        }

        @keyframes flash {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes plungeAndSpin {
          0% {
            transform: translateX(35px) translateY(0px) rotate(0deg) scale(1);
          }
          18% {
            /* Sudah turun keluar dari dasar pintu, baru mulai miring terlempar */
            transform: translateX(35px) translateY(55px) rotate(15deg) scale(1.1);
          }
          45% {
            /* Melayang melintasi belakang teks judul: berputar 180deg */
            transform: translateX(35px) translateY(130px) rotate(180deg) scale(1.2);
          }
          75% {
            /* Melayang melintasi belakang tombol CTA: berputar 360deg */
            transform: translateX(35px) translateY(220px) rotate(360deg) scale(1.2);
          }
          100% {
            /* Meluncur ke dasar kartu modal: berputar 540deg */
            transform: translateX(35px) translateY(320px) rotate(540deg) scale(1.1);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
