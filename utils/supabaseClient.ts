import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Safely purges all Supabase session tokens, cookies, and localStorage markers.
 * Uses local scope signOut to prevent throwing 'Invalid Refresh Token' errors
 * when the session on the server is already missing/revoked.
 */
export async function clearSupabaseLocalAuth(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") && key.endsWith("-auth-token"))) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("isUser");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
  } catch {
    // ignore
  }

  try {
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax;";
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax;";
  } catch {
    // ignore
  }
}
