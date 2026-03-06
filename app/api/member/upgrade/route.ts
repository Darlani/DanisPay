import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Gunakan Service Role Key biar bisa bypass RLS untuk proses krusial ini
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
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email diperlukan' }, { status: 400 });
    }

// 1. Ambil biaya upgrade dari store_settings (Sesuai kolom baru lo)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('store_settings')
      .select('upgrade_fee')
      .single();

    if (settingsError || !settings) throw new Error('Gagal mengambil konfigurasi biaya');
    
    // Pastikan nama variabelnya sesuai dengan nama kolom di DB lo
    const upgradeFee = Number(settings.upgrade_fee);

    // 2. Ambil data profil user (cek saldo & status)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('balance, member_type')
      .eq('email', email)
      .single();

    if (profileError || !profile) throw new Error('User tidak ditemukan');
    if (profile.member_type === 'Special') {
        return NextResponse.json({ error: 'Anda sudah menjadi Special Member' }, { status: 400 });
    }
    if (profile.balance < upgradeFee) {
        return NextResponse.json({ error: 'Saldo tidak mencukupi' }, { status: 400 });
    }

    // 3. Eksekusi Upgrade & Potong Saldo (Gunakan transaksi manual atau sequential)
    const newBalance = profile.balance - upgradeFee;

    // A. Update Status & Saldo
// Menjalankan Update Profil dan Insert Log secara bersamaan (Parallel) agar lebih cepat
    const [updateResult, logResult] = await Promise.all([
      supabaseAdmin.from('profiles').update({ member_type: 'Special', balance: newBalance }).eq('email', email),
      supabaseAdmin.from('balance_logs').insert([{
        user_email: email,
        amount: -upgradeFee,
        upgrade_fee: upgradeFee,
        type: 'Upgrade',
        description: 'UPGRADE STATUS SPECIAL MEMBER'
      }])
    ]);

    if (updateResult.error) throw updateResult.error;
    if (logResult.error) throw logResult.error;

    return NextResponse.json({ 
      success: true, 
      message: 'Upgrade Berhasil!',
      newBalance 
    });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}