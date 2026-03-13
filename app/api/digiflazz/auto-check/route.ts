import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// 1. FUNGSI LAPOR TELEGRAM
async function reportToTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
  } catch (err) {
    console.error("💀 Telegram Gagal:", err);
  }
}

export async function GET(req: Request) {
  try {
    // 1. SATPAM API
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get('secret');
    const WEBHOOK_SECRET = process.env.MACRODROID_SECRET;

    if (querySecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Akses Ditolak!" }, { status: 401 });
    }

    // 2. AMBIL SETTING SAKLAR & CARI PESANAN
    const { data: st } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();
    
    if (!st?.is_digiflazz_active) {
       return NextResponse.json({ message: "Mode Simulasi: Satpam Patroli Libur Bos!" });
    }

    // TAMBAHAN: Tarik data profiles(balance) agar siap untuk Refund jika Gagal
    const { data: pendingOrders, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*, profiles(balance, email)')
      .eq('status', 'Diproses')
      .eq('product_type', 'provider') // 🕵️ Patroli hanya ngecek produk otomatis ke Digiflazz
      .order('updated_at', { ascending: true })
      .limit(5);

    if (fetchErr || !pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ message: "Tidak ada pesanan yang perlu dicek." });
    }

    console.log(`🕵️ [AUTO-CHECK] Memulai patroli untuk ${pendingOrders.length} pesanan...`);

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    // 3. LOOPING JEMPUT BOLA
    for (const order of pendingOrders) {
      
      const targetRefId = order.api_ref_id || order.order_id;
      const targetSku = order.vendor_sku || order.sku;
      const sign = crypto.createHash('md5').update(username + apiKey + targetRefId).digest('hex');
      
      const kategori = (order.category || "").toLowerCase();
      const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');
      const isTokenPLN = kategori.includes('pln') || kategori.includes('token');

      const payload: any = {
        username,
        buyer_sku_code: targetSku,
        customer_no: order.game_id,
        ref_id: targetRefId,
        sign: sign
      };

      if (isPostpaid) payload.commands = "status-pasca";

      try {
        const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await digiRes.json();
        const digiData = result.data;

        if (digiData) {
          const newStatus = digiData.status; 
          const sn = digiData.sn || order.sn;

          // ==========================================
          // SKENARIO 1: BERHASIL
          // ==========================================
          if (newStatus === 'Sukses') {
            const updatePayload: any = {
              status: 'Berhasil',
              sn: sn, 
              updated_at: new Date().toISOString()
            };

            if (isPostpaid || isTokenPLN) {
              updatePayload.desc = digiData.desc || null;
              if (digiData.desc && typeof digiData.desc === 'object') {
                updatePayload.customer_name = digiData.desc.nama || digiData.desc.nama_pelanggan || null;
                const tarif = digiData.desc.tarif || "";
                const daya = digiData.desc.daya || "";
                if (tarif || daya) updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
                
                const detailTagihan = digiData.desc.tagihan?.detail?.[0];
                if (detailTagihan && detailTagihan.meter_awal && detailTagihan.meter_akhir) {
                  updatePayload.stand_meter = `${detailTagihan.meter_awal} - ${detailTagihan.meter_akhir}`;
                } else if (digiData.desc.stand_meter) {
                  updatePayload.stand_meter = String(digiData.desc.stand_meter);
                }
              }
            }

            await supabaseAdmin.from('orders').update(updatePayload).eq('order_id', order.order_id);

            // Hitung jumlah retry dari api_ref_id
            let currentAttempt = 1;
            const matchId = order.api_ref_id?.match(/-R(\d+)$/);
            if (matchId) currentAttempt = parseInt(matchId[1], 10);
            const retryText = currentAttempt > 1 ? `\n🔄 AUTO-RETRY AKTIF! ${currentAttempt}x` : "";
            
            const hargaJual = (order.price || 0) + (order.used_balance || 0);
            const labaBersih = hargaJual - (order.buy_price || 0);

            console.log(`✅ [PATROLI] Pesanan ${order.order_id} SUKSES! SN: ${sn}`);
            await reportToTelegram(`✅ <b>TRANSAKSI BERHASIL!</b> 🚀${retryText}\n\n📦 Produk: ${order.product_name}\n💰 Harga Jual: Rp ${hargaJual.toLocaleString('id-ID')}\n💵 Est. Laba: Rp ${labaBersih.toLocaleString('id-ID')}\n👤 User: ${order.user_id ? 'MEMBER' : 'GUEST'}\n🆔 Inv: <code>${order.order_id}</code>\n📦 SN: <code>${sn}</code>\n🔄 Status: DIPROSES ➡️ BERHASIL`);
          } 
          
          // ==========================================
          // SKENARIO 2: GAGAL (KITA PASANG OTAK AUTO-RETRY & REFUND)
          // ==========================================
          else if (newStatus === 'Gagal') {
            let isRetrying = false;

            if (!isPostpaid) {
              console.log(`⚠️ Patroli menemukan status Gagal. Mengecek Amunisi Auto-Retry untuk Order #${order.order_id}...`);
              
              let currentAttempt = 1;
              const match = order.api_ref_id?.match(/-R(\d+)$/);
              if (match) currentAttempt = parseInt(match[1], 10);

              // Ganti ke nama tabel baru: product_automatic [cite: 2026-03-13]
const { data: mainProd } = await supabaseAdmin.from('product_automatic').select('name, brand').eq('sku', order.sku).single();

              if (mainProd) {
                const nominalTarget = mainProd.name.replace(/[^0-9]/g, '');
                const targetBrandSlug = mainProd.brand?.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || "";
                const isZonasi = (mainProd.name || "").toUpperCase().includes('ZONASI');

                const { data: candidates } = await supabaseAdmin.from('items')
                  .select('sku, modal, name, zona_type')
                  .eq('brand_slug', targetBrandSlug)
                  .eq('is_active', true)
                  .order('modal', { ascending: true });

                const validAlternatives = (candidates || []).filter(item => {
                  const itemNominal = item.name.replace(/[^0-9]/g, '');
                  const itemZona = (item.zona_type || "").toUpperCase() === 'ZONASI';
                  return itemNominal === nominalTarget && itemZona === isZonasi;
                });

                if (currentAttempt < validAlternatives.length) {
                  const nextAlt = validAlternatives[currentAttempt]; 
                  const nextAttempt = currentAttempt + 1;
                  const nextRefId = `${order.order_id}-R${nextAttempt}`;

                  console.log(`🚀 [PATROLI AUTO-RETRY] Mengalihkan ke Supplier ke-${nextAttempt}: SKU ${nextAlt.sku}`);

                  const retrySign = crypto.createHash('md5').update(username + apiKey + nextRefId).digest('hex');
                  
                  try {
                    const digiResRetry = await fetch('https://api.digiflazz.com/v1/transaction', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        username, buyer_sku_code: nextAlt.sku, customer_no: order.game_id, ref_id: nextRefId, sign: retrySign
                      })
                    });

                    const digiDataRetry = await digiResRetry.json();
                    const d = digiDataRetry.data;

                    // JIKA SUKSES ATAU PENDING, BATALKAN REFUND
                    if (d && (d.status === 'Sukses' || d.status === 'Pending')) {
                      await supabaseAdmin.from('orders').update({
                        api_ref_id: nextRefId,
                        vendor_sku: nextAlt.sku,
                        status: d.status === 'Sukses' ? 'Berhasil' : 'Diproses',
                        sn: d.sn || `Retry Patroli ke-${nextAttempt}`,
                        updated_at: new Date().toISOString()
                      }).eq('id', order.id);
                      
                      isRetrying = true; // Tandai sedang retry
                    }
                  } catch (err) {
                    console.error("🔥 Patroli Retry Gagal Koneksi:", err);
                  }
                }
              }
            }

            // JIKA TIDAK ADA RETRY ATAU AMUNISI HABIS -> EKSEKUSI REFUND
            if (!isRetrying) {
              const refundValue = order.total_amount; 

              if (order.user_id) {
                const currentBalance = (order.profiles as any)?.balance || 0;
                const newBalance = currentBalance + refundValue;
                const userEmail = (order.profiles as any)?.email || order.email;

                await supabaseAdmin.from('profiles').update({ balance: newBalance }).eq('id', order.user_id);
                
                await supabaseAdmin.from('balance_logs').insert([{
                  user_id: order.user_id,
                  user_email: userEmail,
                  amount: refundValue,
                  type: 'Refund',
                  description: `Refund Gagal Order #${order.order_id}`,
                  initial_balance: currentBalance,
                  final_balance: newBalance
                }]);

                await supabaseAdmin.from('orders').update({ 
                  status: 'Gagal', 
                  notes: `Otomatis Refund: Rp ${refundValue.toLocaleString('id-ID')} (${digiData.message})`,
                  updated_at: new Date().toISOString() 
                }).eq('id', order.id);
              } 
              else {
                // SKENARIO GUEST
                await supabaseAdmin.from('orders').update({ 
                  status: 'Gagal', 
                  notes: `Gagal - WAJIB REFUND MANUAL: Rp ${refundValue.toLocaleString('id-ID')} (GUEST)`,
                  updated_at: new Date().toISOString() 
                }).eq('id', order.id);
              }

              // Hitung jumlah retry yang sudah dilakukan
              let currentAttempt = 1;
              const matchId = order.api_ref_id?.match(/-R(\d+)$/);
              if (matchId) currentAttempt = parseInt(matchId[1], 10);
              const retryText = currentAttempt > 1 ? `\n🔄 AUTO-RETRY HABIS: ${currentAttempt}x` : "";

              const nominalTransfer = (order.price || 0) + (order.used_balance || 0);
              const userStatus = order.user_id ? 'MEMBER (Koin Kembali)' : 'GUEST (Butuh Refund Manual)';

              await reportToTelegram(`❌ <b>TRANSAKSI GAGAL!</b> 😭${retryText}\n\n📦 Produk: ${order.product_name}\n💰 Nominal: Rp ${nominalTransfer.toLocaleString('id-ID')}\n⚠️ Alasan: ${digiData.message || 'Stok Kosong / Gangguan'}\n👤 User: ${userStatus}\n🆔 Inv: <code>${order.order_id}</code>\n🔄 Status: DIPROSES ➡️ GAGAL`);
            }
          }
        }
      } catch (e) {
        console.error(`Gagal cek order ${order.order_id}:`, e);
      }
    }

    return NextResponse.json({ success: true, processed: pendingOrders.length });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}