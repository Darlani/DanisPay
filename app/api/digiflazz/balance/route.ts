import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// --- 1. FUNGSI PEMBANTU: LAPOR TELEGRAM ---
async function reportToTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.error("❌ Variabel Env Telegram Belum Disetting!");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: message, 
        parse_mode: 'HTML',
        disable_web_page_preview: true 
      })
    });
  } catch (err) {
    console.error("💀 Gagal kirim notif saldo ke Telegram:", err);
  }
}

export async function GET(req: Request) {
  try {
    // --- 2. SATPAM TERPADU (Admin & Manager Lolos) ---
    const cookieStore = req.headers.get('cookie') || "";
    const isAuthorized = cookieStore.includes('isAdmin=true') || cookieStore.toLowerCase().includes('userrole=manager');

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses Ditolak! Sesi Expired atau bukan Admin/Manager." }, { status: 403 });
    }

    // --- 3. AMBIL CREDENTIAL DARI ENV ---
    const username = process.env.DIGIFLAZZ_USERNAME?.trim();
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim(); 
    const storeId = process.env.STORE_ID; // Kunci Toko dari bensin .env [cite: 2026-03-06]

    if (!username || !apiKey || !storeId) {
      return NextResponse.json({ 
        success: false, 
        error: "Data .env (Username/Key/StoreID) belum lengkap Bos!" 
      });
    }

    // --- 4. GENERATE SIGNATURE (MD5: USERNAME + API_KEY + 'depo') ---
    const sign = crypto.createHash('md5').update(username + apiKey + "depo").digest('hex'); 

    // --- 5. TEMBAK API DIGIFLAZZ ---
    const response = await fetch('https://api.digiflazz.com/v1/cek-saldo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'deposit', username, sign }),
      cache: 'no-store'
    });

    const data = await response.json();
    console.log("🔍 RESPONS DIGIFLAZZ:", data);

    if (data.data) {
      const newBalance = data.data.deposit;

      // --- 6. UPDATE DATABASE SUPABASE (Pakai ID dari .env) ---
      const { error: dbError } = await supabaseAdmin
        .from('store_settings')
        .update({ balance_digiflazz: newBalance })
        .eq('id', storeId);

      if (dbError) {
        console.error("❌ ERROR SUPABASE:", dbError.message);
        return NextResponse.json({ 
          success: true, 
          balance: newBalance, 
          warning: "Saldo ditarik tapi gagal update database" 
        });
      }

      // --- 7. RADAR SALDO TIRIS (NOTIFIKASI TELEGRAM) ---
      if (newBalance < 100000) {
        const msgAlert = `<b>⚠️ PERINGATAN SALDO TIPIS!</b>\n\n` +
                         `Bensin Digiflazz Bos tinggal dikit nih.\n` +
                         `💰 Sisa Saldo: <b>Rp ${newBalance.toLocaleString('id-ID')}</b>\n\n` +
                         `<i>Segera Top Up ya Bos biar pelanggan nggak kabur! 🚀</i>`;
        
        // Kirim ke Telegram tanpa await agar API tetap kencang di bawah 200ms
        reportToTelegram(msgAlert).catch(e => console.error("Alert Telegram Gagal:", e));
      }

      return NextResponse.json({ success: true, balance: newBalance });

    } else {
      console.error("❌ DIGIFLAZZ REJECTED:", data);
      return NextResponse.json({ 
        success: false, 
        message: data.data?.message || data.message || "Ditolak Digiflazz",
        raw: data 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("❌ CRASH API BALANCE:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}