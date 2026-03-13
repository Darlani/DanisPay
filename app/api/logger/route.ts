import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Menggunakan service role key agar aman di backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Memori sederhana untuk Rate Limiting (Maksimal 5 request per 1 menit per IP)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 5; 
const WINDOW_MS = 60 * 1000; 

export async function POST(req: Request) {
  try {
    // 1. Dapatkan IP pengunjung dan info browser (User Agent)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'IP_Tidak_Diketahui';
    const userAgent = req.headers.get('user-agent') || 'Browser_Tidak_Diketahui';

    // 2. Cek Rate Limit berdasarkan IP
    const now = Date.now();
    const clientData = rateLimitMap.get(ip);

    if (clientData) {
      if (now - clientData.lastReset < WINDOW_MS) {
        if (clientData.count >= LIMIT) {
          // Jika melebihi batas, tolak dengan status 429 (Too Many Requests)
          console.warn(`Spam logger terdeteksi dari IP: ${ip}`);
          return NextResponse.json({ success: false, message: 'Terlalu banyak request' }, { status: 429 });
        }
        clientData.count += 1; // Tambah hitungan jika masih dalam batas
      } else {
        // Reset hitungan jika sudah lewat 1 menit
        rateLimitMap.set(ip, { count: 1, lastReset: now });
      }
    } else {
      // IP baru pertama kali kirim error
      rateLimitMap.set(ip, { count: 1, lastReset: now });
    }

    // 3. Lanjutkan insert ke Supabase jika aman (tanpa select '*')
    const body = await req.json();
    
    const { error } = await supabase
      .from('error_logs')
      .insert([
        { 
          error_message: body.message, 
          url: body.url, 
          source: body.source,
          ip_address: ip,            // Simpan IP pelaku
          user_agent: userAgent      // Simpan jenis browser/HP pelaku
        }
      ]);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}