import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { basePrice } = await req.json();

    // 1. Logika Smart Range
    const sepuluhMenitLalu = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: trafik } = await supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Pending').gte('created_at', sepuluhMenitLalu);
    const rangeMax = (trafik || 0) > 15 ? 999 : ((trafik || 0) > 5 ? 500 : 100);

    let uniqueCode = 0;
    let isReserved = false;
    let attempts = 0;

    // 2. Loop sampai dapat nominal yang benar-benar kosong di Orders DAN Reservations
    while (!isReserved && attempts < 15) {
      uniqueCode = Math.floor(Math.random() * rangeMax) + 1;
      const targetNominal = basePrice + uniqueCode;

      // Cek di tabel Orders (yang sudah jadi pesanan)
      const { data: orderExists } = await supabaseAdmin.from('orders').select('id').eq('status', 'Pending').eq('total_amount', targetNominal).maybeSingle();

      if (!orderExists) {
        // Jika di orders kosong, coba "Booking" di tabel reservasi
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // Lock 10 menit
        const { error: reserveError } = await supabaseAdmin.from('code_reservations').insert([{ total_amount: targetNominal, expired_at: expiry }]);

        if (!reserveError) {
          isReserved = true; // Berhasil booking!
        }
      }
      attempts++;
    }

    return NextResponse.json({ success: true, uniqueCode });
  } catch (err) {
    return NextResponse.json({ success: false, uniqueCode: Math.floor(Math.random() * 100) + 1 });
  }
}