"use client";

import React from "react";

interface ProviderHealthBadgeProps {
  status: string;
}

export default function ProviderHealthBadge({ status }: ProviderHealthBadgeProps) {
  if (status === "HEALTHY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-emerald-700 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        HEALTHY
      </span>
    );
  }
  if (status === "DOWN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-rose-700 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        DOWN
      </span>
    );
  }
  if (status === "DEGRADED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-amber-700 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        DEGRADED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-slate-600 shadow-2xs">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      UNKNOWN
    </span>
  );
}

