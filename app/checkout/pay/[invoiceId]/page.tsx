"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import {
  Clock,
  Copy,
  CheckCircle,
  Landmark,
  AlertTriangle,
  Loader2,
  Check,
  XCircle,
  Download,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { QRCodeSVG } from 'qrcode.react';
import ReceiptPascabayar from "./ReceiptPascabayar";
import ReceiptPrabayar from "./ReceiptPrabayar"; 

// Komponen Branding DaPay
const DaPayText = () => (
  <span className="font-black italic ml-1">
    <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span>
  </span>
);

function InvoiceContent() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;

  const [trx, setTrx] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState("Pending");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [qrisString, setQrisString] = useState<string>("");
  const [isTimeCalculated, setIsTimeCalculated] = useState(false);

  // --- 1. DATA FETCHING & REALTIME ---
  useEffect(() => {
    if (!invoiceId) return;

  const fetchTransaction = async () => {
      try {
        // Hanya ambil kolom yang nampil di UI & Receipt
      const { data: orderData } = await supabase
        .from("orders")
        .select("order_id, status, payment_method, created_at, total_amount, sku, category, user_id, sn, qris_string, game_id, item_label, user_contact, customer_name, desc, used_balance, stand_meter, segment_power, raw_tagihan, unique_code, product_name, price")
        .eq("order_id", invoiceId)
        .maybeSingle();

        // Ambil info akun pembayaran secara spesifik
        const { data: accounts } = await supabase
          .from("payment_accounts")
          .select("name, account_no, account_name, logo_url, is_qr, method_key");
        
        if (accounts) setPaymentAccounts(accounts);

        const serverTimeRes = await fetch('/api/system/time');
        if (!serverTimeRes.ok) throw new Error("Gagal ambil jam server");
        
        const { serverNow } = await serverTimeRes.json();
        const nowTs = new Date(serverNow).getTime();

        if (orderData) {
          setTrx(orderData);
          setDbStatus(orderData.status);

          // PANGGIL API QRIS JIKA METODE PEMBAYARAN ADALAH QRIS
          if (orderData.payment_method?.toLowerCase().includes('qris')) {
             try {
                 const qrisRes = await fetch('/api/orders/qris', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ orderId: orderData.order_id })
                 });
                 if (qrisRes.ok) {
                     const qrisData = await qrisRes.json();
                     if(qrisData.success) {
                        setQrisString(qrisData.qrisString);
                     }
                 } else {
                     const errData = await qrisRes.json();
                     console.error("Gagal get QRIS:", errData.error);
                 }
             } catch (qrisErr) {
                 console.error("Gagal fetch API QRIS:", qrisErr);
             }
          }

          if (orderData.status === "Pending") {
            const createdAt = new Date(orderData.created_at).getTime();
            const expiredTime = createdAt + 2 * 60 * 60 * 1000;
            const secondsLeft = Math.floor((expiredTime - nowTs) / 1000);

            setTimeLeft(secondsLeft > 0 ? secondsLeft : 0);
            setIsTimeCalculated(true);
          } else {
            setIsTimeCalculated(true); 
          }
        }
      } catch (err) {
        console.error("Kesalahan Sinkronisasi:", err);
      }
    };

