"use client";

import React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import SettingsNotificationCard from "./components/SettingsNotificationCard";
import SettingsProfileCard from "./components/SettingsProfileCard";
import SettingsSecurityCard from "./components/SettingsSecurityCard";
import { useSettingsData } from "./hooks/useSettingsData";
import { SettingsSection, UserProfile } from "./types";

interface SettingsViewUserProps {
  initialProfile?: UserProfile | null;
  activeSection?: SettingsSection;
  onSectionChange?: (section: SettingsSection) => void;
  isSidebarExpanded?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export default function SettingsViewUser({
  initialProfile,
  activeSection = "profile",
  onSectionChange,
  isSidebarExpanded,
  onRefresh,
}: SettingsViewUserProps) {
  void isSidebarExpanded;
  void onSectionChange;

  const currentSection = activeSection || "profile";

  // SWR Hook: Instant Initial Hydration + Silent Background Refresh
  const {
    profile,
    notifications,
    error,
    toastMessage,
    dismissToast,
    revalidate,
    saveProfile,
    updatePassword,
    saveNotificationPreference,
  } = useSettingsData({ initialProfile, onRefresh });

  return (
    <section className="w-full relative">
      {/* 1. TOAST NOTIFICATION FLOATING BANNER */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed bottom-6 right-4 sm:right-6 z-100 flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md border animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "success"
              ? "bg-slate-950/90 text-white border-emerald-500/40 ring-1 ring-emerald-400/30"
              : "bg-rose-950/90 text-white border-rose-500/40 ring-1 ring-rose-400/30"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-snug max-w-xs">
            {toastMessage.text}
          </span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Tutup notifikasi"
            className="ml-2 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. ERROR BANNER IF ANY */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={revalidate}
            className="font-bold text-rose-800 underline hover:no-underline cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 4. ACTIVE SETTINGS SECTION */}
      <main
        id={`panel-${currentSection}`}
        role="region"
        aria-label="Pengaturan Akun"
        className="w-full min-w-0"
      >
        {currentSection === "profile" && (
          <SettingsProfileCard
            profile={profile}
            onSaveProfile={saveProfile}
          />
        )}

        {currentSection === "security" && (
          <SettingsSecurityCard
            onUpdatePassword={updatePassword}
          />
        )}

        {currentSection === "notifications" && (
          <SettingsNotificationCard
            notifications={notifications}
            onTogglePreference={saveNotificationPreference}
          />
        )}
      </main>
    </section>
  );
}