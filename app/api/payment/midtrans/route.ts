import { NextResponse } from 'next/server';
const midtransClient = require('midtrans-client');

let coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

export async function POST(req: Request) {
  try {
    const { orderId, grossAmount, paymentMethod, customerEmail } = await req.json();

    let parameter: any = {
      "transaction_details": {
        "gross_amount": grossAmount,
        "order_id": orderId,
      },
      "customer_details": { "email": customerEmail }
    };

    // LOGIKA PENENTUAN PAYMENT TYPE (CORE API)
    const method = paymentMethod.toUpperCase();

    if (method === 'QRIS' || method === 'GOPAY' || method === 'DANA' || method === 'SHOPEEPAY') {
      // Untuk E-Wallet & QRIS di Sandbox, paling stabil tembak ke QRIS
      parameter.payment_type = "qris";
    } else if (method.includes('BCA')) {
      parameter.payment_type = "bank_transfer";
      parameter.bank_transfer = { "bank": "bca" };
    } else if (method.includes('BNI')) {
      parameter.payment_type = "bank_transfer";
      parameter.bank_transfer = { "bank": "bni" };
    } else if (method.includes('BRI')) {
      parameter.payment_type = "bank_transfer";
      parameter.bank_transfer = { "bank": "bri" };
    } else if (method.includes('MANDIRI')) {
      parameter.payment_type = "echannel";
      parameter.echannel = { 
        "bill_info1": "Top Up Game", 
        "bill_info2": "Danish Top Up" 
      };
      // Tambahkan keterangan tambahan agar rapi di dashboard Midtrans
      parameter.custom_field1 = "Danish Top Up";
      parameter.custom_field2 = customerEmail;

      const response = await coreApi.charge(parameter);
      return NextResponse.json(response);
    } else {
      // Jika tidak terdaftar, default ke QRIS agar tidak error
      parameter.payment_type = "qris";
    }

    const response = await coreApi.charge(parameter);
    return NextResponse.json(response);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}