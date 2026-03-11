import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { isPaymentAllowed } from '@/utils/LogicPembayaran';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Ekstrak data dari frontend
    const { 
      sku, 
      payment_method, 
      total_amount, 
      used_balance, 
      user_id, 
      email,
      product_name,
      order_id,
      game_id,
      item_label,
      user_contact,
      ip_address,
      device_id,
      referred_by,
      voucher_amount,
      voucher_code
    } = body;

    // --- 2. AMBIL DATA PRODUK SPESIFIK (Anti select *, render < 200ms) [cite: 2026-03-09]
    const { data: dbProduct, error: pError } = await supabaseAdmin
      .from('products')
      .select(`
        sku, 
        name, 
        price, 
        cost, 
        discount, 
        cashback, 
        categories (
          name
        )
      `)
      .eq('sku', sku)
      .single();

    if (pError || !dbProduct) {
      return NextResponse.json({ error: "Produk tidak ditemukan di database!" }, { status: 400 });
    }

    // --- 3. LOGIKA CASHBACK (KHUSUS MEMBER SPECIAL) ---
    let finalCashback = 0;

    if (user_id) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('member_type')
        .eq('id', user_id)
        .maybeSingle();

      if (userProfile?.member_type?.toLowerCase() === 'special') {
        finalCashback = dbProduct.cashback || 0;
      }
    } 

    // --- 4. VALIDASI HARGA SERVER-SIDE (Anti-Cheat) ---
    let hargaSeharusnya = 0;
    let modalPascabayar = 0;
    let hargaJualPascabayar = 0;
    let kodeUnikUser = 0; 
    let tagihanMurni = 0; // <--- Tambahkan ini buat nyimpen nilai tagihan aslinya 
    
    const totalInputUser = total_amount + used_balance + (voucher_amount || 0);
    // Gunakan as any untuk akses nama kategori (Solusi error TypeScript) [cite: 2026-03-09]
    const namaKategori = (dbProduct.categories as any)?.name?.toLowerCase() || "";
    const isPascabayar = namaKategori.includes('pascabayar') || dbProduct.sku.toLowerCase() === 'pln';

    if (isPascabayar) {
      try {
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        const cleanCustomerId = game_id.split('(')[0].trim();

        const inqRes = await fetch(`${baseUrl}/api/digiflazz/pascabayar/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: cleanCustomerId, sku: dbProduct.sku, category: namaKategori })
        });

        const inqData = await inqRes.json();
        if (!inqRes.ok || !inqData.data) {
          return NextResponse.json({ error: "Gagal memverifikasi ulang tagihan ke pusat." }, { status: 400 });
        }

        // Hapus const agar dia menimpa variabel global yang kita buat di atas
        tagihanMurni = Number(inqData.data.desc?.detail?.[0]?.nilai_tagihan || 0);
        const adminDigiflazz = Number(inqData.data.admin || 5000);
        const adminToko = Number(dbProduct.price || 0); 
        
        modalPascabayar = tagihanMurni + adminDigiflazz;
        hargaJualPascabayar = tagihanMurni + adminToko;
        hargaSeharusnya = hargaJualPascabayar;
        
        const selisihMurni = Math.floor(totalInputUser - hargaSeharusnya);
        kodeUnikUser = (selisihMurni > 0 && selisihMurni < 1000) ? selisihMurni : 0;
        
        const totalUserTanpaKodeUnik = totalInputUser - kodeUnikUser;

        if (Math.abs(totalUserTanpaKodeUnik - hargaSeharusnya) > 1000) {
          return NextResponse.json({ 
            error: `Deteksi manipulasi! DB: ${hargaSeharusnya}, Input: ${totalUserTanpaKodeUnik}` 
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ error: "Gagal koneksi ke server inquiry pascabayar." }, { status: 500 });
      }
    } else {
      // LOGIKA PRABAYAR
      hargaSeharusnya = Math.floor(dbProduct.price * (1 - ((dbProduct.discount || 0) / 100)));
      
      const listButuhInquiry = ['pln', 'game']; 
      if (listButuhInquiry.some(kw => namaKategori.includes(kw) || dbProduct.sku.toLowerCase().includes(kw))) {
        try {
          const protocol = req.headers.get('x-forwarded-proto') || 'http';
          const host = req.headers.get('host');
          const baseUrl = `${protocol}://${host}`;
          
          await fetch(`${baseUrl}/api/digiflazz/prabayar/inquiry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: game_id, sku: dbProduct.sku })
          });
        } catch (e) { console.error("Re-inquiry prabayar skip"); }
      }

      if (Math.abs(totalInputUser - hargaSeharusnya) > 1500) {
        return NextResponse.json({ error: "Deteksi manipulasi harga prabayar!" }, { status: 400 });
      }
    }

    // --- 5. VALIDASI PEMBAYARAN ---
    const { data: payData } = await supabaseAdmin
      .from('payment_accounts')
      .select('is_maintenance, start_hour, end_hour, min_price')
      .eq('name', payment_method)
      .maybeSingle();

const allowed = isPaymentAllowed(payment_method, product_name || "General", total_amount, payData);
    if (!allowed) {
      return NextResponse.json({ error: "Metode pembayaran tidak tersedia (Maintenance/Limit)." }, { status: 403 });
    }

    // --- 5.5 LOGIKA SMART UNIQUE CODE (RANGE DINAMIS) ---
    const limaMenitLalu = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: trafik } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true }) // Hemat resource, tanya ID saja
      .eq('status', 'Pending')
      .gte('created_at', limaMenitLalu);

    const jumlahPending = trafik || 0;
    let maxRange = 200; // Default Sepi

    if (jumlahPending > 15) {
      maxRange = 999; // Ramai
    } else if (jumlahPending > 5) {
      maxRange = 500; // Sedang
    }

    // Selalu mulai dari 001 sampai maxRange
    const kodeUnikPusat = Math.floor(Math.random() * maxRange) + 1;

    // --- 6. PEMETAAN DATA KE TABEL ORDERS ---
const orderData = {
      order_id,
      sku: dbProduct.sku,
      product_name: dbProduct.name,
      item_label,
      game_id,
      buy_price: isPascabayar ? modalPascabayar : (dbProduct.cost || 0), 
      price: isPascabayar ? hargaJualPascabayar : (dbProduct.price || 0),
      discount: isPascabayar ? 0 : (dbProduct.discount || 0),
      voucher_code: voucher_code || null,
      voucher_amount: voucher_amount || 0,
      cashback: finalCashback, 
      // Kode unik untuk prabayar sekarang pakai hasil hitungan trafik dinamis
      unique_code: isPascabayar ? kodeUnikUser : kodeUnikPusat,
      // Total bayar prabayar = Harga + Kode Unik Trafik
      total_amount: isPascabayar ? total_amount : (hargaSeharusnya + kodeUnikPusat),
      payment_method,
      status: 'Pending',
      user_contact,
      email: email || null,
      referred_by: referred_by || null,
      category: (dbProduct.categories as any)?.name || "umum",
      ip_address,
      device_id,
      used_balance,
      user_id: user_id || null,
      // HANYA TERISI JIKA PASCABAYAR, PRABAYAR TETAP 0
      raw_tagihan: isPascabayar ? tagihanMurni : 0,
      desc: isPascabayar ? { info: "Waiting for payment..." } : null, 
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    };

    // --- 7. EKSEKUSI INSERT ---
    const { error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([orderData]); 
    
    if (insertError) {
      console.error("❌ Gagal Simpan Order:", insertError.message);
      return NextResponse.json({ error: "Gagal menyimpan pesanan." }, { status: 500 });
    }

    return NextResponse.json({ success: true, order_id: order_id });

  } catch (err: any) {
    console.error("🔥 Error API Create:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}