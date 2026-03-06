import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Config: Matikan caching & set Runtime
export const dynamic = 'force-dynamic';

// 2. Init Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    // A. Parse Body dengan aman
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ valid: false, message: "Data tidak valid" }, { status: 400 });
    }

    const { 
        code, product_type, product_slug,
        ip, device_id, target_id, wa_number, email
    } = body;

    // --- LOG PEMANTAUAN MASUK ---
    console.log(`\n[🔍 CEK VOUCHER] : ${code?.toUpperCase()} | User: ${email || 'Guest'}`);

    // Validasi Input Dasar
    if (!code) return NextResponse.json({ valid: false, message: "Masukkan kode voucher!" });

    // --- B. AMBIL DATA VOUCHER ---
    const { data: voucher, error } = await supabase
      .from('promos')
      .select('*')
      .eq('code', code.toUpperCase()) 
      .maybeSingle(); 

    if (error || !voucher) {
      console.log(`[❌ GAGAL] : Kode "${code}" tidak ditemukan.`);
      return NextResponse.json({ valid: false, message: "Kode voucher tidak ditemukan!" });
    }

    // --- C. CEK STATUS SAKLAR ---
    if (!voucher.is_active) {
      console.log(`[❌ GAGAL] : Kode "${code}" nonaktif.`);
      return NextResponse.json({ valid: false, message: "Voucher sedang tidak aktif." });
    }

    // --- D. CEK TANGGAL (VERSI AKURAT WIB/JAKARTA) 🇮🇩 ---
    const now = new Date();
    const jakartaTime = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Jakarta', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(now); 

    const validFrom = voucher.valid_from ? voucher.valid_from.split('T')[0] : null;
    const expiredAt = voucher.expired_at ? voucher.expired_at.split('T')[0] : null;

    if (validFrom && jakartaTime < validFrom) {
        console.log(`[❌ GAGAL] : Belum mulai (Mulai: ${validFrom})`);
        return NextResponse.json({ valid: false, message: "Sabar, voucher belum dimulai!" });
    }
    if (expiredAt && jakartaTime > expiredAt) {
        console.log(`[❌ GAGAL] : Expired (Selesai: ${expiredAt})`);
        return NextResponse.json({ valid: false, message: "Yah, voucher sudah kadaluarsa!" });
    }

    // --- E. CEK KATEGORI (SMART MATCH) ---
    const dbCat = voucher.category ? voucher.category.toLowerCase().replace(/[^a-z0-9]/g, '') : 'all';
    const inputType = product_type ? product_type.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    let isCategoryValid = false;
    if (dbCat === 'all') {
        isCategoryValid = true;
    } else {
        if (inputType.includes(dbCat) || dbCat.includes(inputType)) {
            isCategoryValid = true;
        }
    }

    if (!isCategoryValid) {
       console.log(`[❌ GAGAL] : Salah kategori. (V: ${dbCat}, P: ${inputType})`);
       return NextResponse.json({ 
           valid: false, 
           message: `Voucher ini khusus kategori '${voucher.category}', produk ini '${product_type}'.` 
       });
    }

    // --- F. CEK KUOTA GLOBAL (GLOBAL LIMIT) ---
    if (voucher.global_limit > 0) {
        const { count: globalUsage } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('voucher_code', code.toUpperCase())
            .in('status', ['success', 'paid', 'settlement', 'berhasil', 'sukses']);

        if ((globalUsage || 0) >= voucher.global_limit) {
            console.log(`[❌ GAGAL] : Kuota Global Habis.`);
            return NextResponse.json({ valid: false, message: "Kuota voucher sudah habis terjual!" });
        }
    }

    // --- G. CEK LIMIT USER (IRON DOME PROTECTOR) 🛡️ ---
    if (voucher.usage_limit > 0) {
        const trackingQuery = [];
        if (ip) trackingQuery.push(`ip_address.eq.${ip}`);
        if (device_id) trackingQuery.push(`device_id.eq.${device_id}`);
        if (target_id) trackingQuery.push(`game_id.eq.${target_id}`); 
        if (email && email !== 'guest@danish.com') trackingQuery.push(`email.eq.${email}`); 
        if (wa_number) trackingQuery.push(`user_contact.eq.${wa_number}`);

        if (trackingQuery.length > 0) {
            const orCondition = trackingQuery.join(',');
            const { count: userUsage } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('voucher_code', code.toUpperCase())
                .or(orCondition);

            if ((userUsage || 0) >= voucher.usage_limit) {
                console.log(`[🛡️ BLOKIR] : Iron Dome. User ${email || ip} sudah pakai ${userUsage}x`);
                return NextResponse.json({ 
                    valid: false, 
                    message: `Kamu sudah pakai voucher ini ${userUsage}x. Batas per user cuma ${voucher.usage_limit}x ya!` 
                });
            }
        }
    }

    // --- SUKSES: LOLOS SEMUA VALIDASI ---
    console.log(`[✅ VALID] : Voucher "${code}" sukses dipasang.`);
    return NextResponse.json({ 
      valid: true, 
      message: "Voucher berhasil dipasang!",
      discount: voucher.discount_amount,
      code: voucher.code
    });

  } catch (error: any) {
    console.error("🔥 [CRITICAL ERROR] :", error.message);
    return NextResponse.json({ valid: false, message: "Terjadi kesalahan sistem saat validasi." }, { status: 500 });
  }
}