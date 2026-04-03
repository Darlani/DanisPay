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
      // Panggil kolom yang dipakai saja: id, order_id, status, sku, game_id, category [cite: 2026-03-07]
      supabaseAdmin.from('orders')
        .select('id, order_id, status, sku, game_id, category')
        .eq('order_id', order_id)
        .single(),
      supabaseAdmin.from('store_settings').select('is_digiflazz_active').single()
    ]);

    const order = orderRes.data;
    const isLiveMode = settingsRes.data?.is_digiflazz_active === true;

    if (orderRes.error || !order) return NextResponse.json({ error: "Pesanan tidak ditemukan!" }, { status: 404 });
    
    if (order.status !== 'Pending' && order.status !== 'Diproses') {
      return NextResponse.json({ error: "Pesanan sudah diproses!" }, { status: 400 });
    }

if (isLiveMode) {
      console.log(`🚀 [AUTO-FALLBACK] Mencari harga TERMURAH untuk Order #${order_id}...`);
      
      // 1. Ambil data dari gudang baru: product_automatic [cite: 2026-03-13]
      const { data: mainProd } = await supabaseAdmin
        .from('product_automatic')
        .select('name, brand, sku')
        .eq('sku', order.sku)
        .single();

      if (!mainProd) return NextResponse.json({ error: "Data produk tidak ditemukan di katalog." }, { status: 404 });

      // 1. AMBIL NAMA UTUH (KECILKAN HURUFNYA & BERSIHKAN SPASI KOSONG)
      const exactTargetName = mainProd.name.toLowerCase().trim();
      const targetBrandSlug = slugify(mainProd.brand || "");
      const isZonasi = (mainProd.name || "").toUpperCase().includes('ZONASI');

      // 2. CARI SEMUA KANDIDAT DI TABEL ITEMS (URUTKAN MODAL TERMURAH)
      const { data: candidates } = await supabaseAdmin
        .from('items')
        .select('sku, modal, name, zona_type')
        .eq('brand_slug', targetBrandSlug)
        .eq('is_active', true)
        .order('modal', { ascending: true }); // KUNCI UTAMA: Termurah di atas

      // 3. COCOKKAN NAMA 100% SAMA PERSIS (ANTI SALAH SASARAN!) [cite: 2026-03-07]
      let validAlternatives = (candidates || []).filter(item => {
        const itemName = item.name.toLowerCase().trim();
        const itemZona = (item.zona_type || "").toUpperCase() === 'ZONASI';
        
        // Tolak mentah-mentah kalau namanya beda sehuruf pun!
        return itemName === exactTargetName && itemZona === isZonasi;
      });

      console.log(`🎯 Ditemukan ${validAlternatives.length} supplier untuk produk ${exactTargetName}`);

      // 3. JIKA TIDAK ADA DI ITEMS, PAKAI SKU ASLI
      if (validAlternatives.length === 0) {
        console.log("⚠️ Tidak ada alternatif di tabel Items, menggunakan SKU asli.");
        validAlternatives.push({ 
          sku: order.sku, 
          modal: 0, 
          name: mainProd.name, 
          zona_type: isZonasi ? 'ZONASI' : '' 
        });
      }

      let isSuccess = false;
      let finalResponse: any = null;
      let finalSkuUsed = "";
      let finalRefIdUsed = "";
      let attempt = 0;

      // 4. LOOPING COBA BELI (MULAI DARI YANG PALING MURAH)
      for (const alt of validAlternatives) {
        attempt++;
        const currentRefId = attempt === 1 ? order_id : `${order_id}-R${attempt}`;
        const sign = crypto.createHash('md5').update(username + apiKey + currentRefId).digest('hex');

        console.log(`🔄 Percobaan ${attempt}: Menggunakan SKU ${alt.sku} (Modal: ${alt.modal})`);

        try {
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
          const d = digiData.data;

          if (d && (d.status === 'Sukses' || d.status === 'Pending')) {
            isSuccess = true;
            finalResponse = d;
            finalSkuUsed = alt.sku;
            finalRefIdUsed = currentRefId;
            console.log(`✅ BERHASIL/PENDING dengan SKU: ${alt.sku}`);
            break; 
          } else {
            console.log(`❌ GAGAL dengan SKU ${alt.sku}: ${d?.message || 'Vendor Error'}`);
            finalResponse = d; 
          }
        } catch (e) {
          console.error(`🔥 Koneksi Timeout untuk SKU ${alt.sku}`);
        }
      }

      // 5. UPDATE DATABASE HASIL AKHIR
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

        // Tambahkan baris ini Bos, biar detail error Digiflazz muncul di pm2 logs
        console.error(`🚨 [FINAL FAIL] Order: ${order_id} | SKU Terakhir: ${finalSkuUsed} | Pesan Vendor:`, JSON.stringify(finalResponse));

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