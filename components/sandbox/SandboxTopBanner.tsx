"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical, RotateCcw, Power, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { fetchTesterSessionDeduplicated } from "./SandboxSessionControl";

export default function SandboxTopBanner() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sandboxBalance, setSandboxBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkSession = useCallback(async (force = false) => {
    const data = await fetchTesterSessionDeduplicated(force);
    if (data) {
      setIsActive(data.sandboxAccessState === "ACTIVE" && data.isSandboxActive);
      setSandboxBalance(Number(data.sandboxBalance || 0));
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void checkSession(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void checkSession(true);
    });
    const refreshFromServer = () => { void checkSession(true); };
    window.addEventListener("storage", refreshFromServer);
    window.addEventListener("sandboxSessionChanged", refreshFromServer);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", refreshFromServer);
      window.removeEventListener("sandboxSessionChanged", refreshFromServer);
    };
  }, [checkSession]);
  const handleDeactivate = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/tester/session", { method: "DELETE", headers });
      if (res.ok) {
        setIsActive(false);
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }
    } catch {
      alert("Gagal mematikan mode sandbox");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWallet = async () => {
    if (!confirm("Reset saldo koin virtual tester ke Rp 1.000.000?")) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/tester/wallet/reset", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetAmount: 1000000 })
      });
      if (res.ok) {
        const data = await res.json();
        const newBalance = data.balance || 1000000;
        setSandboxBalance(newBalance);
        window.dispatchEvent(new Event("sandboxSessionChanged"));
        alert("Saldo koin virtual tester berhasil direset!");
      }
    } catch {
      alert("Gagal mereset saldo sandbox");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || !isActive || pathname?.startsWith("/admin")) return null;

  return (
    <div className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-semibold px-4 py-2 shadow-md sticky top-0 z-9999 flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/40 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <span className="p-1 bg-white/20 rounded-md">
          <FlaskConical size={14} className="animate-pulse" />
        </span>
        <span>
          <strong className="uppercase tracking-wider">Mode Sandbox Aktif:</strong> Transaksi diuji secara aman tanpa menyentuh vendor riil.
        </span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full font-mono text-[11px]">
          Koin Virtual: Rp {sandboxBalance.toLocaleString("id-ID")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleResetWallet}
          disabled={isLoading}
          className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition text-[11px] cursor-pointer"
          title="Reset saldo koin tester ke Rp 1.000.000"
        >
          <RotateCcw size={12} />
          Reset Saldo
        </button>

        <button
          onClick={handleDeactivate}
          disabled={isLoading}
          className="flex items-center gap-1 bg-slate-900/80 hover:bg-slate-900 text-amber-200 hover:text-white px-3 py-1 rounded-md transition text-[11px] shadow-sm cursor-pointer"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
          Kembali ke Live
        </button>
      </div>
    </div>
  );
}

