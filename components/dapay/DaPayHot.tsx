import React from "react";

export type DaPayHotVariant = "red" | "gold" | "blue" | "dark";
export type DaPayHotSize = "sm" | "md" | "lg" | "responsive";

export type DaPayHotProps = {
  className?: string;
  size?: DaPayHotSize;
  label?: string;
  variant?: DaPayHotVariant;
};

// Theme-aware and contrast-aware color tokens
const VARIANT_CONFIG: Record<
  DaPayHotVariant,
  {
    gradient: [string, string, string];
    stroke: string;
    textColor: string;
  }
> = {
  red: {
    // Rich red corner ribbon matching DaPay primary alert accent & Garena reference
    gradient: ["#EF4444", "#DC2626", "#B91C1C"],
    stroke: "rgba(255, 255, 255, 0.75)",
    // White text on red has 4.8:1 contrast, exceeding WCAG AA requirements
    textColor: "text-white dark:text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]",
  },
  gold: {
    // Warm gold/amber accent for special promo badges
    gradient: ["#FBBF24", "#F59E0B", "#D97706"],
    stroke: "rgba(255, 255, 255, 0.6)",
    // Dark text on gold provides optimal >9:1 contrast
    textColor: "text-slate-950 dark:text-slate-950 font-black",
  },
  blue: {
    // DaPay tech fintech blue accent
    gradient: ["#60A5FA", "#3B82F6", "#1D4ED8"],
    stroke: "rgba(255, 255, 255, 0.75)",
    textColor: "text-white dark:text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]",
  },
  dark: {
    // Subdued neutral stealth dark accent
    gradient: ["#475569", "#334155", "#0F172A"],
    stroke: "rgba(255, 255, 255, 0.35)",
    textColor: "text-white dark:text-slate-100",
  },
};

export default function DaPayHot({
  className = "",
  size = "responsive",
  label = "HOT",
  variant = "red",
}: DaPayHotProps) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.red;
  const gradientId = `dapay-hot-grad-${variant}`;

  // Responsive dimensions: scaled to fit snugly in app-icons and larger cards
  const dimensionClasses =
    size === "sm"
      ? "w-7 h-7"
      : size === "md"
        ? "w-9 h-9"
        : size === "lg"
          ? "w-12 h-12"
          : "w-7 h-7 min-[380px]:w-8 min-[380px]:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10";

  // If parent container passes legacy badge offset (top-1/left-1), snap back to exact card corner
  const cornerAlignment =
    className.includes("top-1") && className.includes("left-1")
      ? "-translate-x-1 -translate-y-1"
      : "";

  return (
    <div
      role="status"
      aria-label={label}
      className={`relative select-none pointer-events-none ${dimensionClasses} ${cornerAlignment} ${className}`}
    >
      {/* Corner wrapper with top-left curvature matching card squircles (16px mobile, 22px desktop, zero outer seam) */}
      <div className="w-full h-full rounded-tl-2xl md:rounded-tl-[22px] overflow-hidden">
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full block"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={config.gradient[0]} />
              <stop offset="60%" stopColor={config.gradient[1]} />
              <stop offset="100%" stopColor={config.gradient[2]} />
            </linearGradient>
          </defs>

          {/* 1. Diagonal Corner Triangle Ribbon */}
          <path d="M 0,0 L 40,0 L 0,40 Z" fill={`url(#${gradientId})`} />

          {/* 2. Crisp Separation Line Along Hypotenuse */}
          <line
            x1="40"
            y1="0"
            x2="0"
            y2="40"
            stroke={config.stroke}
            strokeWidth="1.2"
          />

          {/* 3. Theme-Aware / Contrast-Aware Rotated HOT Text (Modern Love Bold specification) */}
          <text
            x="13.5"
            y="13.5"
            transform="rotate(-45 13.5 13.5)"
            textAnchor="middle"
            dominantBaseline="central"
            fill="currentColor"
            style={{
              fontFamily:
                '"Modern Love Bold", "Modern Love", var(--font-poppins), var(--font-comfortaa), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 800,
            }}
            className={`${config.textColor} font-black tracking-wider leading-none select-none`}
            fontSize="9"
          >
            {label}
          </text>
        </svg>
      </div>
    </div>
  );
}
