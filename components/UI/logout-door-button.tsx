"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type LogoutDoorButtonProps = {
  onLogout?: () => Promise<void> | void;
  isCollapsed?: boolean;
  className?: string;
};

export default function LogoutDoorButton({
  onLogout,
  isCollapsed = false,
  className = "",
}: LogoutDoorButtonProps) {
  const [loggedOut, setLoggedOut] = useState(false);
  const [opening, setOpening] = useState(false);

  const handleLogout = async () => {
    if (opening || loggedOut) return;

    setOpening(true);

    // Tunggu animasi pintu terbuka
    setTimeout(async () => {
      setLoggedOut(true);

      // Jalankan logout asli (Supabase / NextAuth / dll)
      if (onLogout) {
        await onLogout();
      }
    }, 650);
  };

  if (isCollapsed) {
    return (
      <motion.button
        whileHover={!loggedOut ? { scale: 1.05 } : {}}
        whileTap={!loggedOut ? { scale: 0.95 } : {}}
        onClick={handleLogout}
        disabled={loggedOut}
        title={loggedOut ? "Anda telah keluar" : "Keluar Akun"}
        aria-label="Keluar Akun"
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl transition-all duration-500 ${
          loggedOut
            ? "bg-zinc-400 text-white shadow-xs"
            : "bg-linear-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 hover:from-red-700 hover:to-rose-700"
        } ${className}`}
      >
        {/* Glow saat selesai logout */}
        <AnimatePresence>
          {loggedOut && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.3, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 rounded-xl bg-white"
            />
          )}
        </AnimatePresence>

        {/* ICON PINTU COMPACT */}
        <div className="relative flex h-7 w-7 items-center justify-center">
          {/* Frame pintu */}
          <div className="absolute h-5 w-4 rounded-[3px] border-[1.5px] border-white" />

          {/* Orang */}
          <motion.div
            initial={{ x: -3, opacity: 0 }}
            animate={
              opening
                ? {
                    x: 9,
                    opacity: [0, 1, 1, 0],
                  }
                : {
                    x: -3,
                    opacity: 0,
                  }
            }
            transition={{
              duration: 0.8,
              delay: 0.25,
              ease: "easeInOut",
            }}
            className="absolute bottom-[4px] left-[5px]"
          >
            <div className="mx-auto h-1 w-1 rounded-full bg-white" />
            <div className="mx-auto mt-0.5 h-2 w-[3.5px] rounded-full bg-white" />
          </motion.div>

          {/* Daun pintu */}
          <motion.div
            animate={
              opening
                ? {
                    rotateY: -105,
                  }
                : {
                    rotateY: 0,
                  }
            }
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
            }}
            className="absolute h-4.5 w-3.5 rounded-[2.5px] bg-red-950 border-r border-white/30"
          >
            {/* Kenop pintu */}
            <div className="absolute right-0.5 top-1/2 h-0.75 w-0.75 -translate-y-1/2 rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,.8)]" />
          </motion.div>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={!loggedOut ? { scale: 1.01, y: -1 } : {}}
      whileTap={!loggedOut ? { scale: 0.98 } : {}}
      onClick={handleLogout}
      disabled={loggedOut}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`relative flex h-7 md:h-10 w-full items-center gap-1.5 md:gap-2.5 overflow-hidden rounded-md md:rounded-xl px-2 md:px-2.5 transition-all duration-700 cursor-pointer ${
        loggedOut
          ? "bg-zinc-400 text-white shadow-xs"
          : "bg-linear-to-r from-red-600 via-red-600 to-rose-600 text-white shadow-xs hover:from-red-700 hover:to-rose-700"
      } ${className}`}
    >
      {/* Glow saat selesai logout */}
      <AnimatePresence>
        {loggedOut && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.25, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 rounded-md md:rounded-xl bg-white"
          />
        )}
      </AnimatePresence>

      {/* ICON PINTU */}
      <div className="relative flex h-5 w-5 md:h-6.5 md:w-6.5 shrink-0 items-center justify-center">
        {/* Frame pintu */}
        <div className="absolute h-4 w-3.25 md:h-5.5 md:w-4.25 rounded-[2.5px] md:rounded-[3px] border-[1.2px] md:border-[1.5px] border-white" />

        {/* Orang */}
        <motion.div
          initial={{ x: -2.5, opacity: 0 }}
          animate={
            opening
              ? {
                  x: 8,
                  opacity: [0, 1, 1, 0],
                }
              : {
                  x: -2.5,
                  opacity: 0,
                }
          }
          transition={{
            duration: 0.8,
            delay: 0.25,
            ease: "easeInOut",
          }}
          className="absolute bottom-[3px] md:bottom-[4px] left-[3.5px] md:left-[5px]"
        >
          <div className="mx-auto h-0.75 w-0.75 md:h-1 md:w-1 rounded-full bg-white" />
          <div className="mx-auto mt-0.25 md:mt-0.5 h-1.5 w-[2.5px] md:h-2 md:w-[3.5px] rounded-full bg-white" />
        </motion.div>

        {/* Daun pintu */}
        <motion.div
          animate={
            opening
              ? {
                  rotateY: -105,
                }
              : {
                  rotateY: 0,
                }
          }
          transition={{
            duration: 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
          }}
          className="absolute h-3.75 w-3 md:h-5 md:w-3.75 rounded-[2px] md:rounded-[2.5px] bg-red-950 border-r border-white/30"
        >
          {/* Kenop pintu */}
          <div className="absolute right-0.5 top-1/2 h-0.5 w-0.5 md:h-0.75 md:w-0.75 -translate-y-1/2 rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,.8)]" />
        </motion.div>
      </div>

      {/* TEXT */}
      <div className="relative z-10 min-w-0 flex-1 text-left">
        <AnimatePresence mode="wait">
          <motion.span
            key={loggedOut ? "success" : "logout"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="block truncate text-[9.5px] md:text-xs font-bold tracking-tight"
          >
            {loggedOut ? "Anda telah keluar" : "Keluar Akun"}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.button>
  );
}