"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  isCollapsed?: boolean;
  className?: string;
  showLabel?: boolean;
};

export default function ThemeToggle({
  isCollapsed = false,
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return savedTheme === "dark" || (!savedTheme && prefersDark);
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", nextDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", nextDark);
    }
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
        aria-label="Toggle tema"
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
          isDark
            ? "bg-slate-800 text-amber-300 hover:bg-slate-700"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        } ${className}`}
      >
        <motion.div
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {isDark ? <Moon size={17} /> : <Sun size={17} />}
        </motion.div>
      </button>
    );
  }

  const togglePill = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle mode tema"
      className={`relative h-5 w-10 md:h-6 md:w-12 shrink-0 overflow-hidden rounded-full transition-all duration-500 shadow-inner cursor-pointer ${
        isDark
          ? "bg-linear-to-b from-slate-900 to-slate-700"
          : "bg-linear-to-b from-sky-400 to-sky-200"
      }`}
    >
      {/* Background Stars */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, scale: 0 }}
            animate={
              isDark
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0 }
            }
            transition={{ delay: index * 0.05 }}
            className="absolute h-0.5 w-0.5 rounded-full bg-white"
            style={{
              top: `${2.5 + index * 2.5}px`,
              left: `${5 + index * 5}px`,
            }}
          />
        ))}
      </div>

      {/* Cloud */}
      <motion.div
        animate={{
          opacity: isDark ? 0 : 1,
          y: isDark ? 8 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0.5 left-0.75 h-0.75 w-3 rounded-full bg-white/90"
      >
        <div className="absolute -top-0.5 left-0.5 h-0.75 w-0.75 rounded-full bg-white" />
        <div className="absolute -top-0.5 left-1.25 h-1 w-1 rounded-full bg-white" />
      </motion.div>

      {/* Thumb */}
      <motion.div
        animate={{ x: isDark ? 20 : 0 }}
        transition={{
          type: "spring",
          stiffness: 240,
          damping: 20,
        }}
        className="absolute left-0.5 top-0.5 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-white shadow-xs"
      >
        {/* Sun */}
        <motion.div
          animate={{
            rotate: isDark ? 180 : 0,
            opacity: isDark ? 0 : 1,
            scale: isDark ? 0.4 : 1,
          }}
          className="absolute flex items-center justify-center"
        >
          <Sun className="h-2.5 w-2.5 md:h-3 md:w-3 text-amber-400" />
        </motion.div>

        {/* Moon */}
        <motion.div
          animate={{
            rotate: isDark ? 0 : -180,
            opacity: isDark ? 1 : 0,
            scale: isDark ? 1 : 0.4,
          }}
          className="absolute flex items-center justify-center"
        >
          <Moon className="h-2.5 w-2.5 md:h-3 md:w-3 text-slate-700" />
        </motion.div>
      </motion.div>
    </button>
  );

  if (showLabel) {
    return (
      <div
        className={`flex h-7 md:h-10 items-center justify-between rounded-md md:rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 md:px-2.5 transition-colors ${className}`}
      >
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <div className="flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-xs md:rounded-md bg-white border border-slate-200/70 text-slate-600 shadow-2xs">
            {isDark ? (
              <Moon size={11} className="text-indigo-500 md:h-3 md:w-3" />
            ) : (
              <Sun size={11} className="text-amber-500 md:h-3 md:w-3" />
            )}
          </div>
          <span className="truncate text-[9.5px] md:text-xs font-bold text-slate-700">
            {isDark ? "Mode Gelap" : "Mode Terang"}
          </span>
        </div>

        {togglePill}
      </div>
    );
  }

  return togglePill;
}