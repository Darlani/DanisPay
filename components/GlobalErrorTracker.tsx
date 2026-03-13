"use client";
import { useEffect } from "react";

export default function GlobalErrorTracker() {
  useEffect(() => {
    // Fungsi untuk mengirim error ke backend
    const logToBackend = (message: string, source: string) => {
      // Kita pakai fetch jalan di background tanpa memblokir render UI (dibawah 200ms aman)
      fetch('/api/logger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          source,
          url: window.location.href,
        }),
      }).catch(() => {}); // Abaikan kalau gagal ngirim agar tidak looping
    };

    // Tangkap error yang tidak tertangani (Unhandled Runtime Error)
    const handleWindowError = (event: ErrorEvent) => {
      logToBackend(event.message, "window_error");
    };

    // Bajak console.error bawaan browser
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMsg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
      logToBackend(errorMsg, "console_error");
      originalConsoleError.apply(console, args); // Tetap tampilkan di console lokal saat dev
    };

    window.addEventListener("error", handleWindowError);

    return () => {
      window.removeEventListener("error", handleWindowError);
      console.error = originalConsoleError;
    };
  }, []);

  return null; // Komponen ini tidak menampilkan UI apapun
}