import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/utils/supabaseAdmin"; // <--- SEKARANG INI SUDAH ADA

// Kita buat jadi async function biar params-nya kebaca sempurna
export default async function RefRedirect({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params;
  const code = resolvedParams.code;

  // Jika kode tidak ada, balikin ke register biasa
  if (!code || code === "undefined") {
    redirect("/register");
  }

  // 1. Cek dulu ke database apakah kodenya valid
  const { data: validReferrer } = await supabaseAdmin
    .from('profiles')
    .select('referral_code')
    .eq('referral_code', code.toUpperCase())
    .maybeSingle();

  // 2. Jika kode ngawur/tidak ada, lempar ke register tanpa kode ref
  if (!validReferrer) {
    console.log(`❌ Kode Referral ${code} tidak valid, diarahkan ke register biasa.`);
    redirect("/register");
  }

  // 3. Jika valid, baru lempar dengan kode referral-nya
  redirect(`/register?ref=${validReferrer.referral_code}`);
}