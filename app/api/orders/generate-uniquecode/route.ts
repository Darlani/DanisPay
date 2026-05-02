import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { basePrice } = await req.json();

    // 1. SENSOR KEPADATAN TOTAL (Berdasarkan tumpukan Pending 2 Jam)
    const { count: totalPending } = await supabaseAdmin.from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending');
    
    // Bersihkan booking sementara yang sudah basi
    await supabaseAdmin.from('code_reservations').delete().lt('expired_at', new Date().toISOString());

    // 2. LOGIKA RANGEMAX "SUPER HEMAT" (Range 200 sudah masuk!)
    let rangeMax = 100;
    if ((totalPending || 0) > 350) {
      rangeMax = 999;
    } else if ((totalPending || 0) > 170) {
      rangeMax = 500;
    } else if ((totalPending || 0) > 70) {
      rangeMax = 200; // Level hemat tambahan Bos
    }

    let uniqueCode = 0;
    let isReserved = false;
    let attempts = 0;

    // 3. PROSES PENCARIAN RUNTUT
    while (!isReserved && attempts < 20) {
      // Jika sudah beberapa kali gagal, sistem naik level secara bertahap
      let currentSearchRange = rangeMax;
      if (attempts > 15) {
        currentSearchRange = 2000; 
      } else if (attempts > 10) {
        currentSearchRange = 999;
      } else if (attempts > 5) {
        currentSearchRange = 500;
      }

      uniqueCode = Math.floor(Math.random() * currentSearchRange) + 1;
      const targetNominal = basePrice + uniqueCode;

      // Cek di Orders (Lock 2 Jam)
      const { data: orderExists } = await supabaseAdmin.from('orders')
        .select('id')
        .eq('status', 'Pending')
        .eq('total_amount', targetNominal)
        .maybeSingle();

      if (!orderExists) {
        // Cek di Reservations (Lock 5 Menit) - Manfaatkan UNIQUE constraint
        const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const { error: reserveError } = await supabaseAdmin.from('code_reservations')
          .insert([{ total_amount: targetNominal, expired_at: expiry }]);

        if (!reserveError) {
          isReserved = true; 
        }
      }
      
      attempts++;
    }

    return NextResponse.json({ success: true, uniqueCode });
  } catch (err) {
    // Fallback cerdas agar tidak macet
    return NextResponse.json({ success: false, uniqueCode: Math.floor(Math.random() * 999) + 1 });
  }
}