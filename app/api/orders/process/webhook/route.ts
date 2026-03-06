import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

// --- 1. FUNGSI PEMBERSIH TEKS (WAJIB) ---
function escapeHtml(text: string) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- 2. FUNGSI KIRIM TELEGRAM ---
async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log("📨 [WEBHOOK] Mencoba lapor Telegram..."); 

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
    console.error("💀 Gagal lapor Telegram:", err);
  }
}

export async function POST(request: Request) {
  try {
    // --- 0. AMBIL SETTING MAINTENANCE & SAKLAR SIMULASI ---
    const { data: settings } = await supabaseAdmin
      .from('store_settings')
      .select('is_maintenance, is_maintenance_digiflazz, is_digiflazz_active')
      .single();

    if (settings?.is_maintenance) {
        return NextResponse.json({ error: "Toko sedang maintenance" }, { status: 503 });
    }

    const body = await request.json();
    const { content, secret, isNotifyOnly } = body; 

    // DEKLARASIKAN DI SINI BIAR BISA DIPAKAI LOGIKA DI BAWAHNYA
    const lowerContent = content ? content.toLowerCase() : ""; 

    // --- 1. KEAMANAN SECRET ---
    if (secret !== WEBHOOK_SECRET) {
      console.log("❌ Secret Salah!");
      return NextResponse.json({ message: "Akses Ditolak!" }, { status: 401 });
    }

    // --- 2. PINTU KHUSUS NOTIFIKASI (Full Koin) ---
    if (isNotifyOnly) {
      console.log("📩 Menerima Titipan Notif Full Koin");
      await sendTelegram(content);
      return NextResponse.json({ success: true, message: "Notif terkirim" });
    }

    if (!content) {
      return NextResponse.json({ message: "Konten kosong" }, { status: 400 });
    }

    // --- EKSTRAKSI NOMINAL ---
    const regexNominal = /Rp\.?\s?([\d.,]+)/i;
    const match = content.match(regexNominal);

    if (!match) {
      console.log("❌ Tidak ditemukan format nominal Rp.");
      return NextResponse.json({ message: "Format nominal tidak ditemukan" }, { status: 400 });
    }

    // --- PEMBERSIH ANGKA ---
    let rawAmount = match[1];
    if (rawAmount.includes(',')) {
      rawAmount = rawAmount.split(',')[0];
    }
    const cleanAmount = rawAmount.replace(/\./g, "");
    const amount = parseInt(cleanAmount);

    if (isNaN(amount)) {
      return NextResponse.json({ message: "Gagal memproses nominal" }, { status: 400 });
    }

    console.log(`🔍 Mencari Order: total_amount = ${amount}`);

// --- 2.5 DETEKSI BRAND DARI NOTIFIKASI (VERSI PRESISI BERDASARKAN GAMBAR) ---
    let paymentBrand = "Bank/E-Wallet";
    let brandLogo = "💳"; 

    // 1. Radar GoPay (Transfer & QRIS)
    if (lowerContent.includes("gopay") || lowerContent.includes("gojek") || lowerContent.includes("at dapay") || lowerContent.includes("ke kamu")) {
      if (lowerContent.includes("qris payment")) {
        paymentBrand = "QRIS (GoPay)";
        brandLogo = "📸 [QRIS GOPAY]";
      } else {
        paymentBrand = "GoPay";
        brandLogo = "🔵 [GOPAY]";
      }
    } 
    // 2. Radar DANA
    else if (lowerContent.includes("dana") || lowerContent.includes("telah diterima dari")) {
      paymentBrand = "DANA";
      brandLogo = "🔵 [DANA]";
    } 
    // 3. Radar QRIS Umum
    else if (lowerContent.includes("qris") || lowerContent.includes("ispu") || lowerContent.includes("nmid")) {
      paymentBrand = "QRIS";
      brandLogo = "📸 [QRIS]";
    } else if (lowerContent.includes("ovo")) {
      // Bedakan OVO Sesama dan OVO Top Up (External)
      if (lowerContent.includes("mengirimkan dana")) {
        paymentBrand = "OVO Sesama";
        brandLogo = "💜 [OVO SESAMA]";
      } else {
        paymentBrand = "OVO (Top Up/Bank)";
        brandLogo = "🏦 [OVO EXTERNAL]";
      }
    } else if (lowerContent.includes("shopee") || lowerContent.includes("spay")) {
      paymentBrand = "ShopeePay";
      brandLogo = "🧡 [SHOPEE]";
    } else if (lowerContent.includes("linkaja")) {
      paymentBrand = "LinkAja";
      brandLogo = "❤️ [LINKAJA]";
    } else if (lowerContent.includes("bca")) {
      paymentBrand = "BCA";
      brandLogo = "🏦 [BCA]";
    } else if (lowerContent.includes("bni")) {
      paymentBrand = "BNI";
      brandLogo = "🏦 [BNI]";
    } else if (lowerContent.includes("bri") || lowerContent.includes("brimo")) {
      paymentBrand = "BRI";
      brandLogo = "🏦 [BRI]";
    } else if (lowerContent.includes("mandiri") || lowerContent.includes("livin")) {
      paymentBrand = "Mandiri";
      brandLogo = "🏦 [MANDIRI]";
    } else if (lowerContent.includes("bsi")) {
      paymentBrand = "BSI";
      brandLogo = "🏦 [BSI]";
    } else if (lowerContent.includes("seabank")) {
      paymentBrand = "SeaBank";
      brandLogo = "🏦 [SEABANK]";
    } else if (lowerContent.includes("alfamart") || lowerContent.includes("alfa ")) {
      paymentBrand = "Alfamart";
      brandLogo = "🏪 [ALFAMART]";
    } else if (lowerContent.includes("indomaret")) {
      paymentBrand = "Indomaret";
      brandLogo = "🏪 [INDOMARET]";
    }

    // --- PENCARIAN ORDER PENDING ---
    const { data: orders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('total_amount', amount) 
      .ilike('status', 'pending') 
      .order('created_at', { ascending: false });

    if (fetchError || !orders || orders.length === 0) {
      console.log(`❌ Tidak ada order Pending dengan nominal Rp ${amount}`);
      return NextResponse.json({ message: "Order tidak ditemukan" }, { status: 404 });
    }

    const currentOrder = orders[0]; 
    console.log(`✅ Order Ditemukan! ID Invoice: ${currentOrder.order_id}`);

// --- 3. LOGIKA RADAR "EXTERNAL TRANSFER" (BANK ATAU ANTAR E-WALLET) ---
    const payMethod = currentOrder.payment_method?.toLowerCase() || "";

    /** * Radar E-Wallet: Nangkep kata kunci "Top Up", "Isi Saldo", atau "Melalui" 
     * yang biasanya muncul kalau transfer dari Bank atau antar E-Wallet beda aplikasi.
     */
// --- RADAR EXTERNAL (DITINGKATKAN BERDASARKAN GAMBAR OVO) ---
    const isExternalTransfer = 
      lowerContent.includes("top up") || 
      lowerContent.includes("isi saldo") || 
      lowerContent.includes("via bank") ||
      // Jika ada 'melalui' tapi bukan 'aplikasi OVO', berarti itu Bank (External)
      (lowerContent.includes("melalui") && !lowerContent.includes("aplikasi ovo")) ||
      // GoPay sesama pakai kata 'ke kamu', kalau cuma 'transfer' berarti luar
      (lowerContent.includes("transfer") && !lowerContent.includes("sesama") && !lowerContent.includes("ke kamu"));
    
    // VALIDASI KEJUJURAN: User pilih 'Sesama' tapi notifnya format 'External'
    const needsPenalty = isExternalTransfer && payMethod.includes("sesama");

if (needsPenalty) {
        console.log(`⚠️ [PENALTI] Order ${currentOrder.order_id}: Deteksi Transfer Luar/Potongan Bank.`);

        const msgPenalty = `<b>⚠️ PEMBAYARAN TIDAK SESUAI (PENALTI)</b>\n\n` +
            `🆔 Invoice: <b>${currentOrder.order_id}</b>\n` +
            `👤 User: ${currentOrder.email || "Guest"}\n` +
            `💳 Metode di Web: <b>${currentOrder.payment_method?.toUpperCase()}</b>\n` +
            `💰 Nominal: Rp ${amount.toLocaleString('id-ID')}\n` +
            `❌ Masalah: <b>User kirim pakai Bank/E-Wallet lain (Diterima Bersih -Rp 1.000)</b>\n\n` +
            `<i>Status: Order tetap PENDING. Silakan tagih sisa atau batalkan manual via Dashboard.</i>`;
          
        await sendTelegram(msgPenalty);
        
        return NextResponse.json({ 
            success: true, 
            message: "Metode transfer tidak sesuai (Potongan External). Order dipending otomatis." 
        });
    }

// --- 4. UPDATE STATUS KE 'DIPROSES' (AGAR UI TAMPIL LOADING) ---
    const { error: errUpdatePaid } = await supabaseAdmin
      .from('orders')
      .update({ status: 'Diproses' }) 
      .eq('id', currentOrder.id);

    if (errUpdatePaid) throw errUpdatePaid;

    // ====================================================================
    // --- 5. LOGIKA PENGURANGAN SALDO (KOIN DAPAY) ---
    // ====================================================================
    const userId = currentOrder.user_id;
    const userEmail = currentOrder.email;

    try {
      const usedBalance = currentOrder.used_balance || 0;
      
      if (usedBalance > 0 && userId && userEmail && userEmail !== 'null') {
        console.log(`🪙 Memotong saldo user ID: ${userId}`);
        const { data: currentProf } = await supabaseAdmin.from('profiles').select('balance').eq('id', userId).maybeSingle();
        
        if (currentProf) {
          const finalBalance = Math.max(0, (currentProf.balance || 0) - usedBalance);
          await supabaseAdmin.from('profiles').update({ balance: finalBalance }).eq('id', userId);
          await supabaseAdmin.from('balance_logs').insert([{ 
            user_id: userId, 
            user_email: userEmail, 
            amount: -usedBalance, 
            type: 'Payment', 
            description: `Potongan Order #${currentOrder.order_id}`,
            initial_balance: currentProf.balance || 0,
            final_balance: finalBalance
          }]);
        }
      }
    } catch (balanceErr: any) {
      console.error("⚠️ Error Potong Saldo (Non-Fatal):", balanceErr.message);
    }

    // ====================================================================
    // --- 6. LOGIKA KOMISI, WELCOME BONUS & CASHBACK ---
    // ====================================================================
    try {
      if (userId && userEmail && userEmail !== 'null') {
        console.log("🧮 Menghitung Komisi, Bonus & Cashback...");
        
        // 1. Ambil Settings & Profile Buyer Terupdate
        const [settingsRes, profileRes] = await Promise.all([
          supabaseAdmin.from('store_settings').select('*').single(),
          supabaseAdmin.from('profiles').select('referred_by, member_type, balance').eq('id', userId).single()
        ]);

        const settings = settingsRes.data;
        const buyerProfile = profileRes.data;

        // 2. Cek Transaksi Pertama (Gunakan user_id biar akurat)
        const { count } = await supabaseAdmin.from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'Berhasil');
        
        const isFirstTransaction = (count || 0) <= 1; // 1 karena order ini baru saja Berhasil

        if (settings && buyerProfile) {
          const realRevenue = (currentOrder.total_amount || 0) - (currentOrder.unique_code || 0) + (currentOrder.used_balance || 0);

          // A. 🎁 LOGIKA WELCOME BONUS (BALIK LAGI BOS!)
          if (isFirstTransaction && (settings.welcome_bonus_amount || 0) > 0) {
            const minTrx = settings.welcome_bonus_min_trx || 50000;
            if (realRevenue >= minTrx) {
              const bonus = settings.welcome_bonus_amount;
              const newBalBonus = (buyerProfile.balance || 0) + bonus;
              await supabaseAdmin.from('profiles').update({ balance: newBalBonus }).eq('id', userId);
              await supabaseAdmin.from('balance_logs').insert([{
                user_id: userId, user_email: userEmail, amount: bonus, type: 'Bonus',
                description: `Bonus Welcome (Trx Pertama >= Rp${minTrx.toLocaleString('id-ID')})`,
                initial_balance: buyerProfile.balance || 0, final_balance: newBalBonus
              }]);
              buyerProfile.balance = newBalBonus; // Update lokal buat itung cashback nanti
            }
          }

          // B. 🤝 LOGIKA KOMISI REFERRAL
          const finalReferrerCode = buyerProfile.referred_by;
          if (finalReferrerCode) {
            // Tambahkan 'id' di dalam select biar TypeScript nggak marah
const { data: refProfile } = await supabaseAdmin.from('profiles').select('id, balance, email').eq('referral_code', finalReferrerCode).maybeSingle();
            const profitMurni = realRevenue - (currentOrder.buy_price || 0) - (currentOrder.cashback || 0);

            if (refProfile && profitMurni > 0) {
              const refRate = isFirstTransaction ? (settings.first_referral_percent || 7) : (settings.next_referral_percent || 5);
              const commission = Math.floor(profitMurni * (refRate / 100));

            if (commission > 0) {
              const newRefBal = (refProfile.balance || 0) + commission;
              // Kita pakai ID (UUID) si pengajak ya bos, jangan email lagi
              await supabaseAdmin.from('profiles').update({ balance: newRefBal }).eq('id', refProfile.id);
              await supabaseAdmin.from('balance_logs').insert([{ 
                user_id: refProfile.id, // Masukkan ID pengajak di sini
                user_email: refProfile.email, 
                amount: commission, 
                type: 'Referral',
                  description: `Komisi Referral - Order #${currentOrder.order_id}`,
                  initial_balance: refProfile.balance || 0, final_balance: newRefBal
                }]);
              }
            }
          }

          // C. 💰 LOGIKA CASHBACK BUYER (SPECIAL MEMBER)
          if (buyerProfile.member_type?.toLowerCase() === 'special') {
            const { data: productData } = await supabaseAdmin.from('products').select('cashback').eq('name', currentOrder.product_name).maybeSingle();
            const cbNominal = productData?.cashback || 0;
            if (cbNominal > 0) {
              const newBalCb = (buyerProfile.balance || 0) + cbNominal;
              await supabaseAdmin.from('profiles').update({ balance: newBalCb }).eq('id', userId);
              await supabaseAdmin.from('balance_logs').insert([{ 
                user_id: userId, user_email: userEmail, amount: cbNominal, type: 'Cashback', 
                description: `Cashback Special (Order #${currentOrder.order_id})`,
                initial_balance: buyerProfile.balance || 0, final_balance: newBalCb
              }]);
            }
          }
        }
      }
    } catch (commissionError: any) {
      console.error("⚠️ Error Komisi/Bonus (Non-Fatal):", commissionError.message);
    }

    // --- 7. FORMAT PESAN TELEGRAM ---
    const safeProductName = escapeHtml(currentOrder.product_name || "Produk Digital");
    const safeItemLabel = escapeHtml(currentOrder.item_label || "Item");
    const safeEmail = escapeHtml(userEmail || "Guest");
    
    const usedCoin = currentOrder.used_balance || 0;
    const nominalTransfer = currentOrder.total_amount || 0;
    const grandTotal = usedCoin + nominalTransfer;

    const detailPembayaran = usedCoin > 0 
      ? `🪙 Koin DaPay: <b>- Rp ${usedCoin.toLocaleString('id-ID')}</b>\n` +
        `💰 Nominal Transfer: <b>Rp ${nominalTransfer.toLocaleString('id-ID')}</b>\n` +
        `🧾 Total Pesanan: <b>Rp ${grandTotal.toLocaleString('id-ID')}</b>\n`
      : `💰 Nominal Transfer: <b>Rp ${nominalTransfer.toLocaleString('id-ID')}</b>\n`;

const message = `<b>DANA DITERIMA (WEBHOOK)!</b> 🤑\n\n` +
      `📢 Notif Dari: <b>${brandLogo}</b>\n` +
      `📦 Produk: <b>${safeProductName} - ${safeItemLabel}</b>\n` +
      detailPembayaran +
      `👤 User: ${safeEmail}\n` +
      `🆔 Invoice: <b>${currentOrder.order_id}</b>\n` +
      `🔄 Status: <b>DIPROSES (PROSES VENDOR)</b> ⏳\n\n` +
      `<i>*Sistem otomatis via MacroDroid.</i>`;

    await sendTelegram(message);

    // --- 8. EKSEKUSI PENEMBAKAN SUPPLIER --- [cite: 2026-02-28]
    if (settings?.is_digiflazz_active) {
       await processFulfillment(currentOrder); // Panggil fungsi nembak Digiflazz
    }

    return NextResponse.json({ success: true, message: `Invoice ${currentOrder.order_id} Sukses.` });

  } catch (err: any) {
    console.error("🔥 Webhook Fatal Error:", err.message);
    return NextResponse.json({ message: "Server Error", error: err.message }, { status: 500 });
  }
}

