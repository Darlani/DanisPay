import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Ganti nama fungsi menjadi 'proxy' dan jadikan 'export default'
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Ambil IP pengunjung dari header
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'IP_Tidak_Diketahui';

  // 2. Bypass jalur statis (gambar, CSS) agar render UI tetap wus wus di bawah 200ms
  const isStaticPath = pathname.startsWith('/_next') || pathname.includes('.');
  
  if (!isStaticPath && ip !== 'IP_Tidak_Diketahui') {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // KITA TANYA KOLOM SPESIFIK SAJA (?select=ip_address), BUKAN SELECT * AGAR RINGAN
      const res = await fetch(`${supabaseUrl}/rest/v1/blocked_ips?ip_address=eq.${ip}&select=ip_address`, {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey!}`
        },
        // Cache hasil pencarian 60 detik agar tidak nembak DB terus-terusan tiap ganti halaman
        next: { revalidate: 60 }
      });

      const data = await res.json();

      // Jika IP ditemukan di tabel blacklist, tendang paksa!
      if (data && data.length > 0) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Akses Ditolak', 
            message: 'IP Anda telah diblokir secara permanen dari server DaPay karena aktivitas mencurigakan.' 
          }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
    } catch (error) {
      // Jika ada masalah koneksi DB, biarkan lewat agar web tidak down massal
      console.error("Gagal cek blacklist IP:", error);
    }
  }

  // 3. Proteksi halaman frontend /admin
  if (pathname.startsWith('/admin')) {
    const isAdmin = request.cookies.get('isAdmin')?.value === 'true';
    const userRole = request.cookies.get('userRole')?.value?.toLowerCase();
    
    const isAuthorized = isAdmin && (userRole === 'manager' || userRole === 'admin');

    if (!isAuthorized) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Jalankan proxy di semua rute KECUALI file statis bawaan Next.js
    // agar IP blocker bekerja global, tapi tetap ngebut
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};