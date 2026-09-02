"use client";

import React from "react";
import { Eye } from "lucide-react";
import { Referral, formatDate, getInitial, maskEmail } from "../types";

interface AffiliateDesktopTableProps {
  referrals: Referral[];
  onSelectReferral: (referral: Referral) => void;
  isSidebarExpanded?: boolean;
}

export default function AffiliateDesktopTable({
  referrals,
  onSelectReferral,
  isSidebarExpanded = false,
}: AffiliateDesktopTableProps) {
  // TABLET EXPANDED SIDEBAR (256px): 3-COLUMN COMPACT TABLE
  if (isSidebarExpanded) {
    return (
      <div className="overflow-hidden rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 pl-3.5 pr-2 whitespace-nowrap">
                  Member & Email
                </th>
                <th className="px-2.5 py-3.5 whitespace-nowrap">
                  Bergabung
                </th>
                <th className="py-3.5 pl-2 pr-3.5 text-center whitespace-nowrap">
                  Status & Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 text-slate-700">
              {referrals.map((referral, idx) => {
                const name = referral.full_name || "Member Baru";
                const initial = getInitial(name);
                const masked = maskEmail(referral.email);

                return (
                  <tr
                    key={referral.id || `${referral.email}-${idx}`}
                    className="group transition-colors duration-150 hover:bg-amber-50/30"
                  >
                    {/* 1. MEMBER & EMAIL */}
                    <td className="py-3 pl-3.5 pr-2 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-xs font-black text-white shadow-2xs">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-36">
                            {name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {masked}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 2. BERGABUNG */}
                    <td className="px-2.5 py-3 text-slate-500 font-medium whitespace-nowrap align-middle">
                      {formatDate(referral.created_at)}
                    </td>

                    {/* 3. STATUS & AKSI */}
                    <td className="py-3 pl-2 pr-3.5 text-center align-middle">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Terdaftar
                        </span>

                        <button
                          type="button"
                          onClick={() => onSelectReferral(referral)}
                          title="Lihat Detail Member"
                          aria-label="Lihat Detail Member"
                          className="inline-flex h-6.5 items-center justify-center gap-1 rounded-md border border-slate-200/90 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Eye size={11} />
                          <span>Detail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // STANDARD TABLE: TABLET NAVIGATION RAIL (76px) & DESKTOP ≥1024px
  return (
    <div className="overflow-hidden rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              {/* 1. MEMBER */}
              <th className="py-3.5 pl-3.5 pr-2 sm:pl-4 lg:pr-3 whitespace-nowrap">
                Member
              </th>

              {/* 2. EMAIL (DESKTOP ONLY ≥1024px OR TABLET RAIL) */}
              <th className="px-2.5 sm:px-3 py-3.5 whitespace-nowrap">
                Email
              </th>

              {/* 3. TANGGAL BERGABUNG */}
              <th className="px-2.5 sm:px-3 py-3.5 whitespace-nowrap">
                Bergabung
              </th>

              {/* 4. STATUS */}
              <th className="px-2.5 sm:px-3 py-3.5 text-center whitespace-nowrap">
                Status
              </th>

              {/* 5. AKSI (DESKTOP ONLY ≥1024px) */}
              <th className="hidden lg:table-cell py-3.5 pl-3 pr-4 text-center sm:pr-5 whitespace-nowrap">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100/90 text-slate-700">
            {referrals.map((referral, idx) => {
              const name = referral.full_name || "Member Baru";
              const initial = getInitial(name);
              const masked = maskEmail(referral.email);

              return (
                <tr
                  key={referral.id || `${referral.email}-${idx}`}
                  className="group transition-colors duration-150 hover:bg-amber-50/30"
                >
                  {/* 1. MEMBER & AVATAR */}
                  <td className="py-3 pl-3.5 pr-2 sm:pl-4 lg:pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-xs font-black text-white shadow-2xs">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate max-w-36 sm:max-w-44 lg:max-w-56">
                          {name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Member DaPay
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* 2. EMAIL (MASKED) */}
                  <td className="px-2.5 sm:px-3 py-3 font-mono text-slate-600 font-medium whitespace-nowrap align-middle">
                    {masked}
                  </td>

                  {/* 3. TANGGAL BERGABUNG */}
                  <td className="px-2.5 sm:px-3 py-3 text-slate-500 font-medium whitespace-nowrap align-middle">
                    {formatDate(referral.created_at)}
                  </td>

                  {/* 4. STATUS & TABLET ACTION */}
                  <td className="px-2.5 sm:px-3 py-3 text-center align-middle">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9.5px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Terdaftar
                      </span>

                      {/* Detail button on Tablet (<1024px) */}
                      <button
                        type="button"
                        onClick={() => onSelectReferral(referral)}
                        title="Lihat Detail Member"
                        aria-label="Lihat Detail Member"
                        className="inline-flex lg:hidden h-6 items-center justify-center rounded-md border border-slate-200/90 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                      >
                        Detail
                      </button>
                    </div>
                  </td>

                  {/* 5. AKSI (DESKTOP ONLY ≥1024px) */}
                  <td className="hidden lg:table-cell py-3 pl-3 pr-4 text-center sm:pr-5 align-middle">
                    <button
                      type="button"
                      onClick={() => onSelectReferral(referral)}
                      title="Lihat Detail Member"
                      aria-label="Lihat Detail Member"
                      className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 text-[11px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Eye size={12} />
                      <span>Detail</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

