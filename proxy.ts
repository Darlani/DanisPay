import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Ganti nama fungsi menjadi 'proxy' dan jadikan 'export default'
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
// 1. Ambil IP pengunjung dari header (Anti-Proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'IP_Tidak_Diketahui');

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

// 3. Proteksi ketat halaman frontend /admin & /user dengan Token Supabase
  const isAdminRoute = pathname.startsWith('/admin');
  const isUserRoute = pathname.startsWith('/user');

  if (isAdminRoute || isUserRoute) {
    const token = request.cookies.get('sb-access-token')?.value;
    const userRole = request.cookies.get('userRole')?.value?.toLowerCase();

    // Jika tidak ada token di cookie sama sekali, lempar ke login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

      // Validasi token asli langsung ke server Supabase (Edge-compatible)
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseKey!
        }
      });

      // Jika response tidak ok (token hangus, palsu, atau kedaluwarsa)
      if (!res.ok) {
        // Hapus paksa cookie dan lempar ke halaman login dengan sinyal 'expired'
        const response = NextResponse.redirect(new URL('/login?session=expired', request.url));
        response.cookies.delete('sb-access-token');
        response.cookies.delete('userRole');
        return response;
      }

      // --- Otorisasi Berdasarkan Role ---
      // Jika mengakses /admin, pastikan rolenya memiliki hak akses
      if (isAdminRoute) {
        const isAuthorizedAdmin = userRole === 'manager' || userRole === 'admin';
        if (!isAuthorizedAdmin) {
          // Jika member biasa mencoba masuk /admin, kembalikan ke dashboard user
          return NextResponse.redirect(new URL('/user', request.url));
        }
      }
      // Jika mengakses /user, semua role (termasuk admin/member) boleh lewat selama token valid,
      // sehingga tidak perlu validasi tambahan.

    } catch (error) {
      console.error("Gagal validasi token:", error);
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