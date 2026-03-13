import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // --- 0. PROTEKSI MAINTENANCE & SAKLAR SIMULASI ---
    const { data: settings } = await supabaseAdmin
      .from('store_settings')
      .select('is_maintenance, is_maintenance_digiflazz, is_digiflazz_active')
      .single();

    // A. Cek Maintenance Global
    if (settings?.is_maintenance) {
      return NextResponse.json({ error: "Toko sedang maintenance, pembayaran via koin dihentikan sementara." }, { status: 503 });
    }

    const { order_id, email } = await req.json();

// 1. Ambil data Order (Hanya kolom yang diperlukan saja Bos! [cite: 2026-03-07])
    const [orderRes, profileRes] = await Promise.all([
      supabaseAdmin.from('orders')
        .select('id, order_id, status, used_balance, user_id, category, price, buy_price, product_name, item_label, referred_by, cashback, raw_tagihan, product_type')
        .eq('order_id', order_id).single(),
      supabaseAdmin.from('profiles').select('id, balance, email, member_type, referred_by').eq('email', email).single()
    ]);

    const order = orderRes.data;
    const profile = profileRes.data;

    if (!order || !profile) throw new Error('Data tidak ditemukan');

    // 🔥 GEMBOK 1: CEK STATUS ORDER (ANTI DOUBLE CLICK)
    if (order.status === 'Berhasil' || order.status === 'Selesai') {
      throw new Error('Order ini sudah diproses sebelumnya!');
    }

    // 🔥 GEMBOK 2: CEK SALDO CUKUP ATAU NGGAK
    if ((profile.balance || 0) < (order.used_balance || 0)) {
      throw new Error('Saldo Koin DaPay tidak mencukupi!');
    }

// 2. Hitung Saldo & Cashback Buyer
    const isSpecial = profile.member_type?.toLowerCase() === 'special';
    const cbNominal = isSpecial ? (order.cashback || 0) : 0;
    // Ubah jadi 'let' agar nanti bisa kita tambahkan bonus kalau syaratnya terpenuhi
    let finalBalance = profile.balance - order.used_balance + cbNominal;

    // 3. PROSES KOMISI REFERRAL
    if (order.referred_by) {
      try {
        const [settingsRes, refProfileRes] = await Promise.all([
          supabaseAdmin.from('store_settings').select('*').single(),
          // Tambahkan 'id' di sini biar TypeScript nggak bingung pas kita panggil refProfile.id
          supabaseAdmin.from('profiles').select('id, balance, email').eq('referral_code', order.referred_by).maybeSingle()
        ]);

        const settings = settingsRes.data;
        const refProfile = refProfileRes.data;

        // --- REVISI PERHITUNGAN PROFIT FULL KOIN (PASCABAYAR & PRABAYAR) ---
        const kategori = (order.category || "").toLowerCase();
        const isPascabayar = kategori.includes('pascabayar') || kategori.includes('pln');

        let profitMurni = 0;
        if (isPascabayar) {
          // Modal Real = Tagihan Murni + Admin Digiflazz
          const modalReal = (order.raw_tagihan || 0) + (order.buy_price || 0);
          profitMurni = (order.used_balance || 0) - modalReal - (order.cashback || 0);
        } else {
          // Produk Prabayar Biasa
          profitMurni = (order.used_balance || 0) - (order.buy_price || 0) - (order.cashback || 0);
        }

        if (refProfile && settings && profitMurni > 0) {
      // Pakai profile.id biar lebih akurat nyari riwayatnya
      const { count } = await supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id).eq('status', 'Berhasil');
          
          const isFirst = (count || 0) <= 0;

          // ==========================================================
          // 🎁 LOGIKA BONUS PENDAFTAR BARU (DINAMIS DARI DATABASE)
          // ==========================================================
          if (isFirst && settings.welcome_bonus_amount > 0) {
            const minTrx = settings.welcome_bonus_min_trx || 50000;
            
            // Cek apakah nilai transaksinya memenuhi syarat minimal
            if ((order.used_balance || 0) >= minTrx) {
              const welcomeBonus = settings.welcome_bonus_amount;
              
              // 1. Tambahkan bonus langsung ke finalBalance yang akan di-update di Langkah 4
              finalBalance += welcomeBonus; 

              // 2. Kita HANYA insert log-nya saja di sini. 
              // Update profilnya biar diurus di Poin 4 (Eksekusi Final) sekalian biar nggak double-update.
              await supabaseAdmin.from('balance_logs').insert([{
                  user_id: profile.id, // Tambahkan ini bos!
                  user_email: email,
                  amount: welcomeBonus,
                  type: 'Bonus',
                  description: `Bonus Welcome (Trx Pertama >= Rp${minTrx.toLocaleString('id-ID')})`,
                  initial_balance: profile.balance,
                  final_balance: profile.balance + welcomeBonus
              }]);
              
              console.log(`🎁 Bonus Welcome Rp${welcomeBonus} siap dieksekusi ke ${email}`);
            }
          }
          // ==========================================================

          // 2. Lanjut ke Logika Komisi Pengajak (Referrer)
          const rate = isFirst ? settings.first_referral_percent : settings.next_referral_percent;
          const commission = Math.floor(profitMurni * (rate / 100));

          if (commission > 0) {
            const newRefBal = (refProfile.balance || 0) + commission;

            // Update Pengajak (Parallel)
          await Promise.all([
            supabaseAdmin.from('profiles').update({ balance: newRefBal }).eq('id', refProfile.id),
            supabaseAdmin.from('orders').update({ referral_commission: commission }).eq('order_id', order_id),
            supabaseAdmin.from('balance_logs').insert([{
              user_id: refProfile.id, // Catat ID-nya juga di log
              user_email: refProfile.email,
                amount: commission,
                type: 'Referral',
                description: `Komisi Referral ${rate}% (Full Koin #${order_id})`,
                initial_balance: refProfile.balance || 0,
                final_balance: newRefBal
              }])
            ]);
          }
        }
      } catch (refErr) {
        console.error("❌ Referral Error:", refErr);
      }
    }

