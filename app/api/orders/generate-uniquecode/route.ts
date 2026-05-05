import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    // Tambahkan paymentMethod di sini
    const { basePrice, userId, paymentMethod } = await req.json();

    // ==========================================
    // 1. CEK METODE PEMBAYARAN
    // ==========================================
    if (paymentMethod === 'Koin DaPay') {
      return NextResponse.json({ success: true, uniqueCode: 0 });
    }

    // ==========================================
    // 2. LOGIKA PENCARIAN KODE UNIK (Bank / QRIS / E-Wallet)
    // ==========================================

    // A. SENSOR KEPADATAN & CLEANUP (5 Menit)
    const { count: totalPending } = await supabaseAdmin.from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending');
    
    await supabaseAdmin.from('code_reservations').delete().lt('expired_at', new Date().toISOString());

    // B. LOGIKA RANGEMAX AWAL
    let rangeMax = 100;
    if ((totalPending || 0) > 350) rangeMax = 999;
    else if ((totalPending || 0) > 170) rangeMax = 500;
    else if ((totalPending || 0) > 70) rangeMax = 200;

    // C. TARIK DATA NOMINAL TERKUNCI (Hanya kolom total_amount)
    const [resOrders, resReservations] = await Promise.all([
      supabaseAdmin.from('orders').select('total_amount').eq('status', 'Pending'),
      supabaseAdmin.from('code_reservations').select('total_amount')
    ]);

    const lockedSet = new Set([
      ...(resOrders.data?.map(o => o.total_amount) || []),
      ...(resReservations.data?.map(r => r.total_amount) || [])
    ]);

    let uniqueCode = 0;
    let isReserved = false;

    // D. STAGE 1: RANDOM QUICK TRY (Coba 5x Keberuntungan)
    for (let attempts = 0; attempts < 5; attempts++) {
      let currentRandomRange = rangeMax;
      if (attempts > 3) currentRandomRange = 500; 

      const randomCandidate = Math.floor(Math.random() * currentRandomRange) + 1;
      const targetNominal = basePrice + randomCandidate;

      if (!lockedSet.has(targetNominal)) {
        const { error } = await supabaseAdmin.from('code_reservations')
          .insert([{ total_amount: targetNominal, expired_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }]);
        
        if (!error) {
          uniqueCode = randomCandidate;
          isReserved = true;
          break;
        }
      }
    }

    // E. STAGE 2: SEQUENTIAL GAP SEARCH (Cari lubang terkecil jika random gagal)
    if (!isReserved) {
      for (let i = 1; i <= 2000; i++) {
        const targetNominal = basePrice + i;
        if (!lockedSet.has(targetNominal)) {
          const { error } = await supabaseAdmin.from('code_reservations')
            .insert([{ total_amount: targetNominal, expired_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }]);
          
          if (!error) {
            uniqueCode = i;
            isReserved = true;
            break;
          }
        }
      }
    }

    return NextResponse.json({ success: true, uniqueCode });
  } catch (err) {
    return NextResponse.json({ success: false, uniqueCode: Math.floor(Math.random() * 999) + 1 });
  }
}