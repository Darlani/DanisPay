import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
        // --- 0. PROTEKSI MAINTENANCE LEVEL API (Gembok Utama) ---
        const { data: maintenanceCheck } = await supabaseAdmin
          .from('store_settings')
          .select('is_maintenance')
          .single();
    
        if (maintenanceCheck?.is_maintenance) {
          return NextResponse.json({ 
            error: "Sistem sedang pemeliharaan (Maintenance). Deposit dihentikan sementara demi keamanan saldo Anda." 
          }, { status: 503 });
        }
        // -------------------------------------------------------
const { email, amount, bankName, accNumber, accName } = await req.json();

    // 1. Ambil Pengaturan dari store_settings (Dinamis)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('store_settings')
      .select('withdraw_fee, withdraw_min') // Pastikan lo sudah tambah kolom ini
      .single();

    if (settingsError || !settings) throw new Error('Gagal memuat pengaturan sistem');

    const adminFee = Number(settings.withdraw_fee || 0);
    const minWD = Number(settings.withdraw_min || 10000);
    const totalDeduction = amount + adminFee;

    // 2. Validasi Nominal Minimal & Input
    if (!email || amount < minWD) {
      return NextResponse.json({ error: `Minimal penarikan adalah Rp${minWD.toLocaleString()}` }, { status: 400 });
    }
    
    // 1. Ambil saldo asli dari DB
    const { data: profile, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('balance')
      .eq('email', email)
      .single();

if (pError || !profile) throw new Error('User tidak ditemukan');
    if (profile.balance < totalDeduction) return NextResponse.json({ error: 'Saldo tidak cukup!' }, { status: 400 });

    // 🔥 GEMBOK ANTI-SPAM: Cek apakah user masih punya WD yang menggantung (Pending)
    const { data: pendingWD } = await supabaseAdmin
      .from('withdrawals')
      .select('id')
      .eq('user_email', email)
      .eq('status', 'Pending')
      .maybeSingle();

    if (pendingWD) {
      return NextResponse.json({ 
        error: 'Sabar Bos! Anda masih memiliki penarikan yang sedang diproses.' 
      }, { status: 400 });
    }

    const newBalance = profile.balance - totalDeduction;

    // 🔥 OPTIMASI SPEED: Jalankan Insert WD, Update Saldo, dan Log secara Parallel
    const [wdResult, updateResult, logResult] = await Promise.all([
      supabaseAdmin.from('withdrawals').insert([{
        user_email: email,
        amount: amount,
        held_amount: totalDeduction,
        status: 'Pending',
        bank_name: bankName,
        account_number: accNumber,
        account_name: accName,
        admin_fee: adminFee
      }]),
      supabaseAdmin.from('profiles').update({ balance: newBalance }).eq('email', email),
      supabaseAdmin.from('balance_logs').insert([{
        user_email: email,
        amount: -totalDeduction,
        type: 'Withdraw',
        description: `Penarikan Rp${amount.toLocaleString()} (Pending Admin)`,
        initial_balance: profile.balance,
        final_balance: newBalance
      }])
    ]);

    // Cek kalau ada yang error pas eksekusi barengan
    if (wdResult.error) throw wdResult.error;
    if (updateResult.error) throw updateResult.error;
    if (logResult.error) throw logResult.error;

    return NextResponse.json({ success: true, newBalance });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}