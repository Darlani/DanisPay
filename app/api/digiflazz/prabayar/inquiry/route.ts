import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; // 💡 Import koneksi database admin

// --- SISTEM ANTI-SPAM (KHUSUS GAME/E-WALLET) ---
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 3; 
const WINDOW_MS = 60 * 1000; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 💡 Ambil array `skus` amunisi dari frontend
    const { customer_id, sku, skus, category } = body;

    // 1. VALIDASI DATA AWAL
    if (!customer_id) {
      return NextResponse.json({ message: "ID Pelanggan kosong Bos!" }, { status: 400 });
    }

    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || "";

    if (!username || !apiKey) {
      return NextResponse.json({ message: "Konfigurasi server belum lengkap!" }, { status: 500 });
    }

    const lowerCat = category?.toLowerCase() || "";
    const lowerSku = (sku || "").toLowerCase();

    // 2. LOGIKA DETEKSI PRODUK & AMUNISI SKU
    let requiresInquiry = false;
    let isGame = false;
    let targetSkus: string[] = [];

    if (lowerCat.includes('pln') || lowerSku.includes('pln')) {
      targetSkus = ["PLN"];
      requiresInquiry = true;
    } else if (lowerCat.includes('game') || lowerCat.includes('e-wallet')) {
      // Ambil array skus jika ada, atau fallback ke sku tunggal
      targetSkus = skus && skus.length > 0 ? skus : (sku ? [sku] : []);
      if (targetSkus.length > 0) {
        requiresInquiry = true;
        isGame = true;
      }
    }

    // Bypass Pulsa/Data (Render < 200ms)
    if (!requiresInquiry) {
      return NextResponse.json({
        success: true,
        data: { customerName: "Lanjutkan Pembayaran", amount: 0, period: "-" }
      });
    }

    // ==========================================
    // 💡 MESIN JEMPUT BOLA & AUTO-RETRY BERDASARKAN HARGA TERMURAH
    // ==========================================
    let finalSkus = targetSkus;
    let startIndex = 0;

    if (isGame) {
      const targetGameName = body.game_name || category;

      // 1. CARI SEMUA KANDIDAT SKU "CEK USERNAME" DARI DATABASE (TERMURAH DULUAN)
      if (targetSkus.length > 0) {
        const { data: mainItem } = await supabaseAdmin.from('items')
          .select('name, brand_slug')
          .eq('sku', targetSkus[0])
          .maybeSingle();
          
        if (mainItem) {
          const exactName = mainItem.name.toLowerCase().trim();
          const { data: candidates } = await supabaseAdmin.from('items')
            .select('sku, modal, name')
            .eq('brand_slug', mainItem.brand_slug)
            .eq('is_active', true)
            .order('modal', { ascending: true });
          
          const validAlts = (candidates || []).filter(i => i.name.toLowerCase().trim() === exactName);
          if (validAlts.length > 0) {
             finalSkus = validAlts.map(a => a.sku);
             console.log(`🕵️ [INQUIRY] Menemukan ${finalSkus.length} amunisi supplier Cek Username untuk: ${mainItem.name}`);
          }
        }
      }

      // 2. CEK STATUS TERAKHIR DI SUPABASE (LOCK & JEMPUT BOLA)
      const { data: existingInquiry } = await supabaseAdmin.from('cek_username_game')
        .select('id, status, customer_name, created_at, ref_id')
        .eq('customer_id', customer_id)
        .eq('game_name', targetGameName)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();

      if (existingInquiry) {
        // Skenario A: Sudah Sukses (0ms, 0 Rupiah)
        if (existingInquiry.status === 'Sukses') {
          return NextResponse.json({ success: true, data: { customerName: existingInquiry.customer_name, period: "Pengecekan Berhasil" } });
        }
        
        // Skenario B: Masih Pending -> JEMPUT BOLA KE DIGIFLAZZ
        if (existingInquiry.status === 'Pending') {
          console.log(`🔄 [JEMPUT BOLA] Mengecek nasib ref_id: ${existingInquiry.ref_id}`);
          const signCheck = crypto.createHash('md5').update(username + apiKey + existingInquiry.ref_id).digest('hex');
          
          try {
            const resCheck = await axios.post("https://api.digiflazz.com/v1/transaction", {
              commands: "plg-id", username, buyer_sku_code: finalSkus[0], customer_no: customer_id, ref_id: existingInquiry.ref_id, sign: signCheck
            }, { validateStatus: (s) => s < 500 });

            const checkData = resCheck.data;

            // Hasil 1: Ternyata Sukses!
            if (checkData?.data?.status === "Sukses" && checkData?.data?.rc === "00") {
              const finalName = checkData.data.customer_name || checkData.data.customerName || "Pelanggan Valid";
              await supabaseAdmin.from('cek_username_game').update({ status: 'Sukses', customer_name: finalName }).eq('id', existingInquiry.id);
              return NextResponse.json({ success: true, data: { customerName: finalName, period: "Pengecekan Berhasil" } });
            } 
            // Hasil 2: Ternyata Masih Antre
            else if (checkData?.data?.status === "Pending") {
              return NextResponse.json({ success: false, message: "Server pusat masih memproses antrean (Pending). Mohon tunggu.", rc: "Pending" }, { status: 400 });
            } 
            // Hasil 3: Ternyata Gagal -> Buka gembok & lanjut loop
            else {
              console.log(`⚠️ [JEMPUT BOLA] ref_id ${existingInquiry.ref_id} GAGAL! Lanjut ke SKU berikutnya.`);
              await supabaseAdmin.from('cek_username_game').update({ status: 'Gagal' }).eq('id', existingInquiry.id);
              const match = existingInquiry.ref_id.match(/-R(\d+)$/);
              if (match) startIndex = parseInt(match[1], 10); // Lanjut dari indeks berikutnya
            }
          } catch (e) {
             console.error("Gagal Jemput Bola:", e);
             return NextResponse.json({ success: false, message: "Gangguan koneksi saat mengecek antrean." }, { status: 500 });
          }
        }
        // Skenario C: Terakhir Gagal -> Lanjut loop dari titik terakhir
        else if (existingInquiry.status === 'Gagal') {
          const match = existingInquiry.ref_id.match(/-R(\d+)$/);
          if (match) startIndex = parseInt(match[1], 10);
        }
      }
    }

    // ==========================================
    // 3. RATE LIMITER (HANYA MENCEGAT JIKA GAME)
    // ==========================================
    if (isGame) {
      const forwardedFor = req.headers.get('x-forwarded-for');
      const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'IP_Lokal');
      
      const now = Date.now();
      const clientData = rateLimitMap.get(ip);

      if (clientData) {
        if (now - clientData.lastReset < WINDOW_MS) {
          if (clientData.count >= LIMIT) {
            console.warn(`🚨 SPAM BLOCKED: IP ${ip} mencoba inquiry Game terlalu banyak.`);
            return NextResponse.json({ message: "Terlalu banyak permintaan! Tunggu 1 menit ya Bos." }, { status: 429 });
          }
          clientData.count += 1;
        } else {
          rateLimitMap.set(ip, { count: 1, lastReset: now });
        }
      } else {
        rateLimitMap.set(ip, { count: 1, lastReset: now });
      }
    }

    // 4. EKSEKUSI KE DIGIFLAZZ (AUTO-RETRY LOOP KHUSUS GAME)
    let result: any = null;
    // Bersihkan ID dari spasi agar Sign MD5 tidak meleset (Khusus PLN)
    const cleanCustomerId = String(customer_id).replace(/[^0-9a-zA-Z]/g, '');

    if (targetSkus[0] === "PLN") {
      // JALUR PLN PRABAYAR (TOKEN) -> Bebas Limit
      const signPln = crypto.createHash('md5').update(username + apiKey + cleanCustomerId).digest('hex');
      
      const resPln = await axios.post("https://api.digiflazz.com/v1/inquiry-pln", {
        username,
        customer_no: cleanCustomerId,
        sign: signPln
      }, { 
        validateStatus: (s) => s < 500 
      });
      
      result = resPln.data;
      console.log("🔍 RESPONS INQUIRY PLN:", JSON.stringify(result, null, 2));

    } else {
      // 🚀 JALUR GAME DENGAN PATROLI AUTO-RETRY INSTAN
      console.log(`🎯 Memulai Loop Auto-Retry dari Index ke-${startIndex} dari total ${finalSkus.length} SKU.`);
      for (let i = startIndex; i < finalSkus.length; i++) {
        const currentSku = finalSkus[i];
        const ref_id = `CEKID-${Date.now()}-R${i+1}`;
        const signGame = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

        console.log(`🔍 [INQUIRY] Mencoba ${i+1}/${finalSkus.length} dengan SKU: ${currentSku}...`);

        const resGame = await axios.post("https://api.digiflazz.com/v1/transaction", {
          commands: "plg-id",
          username,
          buyer_sku_code: currentSku, 
          customer_no: customer_id, // ID Game biarkan asli
          ref_id,
          sign: signGame
        }, {
          validateStatus: (s) => s < 500
        });

        result = resGame.data;

        // JIKA SUKSES
        if (result?.data?.status === "Sukses" && result?.data?.rc === "00") {
          console.log(`✅ [INQUIRY] Sukses dapat nama menggunakan SKU: ${currentSku}`);
          
          // 📝 Amankan log Sukses ke Supabase agar pengecekan berikutnya Rp 0
          const targetGameName = body.game_name || category;
          await supabaseAdmin.from('cek_username_game').insert([{
            customer_id: customer_id,
            game_name: targetGameName,
            ref_id: ref_id,
            status: 'Sukses',
            customer_name: result.data.customer_name || result.data.customerName || "Pelanggan Valid"
          }]);

          break; // HENTIKAN LOOP
        } 
        // 🚨 JIKA PENDING (KUNCI DI SUPABASE AGAR TIDAK DOUBLE SALDO!)
        else if (result?.data?.status === "Pending") {
          console.warn(`⏳ [INQUIRY] SKU ${currentSku} PENDING. Hentikan loop & Kunci Polling!`);
          
          // 📝 Kunci status Pending di database Bos
          const targetGameName = body.game_name || category;
          await supabaseAdmin.from('cek_username_game').insert([{
            customer_id: customer_id,
            game_name: targetGameName,
            ref_id: ref_id,
            status: 'Pending',
            customer_name: null
          }]);

          break; // HENTIKAN LOOP
        } 
        // JIKA GAGAL (LANJUT CARI SELLER LAIN)
        else {
          console.warn(`⚠️ [INQUIRY] SKU ${currentSku} Gagal (${result?.data?.message}). Lanjut cari seller lain...`);
          const targetGameName = body.game_name || category;
          // Simpan log gagal agar jika terputus, Jemput Bola tahu harus mulai dari mana
          await supabaseAdmin.from('cek_username_game').insert([{
            customer_id: customer_id, game_name: targetGameName, ref_id: ref_id, status: 'Gagal', customer_name: null
          }]);
        }
      }
    }

    // TANGANI JIKA SEMUA AMUNISI GAGAL / PENDING
    if (!result?.data || result.data?.status !== "Sukses" || result.data?.rc !== "00") {
      let pesanUser = result?.data?.message || "Gagal mengecek ID, Bos!";
      
      if (result?.data?.status === "Pending") {
        // UI Friendly untuk mencegah user bingung
        pesanUser = "Server pusat sedang antrean padat, mohon tunggu beberapa saat.";
      } else if (result?.data?.rc === '02') {
        pesanUser = targetSkus[0] === "PLN" 
          ? "ID Pelanggan tidak ditemukan. Pastikan nomor sudah benar dan sesuai dengan jenis PLN (Token)." 
          : "ID Player salah / tidak ditemukan.";
      } else if (startIndex >= finalSkus.length && finalSkus.length > 0) {
        pesanUser = "Semua server supplier sedang gangguan / ID tidak valid.";
      }

      return NextResponse.json({
        success: false,
        message: pesanUser,
        rc: result?.data?.rc
      }, { status: 400 }); 
    }

    // 5. PARSING SUKSES
    const digiData = result.data;
    return NextResponse.json({
      success: true,
      data: {
        customerName: digiData?.customer_name || digiData?.name || "Pelanggan Valid",
        segmentPower: digiData?.segment_power || "", 
        amount: 0, 
        period: "Pengecekan Berhasil"
      }
    });

  } catch (error: any) {
    console.error("🔥 ERROR API:", error.message);
    return NextResponse.json({ message: "Koneksi server gagal, coba lagi nanti!" }, { status: 500 });
  }
}