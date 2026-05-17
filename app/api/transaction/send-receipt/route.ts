import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inisialisasi Resend pakai API Key dari .env
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      productName, 
      status, 
      paymentMethod, 
      totalAmount, 
      userContact // Ini yang kita ambil dari kolom Supabase bos!
    } = body;

    // Validasi sederhana: Pastikan yang dikirim adalah Email (bukan nomor HP)
    // Kalau userContact isinya nomor HP (misal: 085...), kita tolak halus.
    if (!userContact || !userContact.includes('@')) {
      return NextResponse.json(
        { error: "Kontak bukan email, struk dibatalkan." },
        { status: 400 }
      );
    }

    // Desain Warna Status
    const statusColor = status.toLowerCase() === 'berhasil' ? '#10b981' : '#f43f5e';
    const statusText = status.toUpperCase();

    // 1. Eksekusi Pengiriman Email via Resend
    const data = await resend.emails.send({
      from: 'DanisPay <support@danispay.my.id>', // Pastikan domain bos sudah diverifikasi di Resend
      to: [userContact],
      subject: `[${statusText}] Rincian Pesanan: ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background-color: #f8fafc;">
          <div style="background-color: #2563eb; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-style: italic; font-weight: 900; letter-spacing: -1px;">DANIS<span style="color: #60a5fa;">PAY</span></h2>
            <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">Bukti Transaksi Digital</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">Halo Bosku, berikut adalah rincian transaksi Anda:</p>
            
            <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; width: 40%; font-weight: bold; color: #475569;">No. Pesanan</td>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Produk</td>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${productName}</td>
              </tr>
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Metode Bayar</td>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Total Harga</td>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">Rp ${Number(totalAmount).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td style="padding: 15px; font-weight: bold; color: #475569;">Status</td>
                <td style="padding: 15px; color: ${statusColor}; font-weight: 900; font-style: italic;">${statusText}</td>
              </tr>
            </table>
            
            <p style="color: #64748b; font-size: 13px; margin-top: 30px; text-align: center; line-height: 1.5;">
              Terima kasih telah mempercayakan transaksi digital Anda di DanisPay. <br>
              Jika ada kendala, silakan hubungi Customer Service kami.
            </p>
          </div>
          
          <div style="background-color: #0f172a; padding: 15px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} DanisPay. All rights reserved.</p>
          </div>
        </div>
      `
    });

    // Tambahkan .data?.id agar TypeScript tidak rewel
    return NextResponse.json({ success: true, id: data.data?.id });
    
  } catch (error) {
    console.error("Gagal kirim struk Resend:", error);
    return NextResponse.json({ error: "Gagal mengirim email struk" }, { status: 500 });
  }
}