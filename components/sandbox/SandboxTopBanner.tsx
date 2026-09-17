"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { fetchTesterSessionDeduplicated } from "./SandboxSessionControl";

export default function SandboxTopBanner() {
  const pathname = usePathname();
  const mounted = typeof window !== "undefined";
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    let isSubscribed = true;

    const loadSession = async () => {
      const data = await fetchTesterSessionDeduplicated(true);
      if (isSubscribed && data) {
        setIsActive(data.sandboxAccessState === "ACTIVE" && data.isSandboxActive);
      }
    };

    void loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadSession();
    });
    const refreshFromServer = () => { void loadSession(); };
    window.addEventListener("storage", refreshFromServer);
    window.addEventListener("sandboxSessionChanged", refreshFromServer);

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      window.removeEventListener("storage", refreshFromServer);
      window.removeEventListener("sandboxSessionChanged", refreshFromServer);
    };
  }, []);

  if (!mounted || !isActive || pathname?.startsWith("/admin") || pathname?.startsWith("/user")) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[11px] sm:text-xs font-bold py-1.5 px-4 shadow-sm sticky top-0 z-9999 flex items-center justify-center gap-2 border-b border-amber-400/40 animate-in slide-in-from-top duration-200"
    >
      <FlaskConical size={13} className="animate-pulse shrink-0" />
      <span className="uppercase tracking-wider">Mode Sandbox Aktif</span>
      <span className="hidden sm:inline text-amber-100/85 font-medium text-[11px]">• Mode Simulasi Bisnis</span>
    </div>
  );
}

