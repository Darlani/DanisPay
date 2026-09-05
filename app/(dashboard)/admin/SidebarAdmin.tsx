"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import {
  Calendar,
  ChevronLeft,
  FileText,
  LogOut,
  Menu,
} from "lucide-react";

import {
  ADMIN_NAV_GROUPS,
  getAdminTabHref,
} from "./config/navigation";
import SandboxSessionControl from "@/components/sandbox/SandboxSessionControl";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  activeMenu: string;
  setActiveMenu: (val: string) => void;
}

export default function SidebarAdmin({
  isOpen,
  setIsOpen,
  activeMenu,
  setActiveMenu,
}: SidebarProps) {
  void setActiveMenu;
  const [todayMemo, setTodayMemo] = useState(
    "Tidak ada event khusus hari ini.",
  );
  const [hasUrgentEvent, setHasUrgentEvent] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    const fetchTodayEvent = async () => {
      const today = new Date().toLocaleDateString("en-CA");

      const { data } = await supabase
        .from("admin_events")
        .select("title, impact_level")
        .eq("event_date", today)
        .maybeSingle();

      if (!isMounted) return;

      if (data) {
        setTodayMemo(data.title);
        setHasUrgentEvent(data.impact_level === "High");
      } else {
        setTodayMemo("Tidak ada event khusus hari ini!");
        setHasUrgentEvent(false);
      }
    };

    void fetchTodayEvent();

    const channel = supabase
      .channel("realtime-sidebar")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_events",
        },
        () => {
          void fetchTodayEvent();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // SIDEBAR INFORMATION ARCHITECTURE
  // ---------------------------------------------------------------------------

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <>
      {/* --------------------------------------------------------------------- */}
      {/* MOBILE OVERLAY                                                       */}
      {/* --------------------------------------------------------------------- */}

      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm md:hidden"
          style={{ zIndex: 60 }}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SIDEBAR                                                               */}
      {/* --------------------------------------------------------------------- */}

      <aside
        className={`fixed h-screen bg-[#0B0E14] border-r border-white/5 flex flex-col shadow-2xl transition-transform duration-300 md:transition-all ${
          isOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full md:translate-x-0 md:w-20"
        }`}
        style={{ zIndex: 70 }}
      >
        {/* ----------------------------------------------------------------- */}
        {/* HEADER                                                            */}
        {/* ----------------------------------------------------------------- */}

        <div className="flex items-center justify-between border-b border-white/5 px-5 py-5">
          {isOpen && (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-[-0.04em] text-white">
                DANISH<span className="text-blue-500">ADMIN</span>
              </h1>

              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">
                DaPay Admin System
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Collapse sidebar" : "Open sidebar"}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* NAVIGATION                                                        */}
        {/* ----------------------------------------------------------------- */}

        <nav
          className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4"
          aria-label="Admin navigation"
        >
          {ADMIN_NAV_GROUPS.map((group) => (
            <section
              key={group.label}
              className="mb-5 last:mb-0"
              aria-labelledby={`sidebar-group-${group.label}`}
            >
              {isOpen && (
                <p
                  id={`sidebar-group-${group.label}`}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  {group.label}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activeMenu === item.id;
                  const Icon = item.icon;
                  const targetHref = getAdminTabHref(item.id);

                  return (
                    <Link
                      key={item.id}
                      href={targetHref}
                      scroll={false}
                      aria-current={isActive ? "page" : undefined}
                      title={!isOpen ? item.label : undefined}
                      onClick={() => {
                        if (typeof window !== "undefined" && window.innerWidth < 768) {
                          setIsOpen(false);
                        }
                      }}
                      className={`group flex w-full items-center rounded-xl p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset ${
                        isOpen ? "gap-3.5" : "justify-center"
                      } ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.9}
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-slate-200"
                        }`}
                      />

                      {isOpen && (
                        <span className="truncate text-sm font-semibold tracking-tight">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        {/* ----------------------------------------------------------------- */}
        {/* BOTTOM UTILITY                                                    */}
        {/* ----------------------------------------------------------------- */}

        {isOpen && (
          <div className="space-y-3 px-5 py-4">
            {/* TODAY */}
            <div className="rounded-xl border border-white/5 bg-white/4 p-3">
              <div className="mb-2 flex items-center gap-2 text-blue-400">
                <Calendar size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-widest">
                  Today
                </span>
              </div>

              <p className="text-xs font-semibold leading-5 text-white">
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "full",
                }).format(new Date())}
              </p>
            </div>
            {/* SANDBOX TESTER WIDGET */}
            <SandboxSessionControl variant="sidebar" />

            {/* MEMO */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                hasUrgentEvent
                  ? "border-rose-500/20 bg-rose-500/10"
                  : "border-amber-500/20 bg-amber-500/10"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div
                  className={`flex items-center gap-2 ${
                    hasUrgentEvent ? "text-rose-500" : "text-amber-500"
                  }`}
                >
                  <FileText size={14} />

                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    Memo
                  </span>
                </div>

                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasUrgentEvent ? "bg-rose-500" : "bg-amber-500"
                  }`}
                />
              </div>

              <p
                className={`text-[11px] font-medium leading-5 ${
                  hasUrgentEvent ? "text-rose-200" : "text-slate-400"
                }`}
              >
                &quot;{todayMemo}&quot;
              </p>
            </div>
          </div>
        )}

        {!isOpen && (
          <div className="flex justify-center p-2">
            <SandboxSessionControl variant="navbar" />
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* LOGOUT                                                            */}
        {/* ----------------------------------------------------------------- */}

        <div className="border-t border-white/5 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-rose-500 transition-all hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              !isOpen ? "justify-center" : ""
            }`}
            title={!isOpen ? "Logout" : undefined}
          >
            <LogOut size={20} strokeWidth={1.9} />

            {isOpen && (
              <span className="text-sm font-semibold">
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}