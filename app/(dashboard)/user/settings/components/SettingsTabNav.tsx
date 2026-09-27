"use client";

import React from "react";
import { Bell, ChevronRight, KeyRound, User } from "lucide-react";
import { SETTINGS_TABS, SettingsSection } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface SettingsTabNavProps {
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
}

export default function SettingsTabNav({
  activeSection,
  onSelectSection,
}: SettingsTabNavProps) {
  const { t } = useI18n();

  const getTabLabel = (id: SettingsSection) => {
    switch (id) {
      case "profile":
        return t("dashboard.settings.tabProfileLabel");
      case "security":
        return t("dashboard.settings.tabSecurityLabel");
      case "notifications":
        return t("dashboard.settings.tabNotificationsLabel");
      default:
        return "";
    }
  };

  const getTabDesc = (id: SettingsSection) => {
    switch (id) {
      case "profile":
        return t("dashboard.settings.tabProfileDesc");
      case "security":
        return t("dashboard.settings.tabSecurityDesc");
      case "notifications":
        return t("dashboard.settings.tabNotificationsDesc");
      default:
        return "";
    }
  };

  const getIcon = (iconName: string, active: boolean) => {
    const size = 16;
    switch (iconName) {
      case "user":
        return <User size={size} className={active ? "text-blue-600" : "text-slate-500"} />;
      case "shield":
        return <KeyRound size={size} className={active ? "text-indigo-600" : "text-slate-500"} />;
      case "bell":
        return <Bell size={size} className={active ? "text-amber-600" : "text-slate-500"} />;
      default:
        return <User size={size} />;
    }
  };

  return (
    <>
      {/* 1. MOBILE & TABLET HORIZONTAL TABS (< 1024px) */}
      <div className="block lg:hidden mb-4 overflow-x-auto custom-scrollbar">
        <div
          role="tablist"
          aria-label={t("dashboard.settings.tablistAria")}
          className="flex items-center gap-1.5 p-1 rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md min-w-max"
        >
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => onSelectSection(tab.id)}
                className={`flex items-center gap-1.5 xs:gap-2 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-2xs border border-blue-200/80"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                {getIcon(tab.iconName, isActive)}
                <span>{getTabLabel(tab.id)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DESKTOP VERTICAL ASIDE NAV (>= 1024px) */}
      <aside className="hidden lg:block">
        <div
          role="tablist"
          aria-label={t("dashboard.settings.asideNavAria")}
          className="rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 p-2 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 space-y-1 sticky top-4"
        >
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => onSelectSection(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-blue-50/90 text-blue-900 shadow-2xs border border-blue-200/80 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    isActive ? "bg-white shadow-xs" : "bg-slate-100"
                  }`}
                >
                  {getIcon(tab.iconName, isActive)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight truncate">
                    {getTabLabel(tab.id)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 leading-tight truncate">
                    {getTabDesc(tab.id)}
                  </p>
                </div>

                {isActive && <ChevronRight size={14} className="shrink-0 text-blue-500" />}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}

