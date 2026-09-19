import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import { authenticateRequest } from "@/utils/serverAuth";
import { resolveOrderEnvironment } from "@/lib/auth/tester";

export async function POST(req: Request) {
  try {
    const authentication = await authenticateRequest(req);

    if (!authentication.ok) {
      return NextResponse.json(
        { error: authentication.message },
        { status: authentication.status },
      );
    }

    const userId = authentication.user.id;
    const email = authentication.user.email;

    const body = await req.json().catch(() => ({}));
    const profileOnly = Boolean(body?.profileOnly);

    // 1. Authoritative workspace determination:
    // If request specifies profileOnly or caller environment is Sandbox, skip all LIVE financial queries.
    let isSandboxWorkspace = profileOnly;
    if (!isSandboxWorkspace) {
      try {
        const env = await resolveOrderEnvironment(req, userId);
        isSandboxWorkspace = env.isSandbox;
      } catch {
        isSandboxWorkspace = false;
      }
    }

    // 2. Ambil Profil sesuai konteks workspace:
    // SANGAT PENTING: Pada Sandbox / profileOnly, JANGAN SELECT balance (zero LIVE financial read).
    if (isSandboxWorkspace) {
      const { data: sandboxProfile, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("full_name, referral_code, member_type")
        .eq("id", userId)
        .single();

      if (profErr || !sandboxProfile) {
        return NextResponse.json({ error: "Data profil tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          profile: {
            ...sandboxProfile,
            balance: 0,
            coin_balance: 0,
          },
          deposits: [],
          withdrawals: [],
          balanceLogs: [],
          orders: [],
          referrals: [],
        },
      });
    }

    // 3. Workspace LIVE: Ambil Profil dengan LIVE balance (karena dibutuhkan overview & tab finansial LIVE)
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, balance, referral_code, member_type")
      .eq("id", userId)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Data profil tidak ditemukan" }, { status: 404 });
    }

    // 4. Workspace LIVE: Ambil semua data lainnya SECARA PARALEL
    const [depositsRes, withdrawalsRes, logsRes, ordersRes, referralsRes] = await Promise.all([
      supabaseAdmin.from("deposits").select("id, status, payment_method, payment_channel, created_at, amount, unique_code, total_amount").or(`user_id.eq.${userId},user_email.eq."${email}"`).order("created_at", { ascending: false }),
      supabaseAdmin.from("withdrawals").select("id, status, amount, held_amount, admin_fee, bank_name, account_number, account_name, created_at").eq("user_email", email).order("created_at", { ascending: false }),
      supabaseAdmin.from("balance_logs").select("id, user_id, user_email, type, amount, description, initial_balance, final_balance, created_at").or(`user_id.eq.${userId},user_email.eq."${email}"`).order("created_at", { ascending: false }),
      supabaseAdmin.from("orders").select("id, order_id, api_ref_id, sku, product_name, item_label, customer_no, customer_name, price, total_amount, discount, voucher_code, voucher_amount, payment_method, sn, category, status, used_balance, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }),
      profile.referral_code
        ? supabaseAdmin.from("profiles").select("id, full_name, email, created_at").eq("referred_by", profile.referral_code).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] })
    ]);

    // 5. Kirim semuanya dalam satu paket rapi untuk workspace LIVE
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
  } catch (err: unknown) {
    console.error("API Dashboard Error:", err);
    return NextResponse.json({ error: "Gagal memproses data server." }, { status: 500 });
  }
}
