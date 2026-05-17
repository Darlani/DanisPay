import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function GET(req: Request) {
  // 1. SATPAM API (Khusus Robot Tukang Sapu)
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const authHeader = req.headers.get('Authorization');
  const WEBHOOK_SECRET = process.env.CRON_SECRET;

  const isAuthorized = authHeader === `Bearer ${WEBHOOK_SECRET}` || querySecret === WEBHOOK_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Akses Ditolak! Kunci rahasia salah." }, { status: 401 });
  }

  // 2. LOGIKA CLEANUP: Pesanan lebih dari 2 jam = Hangus
  const duaJamLalu = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  console.error(`🚨 [DEBUG-CLEANUP] Robot Aktif! Cek data sebelum: ${duaJamLalu}`);

  try {
    // A. TARIK SEMUA PESANAN EXPIRED (Ambil kolom spesifik untuk amunisi Resend tanpa SELECT *)
    const { data: expiredOrders, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, user_id, used_balance, product_name, total_amount, payment_method, user_contact, email, profiles(balance, email)')
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

      // C. UPDATE STATUS JADI GAGAL (Penjelasan super jelas agar tidak bisa dimanipulasi user)
      await supabaseAdmin.from('orders').update({ 
        status: 'Gagal',
        notes: `Batal Otomatis: Batas waktu pembayaran habis (Tidak ada dana masuk dalam 2 jam). ${koinDipakai > 0 ? `Koin Rp ${koinDipakai.toLocaleString('id-ID')} telah dikembalikan aman ke saldo.` : ''}`
      }).eq('id', order.id);

      // === AUTOMATIC RESEND NOTICE (EXPIRED/CANCELED) ===
      const targetContactCleanup = order.user_contact || order.email || (order.profiles as any)?.email;
      if (targetContactCleanup && targetContactCleanup.includes('@')) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
        fetch(`${siteUrl}/api/transaction/send-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.order_id,
            productName: order.product_name || 'Produk Digital',
            status: 'Gagal',
            paymentMethod: order.payment_method || 'Sistem Otomatis',
            totalAmount: order.total_amount || 0,
            userContact: targetContactCleanup,
            // Suntik alasan spesifik ke API Resend agar struk email memuat alasan kadaluarsa
            reason: 'Batas waktu pembayaran habis (Sistem tidak menerima dana dalam 2 jam)' 
          })
        }).catch(err => console.error("Gagal auto-receipt cleanup notice:", err));
      }

      cleanedCount++;
    }

    console.error(`✅ [CLEANUP-REPORT] Berhasil hapus: ${cleanedCount} data.`);

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