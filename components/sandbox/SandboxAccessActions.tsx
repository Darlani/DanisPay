"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { fetchTesterSessionDeduplicated, type SandboxSessionData } from "@/components/sandbox/SandboxSessionControl";

export default function SandboxAccessActions() {
  const [data, setData] = useState<SandboxSessionData | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => setData(await fetchTesterSessionDeduplicated(true));
  useEffect(() => { void refresh(); }, []);

  const call = async (url: string) => {
    setPending(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(url, {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
      setMessage(body.message || (url.includes("convert") ? "Akun menjadi Member LIVE." : "Permintaan reaktivasi terkirim."));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Permintaan gagal.");
    } finally {
      setPending(false);
    }
  };

  if (!data?.authenticated || data.sandboxAccessState === null) return null;
  if (data.sandboxAccessState === "ACTIVE" && data.isTester) {
    return (
      <button type="button" disabled={pending} onClick={() => void call("/api/tester/convert")} className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-900 disabled:opacity-50">
        {pending ? "Memproses..." : "Kembali ke Member LIVE"}
        <span className="mt-1 block text-[10px] font-normal">Sandbox tetap tersimpan dan dikunci. Saldo tidak dipindahkan.</span>
        {message && <span className="mt-1 block text-[10px]">{message}</span>}
      </button>
    );
  }
  if (data.sandboxReactivationState === "PENDING") {
    return <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">Permintaan reaktivasi Sandbox sedang menunggu persetujuan.</div>;
  }
  if (data.sandboxAccessState === "LOCKED" || data.sandboxAccessState === "REVOKED") {
    return (
      <button type="button" disabled={pending} onClick={() => void call("/api/tester/reactivation-request")} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 disabled:opacity-50">
        {pending ? "Mengirim..." : "Minta Reaktivasi Sandbox"}
        <span className="mt-1 block text-[10px] font-normal">Persetujuan Admin/Manager diperlukan.</span>
        {message && <span className="mt-1 block text-[10px]">{message}</span>}
      </button>
    );
  }
  return null;
}