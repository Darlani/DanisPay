import React from "react";

export type DaPayCheckSize = "sm" | "md" | "lg" | "responsive";

export type DaPayCheckProps = {
  className?: string;
  size?: DaPayCheckSize;
};

// Theme-aware and contrast-aware color tokens matching DaPayHot red corner system
const COLOR_CONFIG = {
  // Rich red corner ribbon matching DaPay primary alert accent & DaPayHot master reference
  gradient: ["#EF4444", "#DC2626", "#B91C1C"],
  stroke: "rgba(255, 255, 255, 0.75)",
  checkColor: "#FFFFFF",
};

export default function DaPayCheck({
  className = "",
  size = "responsive",
}: DaPayCheckProps) {
  const gradientId = "dapay-check-grad-red";

  // Proportional sizing matching DaPayHot exactly
  const dimensionClasses =
    size === "sm"
      ? "w-7 h-7"
      : size === "md"
        ? "w-9 h-9"
        : size === "lg"
          ? "w-12 h-12"
          : "w-7 h-7 min-[380px]:w-8 min-[380px]:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10";

  return (
    <div
      role="status"
      aria-label="Checked"
      className={`select-none pointer-events-none ${dimensionClasses} ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full block"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={COLOR_CONFIG.gradient[0]} />
            <stop offset="60%" stopColor={COLOR_CONFIG.gradient[1]} />
            <stop offset="100%" stopColor={COLOR_CONFIG.gradient[2]} />
          </linearGradient>
        </defs>

        {/* 1. Diagonal Corner Triangle Ribbon (Top-Left) */}
        <path d="M 0,0 L 40,0 L 0,40 Z" fill={`url(#${gradientId})`} />

        {/* 2. Crisp Separation Line Along Hypotenuse */}
        <line
          x1="40"
          y1="0"
          x2="0"
          y2="40"
          stroke={COLOR_CONFIG.stroke}
          strokeWidth="0.36"
        />

        {/* 3. Bold White Checkmark with Soft/Rounded Joints */}
        <path
          d="M 9.5,13.5 L 13.5,17.5 L 19.5,10"
          stroke={COLOR_CONFIG.checkColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
        />
      </svg>
    </div>
  );
}
