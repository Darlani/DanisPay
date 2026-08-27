"use client";

import { useState } from "react";

export default function QRISAnalyzerPage() {
  const [
    staticQRIS,
    setStaticQRIS,
  ] = useState("");

  const [
    dynamicQRIS,
    setDynamicQRIS,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function analyzeQRIS() {
    setError("");
    setResult("");

    if (!staticQRIS.trim()) {
      setError(
        "QRIS Static belum diisi."
      );
      return;
    }

    if (!dynamicQRIS.trim()) {
      setError(
        "QRIS Dynamic belum diisi."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/qris/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              staticQRIS,
              dynamicQRIS,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `HTTP ${response.status}`
        );
      }

      setResult(
        JSON.stringify(
          data,
          null,
          2
        )
      );
    } catch (err) {
      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );
      } else {
        setError(
          "Terjadi kesalahan."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setStaticQRIS("");
    setDynamicQRIS("");
    setResult("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            QRIS Analyzer
          </h1>

          <p className="mt-2 text-slate-400">
            DaPay - Static vs Dynamic
            QRIS Analyzer
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 font-bold">
              QRIS STATIC
            </h2>

            <textarea
              value={staticQRIS}
              onChange={(event) =>
                setStaticQRIS(
                  event.target.value
                )
              }
              placeholder="Paste QRIS Static..."
              spellCheck={false}
              className="h-64 w-full rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <h2 className="mb-2 font-bold">
              QRIS DYNAMIC
            </h2>

            <textarea
              value={dynamicQRIS}
              onChange={(event) =>
                setDynamicQRIS(
                  event.target.value
                )
              }
              placeholder="Paste QRIS Dynamic..."
              spellCheck={false}
              className="h-64 w-full rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="my-6 flex gap-3">
          <button
            type="button"
            onClick={
              analyzeQRIS
            }
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-500 disabled:opacity-50"
          >
            {loading
              ? "Menganalisis..."
              : "Analisis QRIS"}
          </button>

          <button
            type="button"
            onClick={
              clearForm
            }
            className="rounded-xl border border-slate-700 px-6 py-3 font-bold hover:bg-slate-900"
          >
            Bersihkan
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
            <strong>
              Error:
            </strong>{" "}
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Hasil Analyzer
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    result
                  )
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Copy JSON
              </button>
            </div>

            <pre className="max-h-175 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black p-4 font-mono text-xs text-green-300">
              {result}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}