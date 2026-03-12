import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function GET(req: Request) {
  // 1. SATPAM API
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const authHeader = req.headers.get('Authorization');
  const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

  const isAuthorized = authHeader === `Bearer ${WEBHOOK_SECRET}` || querySecret === WEBHOOK_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Akses Ditolak! Kunci rahasia salah." }, { status: 401 });
  }

  // 2. LOGIKA CLEANUP: Pesanan lebih dari 2 jam = Hangus
  const duaJamLalu = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  console.log(`🧹 [CLEANUP] Memulai pembersihan pesanan Pending sebelum: ${duaJamLalu}`);

  try {
    // A. TARIK SEMUA PESANAN EXPIRED (Termasuk data profil untuk cek saldo)
    const { data: expiredOrders, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, user_id, used_balance, profiles(balance, email)')
      .eq('status', 'Pending')
      .lt('created_at', duaJamLalu);

    if (fetchErr) throw fetchErr;

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log(`✅ [CLEANUP SUKSES]: 0 pesanan sampah ditemukan.`);
      return NextResponse.json({ success: true, message: "Aman, tidak ada data expired.", cleaned_count: 0 });
    }

    // B. LOOPING UNTUK REFUND (JIKA ADA KOIN YANG TERSANDERA)
    let cleanedCount = 0;

    for (const order of expiredOrders) {
      const koinDipakai = order.used_balance || 0;

      // Jika user pakai koin saat checkout tapi gak jadi bayar sisanya (QRIS kadaluarsa)
      if (order.user_id && koinDipakai > 0) {
        const currentBalance = (order.profiles as any)?.balance || 0;
        const newBalance = currentBalance + koinDipakai;
        const userEmail = (order.profiles as any)?.email || "User";

        // 1. Kembalikan Saldo Koin
        await supabaseAdmin.from('profiles').update({ balance: newBalance }).eq('id', order.user_id);
        
        // 2. Catat Sejarah Mutasi
        await supabaseAdmin.from('balance_logs').insert([{
          user_id: order.user_id,
          user_email: userEmail,
          amount: koinDipakai,
          type: 'Refund',
          description: `Refund Koin (Order Batal Expired) #${order.order_id}`,
          initial_balance: currentBalance,
          final_balance: newBalance
        }]);
      }

      // C. UPDATE STATUS JADI GAGAL
      await supabaseAdmin.from('orders').update({ 
        status: 'Gagal',
        notes: `Otomatis dibatalkan (Expired 2 Jam). ${koinDipakai > 0 ? `Koin Rp ${koinDipakai.toLocaleString('id-ID')} dikembalikan.` : ''}`
      }).eq('id', order.id);

      cleanedCount++;
    }

    console.log(`✅ [CLEANUP SUKSES]: ${cleanedCount} pesanan kadaluarsa berhasil disapu dan koin dikembalikan (jika ada).`);

    return NextResponse.json({ 
      success: true, 
      message: "Cleanup & Refund Berhasil",
      cleaned_count: cleanedCount 
    });

  } catch (error: any) {
    console.error("❌ [CLEANUP FATAL ERROR]:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}