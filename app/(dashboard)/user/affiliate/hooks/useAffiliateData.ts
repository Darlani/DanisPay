"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AffiliateSummary,
  BalanceLog,
  CommissionEntry,
  Profile,
  Referral,
  getReferralCommissionLogs,
} from "../types";
import { affiliateService } from "../services/affiliateService";

interface UseAffiliateDataProps {
  initialProfile?: Profile;
  initialReferrals?: Referral[];
  initialBalanceLogs?: BalanceLog[];
}

export function useAffiliateData({
  initialProfile = {},
  initialReferrals = [],
  initialBalanceLogs = [],
}: UseAffiliateDataProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [referrals, setReferrals] = useState<Referral[]>(initialReferrals);
  const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>(initialBalanceLogs);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>("");

  // Set domain on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.origin);
    }
  }, []);

  // Authoritative referral commission logs
  const commissionEntries: CommissionEntry[] = useMemo(() => {
    return getReferralCommissionLogs(balanceLogs);
  }, [balanceLogs]);

  // Total referral commission sum
  const totalCommission: number = useMemo(() => {
    return commissionEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [commissionEntries]);

  // Monthly referral commission sum (Asia/Jakarta timezone)
  const monthlyCommission: number = useMemo(() => {
    const now = new Date();
    // Jakarta format
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return commissionEntries
      .filter((entry) => {
        if (!entry.log.created_at) return false;
        const d = new Date(entry.log.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [commissionEntries]);

  // Total downline count
  const totalReferralCount: number = referrals.length;

  // Recent 5 commission entries sorted by timestamp descending
  const recentCommissions: CommissionEntry[] = useMemo(() => {
    return [...commissionEntries]
      .sort((a, b) => {
        const aTime = new Date(String(a.log.created_at || "")).getTime();
        const bTime = new Date(String(b.log.created_at || "")).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [commissionEntries]);

  // Summary object for KPI cards
  const summary: AffiliateSummary = useMemo(() => {
    return {
      totalCommission,
      monthlyCommission,
      totalReferralCount,
      memberType: profile.member_type || "Reguler",
    };
  }, [totalCommission, monthlyCommission, totalReferralCount, profile.member_type]);

  // Authoritative referral link
  const referralLink: string = useMemo(() => {
    if (!currentDomain || !profile.referral_code) return "";
    return `${currentDomain}/ref/${profile.referral_code}`;
  }, [currentDomain, profile.referral_code]);

  // Fetch / revalidate data
  const refetch = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const data = await affiliateService.fetchAffiliateData();
      setProfile(data.profile);
      setReferrals(data.referrals);
      setBalanceLogs(data.balanceLogs);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        window.location.href = "/login";
        return;
      }
      console.error("Fetch affiliate error:", err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat data afiliasi terbaru.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Silent background revalidation on mount
  useEffect(() => {
    void refetch(false);
  }, [refetch]);

  return {
    profile,
    referrals,
    balanceLogs,
    commissionEntries,
    totalCommission,
    monthlyCommission,
    totalReferralCount,
    recentCommissions,
    summary,
    referralLink,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}

