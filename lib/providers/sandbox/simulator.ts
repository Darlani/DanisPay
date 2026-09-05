import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { sandboxFinancialEngine } from './financial';

export interface SandboxExecutionOutcome {
  success: boolean;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  orderId: string;
  winningProvider: string;
  serialNumber?: string;
  message?: string;
}

export class SandboxExecutionSimulator {
  /**
   * Dispatches a sandbox order into in-flight 'Diproses' state.
   * Does NOT call any external vendor APIs.
   * Leaves the order ready for the asynchronous Sandbox Worker / Auto-Check to resolve.
   */
  async dispatchSandboxOrder(order: {
    id: string;
    order_id: string;
    sku: string;
    customer_no?: string | null;
  }): Promise<SandboxExecutionOutcome> {
    console.log(`🧪 [SANDBOX-ENGINE] Dispatching order #${order.order_id} to Sandbox Simulator...`);

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'Diproses',
        provider_used: 'SANDBOX_SIMULATOR',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .eq('is_sandbox', true);

    if (updateErr) {
      console.error(`❌ [SANDBOX-ENGINE] Failed to update order #${order.order_id}:`, updateErr.message);
      return {
        success: false,
        status: 'FAILED',
        orderId: order.order_id,
        winningProvider: 'SANDBOX_SIMULATOR',
        message: updateErr.message
      };
    }

    return {
      success: true,
      status: 'PROCESSING',
      orderId: order.order_id,
      winningProvider: 'SANDBOX_SIMULATOR',
      message: 'Pesanan simulasi berhasil diterima dan sedang diproses secara asinkron.'
    };
  }

  /**
   * Resolves an in-flight sandbox order to either 'Berhasil' or 'Gagal'.
   * Invoked by the primary asynchronous worker (Auto-Check Cron).
   * 
   * Idempotency & Concurrency:
   * Uses atomic conditional update matching (status = 'Diproses' AND is_sandbox = true).
   */
  async resolveSandboxOrder(order: {
    id: string;
    order_id: string;
    customer_no?: string | null;
    user_id?: string | null;
    user_email?: string | null;
    used_balance?: number | null;
  }): Promise<{ resolved: boolean; finalStatus: string; sn?: string }> {
    const custNo = (order.customer_no || '').trim();

    // 1. Skenario deterministik pengujian:
    // Akhiran '99' disimulasikan GAGAL (untuk menguji alur penanganan error & refund sandbox)
    const shouldFail = custNo.endsWith('99');
    const targetStatus = shouldFail ? 'Gagal' : 'Berhasil';
    const simulatedSn = shouldFail ? null : `SIM-${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 2. Atomic Conditional Update
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: targetStatus,
        sn: simulatedSn,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .eq('status', 'Diproses')
      .eq('is_sandbox', true)
      .select('id, status, sn')
      .maybeSingle();

    if (updateErr || !updated) {
      // Order was already resolved by another process or is no longer in 'Diproses' state
      return { resolved: false, finalStatus: 'ALREADY_PROCESSED' };
    }

    console.log(`✅ [SANDBOX-RESOLVER] Order #${order.order_id} resolved to ${targetStatus}`);

    // 3. Eksekusi mutasi finansial secara terpusat via SandboxFinancialEngine
    if (shouldFail) {
      if (order.used_balance && order.used_balance > 0) {
        await sandboxFinancialEngine.executeCoinRefund(order.order_id);
      }
    } else {
      await sandboxFinancialEngine.executeSuccessRewards(order.order_id);
    }

    return {
      resolved: true,
      finalStatus: targetStatus,
      sn: simulatedSn || undefined
    };
  }
}

export const sandboxExecutionSimulator = new SandboxExecutionSimulator();