// --- FUNGSI PENDUKUNG: SMART ROUTING EKSEKUTOR ---
async function processFulfillment(order: any) {
   console.log(`🚀 [WEBHOOK BANK] Meneruskan Order #${order.order_id} ke Digiflazz...`);
   
   try {
       // Otomatis menggunakan URL Vercel yang sedang aktif [cite: 2026-03-06]
       const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
         ? `https://${process.env.NEXT_PUBLIC_SITE_URL}` 
         : `https://${process.env.VERCEL_URL}`;
       const kategoriLengkap = (order.category || "").toLowerCase();
       
       // Default arahkan ke Prabayar
       let apiEndpoint = `${baseUrl}/api/prabayar/checkout`; 
       
       // Belokkan ke Pascabayar jika ada kata kuncinya
       if (kategoriLengkap.includes('pascabayar') || kategoriLengkap.includes('ppob')) {
           apiEndpoint = `${baseUrl}/api/pascabayar/checkout`; 
       }

       console.log(`➡️ [ROUTE WEBHOOK BANK] Mengirim ke Endpoint: ${apiEndpoint}`);

// Tambahkan header Authorization sederhana jika API Checkout Bos butuh proteksi tambahan
fetch(apiEndpoint, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'x-webhook-secret': String(WEBHOOK_SECRET || '') // Pakai String() agar TS yakin ini bukan undefined
    },
    body: JSON.stringify({
        order_id: order.order_id,
        email: order.email,
        use_koin: false
    })
}).catch(e => console.error("Gagal trigger API Checkout dari Webhook:", e));
       
       return "Diproses";
   } catch (apiErr) {
       console.error("Gagal mengeksekusi rute Digiflazz:", apiErr);
       return "Gagal";
   }
}