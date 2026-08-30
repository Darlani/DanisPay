"use client";

import {
  DashboardResponse,
  DepositInstruction,
  DepositPaymentMethod,
} from "../types";

export interface CreateDepositResponse {
  success: boolean;
  message?: string;
  depositId: string;
  amount: string;
  uniqueCode: number;
  totalAmount: string;
  payment: DepositPaymentMethod;
  adminContact: string | null;
}

export class DepositService {
  /**
   * Fetch Dashboard payload containing Profile and Deposit history.
   */
  static async fetchDashboardData(
    accessToken: string,
  ): Promise<DashboardResponse> {
    const response = await fetch("/api/user/dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("Sesi telah berakhir. Silakan login kembali.");
    }

    const result = (await response.json()) as DashboardResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Gagal memuat data riwayat deposit.");
    }

    return result;
  }

  /**
   * Load active and verified deposit payment methods.
   */
  static async fetchPaymentMethods(
    accessToken: string,
  ): Promise<DepositPaymentMethod[]> {
    const response = await fetch("/api/member/deposits/payment-methods", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Gagal memuat metode pembayaran deposit.");
    }

    return Array.isArray(result.methods) ? result.methods : [];
  }

  /**
   * Create a new deposit request atomically.
   */
  static async createDeposit(
    accessToken: string,
    amount: string,
    paymentMethodKey: string,
  ): Promise<DepositInstruction> {
    const response = await fetch("/api/member/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount,
        paymentMethodKey,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Gagal membuat permintaan deposit.");
    }

    const payment = result.payment as
      | DepositInstruction["payment"]
      | undefined;

    if (
      typeof result.depositId !== "string" ||
      typeof result.amount !== "string" ||
      !Number.isSafeInteger(result.uniqueCode) ||
      result.uniqueCode < 1 ||
      typeof result.totalAmount !== "string" ||
      !payment
    ) {
      throw new Error("Respons pembuatan deposit tidak lengkap.");
    }

    return {
      depositId: result.depositId,
      amount: result.amount,
      uniqueCode: result.uniqueCode,
      totalAmount: result.totalAmount,
      payment,
      adminContact:
        typeof result.adminContact === "string" ? result.adminContact : null,
      qrisString: null,
    };
  }

  /**
   * Fetch dynamic/static QRIS payload for a pending QRIS deposit.
   */
  static async fetchDepositQris(
    accessToken: string,
    depositId: string,
  ): Promise<string> {
    const response = await fetch(
      `/api/member/deposits/${encodeURIComponent(depositId)}/qris`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || typeof result.qrisString !== "string") {
      throw new Error(result.error || "Gagal membuat QRIS deposit.");
    }

    return result.qrisString;
  }
}

