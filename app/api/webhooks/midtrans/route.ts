import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { STORE_CONFIG } from '@/utils/storeConfig';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;

    // 1. VERIFIKASI KEAMANAN
    const signatureKey = crypto
      .createHash('sha512')
      .update(body.order_id + body.status_code + body.gross_amount + serverKey)
      .digest('hex');

    if (signatureKey !== body.signature_key) {
      return NextResponse.json({ message: "Invalid Signature" }, { status: 403 });
    }

    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;

    // 2. LOGIKA JIKA PEMBAYARAN SUKSES
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      
      // Update status order dan ambil data pembeli + pengajak
      const { data: order, error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Berhasil' })
        .eq('order_id', orderId)
        .select('referred_by, email, price') 
        .single();

      if (updateError || !order) {
        return NextResponse.json({ message: "Order processed but not found" }, { status: 200 });
      }

      // --- STEP 1: AMBIL SETTINGAN DINAMIS ---
      const { data: settings } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      // Gunakan optional chaining (?.) untuk jaga-jaga jika data kosong
      const specialPercent = settings?.special_member_percent || 10;
      const firstRefPercent = settings?.first_referral_percent || 7;
      const nextRefPercent = settings?.next_referral_percent || 5;
      const companyProfit = 1500;

      // --- STEP 2: CEK APAKAH INI TRANSAKSI PERTAMA ---
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('email', order.email)
        .eq('status', 'Berhasil');
      
      const isFirstTransaction = (count || 0) <= 1; // Karena order ini baru saja jadi 'Berhasil'

      // --- A. KOMISI REFERRAL DINAMIS ---
      if (order.referred_by) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('balance, email')
          .eq('referral_code', order.referred_by)
          .single();

        if (referrer) {
          const refRate = isFirstTransaction ? firstRefPercent : nextRefPercent;
          const commission = Math.floor(companyProfit * (refRate / 100));

          await supabase.from('profiles').update({ balance: (Number(referrer.balance) || 0) + commission }).eq('referral_code', order.referred_by);
          await supabase.from('balance_logs').insert([{
            user_email: referrer.email,
            amount: commission,
            type: 'Commission',
            description: `Komisi Referral ${refRate}% (Order #${orderId})`
          }]);
        }
      }

      // --- B. CASHBACK SPECIAL MEMBER DINAMIS ---
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('balance, member_type')
        .eq('email', order.email)
        .single();

      if (buyerProfile?.member_type?.toLowerCase() === 'special') {
        const cashback = Math.floor(companyProfit * (specialPercent / 100));
        
        if (cashback > 0) {
          await supabase.from('profiles').update({ balance: (Number(buyerProfile.balance) || 0) + cashback }).eq('email', order.email);
          await supabase.from('balance_logs').insert([{
            user_email: order.email,
            amount: cashback,
            type: 'Cashback',
            description: `Cashback Special ${specialPercent}% (Order #${orderId})`
          }]);
        }
      }
      }

    return NextResponse.json({ message: "Webhook Berhasil Diproses" });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}