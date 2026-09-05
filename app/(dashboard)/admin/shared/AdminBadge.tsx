import React from "react";

export interface AdminBadgeProps {
  status: string | null | undefined;
  label?: string;
  showDot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function getStatusTheme(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (["BERHASIL", "SUCCESS", "AKTIF", "ACTIVE"].includes(normalized)) {
    return {
      container: "border-emerald-100 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  if (["GAGAL", "FAILED", "FAIL", "REJECTED", "REJECT", "DITOLAK"].includes(normalized)) {
    return {
      container: "border-rose-100 bg-rose-50 text-rose-700",
      dot: "bg-rose-500",
    };
  }

  if (["DIPROSES", "PROCESSING", "ONPROCESS", "PROCESSED"].includes(normalized)) {
    return {
      container: "border-blue-100 bg-blue-50 text-blue-700",
      dot: "bg-blue-500",
    };
  }

  if (["PENDING", "MENUNGGU"].includes(normalized)) {
    return {
      container: "border-amber-100 bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
    };
  }

  return {
    container: "border-slate-200 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  };
}

export default function AdminBadge({
  status,
  label,
  showDot = true,
  size = "sm",
  className = "",
}: AdminBadgeProps) {
  const theme = getStatusTheme(status);
  const displayLabel = label ?? status ?? "-";

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-tight ${theme.container} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`} />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

