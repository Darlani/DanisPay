import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export default async function EnglishRefRedirect({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params;
  const rawCode = resolvedParams?.code;

  if (!rawCode || rawCode === "undefined" || rawCode === "null") {
    redirect("/en/register");
  }

  let code = "";
  try {
    code = decodeURIComponent(rawCode).trim().toUpperCase();
  } catch {
    code = String(rawCode).trim().toUpperCase();
  }

  if (!code) {
    redirect("/en/register");
  }

  const { data: validReferrer } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("referral_code", code)
    .maybeSingle();

  if (!validReferrer?.referral_code) {
    redirect("/en/register");
  }

  redirect(`/en/register?ref=${encodeURIComponent(validReferrer.referral_code)}`);
}
