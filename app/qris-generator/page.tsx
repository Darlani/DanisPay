"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type GeneratorResult = {
  success: boolean;

  provider?: string;

  generator?: {
    version?: string;
    type?: string;
    basedOn?: string;
  };

  output?: {
    qr?: string;
    amount?: number;
    crc?: string;
    crcValid?: boolean;
    length?: number;
  };

  error?: string;
};

export default function QRISGeneratorPage() {
  const [
    staticQR,
    setStaticQR,
  ] = useState(
    "00020101021126570011ID.DANA.WWW011893600915300088750202090008875020303UMI51440014ID.CO.QRIS.WWW0215ID10264862223380303UMI5204594553033605802ID5905DaPay6011Kab. Batang61055126163048F12"
  );

  const [
    amount,
    setAmount,
  ] = useState("1000");

  const [
    result,
    setResult,
  ] =
    useState<GeneratorResult | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function generateQR() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/qris/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              provider: "dana_dynamic",
              staticQR,
              amount:
                Number(amount),
            }),
          }
        );

      const data =
        (await response.json()) as GeneratorResult;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Gagal membuat QRIS dynamic."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }

  function copyQR() {
    const qr =
      result?.output?.qr;

    if (!qr) {
      alert(
        "Tidak ada QRIS untuk disalin."
      );
      return;
    }

    navigator.clipboard
      .writeText(qr)
      .then(() => {
        alert(
          "QRIS berhasil disalin."
        );
      })
      .catch(() => {
        alert(
          "Gagal menyalin QRIS."
        );
      });
  }

  function formatRupiah(
    value?: number
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      return "-";
    }

    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }
    ).format(value);
  }

  const generatedQR =
    result?.output?.qr || "";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            QRIS Dynamic Generator
          </h1>

          <p className="mt-2 text-gray-600">
            Generator QRIS Dynamic
            DANA untuk riset DaPay.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* INPUT */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              QRIS Static DANA
            </h2>

            <textarea
              value={staticQR}
              onChange={(e) =>
                setStaticQR(
                  e.target.value
                )
              }
              placeholder="Tempel QRIS static di sini..."
              spellCheck={false}
              className="h-48 w-full rounded-lg border p-3 font-mono text-sm outline-none focus:ring-2"
            />

            <label className="mt-5 block text-sm font-medium text-gray-700">
              Nominal
            </label>

            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-lg border p-3 text-lg outline-none focus:ring-2"
            />

            <button
              type="button"
              onClick={
                generateQR
              }
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading
                ? "Membuat QR..."
                : "Generate Dynamic QRIS"}
            </button>

            {error && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>

          {/* RESULT */}
          <section className="rounded-xl bg-white p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Hasil
              </h2>

              {generatedQR && (
                <button
                  type="button"
                  onClick={
                    copyQR
                  }
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Copy QRIS
                </button>
              )}
            </div>

            {!result &&
              !loading && (
                <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
                  Hasil generator
                  akan muncul di
                  sini.
                </div>
              )}

            {loading && (
              <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
                Membuat QRIS...
              </div>
            )}

            {result &&
              generatedQR && (
                <div>
                  {/* QR CODE */}
                  <div className="flex justify-center">
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                      <QRCodeSVG
                        value={
                          generatedQR
                        }
                        size={280}
                        level="M"
                        includeMargin={
                          true
                        }
                      />
                    </div>
                  </div>

                  {/* NOMINAL */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                      Nominal pembayaran
                    </p>

                    <p className="text-3xl font-bold text-gray-900">
                      {formatRupiah(
                        result
                          .output
                          ?.amount
                      )}
                    </p>
                  </div>

                  {/* STATUS */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">
                        CRC
                      </p>

                      <p className="mt-1 font-mono font-semibold">
                        {result
                          .output
                          ?.crc ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">
                        Panjang QR
                      </p>

                      <p className="mt-1 font-semibold">
                        {result
                          .output
                          ?.length ||
                          "-"}
                      </p>
                    </div>
                  </div>

                  {/* CRC */}
                  <div
                    className={`mt-3 rounded-lg p-4 text-center text-sm font-medium ${
                      result.output
                        ?.crcValid
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {result.output
                      ?.crcValid
                      ? "✓ CRC Valid"
                      : "✕ CRC Tidak Valid"}
                  </div>

                  {/* QR STRING */}
                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        QRIS String
                      </h3>

                      <button
                        type="button"
                        onClick={
                          copyQR
                        }
                        className="text-sm font-medium underline"
                      >
                        Copy
                      </button>
                    </div>

                    <textarea
                      readOnly
                      value={
                        generatedQR
                      }
                      className="h-32 w-full resize-none rounded-lg bg-gray-900 p-3 font-mono text-xs text-white"
                    />
                  </div>

                  {/* RAW RESPONSE */}
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-gray-600">
                      Lihat response
                      lengkap
                    </summary>

                    <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-white">
                      {JSON.stringify(
                        result,
                        null,
                        2
                      )}
                    </pre>
                  </details>
                </div>
              )}
          </section>
        </div>

        {/* WARNING */}
        <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-5">
          <h3 className="font-semibold text-yellow-900">
            ⚠️ Mode Pengujian
          </h3>

          <p className="mt-2 text-sm text-yellow-800">
            QRIS ini masih dalam
            tahap pengujian. Jangan
            gunakan untuk transaksi
            bernilai besar.
          </p>
        </div>
      </div>
    </main>
  );
}