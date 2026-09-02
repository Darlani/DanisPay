import { supabase } from "@/utils/supabaseClient";
import { BalanceLog, Profile, Referral } from "../types";

export interface AffiliateDashboardSnapshot {
  profile: Profile;
  referrals: Referral[];
  balanceLogs: BalanceLog[];
}

export const affiliateService = {
  /**
   * Fetch current user's affiliate data snapshot from server API
   */
  async fetchAffiliateData(): Promise<AffiliateDashboardSnapshot> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sesi login berakhir. Silakan masuk kembali.");
    }

    const response = await fetch("/api/user/dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Gagal memuat data afiliasi.");
    }

    return {
      profile: result.data?.profile || {},
      referrals: Array.isArray(result.data?.referrals) ? result.data.referrals : [],
      balanceLogs: Array.isArray(result.data?.balanceLogs) ? result.data.balanceLogs : [],
    };
  },
};

