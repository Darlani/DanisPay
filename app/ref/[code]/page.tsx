import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export default async function RefRedirect({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params;
  const rawCode = resolvedParams?.code;

  if (!rawCode || rawCode === "undefined" || rawCode === "null") {
    redirect("/register");
  }

  let code = "";
  try {
    code = decodeURIComponent(rawCode).trim().toUpperCase();
  } catch {
    code = String(rawCode).trim().toUpperCase();
  }

  if (!code) {
    redirect("/register");
  }

  // 1. Cek dulu ke database apakah kodenya valid
  const { data: validReferrer } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("referral_code", code)
    .maybeSingle();

  // 2. Jika kode tidak ada di database, lempar ke register biasa tanpa query ref
  if (!validReferrer?.referral_code) {
    redirect("/register");
  }

  // 3. Jika valid, lempar ke register dengan query parameter ref
  redirect(`/register?ref=${encodeURIComponent(validReferrer.referral_code)}`);
}