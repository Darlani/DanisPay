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

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: "Order ID diperlukan" }, { status: 400 });
    }

    // 1. CEK SAKLAR DULU
    const { data: st } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();
    if (!st?.is_digiflazz_active) {
       return NextResponse.json({ error: "Mode Simulasi: Dilarang cek status ke vendor!" }, { status: 403 });
    }

    // TAMBAHAN: Tarik profiles(balance) agar siap untuk Refund
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*, profiles(balance, email)')
      .eq('order_id', order_id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order tidak ditemukan di DB" }, { status: 404 });
    }

    // PROTEKSI 90 HARI
    const createdDate = new Date(order.created_at);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    if (createdDate < ninetyDaysAgo) {
      return NextResponse.json({ error: "Order terlalu lama (> 90 hari), dilarang cek status!" }, { status: 403 });
    }

    // 2. SIAPKAN KREDENSI DIGIFLAZZ
    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    const targetRefId = order.api_ref_id || order_id;
    const targetSku = order.vendor_sku || order.sku;

    const sign = crypto.createHash('md5').update(username + apiKey + targetRefId).digest('hex');

    const kategori = (order.category || "").toLowerCase();
    const isPostpaid = kategori.includes('pascabayar') || kategori.includes('ppob');
    const isTokenPLN = kategori.includes('pln') || kategori.includes('token');

    // 3. TEMBAK API CEK STATUS
    console.log(`🔍 [CHECK STATUS] Menjemput bola untuk Inv: ${targetRefId} (${isPostpaid ? 'Pascabayar' : 'Prabayar'})`);

    const payload: any = {
      username,
      buyer_sku_code: targetSku,
      customer_no: order.game_id,
      ref_id: targetRefId,
      sign: sign
    };

    if (isPostpaid) payload.commands = "status-pasca";

    const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await digiRes.json();
    const digiData = result.data;

    if (!digiData) {
      return NextResponse.json({ error: "Tidak ada respon dari Digiflazz", raw: result }, { status: 500 });
    }

    const newStatus = digiData.status; 
    const sn = digiData.sn || order.sn;
    const message = digiData.message;

    // ==========================================
    // 4. LOGIKA UPDATE DATABASE
    // ==========================================
    
    // SKENARIO 1: BERHASIL
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

      await supabaseAdmin.from('orders').update(updatePayload).eq('id', order.id); 
      await reportToTelegram(`✅ <b>DETEKTIF BERHASIL!</b>\n\n🆔 Inv: <code>${order_id}</code>\n📦 SN: <code>${sn}</code>\n💰 Info: Status diperbarui via Jemput Bola.`);
      
      return NextResponse.json({ success: true, status: newStatus, sn: sn, message: message });
    }

    // SKENARIO 2: GAGAL (KITA PASANG OTAK AUTO-RETRY & REFUND)
    else if (newStatus === 'Gagal') {
      let isRetrying = false;

      if (!isPostpaid) {
        console.log(`⚠️ Detektif menemukan status Gagal. Mengecek Amunisi Auto-Retry untuk Order #${order_id}...`);
        
        let currentAttempt = 1;
        const match = targetRefId?.match(/-R(\d+)$/);
        if (match) currentAttempt = parseInt(match[1], 10);

        const { data: mainProd } = await supabaseAdmin.from('products').select('name, brand').eq('sku', order.sku).single();

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

          // CEK JIKA ADA AMUNISI SELANJUTNYA
          if (currentAttempt < validAlternatives.length) {
            const nextAlt = validAlternatives[currentAttempt]; 
            const nextAttempt = currentAttempt + 1;
            const nextRefId = `${order.order_id}-R${nextAttempt}`;

            console.log(`🚀 [DETEKTIF AUTO-RETRY] Mengalihkan ke Supplier ke-${nextAttempt}: SKU ${nextAlt.sku}`);

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

              // JIKA SUKSES ATAU PENDING, BATALKAN REFUND!
              if (d && (d.status === 'Sukses' || d.status === 'Pending')) {
                await supabaseAdmin.from('orders').update({
                  api_ref_id: nextRefId,
                  vendor_sku: nextAlt.sku,
                  status: d.status === 'Sukses' ? 'Berhasil' : 'Diproses',
                  sn: d.sn || `Retry Detektif ke-${nextAttempt}`,
                  updated_at: new Date().toISOString()
                }).eq('id', order.id);

                await reportToTelegram(`🔄 <b>AUTO-RETRY DETEKTIF AKTIF!</b>\n🆔 Inv: <code>${order.order_id}</code>\n🚀 Otomatis pindah ke Supplier ke-${nextAttempt} (${nextAlt.sku}).\n📊 Status: <b>${d.status}</b>`);
                
                isRetrying = true;
                return NextResponse.json({ success: true, status: d.status, sn: d.sn, message: "Auto-Retry Triggered!" });
              }
            } catch (err) {
              console.error("🔥 Detektif Retry Gagal Koneksi:", err);
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
            notes: `Otomatis Refund: Rp ${refundValue.toLocaleString('id-ID')} (${message})`,
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

        await reportToTelegram(`❌ <b>DETEKTIF MELAPORKAN GAGAL!</b>\n🆔 Inv: <code>${order_id}</code>\n⚠️ Alasan: ${message}\n💰 Telah di-Refund.`);
        return NextResponse.json({ success: true, status: 'Gagal', message: message });
      }
    }

    return NextResponse.json({ success: true, status: newStatus, sn: sn, message: message });

  } catch (err: any) {
    console.error("🔥 Error Check Status:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}