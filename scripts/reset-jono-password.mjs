import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Supabase environment variables tidak ditemukan.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const JONO_USER_ID = "25e11fee-f714-4370-ae38-24a44e80f569";

const newPassword = process.argv[2];

if (!newPassword || newPassword.length < 12) {
  console.error(
    "Masukkan password baru minimal 12 karakter sebagai argument."
  );
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.updateUserById(
  JONO_USER_ID,
  {
    password: newPassword,
  }
);

if (error) {
  console.error("Gagal mengubah password:", error.message);
  process.exit(1);
}

console.log("Password berhasil diubah untuk:", data.user?.email);