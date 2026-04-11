import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const cookieStore = req.headers.get('cookie') || "";
    
    // Satpam cukup cek apakah ada tanda Admin ATAU Manager di Cookie
    const isAuthorized = cookieStore.includes('isAdmin=true') || cookieStore.toLowerCase().includes('userrole=manager');

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses Ditolak! Sesi Expired atau Anda bukan Admin/Manager." }, { status: 403 });
    }

const body = await req.json();
    const { strategies, cashback } = body;
    const storeId = process.env.STORE_ID; // Ambil dari bensin .env [cite: 2026-03-06]

    // VALIDASI KEAMANAN MUTLAK: Pastikan cashback tidak bisa tembus dari 3%
    const safeCashback = Math.min(Math.max(Number(cashback) || 0, 0), 3);

    if (!storeId) {
      return NextResponse.json({ success: false, error: "StoreID di .env belum disetting!" });
    }

    // 2. UPDATE DATABASE
    const { error } = await supabaseAdmin
      .from('store_settings')
      .update({ 
        margin_json: strategies,
        cashback_percent: safeCashback, // Gunakan variabel yang sudah diamankan
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Strategi & Cashback Berhasil Disimpan!" });

  } catch (error: any) {
    console.error("🔥 ERROR SAVE SETTINGS:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}