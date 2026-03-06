/**
 * PUSAT PENGATURAN LOGIKA TRANSAKSI
 * Fokus: Metode Pembayaran, Jadwal Bank, dan Batas Harga.
 */
export const PAYMENT_RULES = {
  // Metode VA, Gerai (Alfamart/Indomaret), dan ATM akan pudar jika harga di bawah nilai ini.
  minPriceForLargeMethods: 1000, 

  // --- 1. JADWAL OPERASIONAL PRODUK (NOMINAL) ---
  itemSchedules: [
    {
      id: 'ml-5', 
      startHour: 8, 
      endHour: 22, 
      days: [1, 2, 3, 4, 5, 6, 7]
    }
  ],

  // --- 2. JADWAL OPERASIONAL METODE PEMBAYARAN ---
  paymentSchedules: [
    {
      name: 'BCA VA',
      startHour: 1, 
      endHour: 23, 
    }
  ],

  // --- 3. STATUS MAINTENANCE GLOBAL METODE BAYAR ---
  maintenanceStatus: {
    'DANA': false,
    'GOPAY': false,
    'QRIS': false,
    'OVO': false,
    'SHOPEEPAY': false,
    'LINKAJA': false,
    'ISAKU': false,
    'SAKUKU': false,
    'BCA VA': false,
    'BNI VA': false,
    'BRI VA': false,
    'MANDIRI VA': false,
    'ALFAMART': false,
    'INDOMARET': false,
    'ATM BERSAMA': false, 
  }
};

const isTimeAllowed = (startH?: number, endH?: number, allowedDays?: number[]): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();

  if (allowedDays && !allowedDays.includes(currentDay)) return false;
  if (startH !== undefined && endH !== undefined) {
    return currentHour >= startH && currentHour < endH;
  }
  return true;
};

export const isPaymentAllowed = (
  paymentName: string, 
  productName: string, 
  price: number,
  dbPaymentData?: any
): boolean => {
  
  // 1. PRIORITAS UTAMA: Data Dinamis Database
  if (dbPaymentData) {
    // Jika di set maintenance di admin dashboard, langsung matikan
    if (dbPaymentData.is_maintenance) return false;

    // Cek Jam Operasional dari Database
    if (dbPaymentData.start_hour !== null && dbPaymentData.end_hour !== null) {
      if (!isTimeAllowed(dbPaymentData.start_hour, dbPaymentData.end_hour)) return false;
    }

    // Cek Minimal Harga dari Database
    if (dbPaymentData.min_price && price < dbPaymentData.min_price) return false;
  }

  // 2. FALLBACK: Logika Statis (Jika data DB tidak ditemukan/error)
  const normalizedName = paymentName.toUpperCase();
  if (PAYMENT_RULES.maintenanceStatus[normalizedName as keyof typeof PAYMENT_RULES.maintenanceStatus]) return false;

  const paySchedule = PAYMENT_RULES.paymentSchedules.find(s => s.name === normalizedName);
  if (paySchedule && !isTimeAllowed(paySchedule.startHour, paySchedule.endHour)) return false;

  const isRestricted = normalizedName.includes('VA') || normalizedName.includes('ALFAMART') || normalizedName.includes('INDOMARET') || normalizedName === 'ATM BERSAMA';
  if (isRestricted && price < PAYMENT_RULES.minPriceForLargeMethods) return false;

  return true; 
};