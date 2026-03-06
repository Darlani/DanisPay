import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { strategies, cashback } = body;

    const { error } = await supabaseAdmin
      .from('store_settings')
      .update({ 
        margin_json: strategies,
        cashback_percent: cashback,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'f2caefe6-7bf4-49d8-b37c-c210a7d93562');

    if (error) throw error;
    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}