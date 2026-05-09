import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email wajib dikirim!" }, { status: 400 });
    }

    // 1. Ambil Profil dulu (karena kita butuh referral_code untuk query selanjutnya)
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, balance, referral_code, member_type")
      .eq("email", email)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Data profil tidak ditemukan" }, { status: 404 });
    }

    // 2. Ambil semua data lainnya SECARA PARALEL (Ini kunci supaya render super kilat di bawah 50ms)
    const [depositsRes, withdrawalsRes, logsRes, ordersRes, referralsRes] = await Promise.all([
      supabaseAdmin.from("deposits").select("id, status, payment_method, created_at, amount").eq("user_email", email).order("created_at", { ascending: false }),
      supabaseAdmin.from("withdrawals").select("status, amount, held_amount").eq("user_email", email).order("created_at", { ascending: false }),
      supabaseAdmin.from("balance_logs").select("id, type, amount, description, created_at").eq("user_email", email).order("created_at", { ascending: false }),
      supabaseAdmin.from("orders").select("id, order_id, created_at, status, product_name, price").eq("email", email).order("created_at", { ascending: false }),
      profile.referral_code 
        ? supabaseAdmin.from("profiles").select("full_name, email, created_at").eq("referred_by", profile.referral_code).order("created_at", { ascending: false }) 
        : Promise.resolve({ data: [] })
    ]);

    // 3. Kirim semuanya dalam satu paket rapi
    return NextResponse.json({
      success: true,
      data: {
        profile,
        deposits: depositsRes.data || [],
        withdrawals: withdrawalsRes.data || [],
        balanceLogs: logsRes.data || [],
        orders: ordersRes.data || [],
        referrals: referralsRes.data || []
      }
    });
  } catch (err: any) {
    console.error("API Dashboard Error:", err);
    return NextResponse.json({ error: "Gagal memproses data server." }, { status: 500 });
  }
}