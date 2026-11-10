"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { fetchTesterSessionDeduplicated, getCachedSandboxSession } from "./SandboxSessionControl";
import { useI18n } from "@/lib/i18n/context";
import { stripLocaleFromPathname } from "@/lib/i18n/config";

export default function SandboxTopBanner() {
  const pathname = usePathname();
  const { t } = useI18n();
  const mounted = typeof window !== "undefined";
  const initialCached = getCachedSandboxSession();
  const [isActive, setIsActive] = useState<boolean>(
    Boolean(initialCached?.sandboxAccessState === "ACTIVE" && initialCached?.isSandboxActive)
  );

  useEffect(() => {
    let isSubscribed = true;

    const syncFromData = (data: ReturnType<typeof getCachedSandboxSession>) => {
      if (isSubscribed && data) {
        setIsActive(data.sandboxAccessState === "ACTIVE" && data.isSandboxActive);
      } else if (isSubscribed) {
        setIsActive(false);
      }
    };

    const loadSession = async () => {
      const data = await fetchTesterSessionDeduplicated(false);
      syncFromData(data);
    };

    // Ambil data awal secara dedup & non-blocking (menghormati cache 60 detik)
    void loadSession();

    // Filter ketat: Hanya bereaksi pada event storage khusus sandbox
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dapay_tester_realtime_event" && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          syncFromData(payload);
        } catch {
          // ignore
        }
      }
    };

    // Sinkronisasi antar-tab instan via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("dapay_tester_sync");
        bc.onmessage = (event) => {
          if (event.data) {
            syncFromData(event.data);
          }
        };
      } catch {
        // ignore
      }
    }

    const handleSessionChanged = () => {
      void loadSession();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sandboxSessionChanged", handleSessionChanged);

    return () => {
      isSubscribed = false;
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sandboxSessionChanged", handleSessionChanged);
    };
  }, []);

  const normPath = stripLocaleFromPathname(pathname || "");
  if (!mounted || !isActive || normPath.startsWith("/admin") || normPath.startsWith("/user")) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[11px] sm:text-xs font-bold py-1.5 px-4 shadow-sm sticky top-0 z-9999 flex items-center justify-center gap-2 border-b border-amber-400/40 animate-in slide-in-from-top duration-200"
    >
      <FlaskConical size={13} className="animate-pulse shrink-0" />
      <span className="uppercase tracking-wider">{t("sandbox.topBanner.active")}</span>
      <span className="hidden sm:inline text-amber-100/85 font-medium text-[11px]">• {t("sandbox.topBanner.simulation")}</span>
    </div>
  );
}

