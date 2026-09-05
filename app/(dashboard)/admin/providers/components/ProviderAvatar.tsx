"use client";

import React, { useState } from "react";
import { BrandMeta } from "../types";

interface ProviderAvatarProps {
  code: string;
  meta: BrandMeta;
  size?: "sm" | "md" | "lg";
}

export default function ProviderAvatar({
  code,
  meta,
  size = "md",
}: ProviderAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClasses =
    size === "lg"
      ? "h-11 w-11 text-base rounded-2xl"
      : size === "sm"
      ? "h-8 w-8 text-xs rounded-xl"
      : "h-9 w-9 text-sm rounded-2xl";
  const logoPath = `/images/providers/${code.toLowerCase()}.png`;

  if (!imgFailed) {
    return (
      <div
        className={`relative flex ${sizeClasses} shrink-0 items-center justify-center overflow-hidden border border-slate-200/80 bg-white shadow-2xs`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoPath}
          alt={code}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${sizeClasses} shrink-0 items-center justify-center bg-gradient-to-br ${meta.gradient} font-bold shadow-2xs`}
    >
      {meta.initial}
    </div>
  );
}