// 4. EKSEKUSI FINAL (DENGAN TANDA WAKTU BARU)
    await Promise.all([
      supabaseAdmin.from('profiles').update({ balance: finalBalance }).eq('id', profile.id),
      supabaseAdmin.from('orders').update({ 
        status: 'Diproses',
        updated_at: new Date().toISOString() 
      }).eq('order_id', order_id),
      supabaseAdmin.from('balance_logs').insert([{ 
        user_id: profile.id, 
        user_email: email, 
        amount: -order.used_balance + cbNominal, 
        type: 'Payment', 
        description: `Full Koin Order #${order_id}`,
        initial_balance: profile.balance,
        final_balance: finalBalance
      }])
    ]);

    // 5. 🕵️ LOGIKA DETEKSI JALUR (HYBRID: KTP + KEYWORDS)
    const kategoriNotif = (order.category || "").toLowerCase();
    const manualKeywords = ['manual', 'jasa', 'konten', 'software', 'voucher'];
    const isManualProduct = order.product_type === 'manual' || manualKeywords.some(k => kategoriNotif.includes(k));

    const telegramMsg = `<b>TRANSAKSI FULL KOIN!</b> 🪙\n\n` +
      `📦 Produk: <b>${order.product_name} - ${order.item_label}</b>\n` +
      `🪙 Koin DaPay: <b>- Rp ${order.used_balance.toLocaleString('id-ID')}</b>\n` +
      `👤 User: <b>${email}</b>\n` +
      `🆔 Invoice: <b>${order_id}</b>\n` +
      `🔄 Status: <b>DIPROSES (${isManualProduct ? 'PROSES MANUAL/STOK' : 'NEMBAK VENDOR'})</b>\n\n` + 
      `<i>*Catatan: ${isManualProduct ? 'Mohon segera diproses manual!' : 'Menunggu eksekusi.'}</i>`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // 🤫 LOGIKA SENYAP FASE 1
    if (!settings?.is_digiflazz_active || isManualProduct) {
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: telegramMsg, parse_mode: 'HTML' })
      }).catch(e => console.error("Gagal lapor telegram di background:", e.message));
    }

    // 6. EKSEKUSI KE DIGIFLAZZ (HANYA JIKA LIVE AKTIF & BUKAN PRODUK MANUAL)
    if (settings?.is_digiflazz_active && !isManualProduct) {
       console.log(`🚀 [FULL KOIN] Mode Live Aktif. Meneruskan Order #${order.order_id} ke Digiflazz...`);
       
       try {
// Pakai localhost VPS sendiri agar anti-rto dan hemat bandwidth [cite: 2026-03-06]
        const baseUrl = "http://127.0.0.1:3000";

        const WEBHOOK_SECRET = String(process.env.MACRODROID_SECRET || ''); // Kunci internal
           const kategoriLengkap = (order.category || "").toLowerCase();
           
// Arahkan ke rute baru yang sudah dipindah ke folder digiflazz [cite: 2026-03-06]
           let apiEndpoint = `${baseUrl}/api/digiflazz/prabayar/checkout`; 
           
           if (kategoriLengkap.includes('pascabayar') || kategoriLengkap.includes('ppob')) {
               apiEndpoint = `${baseUrl}/api/digiflazz/pascabayar/checkout`; 
           }

           console.log(`➡️ [ROUTE FULL KOIN] Mengirim ke Endpoint: ${apiEndpoint}`);

           // Eksekusi tembakan ke API tanpa memblokir response ke user (berjalan di background)
           fetch(apiEndpoint, {
               method: 'POST',
               headers: { 
              'Content-Type': 'application/json',
              'x-webhook-secret': WEBHOOK_SECRET // Proteksi agar hanya server kita yang bisa nembak
          },
               body: JSON.stringify({
                   order_id: order.order_id,
                   email: email,
                   use_koin: true 
               })
           }).catch(e => console.error("Gagal trigger API Checkout dari Full Koin:", e));
           
       } catch (apiErr) {
           console.error("Gagal mengeksekusi rute Digiflazz:", apiErr);
       }
    } else {
       console.log("🛠️ MODE SIMULASI: Pesanan sukses di web saja, saldo Digiflazz aman!");
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 FATAL ERROR COIN ROUTE:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}