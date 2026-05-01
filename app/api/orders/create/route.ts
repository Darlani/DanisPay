import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { isPaymentAllowed } from '@/utils/LogicPembayaran';
// crypto sudah tidak dipakai di sini, tapi saya biarkan agar tidak error jika ada module lain yang butuh
import crypto from 'crypto'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Ekstrak data dari frontend
    const { 
      sku, payment_method, total_amount, used_balance, user_id, email,
      product_name, order_id, game_id, item_label, user_contact,
      ip_address, device_id, referred_by, voucher_amount,
      voucher_code, inquiry_result, unique_code
    } = body;

    // --- 2. DETEKSI SUMBER PRODUK (Hybrid Search) ---
    let dbProduct: any = null;
    let productType: 'manual' | 'provider' = 'provider';

    const { data: semiAutoData } = await supabaseAdmin
      .from('product_semi_auto')
      .select('id, sku, name, price_numeric, cost_numeric, discount, cashback, categories(name)')
      .eq('sku', sku)
      .maybeSingle();

    if (semiAutoData) {
      dbProduct = { ...semiAutoData, price: semiAutoData.price_numeric, cost: semiAutoData.cost_numeric };
      productType = 'manual';
    } else {
      const { data: providerData } = await supabaseAdmin
        .from('product_automatic')
        .select('sku, name, price, cost, discount, cashback, categories(name)')
        .eq('sku', sku)
        .single();

      if (providerData) {
        dbProduct = providerData;
        productType = 'provider';
      }
    }

    if (!dbProduct) {
      return NextResponse.json({ error: "Produk tidak ditemukan di rak database!" }, { status: 400 });
    }

    // --- 2.5 CEK SAKLAR SIMULASI ---
    const { data: settings } = await supabaseAdmin.from('store_settings').select('is_digiflazz_active').single();
    const isLive = settings?.is_digiflazz_active ?? true;

    // --- 3. LOGIKA CASHBACK ---
    let finalCashback = 0;
    if (user_id) {
      const { data: userProfile } = await supabaseAdmin.from('profiles').select('member_type').eq('id', user_id).maybeSingle();
      if (userProfile?.member_type?.toLowerCase() === 'special') {
        finalCashback = dbProduct.cashback || 0;
      }
    } 

    // --- 4. VALIDASI HARGA SERVER-SIDE ---
    let hargaSeharusnya = 0;
    let modalPascabayar = 0;
    let hargaJualPascabayar = 0;
    let kodeUnikUser = 0; 
    let tagihanMurni = 0; 
    
    const totalInputUser = total_amount + used_balance + (voucher_amount || 0);
    const namaKategori = (dbProduct.categories as any)?.name?.toLowerCase() || "";
    
const isPascabayar = productType === 'provider' && (namaKategori.includes('pascabayar') || dbProduct.sku.toLowerCase() === 'pln');

