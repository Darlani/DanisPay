import { supabase } from "@/utils/supabaseClient";
import { Withdrawal, toNumber } from "../types";

export interface DashboardWithdrawResponse {
  success?: boolean;
  data?: {
    profile?: {
      balance?: number | string | null;
      coin_balance?: number | string | null;
    };
    withdrawals?: Withdrawal[];
  };
  error?: string;
}

export interface SubmitWithdrawalParams {
  amount: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface SubmitWithdrawalResponse {
  success?: boolean;
  withdrawalId?: string;
  error?: string;
}

export const withdrawService = {
  async fetchWithdrawData(): Promise<{
    balance: number;
    coinBalance: number;
    withdrawals: Withdrawal[];
  }> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("UNAUTHORIZED");
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

    const result = (await response.json()) as DashboardWithdrawResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Gagal memuat data penarikan saldo.");
    }

    return {
      balance: toNumber(result.data?.profile?.balance),
      coinBalance: toNumber(result.data?.profile?.coin_balance),
      withdrawals: Array.isArray(result.data?.withdrawals)
        ? result.data.withdrawals
        : [],
    };
  },

  async submitWithdrawal(
    params: SubmitWithdrawalParams,
  ): Promise<SubmitWithdrawalResponse> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("UNAUTHORIZED");
    }

    const response = await fetch("/api/member/withdraw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        amount: params.amount,
        bankName: params.bankName,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as SubmitWithdrawalResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Gagal mengajukan penarikan saldo.");
    }

    return result;
  },
};

