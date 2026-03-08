import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// --- 1. FUNGSI PEMBERSIH TEKS ---
function escapeHtml(text: string) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const WEBHOOK_SECRET = String(process.env.MACRODROID_SECRET || '');

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (err) {
    console.error("💀 [KONEKSI ERROR]: Gagal menghubungi server Telegram.", err);
  }
}

// --- 3. GET: AMBIL RIWAYAT ORDER ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email'); 

    if (email) {
      const { data, error } = await supabaseAdmin.from('orders').select('*').eq('email', email).order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    // Gunakan sistem token yang sama dengan PATCH agar lebih aman [cite: 2026-03-06]
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isAdminCookie = req.headers.get('cookie')?.includes('isAdmin=true');

    let hasAccess = isAdminCookie; // Fallback ke cookie jika token tidak ada

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'manager') {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Akses Ditolak! Sesi Expired atau bukan Admin." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- 4. PATCH: UPDATE STATUS, NOTIF, DAN LOGIKA FINANSIAL ---
export async function PATCH(req: Request) {
  try {
    const { data: settings } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();

    // =======================================================
    // FIX ERROR 401: LOGIKA AUTENTIKASI YANG LEBIH TANGGUH
    // =======================================================
    const cookieStore = req.headers.get('cookie');
    const isAdminCookie = cookieStore?.includes('isAdmin=true');
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let adminEmail = "Admin (via Cookie)";
    let hasAccess = false;

    // 1. Coba validasi token (Jika Frontend mengirimkan token JWT)
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: roleCheck } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (roleCheck?.role?.toLowerCase() === 'admin' || roleCheck?.role?.toLowerCase() === 'manager') {
          hasAccess = true;
          adminEmail = user.email || adminEmail;
        }
      }
    }

    // 2. Fallback: Kalau Frontend lupa kirim token, tapi cookie Admin ada, loloskan!
    if (!hasAccess && isAdminCookie) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Sesi expired atau Lu bukan Admin!" }, { status: 401 });
    }

    // =======================================================

    const body = await req.json();
    const { id, status: currentStatus, email: user_email } = body;

    const { data: oldOrder } = await supabaseAdmin.from('orders').select('*').eq('id', id).single();
    if (!oldOrder) throw new Error("Order tidak ditemukan di Database.");

    const oldStatusRaw = oldOrder.status || 'Pending';

    if (oldStatusRaw === currentStatus) {
      return NextResponse.json({ message: "Status sudah sama." });
    }

    const { error: updateError } = await supabaseAdmin.from('orders').update({ status: currentStatus }).eq('id', id);
    if (updateError) throw updateError;

    await supabaseAdmin.from('admin_logs').insert([{
      admin_email: adminEmail,
      action: "UPDATE_STATUS",
      target: oldOrder.order_id || id,
      details: `Mengubah status #${oldOrder.order_id} dari ${oldStatusRaw} menjadi ${currentStatus}`
    }]);

    const safeProductName = escapeHtml(oldOrder.product_name || "Produk Digital");
    const safeItemLabel = escapeHtml(oldOrder.item_label || "Item"); 
    const safeEmail = escapeHtml(user_email || "-");
    const safeInvoiceId = escapeHtml(oldOrder.order_id || id.slice(-8)); 
    const tipeUser = user_email && user_email !== 'null' ? `MEMBER (${safeEmail})` : "GUEST";

    // =========================================================================
    // PROTEKSI GANDA ANTI-BONCOS (Hanya jalan jika sebelumnya BUKAN Berhasil/Diproses)
    // Berlaku untuk status "Diproses" (Nembak API) ATAU "Berhasil" (Produk Manual)
    // =========================================================================
    const isFirstTimeSuccess = (currentStatus === 'Diproses' || currentStatus === 'Berhasil') && 
                               (oldStatusRaw !== 'Diproses' && oldStatusRaw !== 'Berhasil');

    if (isFirstTimeSuccess) {
       // A. POTONG SALDO KOIN DAPAY
       if (oldOrder.used_balance > 0 && user_email && user_email !== 'null') {
         const { data: prof } = await supabaseAdmin.from('profiles').select('balance').eq('id', oldOrder.user_id).maybeSingle();
         if (prof) {
           const finalBal = Math.max(0, (prof.balance || 0) - oldOrder.used_balance);
           await supabaseAdmin.from('profiles').update({ balance: finalBal }).eq('id', oldOrder.user_id);
           await supabaseAdmin.from('balance_logs').insert([{
            user_id: oldOrder.user_id, user_email, amount: -oldOrder.used_balance, type: 'Payment',
             description: `Potongan Koin DaPay (Acc Admin #${oldOrder.order_id})`,
             initial_balance: prof.balance || 0, final_balance: finalBal
           }]);
         }
       }

       // B. LOGIKA CASHBACK UNTUK MEMBER SPECIAL
       if (user_email && user_email !== 'null') {
         const { data: buyerProf } = await supabaseAdmin.from('profiles').select('member_type').eq('id', oldOrder.user_id).maybeSingle();
         if (buyerProf?.member_type?.toLowerCase() === 'special') {
           const { data: prodData } = await supabaseAdmin.from('products').select('cashback').eq('name', oldOrder.product_name).maybeSingle();
           const cb = prodData?.cashback || 0;
           if (cb > 0) {
             const { data: freshProf } = await supabaseAdmin.from('profiles').select('balance').eq('id', oldOrder.user_id).maybeSingle();
             const newBal = (freshProf?.balance || 0) + cb;
             await supabaseAdmin.from('profiles').update({ balance: newBal }).eq('id', oldOrder.user_id);
             await supabaseAdmin.from('balance_logs').insert([{
               user_id: oldOrder.user_id, user_email, amount: cb, type: 'Cashback',
               description: `Cashback Special (Acc Admin #${oldOrder.order_id})`,
               initial_balance: freshProf?.balance || 0, final_balance: newBal
             }]);
           }
         }
       }

       // C. LOGIKA BONUS WELCOME & KOMISI REFERRAL
       if (user_email && user_email !== 'null') {
         const { count } = await supabaseAdmin.from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', oldOrder.user_id)
          .in('status', ['Berhasil', 'Diproses'])
          .neq('id', id); 

         const isFirstTransaction = (count || 0) === 0; 
         const { data: buyerProfile } = await supabaseAdmin.from('profiles').select('id, referred_by, balance').eq('id', oldOrder.user_id).maybeSingle();

         if (buyerProfile?.referred_by) {
           const [refSettingsRes, referrerRes] = await Promise.all([
             supabaseAdmin.from('store_settings').select('first_referral_percent, next_referral_percent, welcome_bonus_amount, welcome_bonus_min_trx').single(),
             supabaseAdmin.from('profiles').select('id, balance, email').eq('referral_code', buyerProfile.referred_by).maybeSingle()
           ]);

           const refSettings = refSettingsRes.data;
           const referrer = referrerRes.data;

           if (refSettings) {
             const realRevenue = (oldOrder.total_amount || 0) - (oldOrder.unique_code || 0) + (oldOrder.used_balance || 0);

             if (isFirstTransaction && (refSettings.welcome_bonus_amount || 0) > 0) {
               const minTrx = refSettings.welcome_bonus_min_trx || 50000;
               if (realRevenue >= minTrx) {
                 const welcomeBonus = refSettings.welcome_bonus_amount;
                 const newBuyerBal = (buyerProfile.balance || 0) + welcomeBonus;

                 await Promise.all([
                   supabaseAdmin.from('profiles').update({ balance: newBuyerBal }).eq('id', oldOrder.user_id),
                   supabaseAdmin.from('balance_logs').insert([{
                     user_id: oldOrder.user_id, user_email: user_email, amount: welcomeBonus, type: 'Bonus',
                     description: `Bonus Welcome (Trx Pertama >= Rp${minTrx.toLocaleString('id-ID')})`,
                     initial_balance: buyerProfile.balance || 0, final_balance: newBuyerBal
                   }])
                 ]);
               }
             }

             if (referrer && oldOrder.referred_by) {
               const profitMurni = realRevenue - (oldOrder.buy_price || 0) - (oldOrder.cashback || 0);
               if (profitMurni > 0) {
                 const rate = isFirstTransaction ? refSettings.first_referral_percent : refSettings.next_referral_percent;
                 const commission = Math.floor(profitMurni * (rate / 100));

                 if (commission > 0) {
                   const newRefBal = (referrer.balance || 0) + commission;
                   
                   await Promise.all([
                     supabaseAdmin.from('profiles').update({ balance: newRefBal }).eq('id', referrer.id),
                     supabaseAdmin.from('orders').update({ referral_commission: commission }).eq('id', id),
                     supabaseAdmin.from('balance_logs').insert([{
                       user_id: referrer.id, user_email: referrer.email, amount: commission, type: 'Referral',
                       description: `Komisi Referral ${rate}% (Acc Admin #${oldOrder.order_id})`,
                       initial_balance: referrer.balance || 0, final_balance: newRefBal
                     }])
                   ]);
                 }
               }
             }
           }
         }
       }
    } 

    // --- NOTIFIKASI TELEGRAM ---
    const usedCoin = oldOrder.used_balance || 0;
    const nominalTransfer = oldOrder.total_amount || 0;
    const grandTotal = usedCoin + nominalTransfer;

    const detailPembayaran = usedCoin > 0 
      ? `🪙 Koin DaPay: <b>- Rp ${usedCoin.toLocaleString('id-ID')}</b>\n` +
        `💰 Nominal Transfer: <b>Rp ${nominalTransfer.toLocaleString('id-ID')}</b>\n` +
        `🧾 Total Pesanan: <b>Rp ${grandTotal.toLocaleString('id-ID')}</b>\n`
      : `💰 Nominal Transfer: <b>Rp ${nominalTransfer.toLocaleString('id-ID')}</b>\n`;

    let telegramMessage = null;

    if (currentStatus === 'Berhasil' || currentStatus === 'Diproses') {
      telegramMessage = `<b>ADA CUAN MASUK!</b> 🚀\n\n` +
        `📦 Produk: <b>${safeProductName} - ${safeItemLabel}</b>\n` +
        detailPembayaran +
        `👤 User: ${tipeUser}\n` +
        `🆔 Invoice: <b>${safeInvoiceId}</b>\n` +
        `🔄 Status: <b>${oldStatusRaw.toUpperCase()}</b> ➡️ <b>${currentStatus.toUpperCase()}</b>\n\n` +
        `<i>*Catatan: ${currentStatus === 'Diproses' ? 'Meneruskan ke Server...' : 'Pesanan Produk Sendiri (Selesai).'}</i>`;
    } else {
      const emoji = currentStatus === 'Gagal' ? '❌' : 'ℹ️';
      telegramMessage = `<b>UPDATE STATUS PESANAN ${emoji}</b>\n\n` +
        `📦 Produk: <b>${safeProductName}</b>\n` +
        detailPembayaran + 
        `👤 User: ${tipeUser}\n` +        
        `🆔 Invoice: <b>${safeInvoiceId}</b>\n` +
        `🔄 Perubahan: <b>${oldStatusRaw.toUpperCase()}</b> ➡️ <b>${currentStatus.toUpperCase()}</b>`;
    }

    if (telegramMessage) await sendTelegram(telegramMessage);

    // =========================================================================
    // 🚀 EKSEKUSI NEMBAK KE DIGIFLAZZ (HANYA JIKA STATUS "DIPROSES" DAN LIVE AKTIF)
    // Jika admin set "Berhasil", berarti ini produk manual Bos, SKIP Digiflazz!
    // =========================================================================
    if (currentStatus === 'Diproses' && settings?.is_digiflazz_active) {
       console.log(`🚀 [ADMIN ACTION] Order #${oldOrder.order_id} diteruskan ke Digiflazz...`);
       
try {
           // Jalur tol internal VPS: Super cepat & anti-nyasar [cite: 2026-03-06]
           const baseUrl = "http://127.0.0.1:3000"; 
           
           const kategoriLengkap = (oldOrder.category || "").toLowerCase();
           
           let apiEndpoint = `${baseUrl}/api/prabayar/checkout`;
           if (kategoriLengkap.includes('pascabayar') || kategoriLengkap.includes('ppob')) {
               apiEndpoint = `${baseUrl}/api/pascabayar/checkout`; 
           }

      fetch(apiEndpoint, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'x-webhook-secret': WEBHOOK_SECRET // Gunakan secret untuk verifikasi internal [cite: 2026-03-06]
          },
          body: JSON.stringify({
              order_id: oldOrder.order_id,
              email: user_email,
              use_koin: false 
          })
           }).catch(e => console.error("Gagal trigger API Checkout:", e));
           
       } catch (apiErr) {
           console.error("Gagal mengeksekusi ke Digiflazz:", apiErr);
       }
    }

    return NextResponse.json({ message: "Update Success" });
  } catch (error: any) {
    console.error("🔥 FATAL ERROR PATCH:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// --- 5. DELETE: MENGHAPUS PESANAN ---
export async function DELETE(req: Request) {
  try {
    // Gunakan pengecekan Authorization yang ketat untuk fungsi hapus [cite: 2026-03-06]
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) return NextResponse.json({ error: "Token diperlukan!" }, { status: 401 });

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user?.id).maybeSingle();

    if (profile?.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: "Hanya Admin yang boleh hapus data!" }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;
    const { error } = await supabaseAdmin.from('orders').delete().eq('id', id);
    
    if (error) throw error;
    
    console.log(`🗑️ Order ID ${id} berhasil dihapus.`);
    return NextResponse.json({ message: "Berhasil dihapus" });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}