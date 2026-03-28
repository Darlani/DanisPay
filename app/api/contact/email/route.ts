import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, message } = await req.json();

// Sekarang kita pakai akun Support khusus, bukan Security lagi bos!
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, 
      auth: {
        user: process.env.SMTP_USER_SUPPORT, // Pakai variabel Support
        pass: process.env.SMTP_PASS_SUPPORT, // Pakai password Support
      },
    });

    const mailOptions = {
      from: `"Support DanisPay" <${process.env.SMTP_USER_SUPPORT}>`,
      to: 'support@danispay.my.id', // Tujuan masuk ke inbox CS
      replyTo: email, // Keren nih bos: kalau bos klik 'Balas' di Zoho, otomatis langsung balas ke email pelanggan
      subject: `[Bantuan] Pesan Baru dari: ${email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background-color: #f8fafc;">
          <div style="background-color: #2563eb; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-style: italic; font-weight: 900; letter-spacing: -1px;">DANIS<span style="color: #60a5fa;">PAY</span></h2>
            <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">Notifikasi Bantuan Pelanggan</p>
          </div>
          <div style="padding: 30px 20px;">
            <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">Halo Tim CS, ada pelanggan yang membutuhkan bantuan dengan rincian sebagai berikut:</p>
            <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; width: 30%; font-weight: bold; color: #475569;">Email Pelanggan</td>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #0f172a;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 15px; font-weight: bold; color: #475569; vertical-align: top;">Pesan / Keluhan</td>
                <td style="padding: 15px; color: #0f172a; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">Silakan klik <b>Balas (Reply)</b> pada email ini untuk langsung menjawab ke pelanggan.</p>
          </div>
          <div style="background-color: #0f172a; padding: 15px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Danishtopup. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    // 1. Eksekusi pengiriman Email
    await transporter.sendMail(mailOptions);

const telegramToken = process.env.TELEGRAM_BOT_TOKEN_SUPPORT;
    const chatId = process.env.TELEGRAM_CHAT_ID_SUPPORT;

    if (telegramToken && chatId) {
      const cleanEmail = email.trim();
      
      // Pesan ringkas: Email polos otomatis jadi biru & link Zoho tetap aktif karena https
      const telegramMsg = `📩 <b>BANTUAN PELANGGAN</b>\n\n` +
                          `📝 <b>Pesan:</b>\n"${message}"\n\n` +
                          `👤 <b>Balas Ke:</b> ${cleanEmail}\n` +
                          `🌐 <a href="https://mail.zoho.com/zm/">Buka Zoho Mail Web</a>`;

      try {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMsg,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });
      } catch (tgErr) {
        console.error("Gagal kirim Telegram:", tgErr);
      }
    }

    return NextResponse.json({ success: true, message: "Email & Notifikasi terkirim" });
  } catch (error) {
    console.error("Error SMTP:", error);
    return NextResponse.json({ error: "Gagal mengirim email via SMTP" }, { status: 500 });
  }
}