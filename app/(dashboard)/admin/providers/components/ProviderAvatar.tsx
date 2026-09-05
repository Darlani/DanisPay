"use client";

import React, { useState } from "react";
import { BrandMeta } from "../types";

interface ProviderAvatarProps {
  code: string;
  meta: BrandMeta;
  size?: "sm" | "md" | "lg";
}

const PROVIDER_LOGOS: Record<string, string> = {
  APIGAMES: "/Providers/apigames.png",
  DIGIFLAZZ: "/Providers/digiflazz.png",
  UNIPLAY: "/Providers/uniplay.png",
  VIP_RESELLER: "/Providers/vip_reseller.png",
};

export default function ProviderAvatar({
  code,
  meta,
  size = "md",
}: ProviderAvatarProps) {
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const isFailed = failedCode === code;

  const sizeBoxClasses =
    size === "lg"
      ? "h-11 w-11 rounded-2xl p-1.5"
      : size === "sm"
      ? "h-8 w-8 rounded-xl p-1"
      : "h-9 w-9 rounded-2xl p-1";

  const sizeFallbackClasses =
    size === "lg"
      ? "h-11 w-11 text-base rounded-2xl"
      : size === "sm"
      ? "h-8 w-8 text-xs rounded-xl"
      : "h-9 w-9 text-sm rounded-2xl";

  const cleanCode = code ? code.toUpperCase().replace(/-/g, "_") : "";
  const logoPath =
    PROVIDER_LOGOS[cleanCode] ||
    `/Providers/${code ? code.toLowerCase() : ""}.png`;

  if (!isFailed && logoPath) {
    return (
      <div
        className={`relative flex ${sizeBoxClasses} shrink-0 items-center justify-center overflow-hidden border border-slate-200/80 bg-white shadow-2xs`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoPath}
          alt={code}
          className="h-full w-full object-contain"
          onError={() => setFailedCode(code)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${sizeFallbackClasses} shrink-0 items-center justify-center bg-linear-to-br ${meta.gradient} font-bold shadow-2xs`}
    >
      {meta.initial}
    </div>
  );
}

