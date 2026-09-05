import React from "react";

export interface AdminSkeletonProps {
  variant?: "dashboard" | "card" | "table" | "kpi";
  count?: number;
  className?: string;
}

export default function AdminSkeleton({
  variant = "dashboard",
  count = 1,
  className = "",
}: AdminSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div
        className={`space-y-5 animate-pulse ${className}`}
        aria-label="Memuat Dashboard"
      >
        <div className="h-28 rounded-3xl bg-slate-200/70" />
        <div className="h-20 rounded-[20px] bg-slate-200/70" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-36 rounded-[20px] bg-slate-200/70" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="h-80 rounded-[22px] bg-slate-200/70 lg:col-span-8" />
          <div className="h-80 rounded-[22px] bg-slate-200/70 lg:col-span-4" />
        </div>
        <div className="h-80 rounded-[22px] bg-slate-200/70" />
      </div>
    );
  }

  if (variant === "kpi") {
    return (
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="h-36 rounded-[20px] bg-slate-200/70 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={`space-y-3 rounded-2xl bg-white p-5 border border-slate-200/70 ${className}`}>
        <div className="h-8 w-48 rounded-lg bg-slate-200/70 animate-pulse" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: count || 5 }, (_, index) => (
            <div
              key={index}
              className="h-12 w-full rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-48 rounded-[22px] bg-slate-200/70 animate-pulse ${className}`}
    />
  );
}

