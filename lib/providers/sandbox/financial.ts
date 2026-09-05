import { supabaseAdmin } from '@/utils/supabaseAdmin';

export interface SandboxRewardsResult {
  success: boolean;
  orderId: string;
  cashbackAwarded: number;
  welcomeBonusAwarded: number;
  referralCommissionAwarded: number;
  referrerStatus?: 'TESTER_CREDITED' | 'NON_TESTER_LIVE_PROTECTED' | 'NO_REFERRER';
  message: string;
}

export interface SandboxPaymentResult {
  success: boolean;
  orderId: string;
  debitedAmount: number;
  remainingBalance: number;
  alreadyPaid?: boolean;
  message: string;
}

export interface SandboxRefundResult {
  success: boolean;
  orderId: string;
  refundedAmount: number;
  alreadyRefunded?: boolean;
  message: string;
}

export class SandboxFinancialEngine {
  // In-flight mutex to prevent concurrent promise re-entrancy within the same Node.js runtime
  private inFlightLocks = new Set<string>();

  /**
   * Acquire in-memory runtime lock for an order
   */
  private async acquireLock(key: string): Promise<boolean> {
    if (this.inFlightLocks.has(key)) {
      return false;
    }
    this.inFlightLocks.add(key);
    return true;
  }

  /**
   * Release in-memory runtime lock
   */
  private releaseLock(key: string) {
    this.inFlightLocks.delete(key);
  }

  /**
   * 1. DEBIT: True ACID Atomic Sandbox Coin Payment
   * Invokes public.execute_sandbox_coin_payment_atomic(p_order_id)
   * Guaranteed all-or-nothing database transaction.
   * Real profiles.balance and balance_logs are NEVER touched.
   */
  async executeCoinPayment(orderIdentifier: string): Promise<SandboxPaymentResult> {
    const lockKey = `payment:${orderIdentifier}`;
    const acquired = await this.acquireLock(lockKey);
    if (!acquired) {
      return {
        success: false,
        orderId: orderIdentifier,
        debitedAmount: 0,
        remainingBalance: 0,
        message: 'Transaksi pembayaran koin sandbox sedang berjalan pada proses lain.'
      };
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('execute_sandbox_coin_payment_atomic', {
        p_order_id: orderIdentifier
      });

      if (error) {
        throw new Error(error.message);
      }

      const res = (data as Record<string, unknown>) || {};
      return {
        success: Boolean(res.success),
        orderId: String(res.order_id || orderIdentifier),
        debitedAmount: Number(res.debited_amount || 0),
        remainingBalance: Number(res.remaining_balance || 0),
        alreadyPaid: Boolean(res.already_paid),
        message: String(res.message || (res.success ? 'Payment berhasil' : res.error || 'Payment gagal'))
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * 2. REWARDS: True ACID Atomic Sandbox Success-Side Rewards
   * Invokes public.execute_sandbox_success_rewards_atomic(p_order_id)
   * Guaranteed all-or-nothing database transaction for Cashback + Welcome Bonus + Referral Commission.
   * Non-tester referrer is 100% protected (never touches live balance).
   */
  async executeSuccessRewards(orderIdentifier: string): Promise<SandboxRewardsResult> {
    const lockKey = `rewards:${orderIdentifier}`;
    const acquired = await this.acquireLock(lockKey);
    if (!acquired) {
      return {
        success: false,
        orderId: orderIdentifier,
        cashbackAwarded: 0,
        welcomeBonusAwarded: 0,
        referralCommissionAwarded: 0,
        message: 'Reward processing sedang berjalan pada proses lain.'
      };
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('execute_sandbox_success_rewards_atomic', {
        p_order_id: orderIdentifier
      });

      if (error) {
        throw new Error(error.message);
      }

      const res = (data as Record<string, unknown>) || {};
      return {
        success: Boolean(res.success),
        orderId: String(res.order_id || orderIdentifier),
        cashbackAwarded: Number(res.cashback_awarded || 0),
        welcomeBonusAwarded: Number(res.welcome_bonus_awarded || 0),
        referralCommissionAwarded: Number(res.referral_commission_awarded || 0),
        referrerStatus: (res.referrer_status as SandboxRewardsResult['referrerStatus']) || 'NO_REFERRER',
        message: String(res.message || (res.success ? 'Rewards berhasil diproses' : res.error || 'Rewards gagal'))
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * 3. REFUND: True ACID Atomic Sandbox Coin Refund
   * Invokes public.execute_sandbox_coin_refund_atomic(p_order_id)
   * Guaranteed all-or-nothing database transaction.
   * Restores virtual coins to sandbox_wallets when an order fails.
   */
  async executeCoinRefund(orderIdentifier: string): Promise<SandboxRefundResult> {
    const lockKey = `refund:${orderIdentifier}`;
    const acquired = await this.acquireLock(lockKey);
    if (!acquired) {
      return {
        success: false,
        orderId: orderIdentifier,
        refundedAmount: 0,
        message: 'Proses refund sandbox sedang berjalan pada proses lain.'
      };
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('execute_sandbox_coin_refund_atomic', {
        p_order_id: orderIdentifier
      });

      if (error) {
        throw new Error(error.message);
      }

      const res = (data as Record<string, unknown>) || {};
      return {
        success: Boolean(res.success),
        orderId: String(res.order_id || orderIdentifier),
        refundedAmount: Number(res.refunded_amount || 0),
        alreadyRefunded: Boolean(res.already_refunded),
        message: String(res.message || (res.success ? 'Refund berhasil diproses' : res.error || 'Refund gagal'))
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }
}

export const sandboxFinancialEngine = new SandboxFinancialEngine();
