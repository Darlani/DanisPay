import { NextResponse } from 'next/server';
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await req.json();
    const { strategies, cashback } = body;
    const safeCashback = Math.min(Math.max(Number(cashback) || 0, 0), 3);

    // 1. CARI ID TOKO OTOMATIS (Tanpa mengandalkan .env yang rawan meleset)
    const { data: settingsData } = await supabaseAdmin.from('store_settings').select('id').limit(1).single();
    
    if (!settingsData) {
      return NextResponse.json({ success: false, error: "Gagal: Tabel store_settings kosong!" });
    }

    // 2. UPDATE DATABASE BERSAMAAN
    const { error } = await supabaseAdmin
      .from('store_settings')
      .update({ 
        margin_json: strategies,
        cashback_percent: safeCashback,
        updated_at: new Date().toISOString()
      })
      .eq('id', settingsData.id); // <- Kunci presisi langsung ke database

    if (error) throw error;

    // 3. CATAT LOG
    try {
      await supabaseAdmin.from('activity_logs').insert([{
        action: "UPDATE STRATEGI",
        details: `Profil strategi baru & Global Cashback (${safeCashback}%) tersimpan permanen.`,
        created_at: new Date().toISOString()
      }]);
    } catch (logErr) {}

    return NextResponse.json({ success: true, message: "Strategi Berhasil Disimpan Ke Supabase!" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}