fetchTransaction();

    // --- SATPAM POLLING (Backup Realtime) [cite: 2026-03-06] ---
    const polling = setInterval(async () => {
      if (dbStatus === "Pending" || dbStatus === "Diproses") {
        const { data } = await supabase
          .from("orders")
          .select("status, sn")
          .eq("order_id", invoiceId)
          .maybeSingle();
        
        if (data && data.status !== dbStatus) {
          setDbStatus(data.status);
          setTrx((prev: any) => ({ ...prev, status: data.status, sn: data.sn }));
        }
      } else {
        clearInterval(polling);
      }
    }, 5000); // Cek setiap 5 detik [cite: 2026-03-08]

    const channel = supabase
      .channel(`status-${invoiceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${invoiceId}`,
        },
        (payload) => {
          setDbStatus(payload.new.status);
          setTrx(payload.new);
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(polling); // Bersihkan satpam [cite: 2026-03-06]
    };
  }, [invoiceId]);

  // --- 2. TIMER LOGIC ---
  useEffect(() => {
    if (dbStatus !== "Pending") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dbStatus]);

  useEffect(() => {
    if (trx && timeLeft === 0 && dbStatus === "Pending" && isTimeCalculated) {
      setDbStatus("Gagal"); 
    }
  }, [timeLeft, dbStatus, trx, isTimeCalculated]);

  // --- 3. NOTIFIKASI SUARA (SINGLE TRIGGER) ---
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (dbStatus === "Berhasil" && !soundPlayed.current) {
      const audio = new Audio('/sound/ting.mp3');
      const timer = setTimeout(() => {
        audio.play()
          .then(() => { soundPlayed.current = true; })
          .catch((err) => { console.log("Browser blokir suara:", err); });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [dbStatus]);

  // --- 4. HELPERS ---
  const isPending = dbStatus === "Pending";
  const isGagal = dbStatus === "Gagal";
  const isProcessing = dbStatus === "Diproses"; // Status transisi nunggu Digiflazz

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIdentityLabel = (category: string) => {
    const cat = category?.toLowerCase();
    if (cat === 'travel') return "No Tiket";
    if (['ppob', 'pulsa', 'data', 'e-money'].includes(cat)) return "No Telepon";
    if (cat === 'pln' || cat === 'listrik') return "ID Pelanggan";
    return "ID Pengguna";
  };

  const formatTimeLeft = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const getPaymentDetails = (method: string) => {
    const p = method?.toLowerCase() || "";
    const account = paymentAccounts.find(acc => p.includes(acc.method_key.toLowerCase()));

    if (account) {
      return { 
        name: account.name, 
        no: account.account_no, 
        an: account.account_name, 
        logo: account.logo_url || "/payment/default.png",
        isQR: account.is_qr 
      };
    }
    return { name: method || "Transfer", no: "-", an: "-", logo: "/payment/default.png", isQR: false }; 
  };

  if (!trx) return (
    <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 bg-slate-50 uppercase italic tracking-widest">
      <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
      Memuat Invoice...
    </div>
  );

  const nominalString = trx.total_amount.toString();
  const uniqueCode = nominalString.slice(-3);
  const mainNominal = new Intl.NumberFormat("id-ID").format(Math.floor(trx.total_amount / 1000));
  const payDetail = getPaymentDetails(trx.payment_method);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 font-sans tracking-tight">
      <div className="bg-white w-full max-w-md mx-auto rounded-4xl shadow-xl p-6 sm:p-8 space-y-5 text-center relative overflow-hidden border border-slate-100">
        
        {isPending ? (
          <>
            {trx.total_amount <= 0 ? (
              <div className="space-y-5 py-4 animate-in zoom-in duration-500">
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto shadow-inner ring-4 ring-blue-50">
                    <Loader2 size={32} className="text-blue-600 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-blue-600 flex items-center justify-center gap-1">
                      Memproses <DaPayText />
                    </h2>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">Tunggu Sebentar...</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="text-blue-600 animate-pulse" size={20} />
                    <h1 className="text-lg font-bold text-slate-900">Menunggu Pembayaran</h1>
                  </div>
                  <p className="text-xs font-medium text-slate-400">ID: {trx.order_id}</p>
                </div>

                {!isTimeCalculated ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <p className="text-xs text-slate-500 font-medium animate-pulse">Menyiapkan pembayaran...</p>
                  </div>
                ) : (
                  <>
                    <div className={`${timeLeft > 0 ? 'bg-blue-50 border-blue-100' : 'bg-rose-50 border-rose-100'} rounded-2xl p-3 border transition-colors`}>
                      <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${timeLeft > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {timeLeft > 0 ? "Selesaikan dalam" : "Batas Waktu Habis"}
                      </p>
                      <p className={`text-2xl font-extrabold ${timeLeft > 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                        {timeLeft > 0 ? formatTimeLeft(timeLeft) : "EXPIRED"}
                      </p>
                    </div>

                    {timeLeft > 0 ? (
                      <div className="space-y-5 animate-in fade-in duration-500">
                        {payDetail.isQR ? (
                          <div className="space-y-3 animate-in zoom-in duration-500">
                            <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-blue-200 flex flex-col items-center shadow-sm relative">
                              <div id="qris-export-area" className="bg-white p-2 rounded-xl">
                                {qrisString ? (
                                  <QRCodeSVG 
                          value={qrisString} 
                          size={200} 
                          level="H" // Ubah ke High biar logo nggak ganggu scan
                          includeMargin={true} 
                          className="rounded-xl"
                        />
                                ) : (
                                  <div className="w-50 h-50 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                                     <Loader2 className="animate-spin text-slate-300" size={32} />
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest text-center">
                                Scan & Bayar Rp {mainNominal}.{uniqueCode}
                              </p>
                              {qrisString && (
                                <button 
                                  onClick={() => {
                                    const svg = document.querySelector('#qris-export-area svg') as SVGElement;
                                    if (svg) {
                                      const svgData = new XMLSerializer().serializeToString(svg);
                                      const canvas = document.createElement("canvas");
                                      const ctx = canvas.getContext("2d");
                                      const img = new Image();
                                      img.onload = () => {
                                        canvas.width = img.width;
                                        canvas.height = img.height;
                                        ctx?.drawImage(img, 0, 0);
                                        const pngFile = canvas.toDataURL("image/png");
                                        const downloadLink = document.createElement("a");
                                        downloadLink.download = `QRIS-${trx.order_id}.png`;
                                        downloadLink.href = pngFile;
                                        downloadLink.click();
                                      };
                                      img.src = "data:image/svg+xml;base64," + btoa(svgData);
                                    }
                                  }}
                                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all shadow-md"
                                >
                                  <Download size={14} /> Unduh QRIS
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Transfer</p>
                            <div className="flex items-center justify-center gap-2">
                              <h2 className="text-3xl font-bold text-slate-900 tracking-tighter">
                                Rp {mainNominal}.<span className="text-blue-600">{uniqueCode}</span>
                              </h2>
                              <button onClick={() => copyToClipboard(nominalString, "nominal")} className="bg-slate-100 p-2 rounded-xl active:scale-95 transition-all">
                                {copiedId === "nominal" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                        )}

                        {payDetail.isQR ? (
                          <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-2xl text-left border border-blue-100">
                            <div className="bg-blue-600 text-white p-1 rounded-lg shrink-0 mt-0.5"><Check size={14} /></div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-blue-900 uppercase leading-none">Tutorial QRIS</p>
                              <ol className="text-[10px] font-medium text-blue-800 list-decimal ml-3 leading-relaxed">
                                <li>Klik tombol <b>Unduh QRIS</b> di atas.</li>
                                <li>Buka aplikasi (GoPay, DANA, OVO, m-Banking).</li>
                                <li>Pilih menu <b>Scan</b> lalu klik ikon Galeri.</li>
                                <li>Pilih gambar QRIS (Hasil unduhan).</li>
                                <li>Jangan tutup halaman ini.</li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 bg-orange-50 p-3 rounded-xl text-left border border-orange-100">
                            <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-orange-700 leading-tight">
                              <strong>PENTING:</strong> Transfer nominal hingga <span className="underline">3 digit terakhir</span> agar otomatis valid.
                            </p>
                          </div>
                        )}

                        {!payDetail.isQR && (
                          <div className="bg-blue-50 rounded-2xl p-4 space-y-3 text-left border border-blue-100">
                            <div className="flex items-center gap-2 text-blue-800"><Landmark size={18} /><h3 className="text-sm font-bold">Tujuan Transfer</h3></div>
                            <div className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm border border-blue-50">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-8 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                  <img src={payDetail.logo} alt={payDetail.name} className="max-w-full max-h-full object-contain" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase">{payDetail.name}</p>
                                  <p className="text-lg font-bold text-slate-900 tracking-wider leading-none mt-0.5">{payDetail.no}</p>
                                  <p className="text-[9px] font-medium text-slate-500 uppercase mt-1">A/N {payDetail.an}</p>
                                </div>
                              </div>
                              <button onClick={() => copyToClipboard(payDetail.no, "rekening")} className="bg-slate-100 p-2.5 rounded-xl active:scale-95 transition-all">
                                {copiedId === "rekening" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-500" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 space-y-4 animate-in zoom-in text-center">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600"><AlertTriangle size={32} /></div>
                        <h3 className="text-lg font-bold text-slate-800">Kadaluarsa</h3>
                        <Link href="/" className="block w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase shadow-lg">Buat Pesanan Baru</Link>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : isProcessing ? (
          <div className="space-y-6 py-8 animate-in zoom-in duration-500 text-center w-full">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              <div className="relative w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center shadow-inner border-4 border-blue-100">
                <Loader2 size={36} className="text-blue-600 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Pembayaran Diterima!</h2>
              <p className="text-[11px] text-slate-500 font-medium px-4 leading-relaxed">
                Uang Bos sudah masuk dengan aman. <br/>
                Sistem sedang <span className="font-bold text-blue-600">memproses pesanan</span> ke server...
              </p>
            </div>
            <div className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded-xl inline-block mt-2 animate-pulse">
              Mohon Tunggu Sebentar
            </div>
          </div>
        ) : isGagal ? (
          <div className="space-y-5 py-6 animate-in zoom-in text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto shadow-inner"><XCircle size={32} className="text-rose-600" /></div>
        <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-rose-600">Transaksi Gagal</h2>
              <p className="text-[11px] text-slate-500 font-medium px-6">
                {trx.user_id 
                  ? "Saldo koin Bos sudah dikembalikan otomatis." 
                  : "Uang Bos aman. Silakan klik tombol di bawah untuk refund manual ke Admin."}
              </p>
            </div>
            {!trx.user_id && (
              <a 
                href={`https://wa.me/6285545213952?text=Halo Admin, pesanan saya ${trx.order_id} GAGAL. Mohon bantu refund manual.`}
                className="block w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold text-[11px] uppercase shadow-lg shadow-emerald-200"
              >
                Hubungi Admin (Refund)
              </a>
            )}
            <Link href="/" className="block w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase shadow-lg">Ke Beranda</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in zoom-in duration-500 w-full">
            {/* 1. ICON & HEADER SUKSES */}
            <div className="space-y-2 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-50">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase italic">Pembayaran Sukses!</h2>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Transaksi Berhasil Diproses</p>
              </div>
            </div>

            {/* 2. KOMPONEN STRUK DIGITAL */}
            <div className="w-full">
               {trx.category?.toLowerCase().includes('pascabayar') || trx.sku?.toLowerCase() === 'pln' ? (
                 <ReceiptPascabayar order={trx} />
               ) : (
                 <ReceiptPrabayar order={trx} />
               )}
            </div>

            {/* 3. TOMBOL AKSI BAWAH */}
            <div className="pt-2 border-t border-slate-100 space-y-2 w-full max-w-md mx-auto">
               <Link 
                 href="/" 
                 className="block w-full py-3 bg-slate-900 text-white rounded-xl font-black italic text-[11px] uppercase transition-all shadow-md hover:bg-blue-600 text-center tracking-widest active:scale-95"
               >
                 BELANJA LAGI DI DANISPAY
               </Link>
               <p className="text-[8px] text-slate-400 font-bold text-center uppercase tracking-widest italic">
                 Bukti otomatis tersimpan di riwayat
               </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500 italic uppercase">Loading...</div>}>
      <InvoiceContent />
    </Suspense>
  );
}