if (isPascabayar) {
      try {
        // 1. Ambil data dari hasil inquiry yang dikirim frontend
        tagihanMurni = Number(inquiry_result?.amount || 0);
        const adminToko = Number(dbProduct.price || 0); 
        const adminSupplier = Number(inquiry_result?.adminSupplier || 0);

        // 1.5 EKSTRAK DENDA DARI DESC JSON
        let dendaTagihan = 0;
        try {
            if (inquiry_result?.desc?.detail && inquiry_result.desc.detail.length > 0) {
                dendaTagihan = Number(inquiry_result.desc.detail[0].denda) || 0;
            }
        } catch (e) {
            console.error("Gagal ekstrak denda:", e);
        }

        // 2. Hitung harga yang seharusnya dibayar user (WAJIB TAMBAH DENDA)
        hargaJualPascabayar = tagihanMurni + adminToko + dendaTagihan;
        modalPascabayar = tagihanMurni + adminSupplier + dendaTagihan; // Modal asli Bos ke Digiflazz (tambah denda)
        
        hargaSeharusnya = hargaJualPascabayar;
        
        // 3. Validasi angka yang dikirim Frontend vs Perhitungan Backend
        const selisihMurni = Math.floor(totalInputUser - hargaSeharusnya);
        kodeUnikUser = (selisihMurni > 0 && selisihMurni < 1000) ? selisihMurni : 0;
        const totalUserTanpaKodeUnik = Math.floor(totalInputUser - kodeUnikUser);

        // Toleransi dinaikkan sedikit ke 2000 untuk menghindari pembulatan sistem
        if (Math.abs(totalUserTanpaKodeUnik - hargaSeharusnya) > 2000) {
           console.error(`⚠️ Price Mismatch! DB: ${hargaSeharusnya}, User: ${totalUserTanpaKodeUnik}`);
           return NextResponse.json({ error: `Harga tagihan tidak sinkron, silakan ulangi cek tagihan.` }, { status: 400 });
        }
      } catch (error: any) {
        console.error("🔥 Error Pascabayar Create:", error.message);
        return NextResponse.json({ error: "Gagal memproses data tagihan." }, { status: 500 });
      }
    }
    else {
      // LOGIKA PRABAYAR
      hargaSeharusnya = Math.floor(dbProduct.price * (1 - ((dbProduct.discount || 0) / 100)));
      if (Math.abs(totalInputUser - hargaSeharusnya) > 1500) {
        return NextResponse.json({ error: "Deteksi manipulasi harga prabayar!" }, { status: 400 });
      }
    }

    // --- 5. VALIDASI PEMBAYARAN ---
    const { data: payData } = await supabaseAdmin.from('payment_accounts').select('is_maintenance, start_hour, end_hour, min_price').eq('name', payment_method).maybeSingle();
    const allowed = isPaymentAllowed(payment_method, product_name || "General", total_amount, payData);
    if (!allowed) return NextResponse.json({ error: "Metode pembayaran tidak tersedia." }, { status: 403 });

    // --- 6. PEMETAAN DATA KE TABEL ORDERS ---
    const safeProductName = dbProduct.name || product_name || "Produk Digital";
    let dynamicLabel = safeProductName; 
    if (isPascabayar && inquiry_result?.period) {
      dynamicLabel = `Tagihan ${inquiry_result.period}`;
    }

    const orderData = {
      order_id,
      // 🚀 PAKSA SIMPAN ID INQUIRY ASLI DARI DIGIFLAZZ (INQ-xxxx)
      api_ref_id: inquiry_result?.ref_id || order_id, 
      
      sku: dbProduct.sku,
      product_name: safeProductName,
      item_label: isPascabayar ? (inquiry_result?.period ? `Tagihan ${inquiry_result.period}` : "Tagihan Listrik") : item_label,
      game_id,
      buy_price: isPascabayar ? modalPascabayar : (dbProduct.cost || 0), 
      price: isPascabayar ? hargaJualPascabayar : (dbProduct.price || 0),
      discount: isPascabayar ? 0 : (dbProduct.discount || 0),
      voucher_code: voucher_code || null,
      voucher_amount: voucher_amount || 0,
      cashback: finalCashback, 
      unique_code: isPascabayar ? kodeUnikUser : Number(unique_code || 0),
      total_amount: total_amount, 
      payment_method,
      
      product_type: productType, 
      manual_product_id: productType === 'manual' ? dbProduct.id : null,

      status: (used_balance >= totalInputUser && !isLive) ? 'Berhasil' : 'Pending',
      sn: (used_balance >= totalInputUser && !isLive) ? `SIM-KOIN-${Math.floor(Math.random() * 9999)}` : null,

      user_contact,
      email: email || null,
      referred_by: referred_by || null,
      category: namaKategori || "umum",
      ip_address,
      device_id,
      used_balance,
      user_id: user_id || null,
      raw_tagihan: isPascabayar ? tagihanMurni : 0,

      customer_name: inquiry_result?.customerName || null,
      segment_power: inquiry_result?.segmentPower || null,
      // 🚀 TAMBAHKAN BARIS INI: Agar stand meter masuk ke database sejak awal
      stand_meter: inquiry_result?.standMeter || null, 
      
      // Simpan seluruh object desc dari frontend
      desc: inquiry_result?.desc ? inquiry_result.desc : (isPascabayar ? { info: "Waiting for payment..." } : null), 

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    };

    // --- 6.5 VALIDASI TABRAKAN & PEMBERSIHAN RESERVASI (CARA PRO) ---
    // Cek sekali lagi apakah nominal ini tiba-tiba dipakai orang lain dalam jeda milidetik
    const { data: duplicate } = await supabaseAdmin.from('orders').select('id').eq('status', 'Pending').eq('total_amount', total_amount).maybeSingle();
    
    if (duplicate) {
      return NextResponse.json({ error: "Nominal ini baru saja diambil orang lain, silakan klik Beli Sekarang lagi." }, { status: 409 });
    }

    // Hapus booking di tabel reservasi karena nominal sudah resmi jadi Order
    await supabaseAdmin.from('code_reservations').delete().eq('total_amount', total_amount);

    // --- 7. EKSEKUSI INSERT ---
    const { error: insertError } = await supabaseAdmin.from('orders').insert([orderData]); 
    if (insertError) throw insertError;

    return NextResponse.json({ success: true, order_id: order_id });

  } catch (err: any) {
    console.error("🔥 Error API Create:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}