/**
 * PUSAT STATUS KETERSEDIAAN PRODUK
 * Digunakan untuk membuat item pudar dan tidak bisa diklik.
 */
import { PAYMENT_RULES } from './LogicPembayaran';

// Interface untuk jadwal agar TS tidak bingung
interface ItemSchedule {
  id: string;
  startHour: number;
  endHour: number;
  days: number[];
}

export const PRODUCT_STATUS = {
  // 1. Barang Rusak / Gangguan (Diberi tipe string[] agar tidak dianggap 'never')
  maintenanceItems: [
    'ml-44', 
    'gp-20'
  ] as string[],

  // 2. Barang Stok Kosong
  outOfStockItems: [
    // Masukkan ID di sini jika stok habis
  ] as string[],
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

export const isItemEnabled = (itemId: string): boolean => {
  // 1. Cek Maintenance
  if ((PRODUCT_STATUS.maintenanceItems as string[]).includes(itemId)) return false;
  
  // 2. Cek Stok Kosong
  if ((PRODUCT_STATUS.outOfStockItems as string[]).includes(itemId)) return false;

  // 3. Cek Jadwal Operasional
  const schedule = (PAYMENT_RULES.itemSchedules as ItemSchedule[]).find(
    (s) => s.id === itemId
  );
  
  if (schedule) {
    return isTimeAllowed(schedule.startHour, schedule.endHour, schedule.days);
  }

  return true;
};