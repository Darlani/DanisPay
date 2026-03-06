// utils/priceMarkup.ts (Update agar ambil dari DB)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const calculateSellingPrice = async (modal: number) => {
  const { data } = await supabase.from('store_settings').select('company_profit').single();
  const margin = data?.company_profit || 1500;

  // Harga Jual Dasar
  const baseSellingPrice = modal + margin;

  // Tambahkan Nomor Unik (Acak 1-999)
  // Ini nanti disimpan di tabel orders agar Microdroid bisa cek
  const uniqueCode = Math.floor(Math.random() * 999) + 1;

  return {
    total: baseSellingPrice + uniqueCode,
    uniqueCode: uniqueCode
  };
};