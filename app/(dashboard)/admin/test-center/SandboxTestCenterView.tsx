"use client";

import React, { useState, useCallback } from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileText,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";

interface AssertionItem {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

interface SnapshotData {
  liveBalance: number;
  liveCoin: number;
  liveLogsCount: number;
  sandboxBalance: number;
  sandboxLogsCount: number;
}

interface DeltaData {
  deltaLiveBalance: number;
  deltaLiveCoin: number;
  deltaLiveLogs: number;
  deltaSandboxBalance: number;
  deltaSandboxLogs: number;
}

interface TestCaseResult {
  id: string;
  name: string;
  category: "Payment" | "Rewards" | "Refund" | "Security" | "Worker" | "Invoice" | "Audit";
  status: "PASS" | "FAIL" | "SKIPPED";
  durationMs: number;
  beforeSnapshot?: SnapshotData;
  afterSnapshot?: SnapshotData;
  deltas?: DeltaData;
  assertions: AssertionItem[];
  evidence: Record<string, unknown>;
  error?: string;
}

interface TestDefinition {
  id: string;
  name: string;
  category: "Payment" | "Rewards" | "Refund" | "Security" | "Worker" | "Invoice" | "Audit";
  description: string;
  keyInvariant: string;
}

const TEST_DEFINITIONS: TestDefinition[] = [
  {
    id: "TC-1",
    name: "Sandbox Coin Payment Isolation",
    category: "Payment",
    description: "Memverifikasi pemotongan saldo koin sandbox pada pesanan baru tidak mengubah saldo maupun ledger LIVE.",
    keyInvariant: "Δ Live Balance = 0, Δ Live Ledger = 0, Δ Sandbox Balance = -amount",
  },
  {
    id: "TC-2",
    name: "Non-Tester Upline Protection & Rewards",
    category: "Rewards",
    description: "Memverifikasi reward pesanan sandbox: cashback masuk ke dompet sandbox, dan upline non-tester terlindungi 100%.",
    keyInvariant: "Δ Upline Live Balance = 0, ReferrerStatus = NON_TESTER_LIVE_PROTECTED",
  },
  {
    id: "TC-3",
    name: "Sandbox Coin Refund & Status Invariant",
    category: "Refund",
    description: "Menguji penolakan refund pada pesanan Berhasil dan keberhasilan refund atomik pada pesanan Gagal.",
    keyInvariant: "Refund ditolak jika bukan Gagal; Saldo sandbox bertambah jika Gagal",
  },
  {
    id: "TC-4",
    name: "LIVE Order Tamper Resistance",
    category: "Security",
    description: "Memastikan RPC sandbox menolak pesanan produksi LIVE secara mutlak dan tidak memutasi database riil.",
    keyInvariant: "Sandbox RPC menolak LIVE order dengan status NOT_FOUND",
  },
  {
    id: "TC-5",
    name: "Worker & External Vendor Barrier",
    category: "Worker",
    description: "Memverifikasi Auto-Check/Worker sandbox terselesaikan lokal dengan SN 'SIM-*' tanpa menyentuh vendor Digiflazz.",
    keyInvariant: "External Digiflazz API call = 0; Deterministic SN = SIM-*",
  },
  {
    id: "TC-6",
    name: "Invoice & Instant Pay Guard",
    category: "Invoice",
    description: "Memverifikasi perlindungan invoice sandbox: bypass QRIS eksternal dan dispatch simulasi bayar instan.",
    keyInvariant: "Invoice QRIS bypassed; Simulator dispatch status = PROCESSING",
  },
  {
    id: "TC-7",
    name: "Live Balance Ledger Zero-Bleed Audit",
    category: "Audit",
    description: "Melakukan scan komprehensif pada tabel balance_logs produksi dan memverifikasi keutuhan closed primitive.",
    keyInvariant: "Tainted balance_logs = 0; Closed primitives operative",
  },
];

const formatRupiah = (val: number) => {
  const sign = val < 0 ? "-" : val > 0 ? "+" : "";
  return `${sign}Rp ${Math.abs(val).toLocaleString("id-ID")}`;
};

export default function SandboxTestCenterView() {
  const [results, setResults] = useState<Record<string, TestCaseResult>>({});
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleEvidence = (id: string) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyEvidence = (id: string, evidence: Record<string, unknown>) => {
    navigator.clipboard.writeText(JSON.stringify(evidence, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Run a single test case
  const runSingleTest = useCallback(async (testId: string) => {
    setRunningIds((prev) => new Set(prev).add(testId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Sesi tidak valid. Silakan login kembali.");
        return;
      }

      const res = await fetch("/api/admin/test-center/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ testCaseId: testId }),
      });

      const data = (await res.json()) as { results?: TestCaseResult[]; error?: string };

      if (!res.ok) {
        alert(data.error || "Gagal menjalankan test.");
        return;
      }

      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        setResults((prev) => ({ ...prev, [item.id]: item }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error executing test";
      alert(message);
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  }, []);

  // Run all test cases sequentially or in full suite
  const runAllTests = useCallback(async () => {
    setIsRunningAll(true);
    setRunningIds(new Set(TEST_DEFINITIONS.map((d) => d.id)));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Sesi tidak valid. Silakan login kembali.");
        return;
      }

      const res = await fetch("/api/admin/test-center/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const data = (await res.json()) as { results?: TestCaseResult[]; error?: string };

      if (!res.ok) {
        alert(data.error || "Gagal menjalankan test suite.");
        return;
      }

      if (data.results) {
        const newMap: Record<string, TestCaseResult> = {};
        for (const r of data.results) {
          newMap[r.id] = r;
        }
        setResults((prev) => ({ ...prev, ...newMap }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error executing test suite";
      alert(message);
    } finally {
      setIsRunningAll(false);
      setRunningIds(new Set());
    }
  }, []);

  // Reset results
  const handleReset = () => {
    setResults({});
    setCleanupMessage(null);
  };

  // Safe cleanup of temporary test orders
  const handleCleanup = async () => {
    if (!confirm("Hapus seluruh order uji sementara (is_sandbox: true dan SKU bertanda TEST-*)? Order LIVE tidak akan pernah disentuh.")) {
      return;
    }

    setIsCleaning(true);
    setCleanupMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Sesi tidak valid.");
        return;
      }

      const res = await fetch("/api/admin/test-center/cleanup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = (await res.json()) as { message?: string; deletedCount?: number; error?: string };

      if (!res.ok) {
        alert(data.error || "Gagal melakukan pembersihan.");
        return;
      }

      setCleanupMessage(data.message || `Berhasil membersihkan ${data.deletedCount || 0} order uji.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cleanup error";
      alert(message);
    } finally {
      setIsCleaning(false);
    }
  };

  // Export report as Markdown
  const handleExportMarkdown = () => {
    const lines: string[] = [];
    lines.push("# DAPAY SANDBOX TEST CENTER — QA VALIDATION REPORT");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("## Summary");
    const total = TEST_DEFINITIONS.length;
    const passed = Object.values(results).filter((r) => r.status === "PASS").length;
    const failed = Object.values(results).filter((r) => r.status === "FAIL").length;
    const untested = total - (passed + failed);
    lines.push(`- Total Tests: ${total}`);
    lines.push(`- Passed: ${passed}`);
    lines.push(`- Failed: ${failed}`);
    lines.push(`- Untested: ${untested}`);
    lines.push(`- Integrity Verdict: ${failed === 0 && passed > 0 ? "AIRTIGHT & PRODUCTION-SAFE" : "NOT READY"}`);
    lines.push("");
    lines.push("## Detailed Test Cases");
    lines.push("");

    for (const def of TEST_DEFINITIONS) {
      const res = results[def.id];
      const status = res ? res.status : "NOT TESTED";
      lines.push(`### [${status}] ${def.id}: ${def.name}`);
      lines.push(`- **Category**: ${def.category}`);
      lines.push(`- **Description**: ${def.description}`);
      lines.push(`- **Key Invariant**: \`${def.keyInvariant}\``);
      if (res) {
        lines.push(`- **Duration**: ${res.durationMs}ms`);
        if (res.deltas) {
          lines.push(`- **Deltas**: LiveBalance=${res.deltas.deltaLiveBalance}, LiveCoin=${res.deltas.deltaLiveCoin}, LiveLogs=${res.deltas.deltaLiveLogs}, SbBalance=${res.deltas.deltaSandboxBalance}, SbLogs=${res.deltas.deltaSandboxLogs}`);
        }
        lines.push("- **Assertions**:");
        for (const a of res.assertions) {
          lines.push(`  - [${a.passed ? "PASS" : "FAIL"}] ${a.name} (Expected: ${a.expected} | Actual: ${a.actual})`);
        }
      }
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sandbox-qa-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Metrics calculation
  const totalCount = TEST_DEFINITIONS.length;
  const passedCount = Object.values(results).filter((r) => r.status === "PASS").length;
  const failedCount = Object.values(results).filter((r) => r.status === "FAIL").length;
  const untestedCount = totalCount - Object.keys(results).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <FlaskConical size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Sandbox Test Center
                </h1>
                <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  QA Console
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Verifikasi interaktif integritas sistem Sandbox, validasi zero-bleed ledger produksi, dan kepatuhan invariant status transaksi.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isRunningAll}
              onClick={runAllTests}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isRunningAll ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              <span>Jalankan Seluruh Uji</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={15} />
              <span>Export Report</span>
            </button>

            <button
              type="button"
              disabled={isCleaning}
              onClick={handleCleanup}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              title="Hapus order dummy uji bertanda TEST-*"
            >
              {isCleaning ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              <span>Bersihkan Fixture</span>
            </button>
          </div>
        </div>

        {cleanupMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
            {cleanupMessage}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Tests</span>
            <FileText size={16} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalCount}</p>
          <span className="text-xs text-slate-400">7 Skenario Independen</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-medium uppercase tracking-wider">Passed</span>
            <CheckCircle2 size={16} />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{passedCount}</p>
          <span className="text-xs text-emerald-600">Terverifikasi Invariant</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-medium uppercase tracking-wider">Failed</span>
            <XCircle size={16} />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">{failedCount}</p>
          <span className="text-xs text-rose-600">Anomali Terdeteksi</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Integritas Sistem</span>
            <ShieldCheck size={16} className={passedCount === totalCount ? "text-emerald-500" : "text-amber-500"} />
          </div>
          <p className={`mt-2 text-base font-bold ${passedCount === totalCount ? "text-emerald-700" : failedCount > 0 ? "text-rose-700" : "text-slate-700"}`}>
            {passedCount === totalCount
              ? "100% AIRTIGHT"
              : failedCount > 0
                ? "FAILURES DETECTED"
                : `${untestedCount} UNTESTED`}
          </p>
          <span className="text-xs text-slate-400">
            {passedCount === totalCount ? "Steril & Siap Operasional" : "Jalankan verifikasi"}
          </span>
        </div>
      </div>

      {/* Test Cases Checklist */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Interactive Test Checklist</h2>

        <div className="space-y-3">
          {TEST_DEFINITIONS.map((def) => {
            const res = results[def.id];
            const isRunning = runningIds.has(def.id);
            const isExpanded = expandedEvidence.has(def.id);

            return (
              <div
                key={def.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
              >
                {/* Header Row */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    {/* Status Badge */}
                    <div className="shrink-0 pt-0.5">
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          <Loader2 size={13} className="animate-spin" />
                          RUNNING
                        </span>
                      ) : !res ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          <Clock size={13} />
                          NOT TESTED
                        </span>
                      ) : res.status === "PASS" ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 size={13} />
                          PASS
                        </span>
                      ) : res.status === "SKIPPED" ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                          <AlertTriangle size={13} />
                          SKIPPED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                          <XCircle size={13} />
                          FAIL
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">{def.id}</span>
                        <h3 className="text-sm font-bold text-slate-900">{def.name}</h3>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          {def.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{def.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-amber-700">
                        Invariant: {def.keyInvariant}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Timings */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {res && (
                      <span className="text-xs font-mono text-slate-400">
                        {res.durationMs}ms
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => runSingleTest(def.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {isRunning ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Play size={13} />
                      )}
                      <span>Run</span>
                    </button>
                  </div>
                </div>

                {/* Extended Details Panel */}
                {res && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    {/* Delta Grid */}
                    {res.deltas && (
                      <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Financial State Deltas (Before vs After)
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
                            <span className="text-[10px] text-slate-500">Δ Live Balance</span>
                            <p className={`font-mono text-xs font-bold ${res.deltas.deltaLiveBalance === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {formatRupiah(res.deltas.deltaLiveBalance)}
                            </p>
                          </div>
                          <div className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
                            <span className="text-[10px] text-slate-500">Δ Live Ledger</span>
                            <p className={`font-mono text-xs font-bold ${res.deltas.deltaLiveLogs === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {res.deltas.deltaLiveLogs >= 0 ? `+${res.deltas.deltaLiveLogs}` : res.deltas.deltaLiveLogs} baris
                            </p>
                          </div>
                          <div className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
                            <span className="text-[10px] text-slate-500">Δ Sandbox Balance</span>
                            <p className="font-mono text-xs font-bold text-amber-600">
                              {formatRupiah(res.deltas.deltaSandboxBalance)}
                            </p>
                          </div>
                          <div className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
                            <span className="text-[10px] text-slate-500">Δ Sandbox Ledger</span>
                            <p className="font-mono text-xs font-bold text-amber-600">
                              {res.deltas.deltaSandboxLogs >= 0 ? `+${res.deltas.deltaSandboxLogs}` : res.deltas.deltaSandboxLogs} baris
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assertions List */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Assertions ({res.assertions.filter((a) => a.passed).length}/{res.assertions.length} Passed)
                      </p>
                      {res.assertions.map((a, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {a.passed ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <XCircle size={14} className="text-rose-600" />
                            )}
                            <span className={a.passed ? "text-slate-800" : "font-semibold text-rose-700"}>
                              {a.name}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {a.actual}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Evidence Toggle */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleEvidence(def.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>{isExpanded ? "Tutup Evidence Payload" : "Lihat Structured Evidence"}</span>
                      </button>

                      {isExpanded && (
                        <div className="relative mt-2 rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                          <button
                            type="button"
                            onClick={() => handleCopyEvidence(def.id, res.evidence)}
                            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
                          >
                            {copiedId === def.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedId === def.id ? "Copied" : "Copy"}</span>
                          </button>
                          <pre className="max-h-60 overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(res.evidence, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

