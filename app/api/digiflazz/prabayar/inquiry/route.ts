import { NextResponse } from "next/server";
import crypto from 'crypto';
import axios from 'axios';
import { supabaseAdmin } from '@/utils/supabaseAdmin'; // 💡 Import koneksi database admin

// --- SISTEM ANTI-SPAM (KHUSUS GAME/E-WALLET) ---
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 3; 
const WINDOW_MS = 60 * 1000; 

// 💡 MESIN PENYARING NAMA (Decoupled System - Paling Tahan Banting)
function extractCleanName(raw: any): string {
  if (!raw) return "Pelanggan Valid";
  const safeRaw = String(raw);

  let nick = "";
  let reg = "";
  let labelTipe = "Region";

  // 1. Ekstrak Khusus Nickname (Hanya membaca setelah kata Username/Nickname/Nama)
  const nickMatch = safeRaw.match(/(?:Username|Nickname|Nama)\s*[:=]?\s*([^/\|,-]+)/i);
  if (nickMatch) {
    nick = nickMatch[1].trim();
  }

  // 2. Ekstrak Khusus Region atau Server (Abaikan Zone ID angka milik MLBB)
  const regionMatch = safeRaw.match(/(?:Region|Reg)\s*[:=]?\s*([a-zA-Z]+)/i);
  const serverMatch = safeRaw.match(/(?:Server)\s*[:=]?\s*([a-zA-Z0-9]+)/i);

  if (regionMatch) {
    reg = regionMatch[1].trim().toUpperCase();
    labelTipe = "Region";
  } else if (serverMatch) {
    reg = serverMatch[1].trim().toUpperCase();
    labelTipe = "Server";
  }

  // 3. Pola Alternatif (Bila formatnya gabungan strip: ID-Nama-Region)
  if (!nick) {
    const matchDash = safeRaw.match(/(?:ID\s*)?\d+\s*-\s*(.*?)\s*-\s*([a-zA-Z]{2,5})$/i);
    if (matchDash) {
      nick = matchDash[1].trim();
      reg = matchDash[2].trim().toUpperCase();
      labelTipe = "Region";
    }
  }

  // 4. Jika Sukses Ekstrak Nickname, Gabungkan!
  if (nick) {
    let regionName = reg;
    if (reg === 'ID') regionName = 'Indonesia';
    else if (reg === 'SG') regionName = 'Singapura';
    else if (reg === 'MY') regionName = 'Malaysia';
    else if (reg === 'PH') regionName = 'Filipina';
    else if (reg === 'BR') regionName = 'Brazil';

    // Jika region ada tampilkan, jika tidak, tampilkan nickname saja
    return reg ? `${nick} - ${labelTipe}: ${regionName}` : nick;
  }

  // 5. Fallback Sapu Jagat
  let clean = safeRaw
    .replace(/(?:Tgl|Tanggal|SN|Waktu|Server|Zone|Region|Reg)[\s:=].*$/gi, '') 
    .replace(/(?:,|\/|\|).*$/g, '') 
    .replace(/Sukses Cek ID\.|Nickname:|Nama:|Username:|Tujuan:|ID:|User:/gi, '') 
    .replace(/^[-\s]+|[-\s]+$/g, ''); 
    
  return clean || "Pelanggan Valid";
}

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
    // 💡 MESIN JEMPUT BOLA & UPSERT (1 BARIS PER TRANSAKSI)
    // ==========================================
    let finalSkus = targetSkus;
    let startIndex = 0;
    let localFailedSkus: string[] = []; // 💡 Memori untuk menyimpan SKU yang gagal (JSON)
    let existingId: number | null = null; 

    if (isGame) {
      const targetGameName = body.game_name || category;

      // 1. CARI SEMUA KANDIDAT SKU "CEK USERNAME"
      if (targetSkus.length > 0) {
        const { data: mainItem } = await supabaseAdmin.from('items')
          .select('name, brand_slug').eq('sku', targetSkus[0]).maybeSingle();
          
        if (mainItem) {
          const exactName = mainItem.name.toLowerCase().trim();
          const { data: candidates } = await supabaseAdmin.from('items')
            .select('sku, modal, name').eq('brand_slug', mainItem.brand_slug)
            .eq('is_active', true).order('modal', { ascending: true });
          
          const validAlts = (candidates || []).filter(i => i.name.toLowerCase().trim() === exactName);
          
          // 💡 FIX URUTAN HARGA: Paksa urutkan sebagai Angka (Number) agar "6" lebih kecil dari "10"
          validAlts.sort((a, b) => Number(a.modal || 0) - Number(b.modal || 0));

          if (validAlts.length > 0) {
             finalSkus = validAlts.map(a => a.sku);
             console.log(`🕵️ [INQUIRY] Menemukan ${finalSkus.length} amunisi (Termurah: Rp ${validAlts[0].modal}) untuk: ${mainItem.name}`);
          }
        }
      }

      // 2. CEK STATUS TERAKHIR DI DATABASE (1 BARIS SELAMANYA UNTUK 1 ID)
      const { data: existingInquiry } = await supabaseAdmin.from('cek_username_game')
        .select('id, status, customer_name, created_at, ref_id, failed_skus')
        .eq('customer_id', customer_id)
        .eq('game_name', targetGameName)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();

      if (existingInquiry) {
        existingId = existingInquiry.id; 
        localFailedSkus = (existingInquiry as any).failed_skus || [];
        
        // Skenario A: Sudah Sukses -> (CACHE PERMANEN DATABASE - RP 0 BIAYA)
        if (existingInquiry.status === 'Sukses') {
          return NextResponse.json({ success: true, data: { customerName: existingInquiry.customer_name, period: "Pengecekan Berhasil" } });
        }
        
        // Skenario B: Masih Pending -> JEMPUT BOLA
        if (existingInquiry.status === 'Pending') {
          console.log(`🔄 [JEMPUT BOLA] Mengecek nasib ref_id: ${existingInquiry.ref_id}`);
          const signCheck = crypto.createHash('md5').update(username + apiKey + existingInquiry.ref_id).digest('hex');
          
          try {
            const resCheck = await axios.post("https://api.digiflazz.com/v1/transaction", {
              commands: "plg-id", username, buyer_sku_code: finalSkus[0], customer_no: customer_id, ref_id: existingInquiry.ref_id, sign: signCheck
            }, { validateStatus: (s) => s < 500 });

            const checkData = resCheck.data;

            if (checkData?.data?.status === "Sukses" && checkData?.data?.rc === "00") {
                  // 💡 GUNAKAN MESIN PENYARING
                  const rawName = checkData.data.customer_name || checkData.data.customerName || checkData.data.sn || "";
                  const finalName = extractCleanName(rawName);

                  await supabaseAdmin.from('cek_username_game').update({ status: 'Sukses', customer_name: finalName } as any).eq('id', existingId);
                  return NextResponse.json({ success: true, data: { customerName: finalName, period: "Pengecekan Berhasil" } });
            } 
            else if (checkData?.data?.status === "Pending") {
              return NextResponse.json({ success: false, message: "Server pusat masih memproses antrean (Pending). Mohon tunggu.", rc: "Pending" }, { status: 400 });
            } 
            else {
              // Jemput bola ternyata gagal, catat SKU yang gagal ke dalam JSON
              console.log(`⚠️ [JEMPUT BOLA] ref_id ${existingInquiry.ref_id} GAGAL! Lanjut ke SKU berikutnya.`);
              const match = existingInquiry.ref_id.match(/-R(\d+)$/);
              if (match) {
                 const failedIndex = parseInt(match[1], 10) - 1;
                 if (finalSkus[failedIndex] && !localFailedSkus.includes(finalSkus[failedIndex])) {
                    localFailedSkus.push(finalSkus[failedIndex]); // 💡 Tambah ke riwayat gagal
                 }
                 startIndex = parseInt(match[1], 10); 
              }
              await supabaseAdmin.from('cek_username_game').update({ status: 'Gagal', failed_skus: localFailedSkus } as any).eq('id', existingId);
            }
          } catch (e) {
             return NextResponse.json({ success: false, message: "Gangguan koneksi saat mengecek antrean." }, { status: 500 });
          }
        }
        // Skenario C: Terakhir Gagal -> Reset memori dan paksa tembak ulang Digiflazz!
        else if (existingInquiry.status === 'Gagal') {
          // Jika user nge-refresh manual setelah ID dinyatakan gagal, kita buka gemboknya!
          // Kosongkan memori startIndex dan hapus riwayat JSON agar Loop mencari dari SKU termurah lagi.
          startIndex = 0;
          localFailedSkus = [];
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
    const cleanCustomerId = String(customer_id).replace(/[^0-9a-zA-Z]/g, '');

    if (targetSkus[0] === "PLN") {
      // JALUR PLN
      const signPln = crypto.createHash('md5').update(username + apiKey + cleanCustomerId).digest('hex');
      const resPln = await axios.post("https://api.digiflazz.com/v1/inquiry-pln", {
        username, customer_no: cleanCustomerId, sign: signPln
      }, { validateStatus: (s) => s < 500 });
      result = resPln.data;
      console.log("🔍 RESPONS INQUIRY PLN:", JSON.stringify(result, null, 2));
    } else {
      // 🚀 JALUR GAME (SISTEM UPDATE 1 BARIS & HEMAT DATABASE)
      let isLoopBroken = false;
      const targetGameName = body.game_name || category;

      console.log(`🎯 Memulai Loop Auto-Retry dari Index ke-${startIndex} dari total ${finalSkus.length} SKU.`);
      for (let i = startIndex; i < finalSkus.length; i++) {
        const currentSku = finalSkus[i];
        const ref_id = `CEKID-${Date.now()}-R${i+1}`;
        const signGame = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

        console.log(`🔍 [INQUIRY] Mencoba ${i+1}/${finalSkus.length} dengan SKU: ${currentSku}...`);

        const resGame = await axios.post("https://api.digiflazz.com/v1/transaction", {
          commands: "plg-id", username, buyer_sku_code: currentSku, customer_no: customer_id, ref_id, sign: signGame
        }, { validateStatus: (s) => s < 500 });

        result = resGame.data;

        if (result?.data?.status === "Sukses" && result?.data?.rc === "00") {
          console.log(`✅ [INQUIRY] Sukses dapat nama menggunakan SKU: ${currentSku}`);
          
          // 💡 GUNAKAN MESIN PENYARING
          const rawName = result.data.customer_name || result.data.customerName || result.data.sn || "";
          const finalName = extractCleanName(rawName);

          const payload = { customer_id, game_name: targetGameName, ref_id, status: 'Sukses', customer_name: finalName, failed_skus: localFailedSkus };
          
          if (existingId) await supabaseAdmin.from('cek_username_game').update(payload as any).eq('id', existingId);
          else await supabaseAdmin.from('cek_username_game').insert([payload as any]);
          
          isLoopBroken = true;
          break;
        } 
        else if (result?.data?.status === "Pending") {
          console.warn(`⏳ [INQUIRY] SKU ${currentSku} PENDING. Hentikan loop & Kunci Polling!`);
          const payload = { customer_id, game_name: targetGameName, ref_id, status: 'Pending', customer_name: null, failed_skus: localFailedSkus };
          
          if (existingId) await supabaseAdmin.from('cek_username_game').update(payload as any).eq('id', existingId);
          else await supabaseAdmin.from('cek_username_game').insert([payload as any]);

          isLoopBroken = true;
          break; 
        } 
        else {
          // 💡 GAGAL - Cukup catat SKU di memori JSON, JANGAN MENULIS KE DATABASE DULU (Super Cepat!)
          console.warn(`⚠️ [INQUIRY] SKU ${currentSku} Gagal. Lanjut seller lain...`);
          if (!localFailedSkus.includes(currentSku)) localFailedSkus.push(currentSku);
        }
      }

      // Jika loop selesai & semua amunisi habis/gagal total
      if (!isLoopBroken && finalSkus.length > 0) {
        const payload = { customer_id, game_name: targetGameName, ref_id: `CEKID-${Date.now()}-R${finalSkus.length}`, status: 'Gagal', customer_name: null, failed_skus: localFailedSkus };
        if (existingId) await supabaseAdmin.from('cek_username_game').update(payload as any).eq('id', existingId);
        else await supabaseAdmin.from('cek_username_game').insert([payload as any]);
      }
    }

    // TANGANI JIKA SEMUA AMUNISI GAGAL / PENDING
    if (!result?.data || result.data?.status !== "Sukses" || result.data?.rc !== "00") {
      let pesanUser = result?.data?.message || "Gagal mengecek ID, Bos!";
      
      if (result?.data?.status === "Pending") {
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
    
    // 💡 GUNAKAN MESIN PENYARING UNTUK DIKIRIM KE UI PELANGGAN
    const rawName = digiData?.customer_name || digiData?.customerName || digiData?.name || digiData?.sn || "";
    const finalExtractedName = extractCleanName(rawName);
    
    return NextResponse.json({
      success: true,
      data: {
        customerName: finalExtractedName,
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