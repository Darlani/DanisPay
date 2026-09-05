import React from "react";

export interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "solid" | "glass" | "subtle";
  noPadding?: boolean;
  header?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AdminCard({
  variant = "solid",
  noPadding = false,
  header,
  action,
  children,
  className = "",
  ...props
}: AdminCardProps) {
  const variantClasses = {
    solid:
      "bg-white border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.04)]",
    glass:
      "bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-[0_12px_32px_rgba(15,23,42,0.06)]",
    subtle:
      "bg-slate-50/60 border border-slate-200/50 shadow-none",
  }[variant];

  return (
    <div
      className={`rounded-[22px] transition-all duration-200 ${variantClasses} ${
        noPadding ? "" : "p-5 md:p-6"
      } ${className}`}
      {...props}
    >
      {(header || action) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          {header && <div className="min-w-0 flex-1">{header}</div>}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

