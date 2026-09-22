/**
 * PUSAT PENGATURAN TOKO (GLOBAL CONFIG)
 * Lokasi: utils/storeConfig.ts
 */
export const STORE_CONFIG = {
  name: "DaPay",
  tagline: "Proses Cepat & Terverifikasi Aman",
  description: "Platform Ekosistem Pembayaran & Produk Digital Terintegrasi di Indonesia",
  logo: "/images/DaPay.svg",
  adminNumber: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "6285545213952",
  isMaintenanceMode: false,
  currency: "IDR",

  commissionPerTransaction: 300, 
  
  paymentAccounts: {
    'DANA': { name: 'DaPay Store', number: '085545213952' },
    'GOPAY': { name: 'DaPay Store', number: '085545213952' },
    'BCA VA': { name: 'DaPay Store', number: '1234567890' },
  },

  socials: {
    instagram: "https://instagram.com/dapay.official",
    telegram: "https://t.me/dapay_official",
    tiktok: "https://tiktok.com/@dapay.official",
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

/**
 * Helper canonical untuk URL WhatsApp Customer Service
 */
export const getWhatsAppUrl = (customText?: string) => {
  const number = STORE_CONFIG.adminNumber;
  const text = customText ? encodeURIComponent(customText) : encodeURIComponent("Halo CS DaPay, saya butuh bantuan");
  return `https://wa.me/${number}?text=${text}`;
};