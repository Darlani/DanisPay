/**
 * PUSAT PENGATURAN TOKO (GLOBAL CONFIG)
 * Lokasi: utils/storeConfig.ts
 */
export const STORE_CONFIG = {
  name: "Danish Top Up",
  tagline: "Proses Instan & Terverifikasi Aman",
  description: "Platform Top Up Game Tercepat dan Terpercaya di Indonesia",
  logo: "/logo.png",
  adminNumber: "6281391171712",
  isMaintenanceMode: false,
  currency: "IDR",

  commissionPerTransaction: 300, 
  
  paymentAccounts: {
    'DANA': { name: 'Danish Store', number: '081391171712' },
    'GOPAY': { name: 'Danish Store', number: '081391171712' },
    'BCA VA': { name: 'Danish Store', number: '1234567890' },
  },

  socials: {
    instagram: "https://instagram.com/danishtopup",
    tiktok: "https://tiktok.com/@danishtopup",
  },

  metadata: {
    keywords: "top up game, danish top up, mlbb, free fire, murah",
    author: "Danish Dev Team",
  },

  // --- LOGIKA PENERJEMAH MIDTRANS (Tambahkan di sini) ---
  getPaymentInstruction: (method: string, paymentData: any) => {
    // 1. Jika ada QR Code (QRIS / ShopeePay / Gopay)
    if (paymentData.qr) {
      return {
        label: "Scan QR Code untuk Bayar",
        value: "QRIS / E-Wallet",
        subText: "Silakan simpan/scan kode QR di bawah",
        qr: paymentData.qr,
        copy: null
      };
    }

    // 2. Jika Mandiri Bill (Mandiri memiliki 2 kode)
    if (paymentData.bill_key && paymentData.biller_code) {
      return {
        label: "Kode Biller - Bill Key",
        value: `${paymentData.biller_code} - ${paymentData.bill_key}`,
        subText: "Bayar melalui Mandiri Bill Payment",
        copy: `${paymentData.biller_code}${paymentData.bill_key}`,
        qr: null
      };
    }

    // 3. Jika Virtual Account (BCA, BNI, BRI, dll)
    if (paymentData.va) {
      return {
        label: `Nomor Virtual Account ${method}`,
        value: paymentData.va,
        subText: "Dicek Otomatis oleh Sistem",
        copy: paymentData.va,
        qr: null
      };
    }

    // 4. Jika Gerai Retail (Alfamart / Indomaret)
    if (paymentData.payment_code) {
      return {
        label: "Kode Pembayaran Retail",
        value: paymentData.payment_code,
        subText: `Tunjukkan kode ini ke kasir ${method}`,
        copy: paymentData.payment_code,
        qr: null
      };
    }

    // 5. Default: Jika data Midtrans kosong, gunakan data manual dari paymentAccounts
    const manualAccount = (STORE_CONFIG.paymentAccounts as any)[method];
    return {
      label: "Nomor Akun/Rekening",
      value: manualAccount?.number || "Data Tidak Ada",
      subText: `a.n ${manualAccount?.name || STORE_CONFIG.name}`,
      copy: manualAccount?.number || "",
      qr: null
    };
  }
};