import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { basePrice } = await req.json();

    // 1. SENSOR TOTAL KEPADATAN (Bukan cuma 5 menit)
    // Cek semua pesanan yang sedang 'Pending' (kunci 2 jam)
    const { count: totalPending } = await supabaseAdmin.from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending');
    
    // Bersihkan sampah reservasi yang sudah lewat 5 menit
    await supabaseAdmin.from('code_reservations').delete().lt('expired_at', new Date().toISOString());

    // 2. LOGIKA RANGEMAX DINAMIS (Sesuai tumpukan di gudang angka)
    let rangeMax = 100;
    if ((totalPending || 0) > 300) {
      rangeMax = 999;
    } else if ((totalPending || 0) > 70) {
      rangeMax = 500;
    }

    let uniqueCode = 0;
    let isReserved = false;
    let attempts = 0;

    // 3. PROSES PENCARIAN & LOCKING
    while (!isReserved && attempts < 20) {
      uniqueCode = Math.floor(Math.random() * rangeMax) + 1;
      const targetNominal = basePrice + uniqueCode;

      // Cek bentrokan di Orders (Permanent Lock 2 Jam)
      const { data: orderExists } = await supabaseAdmin.from('orders')
        .select('id')
        .eq('status', 'Pending')
        .eq('total_amount', targetNominal)
        .maybeSingle();

      if (!orderExists) {
        // Cek bentrokan di Reservations (Temporary Lock 5 Menit)
        const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        
        // INSERT di sini akan gagal otomatis jika total_amount sudah ada (Syarat: UNIQUE aktif)
        const { error: reserveError } = await supabaseAdmin.from('code_reservations')
          .insert([{ total_amount: targetNominal, expired_at: expiry }]);

        if (!reserveError) {
          isReserved = true; 
        }
      }

      // Jika susah dapet angka, perlebar pencarian secara otomatis
      if (attempts > 10) {
        rangeMax = (totalPending || 0) > 1000 ? 5000 : 2000;
      }
      
      attempts++;
    }

    return NextResponse.json({ success: true, uniqueCode });
  } catch (err) {
    return NextResponse.json({ success: false, uniqueCode: Math.floor(Math.random() * 999) + 1 });
  }
}