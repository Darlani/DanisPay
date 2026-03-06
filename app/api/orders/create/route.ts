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

    // --- 2. AMBIL DATA PRODUK + JOIN NAMA KATEGORI ---
    // Kita ambil 'name' dari tabel categories biar gak muncul UUID lagi bos!
    const { data: dbProduct, error: pError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
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

    // Cek apakah user login (punya user_id)
    if (user_id) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('member_type')
        .eq('id', user_id)
        .maybeSingle();

      // Hanya Member Special yang dapet cashback sesuai tabel product
      if (userProfile?.member_type?.toLowerCase() === 'special') {
        finalCashback = dbProduct.cashback || 0;
      }
    } 
    // Jika user_id kosong, berarti dia GUEST, cashback tetap 0.

    // --- 4. VALIDASI HARGA SERVER-SIDE (Anti-Cheat) ---
    let hargaSeharusnya = 0;
    let modalPascabayar = 0;
    let hargaJualPascabayar = 0;
    let kodeUnikUser = 0; // Kita kenalkan di sini biar bisa dipakai di bawah
    
    const totalInputUser = total_amount + used_balance + (voucher_amount || 0);
    const namaKategori = dbProduct.categories?.name?.toLowerCase() || "";
    const isPascabayar = namaKategori.includes('pascabayar') || dbProduct.sku.toLowerCase() === 'pln';

    if (isPascabayar) {
      // LOGIKA PASCABAYAR (RE-INQUIRY KE BACKEND INTERNAL)
      try {
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        // Ekstrak ID Pelanggan murni (hilangkan zoneId jika formatnya accId(zoneId))
        const cleanCustomerId = game_id.split('(')[0].trim();

        // Tembak API Inquiry kita sendiri secara internal
        const inqRes = await fetch(`${baseUrl}/api/pascabayar/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: cleanCustomerId, sku: dbProduct.sku, category: namaKategori })
        });

        const inqData = await inqRes.json();
        if (!inqRes.ok || !inqData.data) {
          return NextResponse.json({ error: "Gagal memverifikasi ulang tagihan ke pusat." }, { status: 400 });
        }

        // 1. Ambil Nilai Tagihan murni dari hasil inquiry (Misal: 118.976)
        const tagihanMurni = Number(inqData.data.desc?.detail?.[0]?.nilai_tagihan || 0);
        
        // 2. Ambil Admin Digiflazz (Modal admin dari pusat, misal: 5000)
        const adminDigiflazz = Number(inqData.data.admin || 5000);
        
        // 3. Ambil Admin Toko dari kolom 'price' Supabase (Admin Bos, misal: 5100)
        const adminToko = Number(dbProduct.price || 0); 
        
        // 4. Set Modal Real (Tagihan + Admin Pusat) -> Ini untuk hitung profit bersih
        modalPascabayar = tagihanMurni + adminDigiflazz;

        // 5. Set Harga Jual ke Customer (Tagihan + Admin Toko Bos)
        hargaJualPascabayar = tagihanMurni + adminToko;
        
        // PENTING: Pindahkan ini ke SINI agar saat dihitung di bawah, nilainya sudah bukan 0!
        hargaSeharusnya = hargaJualPascabayar;
        
        // FIX: Hitung selisih murni dengan pembulatan ke bawah untuk menghindari error desimal JavaScript
        const selisihMurni = Math.floor(totalInputUser - hargaSeharusnya);
        
        // Kode unik adalah selisih tersebut (harus di bawah 1000)
        kodeUnikUser = (selisihMurni > 0 && selisihMurni < 1000) ? selisihMurni : 0;
        
        // Sekarang kurangi (Misal: 152883 - 550 = 152333)
        const totalUserTanpaKodeUnik = totalInputUser - kodeUnikUser;

        // DEBUG: Aktifkan ini kalau masih 400 biar kelihatan di terminal angkanya
        console.log("--- DEBUG PASCABAYAR ---");
        console.log("Total Input (Tanpa Kode Unik):", totalUserTanpaKodeUnik);
        console.log("Harga Seharusnya (Tagihan + Admin):", hargaSeharusnya);
        console.log("Selisih:", Math.abs(totalUserTanpaKodeUnik - hargaSeharusnya));

        // FIX: Toleransi dilebarkan ke 1000 karena kode unik bisa sampai 999
        if (Math.abs(totalUserTanpaKodeUnik - hargaSeharusnya) > 1000) {
          return NextResponse.json({ 
            error: `Deteksi manipulasi! DB: ${hargaSeharusnya}, Input: ${totalUserTanpaKodeUnik}` 
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ error: "Gagal koneksi ke server inquiry pascabayar." }, { status: 500 });
      }
    } else {
      // LOGIKA PRABAYAR (Pulsa, Game, dll)
      hargaSeharusnya = Math.floor(dbProduct.price * (1 - ((dbProduct.discount || 0) / 100)));
      
      if (Math.abs(totalInputUser - hargaSeharusnya) > 1500) {
        return NextResponse.json({ error: "Deteksi manipulasi harga prabayar!" }, { status: 400 });
      }
    }

    // --- 5. VALIDASI PEMBAYARAN (Maintenance Check) ---
    const { data: payData } = await supabaseAdmin
      .from('payment_accounts')
      .select('is_maintenance, start_hour, end_hour, min_price')
      .eq('name', payment_method)
      .maybeSingle();

    const allowed = isPaymentAllowed(payment_method, product_name || "General", total_amount, payData);
    if (!allowed) {
      return NextResponse.json({ error: "Metode pembayaran tidak tersedia (Maintenance/Limit)." }, { status: 403 });
    }

    // --- 6. PEMETAAN DATA KE TABEL ORDERS ---
    const orderData = {
      order_id,
      sku: dbProduct.sku,
      product_name: dbProduct.name,
      item_label,
      game_id,
      // PENTING: Gunakan harga dinamis untuk Pascabayar, harga statis untuk Prabayar
      buy_price: isPascabayar ? modalPascabayar : (dbProduct.cost || 0), 
      price: isPascabayar ? hargaJualPascabayar : (dbProduct.price || 0),
      discount: isPascabayar ? 0 : (dbProduct.discount || 0),
      voucher_code: voucher_code || null,
      voucher_amount: voucher_amount || 0,
cashback: finalCashback, 
      // Kita masukkan variabel kodeUnikUser yang sudah dihitung presisi di atas tadi
      unique_code: isPascabayar ? kodeUnikUser : (Number(total_amount) % 1000),
      total_amount,
      payment_method,
      status: 'Pending',
      user_contact,
      email: email || null,
      referred_by: referred_by || null,
      category: dbProduct.categories?.name || "umum", // Nama kategori asli
      ip_address,
      device_id,
      used_balance,
      user_id: user_id || null,
      // TAMBAHKAN INI BIAR TABELNYA GAK KOSONG SEJAK AWAL BOS! [cite: 2026-02-11]
      raw_tagihan: isPascabayar ? modalPascabayar : (dbProduct.cost || 0),
      desc: isPascabayar ? { info: "Waiting for payment..." } : null, 
      created_at: new Date().toISOString()
    };

    // --- 7. EKSEKUSI INSERT ---
    const { data, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([orderData]) 
      .select('id')
      .single();
    
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