import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inisialisasi Resend pakai API Key dari .env
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 1. Ekstrak data (Sekarang menangkap isSimulation dan reason)
    const { orderId, productName, status, paymentMethod, totalAmount, userContact, isSimulation, reason } = body;

    if (!userContact || !userContact.includes('@')) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
    }

    // 2. Tentukan Warna & Label
    const isSuccess = status.toLowerCase().includes('berhasil');
    const statusColor = isSuccess ? '#10B981' : '#EF4444'; // Hijau Emerald untuk Sukses, Merah untuk Gagal
    const statusText = status.toUpperCase();

    // 3. Desain Template HTML Super Rapi
    const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      ${isSimulation ? `
      <div style="background-color: #F59E0B; color: #fff; text-align: center; padding: 12px; font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">
        ⚠️ Transaksi Simulasi / Uji Coba Sistem ⚠️
      </div>` : ''}
      
      <div style="background-color: ${statusColor}; color: white; text-align: center; padding: 30px 20px;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">${statusText}</h2>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Invoice: <strong>${orderId}</strong></p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 15px; color: #475569; margin-top: 0;">Halo,</p>
        <p style="font-size: 15px; color: #475569;">Berikut adalah rincian transaksi Anda di <strong>DaPay</strong>:</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1; color: #64748b; font-size: 14px;">Produk</td>
            <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 700; color: #0f172a; font-size: 15px;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1; color: #64748b; font-size: 14px;">Metode Pembayaran</td>
            <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 700; color: #0f172a; font-size: 15px;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 16px 0 8px; color: #64748b; font-size: 14px;">Total Transaksi</td>
            <td style="padding: 16px 0 8px; text-align: right; font-weight: 800; color: ${statusColor}; font-size: 20px;">Rp ${Number(totalAmount).toLocaleString('id-ID')}</td>
          </tr>
        </table>

        ${reason ? `
        <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #991B1B; font-size: 13px; line-height: 1.5;">
            <strong>Catatan Sistem:</strong><br/>${reason}
          </p>
        </div>
        ` : ''}

        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: ${!isSuccess ? '15px' : '0'};">
          <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.6;">
            Untuk detail kelengkapan struk pembayaran bisa dicek dengan memasukkan nomor invoice 
            <strong style="color: #0f172a;">${orderId}</strong> di halaman pencarian struk pada website kami.
          </p>
        </div>

        ${!isSuccess ? `
        <div style="background-color: #FFF7ED; border: 1px dashed #F97316; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="font-size: 14px; color: #C2410C; margin: 0 0 8px 0; font-weight: 700;">Butuh Bantuan Terkait Kegagalan Ini?</p>
          <p style="font-size: 13px; color: #C2410C; margin: 0; line-height: 1.6;">
            Silakan hubungi Customer Service kami dengan melampirkan nomor Invoice di atas melalui:<br/>
            ✉️ Email: <a href="mailto:support@danispay.my.id?subject=Bantuan%20Transaksi%20DaPay%20-%20${orderId}" style="color: #ea580c; text-decoration: underline; font-weight: bold;">support@danispay.my.id</a><br/>
            💬 WhatsApp: <a href="https://wa.me/6285545213952?text=Halo%20Admin%20DaPay,%20saya%20butuh%20bantuan%20terkait%20transaksi%20gagal%20dengan%20Invoice:%20${orderId}" target="_blank" style="color: #ea580c; text-decoration: underline; font-weight: bold;">Klik di sini untuk Chat WA</a>
          </p>
        </div>
        ` : ''}

      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        &copy; ${new Date().getFullYear()} DaPay.<br/>
        Email ini dikirim secara otomatis oleh sistem, mohon tidak membalas email ini.
      </div>
    </div>
    `;

    // 4. Eksekusi Tembakan ke API Resend
    // Menggunakan domain yang sudah Verified: danispay.my.id
    const { data, error } = await resend.emails.send({
      from: 'DaPay <no-reply@danispay.my.id>', 
      to: [userContact],
      subject: `[${statusText}] Struk Transaksi DaPay - ${orderId}`,
      html: htmlTemplate,
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Fatal Error Send Receipt:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}