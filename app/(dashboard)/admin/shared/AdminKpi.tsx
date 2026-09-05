import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

export interface AdminKpiProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    delta: number | string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: "default" | "blue" | "amber" | "emerald" | "rose";
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function AdminKpi({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  loading = false,
  onClick,
  className = "",
}: AdminKpiProps) {
  const iconToneClasses = {
    default: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
  }[variant];

  const content = (
    <div
      className={`relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:shadow-md" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 truncate">
            {title}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-24 animate-pulse rounded-md bg-slate-200" />
            ) : (
              <p className="text-xl font-bold tracking-tight text-slate-900 tabular-nums truncate sm:text-2xl">
                {value}
              </p>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-[11px] text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
        {icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconToneClasses}`}
          >
            {icon}
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[10px] font-medium">
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              trend.isPositive
                ? "text-emerald-600"
                : trend.isPositive === false
                  ? "text-rose-600"
                  : "text-slate-500"
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp size={12} />
            ) : trend.isPositive === false ? (
              <TrendingDown size={12} />
            ) : null}
            {trend.delta}
          </span>
          {trend.label && (
            <span className="text-slate-400 truncate">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-[20px]"
      >
        {content}
      </button>
    );
  }

  return content;
}

