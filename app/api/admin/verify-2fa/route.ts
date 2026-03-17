import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import nodemailer from 'nodemailer'; // Tambahkan Nodemailer

const { authenticator } = require('otplib');

export async function POST(req: Request) {
  try {
    const { userId, pin } = await req.json();

// Tangkap IP dan User-Agent dari Headers (Anti-Proxy)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'IP Tidak Diketahui');
    const userAgent = req.headers.get('user-agent') || 'Device Tidak Diketahui';

// 1. Ambil Secret Key & Status Limit
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('2fa_secret, failed_attempts, lockout_until')
      .eq('id', userId)
      .single();

    if (!profile || !profile['2fa_secret']) {
       return NextResponse.json({ error: "Secret Key tidak ditemukan!" }, { status: 404 });
    }

    // Cek apakah akun sedang dilock
    if (profile.lockout_until && new Date(profile.lockout_until) > new Date()) {
      return NextResponse.json({ error: "Akun dikunci sementara karena terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
    }

    // 2. Verifikasi PIN dari HP Bos
    // Kita pakai try-catch internal buat nangkep error "Secret Too Short"
let isValid = false;
    try {
      const cleanSecret = profile['2fa_secret'].trim();
      const cleanPin = String(pin || '').trim();

      // Validasi: PIN harus 6 digit angka saja sebelum diverifikasi otplib
      if (!/^\d+$/.test(cleanPin)) {
        return NextResponse.json({ error: "PIN HARUS BERUPA ANGKA!" }, { status: 400 });
      }
      
      isValid = authenticator.verify({
        token: cleanPin,
        secret: cleanSecret
      });
    } catch (err: any) {
      console.error("⚠️ Detail Error 2FA:", err.message);
      return NextResponse.json({ 
        error: "Kunci di Database bermasalah (Min. 16 Karakter)!" 
      }, { status: 403 });
    }

if (isValid) {
      // Reset limit jika sukses login
      if (profile.failed_attempts > 0) {
        await supabaseAdmin.from('profiles').update({ failed_attempts: 0, lockout_until: null }).eq('id', userId);
      }
      return NextResponse.json({ success: true });
    } else {
      // Tambah percobaan gagal
      const newAttempts = (profile.failed_attempts || 0) + 1;
      let lockoutTime = null;
      let errorMsg = `KODE SALAH! Sisa percobaan: ${3 - newAttempts}`;

      // Lock 15 menit jika gagal 3x
      if (newAttempts >= 3) {
        lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        errorMsg = "KODE SALAH! Akun dikunci 15 menit demi keamanan.";

// 1. Catat ke tabel activity_logs (Sesuai kolom di screenshot: action, details)
        await supabaseAdmin.from('activity_logs').insert({
          action: 'SECURITY_ALERT_LOCKOUT',
          details: `Percobaan Bruteforce! UserID: ${userId} | IP: ${ip} | Perangkat: ${userAgent}`
        });

        // 2. Opsional: Otomatis masukkan ke blocked_ips agar dia tidak bisa akses sama sekali
        await supabaseAdmin.from('blocked_ips').insert({
          ip_address: ip,
          reason: `Bruteforce 2FA Admin (User: ${userId})`
        });

        // 3. Konfigurasi Zoho SMTP
        const transporter = nodemailer.createTransport({
          host: 'smtp.zoho.com',
          port: 465,
          secure: true, // Zoho mewajibkan SSL di port 465
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

const mailOptions = {
  from: `"DanisPay Security" <${process.env.SMTP_USER}>`,
  to: process.env.SECURITY_EMAIL_RECEIVER,
  subject: '🚨 PERINGATAN: Upaya Pembobolan Akun Admin!',
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e11d48; border-radius: 20px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #e11d48; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Security Alert</h2>
      </div>
      <div style="padding: 30px; color: #334155;">
        <p style="font-size: 16px; font-weight: bold;">Halo Bos DanisPay,</p>
        <p>Sistem keamanan mendeteksi upaya login yang mencurigakan. Akun Admin telah <b>DIKUNCI OTOMATIS</b> selama 15 menit untuk mencegah akses ilegal.</p>
        
        <table style="width: 100%; background-color: #f8fafc; border-radius: 12px; padding: 15px; margin-top: 20px;">
          <tr>
            <td style="color: #64748b; font-size: 12px; padding-bottom: 5px;">IP ADDRESS</td>
          </tr>
          <tr>
            <td style="font-family: monospace; font-weight: bold; color: #e11d48; font-size: 18px;">${ip}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 12px; padding: 15px 0 5px 0;">PERANGKAT / BROWSER</td>
          </tr>
          <tr>
            <td style="font-size: 14px; font-weight: bold;">${userAgent}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 12px; padding: 15px 0 5px 0;">WAKTU KEJADIAN</td>
          </tr>
          <tr>
            <td style="font-size: 14px; font-weight: bold;">${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</td>
          </tr>
        </table>

        <div style="margin-top: 30px; text-align: center;">
          <a href="https://danispay.my.id/admin/security" style="background-color: #0f172a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px;">CEK LOG AKTIVITAS</a>
        </div>
        
        <p style="font-size: 11px; color: #94a3b8; margin-top: 40px; text-align: center; line-height: 1.5;">
          Ini adalah pesan otomatis dari sistem keamanan DanisPay.<br>
          Jika ini bukan Anda, segera amankan akses database Supabase Anda.
        </p>
      </div>
    </div>
  `,
};

      // Tambahkan tipe :any pada parameter err
        transporter.sendMail(mailOptions).catch((err: any) => console.error("Gagal kirim email alert:", err.message));
      }

      await supabaseAdmin
        .from('profiles')
        .update({ failed_attempts: newAttempts, lockout_until: lockoutTime })
        .eq('id', userId);

      return NextResponse.json({ error: errorMsg }, { status: 403 });
    }

  } catch (error: any) {
    console.error("🔥 Error 2FA API:", error.message);
    return NextResponse.json({ error: "Gagal verifikasi kode!" }, { status: 500 });
  }
}