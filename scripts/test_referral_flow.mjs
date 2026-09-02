import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// Function simulating server route POST /api/auth/validate-referral
async function validateReferralApi(body) {
  const rawCode = typeof body?.code === "string" ? body.code : "";
  const code = rawCode.trim().toUpperCase();

  if (!code) {
    return { status: 400, body: { valid: false, message: "Kode referral tidak boleh kosong." } };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("referral_code", code)
    .maybeSingle();

  if (error) {
    return { status: 500, body: { valid: false, message: "Database error." } };
  }

  if (!profile?.referral_code) {
    return { status: 404, body: { valid: false, message: "Kode referral tidak valid atau tidak ditemukan." } };
  }

  return { status: 200, body: { valid: true, referral_code: profile.referral_code } };
}

// Function simulating /ref/[code] route redirect resolver
async function resolveRefRedirect(paramCode) {
  if (!paramCode || paramCode === "undefined" || paramCode === "null") {
    return { redirect: "/register" };
  }

  let code = "";
  try {
    code = decodeURIComponent(paramCode).trim().toUpperCase();
  } catch {
    code = String(paramCode).trim().toUpperCase();
  }

  if (!code) {
    return { redirect: "/register" };
  }

  const { data: validReferrer } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("referral_code", code)
    .maybeSingle();

  if (!validReferrer?.referral_code) {
    return { redirect: "/register" };
  }

  return { redirect: `/register?ref=${encodeURIComponent(validReferrer.referral_code)}` };
}

async function runTests() {
  console.log("==================================================");
  console.log("REFERRAL REGISTRATION FLOW — AUTOMATED TEST SUITE");
  console.log("==================================================");

  // 1. Check known production referral FE0C65
  const res1 = await validateReferralApi({ code: "FE0C65" });
  assert(res1.status === 200 && res1.body.valid === true && res1.body.referral_code === "FE0C65",
    "API validates 'FE0C65' successfully and returns valid: true with canonical code");

  // 2. Case-insensitivity: lowercase 'fe0c65'
  const res2 = await validateReferralApi({ code: "fe0c65" });
  assert(res2.status === 200 && res2.body.valid === true && res2.body.referral_code === "FE0C65",
    "API normalizes lowercase 'fe0c65' to uppercase 'FE0C65'");

  // 3. Mixed case + whitespace: '  Fe0C65  '
  const res3 = await validateReferralApi({ code: "  Fe0C65  " });
  assert(res3.status === 200 && res3.body.valid === true && res3.body.referral_code === "FE0C65",
    "API trims whitespace and normalizes mixed-case '  Fe0C65  '");

  // 4. Invalid referral code: 'INVALIDCODE999'
  const res4 = await validateReferralApi({ code: "INVALIDCODE999" });
  assert(res4.status === 404 && res4.body.valid === false,
    "API safely rejects non-existent code 'INVALIDCODE999' with 404");

  // 5. Empty referral code
  const res5 = await validateReferralApi({ code: "" });
  assert(res5.status === 400 && res5.body.valid === false,
    "API handles empty code safely with 400");

  // 6. Test /ref/[code] redirect resolver for valid 'FE0C65'
  const red1 = await resolveRefRedirect("FE0C65");
  assert(red1.redirect === "/register?ref=FE0C65",
    "/ref/FE0C65 redirects to /register?ref=FE0C65");

  // 7. Test /ref/[code] redirect resolver for lowercase 'fe0c65'
  const red2 = await resolveRefRedirect("fe0c65");
  assert(red2.redirect === "/register?ref=FE0C65",
    "/ref/fe0c65 redirects to /register?ref=FE0C65");

  // 8. Test /ref/[code] redirect resolver for invalid code
  const red3 = await resolveRefRedirect("NONEXISTENT_XYZ");
  assert(red3.redirect === "/register",
    "/ref/NONEXISTENT_XYZ falls back safely to /register without query params");

  // 9. Test /ref/[code] redirect resolver for empty / undefined / null
  const red4 = await resolveRefRedirect("undefined");
  assert(red4.redirect === "/register",
    "/ref/undefined falls back safely to /register");

  // 10. Verify Security: Ensure client-side supabaseClient does NOT contain service role key
  const clientFile = fs.readFileSync("utils/supabaseClient.ts", "utf8");
  assert(!clientFile.includes("SUPABASE_SERVICE_ROLE_KEY"),
    "supabaseClient.ts does NOT reference SUPABASE_SERVICE_ROLE_KEY");
  assert(clientFile.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    "supabaseClient.ts properly uses NEXT_PUBLIC_SUPABASE_ANON_KEY only");

  // 11. Verify Security: Ensure register/page.tsx does NOT import supabaseAdmin
  const registerFile = fs.readFileSync("app/(auth)/register/page.tsx", "utf8");
  assert(!registerFile.includes("supabaseAdmin"),
    "register/page.tsx (use client) does NOT import or use supabaseAdmin");
  assert(registerFile.includes("/api/auth/validate-referral"),
    "register/page.tsx validates referral via secure server endpoint /api/auth/validate-referral");

  // 12. Verify Security: Ensure validate-referral route uses supabaseAdmin
  const routeFile = fs.readFileSync("app/api/auth/validate-referral/route.ts", "utf8");
  assert(routeFile.includes("supabaseAdmin"),
    "validate-referral/route.ts properly executes server-side with supabaseAdmin");

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);

