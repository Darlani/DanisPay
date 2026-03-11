import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const slugify = (text: string) => 
  text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id } = body;

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || ""; 

    if (!username || !apiKey) {
      return NextResponse.json({ error: "Konfigurasi Digiflazz di .env belum lengkap!" }, { status: 500 });
    }

    const [orderRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('orders').select('*').eq('order_id', order_id).single(),
      supabaseAdmin.from('store_settings').select('is_digiflazz_active').single()
    ]);

    const order = orderRes.data;
    const isLiveMode = settingsRes.data?.is_digiflazz_active === true;

    if (orderRes.error || !order) return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    
    if (order.status !== 'Pending' && order.status !== 'Diproses') {
      return NextResponse.json({ error: "Pesanan sudah diproses!" }, { status: 400 });
    }

    if (isLiveMode) {
      console.log(`🚀 [PRABAYAR LIVE] Memulai sistem Auto-Fallback untuk Order #${order_id}...`);
      
      const { data: prod } = await supabaseAdmin.from('products').select('*').eq('sku', order.sku).single();
      if (!prod) return NextResponse.json({ error: "Data produk tidak ditemukan di katalog." }, { status: 404 });

      const nominalMatch = prod.name.match(/\d+([.,]\d+)?/);
      const targetNominal = nominalMatch ? nominalMatch[0] : null;
      const isZonasi = (prod.name || "").toUpperCase().includes('ZONASI');
      const targetBrandSlug = slugify(prod.brand || "");

      const { data: candidates } = await supabaseAdmin.from('items')
        .select('*')
        .eq('brand_slug', targetBrandSlug)
        .eq('is_active', true)
        .order('modal', { ascending: true });

      let validAlternatives = (candidates || []).filter(item => {
        const itemNominalMatch = item.name.match(/\d+([.,]\d+)?/);
        const itemNominal = itemNominalMatch ? itemNominalMatch[0] : null;
        const itemZona = (item.zona_type || "").toUpperCase() === 'ZONASI';
        return itemNominal === targetNominal && itemZona === isZonasi;
      });

      if (validAlternatives.length === 0) {
        validAlternatives.push({ sku: order.sku, modal: 0 });
      }

      let isSuccess = false;
      let finalResponse: any = null;
      let finalSkuUsed = "";
      let finalRefIdUsed = "";
      let attempt = 0;

      for (const alt of validAlternatives) {
        attempt++;
        const currentRefId = attempt === 1 ? order_id : `${order_id}-R${attempt}`;
        const sign = crypto.createHash('md5').update(username + apiKey + currentRefId).digest('hex');

        const digiRes = await fetch('https://api.digiflazz.com/v1/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            buyer_sku_code: alt.sku,
            customer_no: order.game_id,
            ref_id: currentRefId,
            sign: sign
          })
        });

        const digiData = await digiRes.json();

        if (digiData.data && (digiData.data.status === 'Sukses' || digiData.data.status === 'Pending')) {
          isSuccess = true;
          finalResponse = digiData.data;
          finalSkuUsed = alt.sku;
          finalRefIdUsed = currentRefId;
          break; 
        } else {
          finalResponse = digiData.data; 
        }
      }

      if (isSuccess) {
        // --- TAMBAHAN LOGIKA STRUK (Agar Token PLN langsung muncul Nama) ---
        const kategori = (order.category || "").toLowerCase();
        const isTokenPLN = kategori.includes('pln') || kategori.includes('token');

        const updatePayload: any = { 
          status: finalResponse.status === 'Sukses' ? 'Berhasil' : 'Diproses',
          sn: finalResponse.sn || 'Proses di Vendor',
          api_ref_id: finalRefIdUsed,
          vendor_sku: finalSkuUsed,
          updated_at: new Date().toISOString()
        };

        // Jika ini Token PLN dan ada data desc, langsung bongkar!
        if (isTokenPLN && finalResponse.desc && typeof finalResponse.desc === 'object') {
           updatePayload.desc = JSON.stringify(finalResponse.desc);
           updatePayload.customer_name = finalResponse.desc.nama || finalResponse.desc.nama_pelanggan || null;
           
           const tarif = finalResponse.desc.tarif || "";
           const daya = finalResponse.desc.daya || "";
           if (tarif || daya) updatePayload.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
        }

        await supabaseAdmin.from('orders').update(updatePayload).eq('order_id', order_id);

        return NextResponse.json({ success: true, status: finalResponse.status, sn: finalResponse.sn, sku_used: finalSkuUsed });
      } else {
        await supabaseAdmin.from('orders').update({ 
          status: 'Gagal',
          updated_at: new Date().toISOString()
        }).eq('order_id', order_id);

        return NextResponse.json({ error: finalResponse?.message || "Semua stok alternatif sedang gangguan", raw: finalResponse }, { status: 500 });
      }

    } else {
      // 🛠️ MODE SIMULASI
      const dummySN = `SIM-PRA-${Math.floor(Math.random() * 999999)}`;
      await supabaseAdmin.from('orders').update({ status: 'Berhasil', sn: dummySN }).eq('order_id', order_id);
      return NextResponse.json({ success: true, status: 'Sukses', sn: dummySN });
    }

  } catch (err: any) {
    console.error("Fatal Error Checkout Prabayar:", err.message);
    return NextResponse.json({ error: "Terjadi kesalahan internal!" }, { status: 500 });
  }
}