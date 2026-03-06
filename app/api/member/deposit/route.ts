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
    const { email, amount, paymentMethod } = await req.json();

    // 1. Ambil minimal deposit dari store_settings (Dinamis)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('store_settings')
      .select('deposit_min')
      .single();

    if (settingsError || !settings) throw new Error('Gagal mengambil konfigurasi deposit');
    
    const minDepo = Number(settings.deposit_min || 10000);

    // 2. Validasi Input dengan angka dari Database
    if (!email || !amount || amount < minDepo) {
      return NextResponse.json({ 
        error: `Minimal deposit adalah Rp${minDepo.toLocaleString()}` 
      }, { status: 400 });
    }

// 🔥 GEMBOK ANTI-SPAM DEPOSIT: Cek apakah user masih punya tiket deposit 'Pending'
    const { data: existingDeposit } = await supabaseAdmin
      .from('deposits')
      .select('id')
      .eq('user_email', email)
      .eq('status', 'Pending')
      .maybeSingle();

    if (existingDeposit) {
      return NextResponse.json({ 
        error: 'Sabar Bos! Anda masih memiliki permintaan deposit yang belum diselesaikan.' 
      }, { status: 400 });
    }

    // 3. Masukkan permintaan ke tabel deposits
    const { error: depositError } = await supabaseAdmin
      .from('deposits')
      .insert([{
        user_email: email,
        amount: amount,
        payment_method: paymentMethod,
        status: 'Pending'
      }]);

    if (depositError) throw depositError;

    return NextResponse.json({ 
      success: true, 
      message: 'Permintaan deposit berhasil dibuat' 
    });

  } catch (error: any) {
    console.error('Deposit API Error:', error.message);
    return NextResponse.json({ error: 'Gagal memproses permintaan deposit' }, { status: 500 });
  }
}