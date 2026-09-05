"use client";

import React from "react";

interface ProviderToggleProps {
  checked: boolean;
  disabled?: boolean;
  variant?: "blue" | "amber";
  size?: "sm" | "md";
  ariaLabel?: string;
  title?: string;
  onClick?: () => void;
}

export default function ProviderToggle({
  checked,
  disabled = false,
  variant = "blue",
  size = "md",
  ariaLabel,
  title,
  onClick,
}: ProviderToggleProps) {
  const isSm = size === "sm";
  const activeBg =
    variant === "amber"
      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
      : "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]";

  return (
    <div
      title={title}
      className={`inline-flex items-center justify-center ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
      onClick={disabled ? undefined : onClick}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div
        className={`relative inline-flex ${
          isSm ? "h-5 w-9" : "h-6 w-11"
        } shrink-0 items-center rounded-full border border-slate-300/80 transition-colors duration-200 ease-in-out ${
          checked ? activeBg : "bg-slate-200/90"
        }`}
      >
        <span
          className={`inline-block ${
            isSm ? "h-3.5 w-3.5" : "h-4 w-4"
          } transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
            checked
              ? isSm
                ? "translate-x-[18px]"
                : "translate-x-6"
              : isSm
              ? "translate-x-0.5"
              : "translate-x-1"
          }`}
        />
      </div>
    </div>
  );
}

