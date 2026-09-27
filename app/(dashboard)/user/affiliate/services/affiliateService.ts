import { supabase } from "@/utils/supabaseClient";
import { getLocaleFromPathname } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { BalanceLog, Profile, Referral } from "../types";

function getClientT() {
  const locale = typeof window !== "undefined" ? getLocaleFromPathname(window.location.pathname) : "id";
  return createTranslator(locale);
}

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
    const t = getClientT();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(t("dashboard.settings.errSessionExpired"));
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
      throw new Error(result.error || t("dashboard.affiliate.errLoadData"));
    }

    return {
      profile: result.data?.profile || {},
      referrals: Array.isArray(result.data?.referrals) ? result.data.referrals : [],
      balanceLogs: Array.isArray(result.data?.balanceLogs) ? result.data.balanceLogs : [],
    };
  },
};

