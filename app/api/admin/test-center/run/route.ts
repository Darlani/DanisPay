import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import { sandboxFinancialEngine } from "@/lib/providers/sandbox/financial";
import { sandboxExecutionSimulator } from "@/lib/providers/sandbox/simulator";

export interface SnapshotData {
  liveBalance: number;
  liveCoin: number;
  liveLogsCount: number;
  sandboxBalance: number;
  sandboxLogsCount: number;
}

export interface DeltaData {
  deltaLiveBalance: number;
  deltaLiveCoin: number;
  deltaLiveLogs: number;
  deltaSandboxBalance: number;
  deltaSandboxLogs: number;
}

export interface AssertionItem {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface TestCaseResult {
  id: string;
  name: string;
  category: "Payment" | "Rewards" | "Refund" | "Security" | "Worker" | "Invoice" | "Audit";
  status: "PASS" | "FAIL" | "SKIPPED";
  durationMs: number;
  beforeSnapshot?: SnapshotData;
  afterSnapshot?: SnapshotData;
  deltas?: DeltaData;
  assertions: AssertionItem[];
  evidence: Record<string, unknown>;
  error?: string;
}

async function captureSnapshot(userId: string): Promise<SnapshotData> {
  const [profileRes, liveLogsRes, sbWalletRes, sbLogsRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("balance, coin_balance")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("balance_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabaseAdmin
      .from("sandbox_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("sandbox_balance_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return {
    liveBalance: Number(profileRes.data?.balance || 0),
    liveCoin: Number(profileRes.data?.coin_balance || 0),
    liveLogsCount: liveLogsRes.count || 0,
    sandboxBalance: Number(sbWalletRes.data?.balance || 0),
    sandboxLogsCount: sbLogsRes.count || 0,
  };
}

function calculateDeltas(before: SnapshotData, after: SnapshotData): DeltaData {
  return {
    deltaLiveBalance: after.liveBalance - before.liveBalance,
    deltaLiveCoin: after.liveCoin - before.liveCoin,
    deltaLiveLogs: after.liveLogsCount - before.liveLogsCount,
    deltaSandboxBalance: after.sandboxBalance - before.sandboxBalance,
    deltaSandboxLogs: after.sandboxLogsCount - before.sandboxLogsCount,
  };
}

export async function POST(request: Request) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const user = authorization.user;
  const userEmail = user.email || "admin-tester@dapay.id";

  const body = (await request.json().catch(() => ({}))) as { testCaseId?: string };
  const targetId = body.testCaseId;

  try {
    // Ensure tester has a sandbox wallet ready
    await supabaseAdmin
      .from("sandbox_wallets")
      .upsert(
        { user_id: user.id, balance: 1000000, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    const results: TestCaseResult[] = [];

    // =========================================================================
    // TC-1: Sandbox Coin Payment Isolation & Invariants
    // =========================================================================
    if (!targetId || targetId === "TC-1") {
      const startTime = Date.now();
      const testTimestamp = Date.now();
      const testOrderId = `TEST-PAY-${testTimestamp}`;
      // Unique deterministic total_amount per run to prevent collision with partial unique index orders_one_pending_total_amount_idx
      // while used_balance remains exactly 2500 so financial debit tested is strictly Rp2.500.
      const uniqueTotalAmount = 25000000 + (testTimestamp % 1000000);
      const assertions: AssertionItem[] = [];

      const before = await captureSnapshot(user.id);

      // Create test sandbox order in dedicated sandbox_orders table
      const { data: orderData, error: orderErr } = await supabaseAdmin
        .from("sandbox_orders")
        .insert({
          order_id: testOrderId,
          sku: "TEST-COINPAY",
          product_name: "QA Test Sandbox Coin Payment",
          item_label: "QA Nominal 2.500",
          price: 2500,
          total_amount: uniqueTotalAmount,
          used_balance: 2500,
          payment_method: "Koin DaPay",
          status: "Pending",
          user_id: user.id,
          email: userEmail,
        })
        .select("id, order_id, used_balance, status")
        .single();

      if (orderErr || !orderData) {
        results.push({
          id: "TC-1",
          name: "Sandbox Coin Payment Isolation",
          category: "Payment",
          status: "FAIL",
          durationMs: Date.now() - startTime,
          assertions: [{
            name: "Create Test Order",
            passed: false,
            expected: "Order created successfully",
            actual: orderErr?.message || "Null order data",
          }],
          evidence: { error: orderErr },
          error: "Gagal membuat fixture pesanan uji untuk TC-1",
        });
      } else {
        // Execute atomic coin payment
        const payResult = await sandboxFinancialEngine.executeCoinPayment(orderData.order_id);
        const after = await captureSnapshot(user.id);
        const deltas = calculateDeltas(before, after);

        assertions.push({
          name: "RPC Payment Execution Success",
          passed: payResult.success === true,
          expected: "true",
          actual: String(payResult.success),
        });
        assertions.push({
          name: "Debited Amount Matches Order",
          passed: payResult.debitedAmount === 2500,
          expected: "2500",
          actual: String(payResult.debitedAmount),
        });
        assertions.push({
          name: "Live Balance Zero-Bleed (Δ = 0)",
          passed: deltas.deltaLiveBalance === 0,
          expected: "0",
          actual: String(deltas.deltaLiveBalance),
        });
        assertions.push({
          name: "Live Coin Zero-Bleed (Δ = 0)",
          passed: deltas.deltaLiveCoin === 0,
          expected: "0",
          actual: String(deltas.deltaLiveCoin),
        });
        assertions.push({
          name: "Live Ledger Zero-Bleed (Δ = 0)",
          passed: deltas.deltaLiveLogs === 0,
          expected: "0",
          actual: String(deltas.deltaLiveLogs),
        });
        assertions.push({
          name: "Sandbox Balance Debited Correctly",
          passed: deltas.deltaSandboxBalance === -2500,
          expected: "-2500",
          actual: String(deltas.deltaSandboxBalance),
        });
        assertions.push({
          name: "Sandbox Balance Log Created",
          passed: deltas.deltaSandboxLogs === 1,
          expected: "1",
          actual: String(deltas.deltaSandboxLogs),
        });

        const allPassed = assertions.every((a) => a.passed);

        results.push({
          id: "TC-1",
          name: "Sandbox Coin Payment Isolation",
          category: "Payment",
          status: allPassed ? "PASS" : "FAIL",
          durationMs: Date.now() - startTime,
          beforeSnapshot: before,
          afterSnapshot: after,
          deltas,
          assertions,
          evidence: {
            orderId: orderData.order_id,
            payResult,
            deltas,
          },
        });
      }
    }

    // =========================================================================
    // TC-2: Non-Tester Upline Protection & Rewards
    // =========================================================================
    if (!targetId || targetId === "TC-2") {
      const startTime = Date.now();
      const testOrderId = `TEST-REW-${Date.now()}`;
      const assertions: AssertionItem[] = [];

      // Find a non-tester user to act as upline with a valid referral_code
      const { data: nonTesterUpline } = await supabaseAdmin
        .from("profiles")
        .select("id, email, is_tester, balance, referral_code")
        .eq("is_tester", false)
        .not("referral_code", "is", null)
        .neq("referral_code", "")
        .neq("id", user.id)
        .limit(1)
        .maybeSingle();

      if (!nonTesterUpline || !nonTesterUpline.referral_code) {
        results.push({
          id: "TC-2",
          name: "Non-Tester Upline Protection & Rewards",
          category: "Rewards",
          status: "SKIPPED",
          durationMs: Date.now() - startTime,
          assertions: [{
            name: "Non-Tester Upline Availability",
            passed: true,
            expected: "Akun non-tester dengan referral_code valid",
            actual: "Tidak ditemukan akun non-tester dengan referral_code valid (Skipped safely)",
          }],
          evidence: {
            message: "Tidak tersedia akun non-tester dengan referral_code valid untuk pengujian komisi upline.",
          },
        });
      } else {
        const buyerBefore = await captureSnapshot(user.id);
        const uplineBefore = await captureSnapshot(nonTesterUpline.id);

        const { data: buyerProfile } = await supabaseAdmin
          .from("profiles")
          .select("member_type")
          .eq("id", user.id)
          .maybeSingle();

        const isSpecial = buyerProfile?.member_type?.toLowerCase() === "special";

        // Create test order in 'Berhasil' state with cashback & valid upline referral_code in sandbox_orders
        const { data: orderData, error: orderErr } = await supabaseAdmin
          .from("sandbox_orders")
          .insert({
            order_id: testOrderId,
            sku: "TEST-REWARDS",
            product_name: "QA Test Rewards & Protection",
            item_label: "QA Nominal 10.000",
            price: 10000,
            buy_price: 8000,
            total_amount: 10000,
            status: "Berhasil",
            user_id: user.id,
            email: userEmail,
            cashback: isSpecial ? 500 : 0,
            referred_by: nonTesterUpline.referral_code,
          })
          .select("id, order_id, status")
          .single();

        if (orderErr || !orderData) {
          results.push({
            id: "TC-2",
            name: "Non-Tester Upline Protection & Rewards",
            category: "Rewards",
            status: "FAIL",
            durationMs: Date.now() - startTime,
            assertions: [{
              name: "Create Test Order",
              passed: false,
              expected: "Order created successfully",
              actual: orderErr?.message || "Null order data",
            }],
            evidence: { error: orderErr },
            error: "Gagal membuat fixture pesanan uji untuk TC-2",
          });
        } else {
          const rewardsResult = await sandboxFinancialEngine.executeSuccessRewards(orderData.order_id);
          const buyerAfter = await captureSnapshot(user.id);
          const buyerDeltas = calculateDeltas(buyerBefore, buyerAfter);

          assertions.push({
            name: "Rewards RPC Execution Success",
            passed: rewardsResult.success === true,
            expected: "true",
            actual: String(rewardsResult.success),
          });
          assertions.push({
            name: "Buyer Live Balance Zero-Bleed (Δ = 0)",
            passed: buyerDeltas.deltaLiveBalance === 0,
            expected: "0",
            actual: String(buyerDeltas.deltaLiveBalance),
          });
          assertions.push({
            name: "Buyer Live Ledger Zero-Bleed (Δ = 0)",
            passed: buyerDeltas.deltaLiveLogs === 0,
            expected: "0",
            actual: String(buyerDeltas.deltaLiveLogs),
          });

          if (isSpecial) {
            assertions.push({
              name: "Buyer Sandbox Wallet Credited with Cashback (Special Member)",
              passed: buyerDeltas.deltaSandboxBalance >= 500,
              expected: ">= 500",
              actual: String(buyerDeltas.deltaSandboxBalance),
            });
          } else {
            assertions.push({
              name: "Buyer Sandbox Wallet Zero-Cashback (Regular Member Protected)",
              passed: buyerDeltas.deltaSandboxBalance === 0,
              expected: "0",
              actual: String(buyerDeltas.deltaSandboxBalance),
            });
          }

          const uplineAfter = await captureSnapshot(nonTesterUpline.id);
          const uplineDeltas = calculateDeltas(uplineBefore, uplineAfter);

          assertions.push({
            name: "Non-Tester Upline Status Flagged Protected",
            passed: rewardsResult.referrerStatus === "NON_TESTER_LIVE_PROTECTED",
            expected: "NON_TESTER_LIVE_PROTECTED",
            actual: String(rewardsResult.referrerStatus),
          });
          assertions.push({
            name: "Upline Live Balance Untouched (Δ = 0)",
            passed: uplineDeltas.deltaLiveBalance === 0,
            expected: "0",
            actual: String(uplineDeltas.deltaLiveBalance),
          });
          assertions.push({
            name: "Upline Live Ledger Untouched (Δ = 0)",
            passed: uplineDeltas.deltaLiveLogs === 0,
            expected: "0",
            actual: String(uplineDeltas.deltaLiveLogs),
          });

          const allPassed = assertions.every((a) => a.passed);

          results.push({
            id: "TC-2",
            name: "Non-Tester Upline Protection & Rewards",
            category: "Rewards",
            status: allPassed ? "PASS" : "FAIL",
            durationMs: Date.now() - startTime,
            beforeSnapshot: buyerBefore,
            afterSnapshot: buyerAfter,
            deltas: buyerDeltas,
            assertions,
            evidence: {
              orderId: orderData.order_id,
              uplineReferralCode: nonTesterUpline.referral_code,
              uplineEmail: nonTesterUpline.email,
              rewardsResult,
            },
          });
        }
      }
    }

    // =========================================================================
    // TC-3: Sandbox Coin Refund & Status Invariant
    // =========================================================================
    if (!targetId || targetId === "TC-3") {
      const startTime = Date.now();
      const testOrderIdSuccess = `TEST-REF-SUCC-${Date.now()}`;
      const testOrderIdFailed = `TEST-REF-FAIL-${Date.now()}`;
      const assertions: AssertionItem[] = [];

      // 3.1 Test Status Invariant: Attempt refund on 'Berhasil' order (Must FAIL)
      await supabaseAdmin.from("sandbox_orders").insert({
        order_id: testOrderIdSuccess,
        sku: "TEST-REFUND-INV",
        product_name: "QA Invariant Test",
        price: 1500,
        total_amount: 1500,
        used_balance: 1500,
        status: "Berhasil",
        user_id: user.id,
        email: userEmail,
      });

      const invRefundResult = await sandboxFinancialEngine.executeCoinRefund(testOrderIdSuccess);
      assertions.push({
        name: "Refund Rejection on Status 'Berhasil'",
        passed: invRefundResult.success === false && Boolean(invRefundResult.message?.includes("Gagal")),
        expected: "Rejected with invariant requires status Gagal",
        actual: invRefundResult.message || "No message",
      });

      // 3.2 Test Valid Refund: Follow legitimate lifecycle:
      // Pending → executeCoinPayment → Gagal → executeCoinRefund

      // Step 1: Create order in Pending status with used_balance in sandbox_orders
      const { data: orderFailedData, error: orderFailedErr } = await supabaseAdmin
        .from("sandbox_orders")
        .insert({
          order_id: testOrderIdFailed,
          sku: "TEST-REFUND-OK",
          product_name: "QA Valid Refund Test",
          price: 1500,
          total_amount: 1500,
          used_balance: 1500,
          payment_method: "Koin DaPay",
          status: "Pending",
          user_id: user.id,
          email: userEmail,
        })
        .select("id, order_id, used_balance, status")
        .single();

      if (orderFailedErr || !orderFailedData) {
        assertions.push({
          name: "Create Test Order for Refund",
          passed: false,
          expected: "Order created successfully in Pending status",
          actual: orderFailedErr?.message || "Null order data",
        });

        results.push({
          id: "TC-3",
          name: "Sandbox Coin Refund & Status Invariant",
          category: "Refund",
          status: "FAIL",
          durationMs: Date.now() - startTime,
          assertions,
          evidence: { orderFailedErr },
          error: "Gagal membuat fixture pesanan uji untuk TC-3",
        });
      } else {
        // Step 2: Debit coin via payment RPC to produce legitimate Payment log
        const prePayResult = await sandboxFinancialEngine.executeCoinPayment(orderFailedData.order_id);
        assertions.push({
          name: "Pre-Refund Coin Payment Execution",
          passed: prePayResult.success === true && prePayResult.debitedAmount === 1500,
          expected: "true (debited 1500)",
          actual: `${prePayResult.success} (debited ${prePayResult.debitedAmount})`,
        });

        // Step 3: Transition order to 'Gagal' in sandbox_orders
        await supabaseAdmin
          .from("sandbox_orders")
          .update({ status: "Gagal", updated_at: new Date().toISOString() })
          .eq("id", orderFailedData.id);

        // Step 4: Capture snapshot specifically before refund
        const beforeRefund = await captureSnapshot(user.id);

        // Step 5: Execute atomic coin refund
        const okRefundResult = await sandboxFinancialEngine.executeCoinRefund(testOrderIdFailed);

        // Step 6: Capture snapshot specifically after refund
        const afterRefund = await captureSnapshot(user.id);
        const deltas = calculateDeltas(beforeRefund, afterRefund);

        assertions.push({
          name: "Valid Refund Execution Success",
          passed: okRefundResult.success === true && okRefundResult.refundedAmount === 1500,
          expected: "true (refunded 1500)",
          actual: `${okRefundResult.success} (refunded ${okRefundResult.refundedAmount})`,
        });
        assertions.push({
          name: "Live Balance Zero-Bleed on Refund (Δ = 0)",
          passed: deltas.deltaLiveBalance === 0,
          expected: "0",
          actual: String(deltas.deltaLiveBalance),
        });
        assertions.push({
          name: "Live Coin Zero-Bleed on Refund (Δ = 0)",
          passed: deltas.deltaLiveCoin === 0,
          expected: "0",
          actual: String(deltas.deltaLiveCoin),
        });
        assertions.push({
          name: "Live Ledger Zero-Bleed on Refund (Δ = 0)",
          passed: deltas.deltaLiveLogs === 0,
          expected: "0",
          actual: String(deltas.deltaLiveLogs),
        });
        assertions.push({
          name: "Sandbox Balance Restored (+1500)",
          passed: deltas.deltaSandboxBalance === 1500,
          expected: "1500",
          actual: String(deltas.deltaSandboxBalance),
        });
        assertions.push({
          name: "Sandbox Refund Log Created (+1)",
          passed: deltas.deltaSandboxLogs === 1,
          expected: "1",
          actual: String(deltas.deltaSandboxLogs),
        });

        const allPassed = assertions.every((a) => a.passed);

        results.push({
          id: "TC-3",
          name: "Sandbox Coin Refund & Status Invariant",
          category: "Refund",
          status: allPassed ? "PASS" : "FAIL",
          durationMs: Date.now() - startTime,
          beforeSnapshot: beforeRefund,
          afterSnapshot: afterRefund,
          deltas,
          assertions,
          evidence: {
            testOrderIdSuccess,
            testOrderIdFailed,
            invRefundResult,
            prePayResult,
            okRefundResult,
          },
        });
      }
    }

    // =========================================================================
    // TC-4: LIVE Order Tamper Resistance
    // =========================================================================
    if (!targetId || targetId === "TC-4") {
      const startTime = Date.now();
      const assertions: AssertionItem[] = [];

      // Query 1 real live order (READ-ONLY)
      const { data: liveOrder } = await supabaseAdmin
        .from("orders")
        .select("id, order_id, status")
        .limit(1)
        .maybeSingle();

      if (!liveOrder) {
        results.push({
          id: "TC-4",
          name: "LIVE Order Tamper Resistance",
          category: "Security",
          status: "SKIPPED",
          durationMs: Date.now() - startTime,
          assertions: [{
            name: "Live Order Fixture Availability",
            passed: true,
            expected: "At least 1 live order exists",
            actual: "No live order found in database (Skipped safely)",
          }],
          evidence: { message: "No live order present for tamper resistance verification." },
        });
      } else {
        const before = await captureSnapshot(user.id);

        const [payTamper, refTamper, rewTamper] = await Promise.all([
          sandboxFinancialEngine.executeCoinPayment(liveOrder.order_id),
          sandboxFinancialEngine.executeCoinRefund(liveOrder.order_id),
          sandboxFinancialEngine.executeSuccessRewards(liveOrder.order_id),
        ]);

        const after = await captureSnapshot(user.id);
        const deltas = calculateDeltas(before, after);

        assertions.push({
          name: "Sandbox Payment Rejects LIVE Order",
          passed: payTamper.success === false && Boolean(payTamper.message?.includes("tidak ditemukan")),
          expected: "Sandbox order tidak ditemukan",
          actual: payTamper.message || "No message",
        });
        assertions.push({
          name: "Sandbox Refund Rejects LIVE Order",
          passed: refTamper.success === false && Boolean(refTamper.message?.includes("tidak ditemukan")),
          expected: "Sandbox order tidak ditemukan",
          actual: refTamper.message || "No message",
        });
        assertions.push({
          name: "Sandbox Rewards Rejects LIVE Order",
          passed: rewTamper.success === false && Boolean(rewTamper.message?.includes("tidak ditemukan")),
          expected: "Sandbox order tidak ditemukan",
          actual: rewTamper.message || "No message",
        });
        assertions.push({
          name: "Live Balance Zero-Bleed (Δ = 0)",
          passed: deltas.deltaLiveBalance === 0,
          expected: "0",
          actual: String(deltas.deltaLiveBalance),
        });
        assertions.push({
          name: "Live Ledger Zero-Bleed (Δ = 0)",
          passed: deltas.deltaLiveLogs === 0,
          expected: "0",
          actual: String(deltas.deltaLiveLogs),
        });

        const allPassed = assertions.every((a) => a.passed);

        results.push({
          id: "TC-4",
          name: "LIVE Order Tamper Resistance",
          category: "Security",
          status: allPassed ? "PASS" : "FAIL",
          durationMs: Date.now() - startTime,
          beforeSnapshot: before,
          afterSnapshot: after,
          deltas,
          assertions,
          evidence: {
            liveOrderId: liveOrder.order_id,
            payTamper,
            refTamper,
            rewTamper,
          },
        });
      }
    }

    // =========================================================================
    // TC-5: Worker & External Vendor Barrier
    // =========================================================================
    if (!targetId || targetId === "TC-5") {
      const startTime = Date.now();
      const assertions: AssertionItem[] = [];

      // Insert real sandbox order in Diproses state for resolver test into sandbox_orders
      const { data: mockOrderSucc } = await supabaseAdmin
        .from("sandbox_orders")
        .insert({
          order_id: `TEST-SIM-RESOLVE-${Date.now()}`,
          sku: "TEST-SKU-SIM",
          product_name: "QA Simulator Resolver Test",
          price: 1000,
          total_amount: 1000,
          customer_no: "081234567800",
          status: "Diproses",
          user_id: user.id,
          email: userEmail,
        })
        .select("id, order_id, customer_no, user_id, email, used_balance")
        .single();

      const resolution = mockOrderSucc
        ? await sandboxExecutionSimulator.resolveSandboxOrder({
            id: mockOrderSucc.id,
            order_id: mockOrderSucc.order_id,
            customer_no: mockOrderSucc.customer_no,
            user_id: mockOrderSucc.user_id,
            user_email: mockOrderSucc.email,
            used_balance: mockOrderSucc.used_balance,
          })
        : { resolved: false, finalStatus: "FAILED_TO_INSERT" };

      assertions.push({
        name: "Resolver Deterministic Outcome (Berhasil)",
        passed: resolution.resolved === true && resolution.finalStatus === "Berhasil",
        expected: "resolved: true, finalStatus: Berhasil",
        actual: `resolved: ${resolution.resolved}, status: ${resolution.finalStatus}`,
      });
      assertions.push({
        name: "Serial Number Deterministic Prefix (SIM-)",
        passed: Boolean(resolution.sn?.startsWith("SIM-")),
        expected: "Starts with SIM-",
        actual: resolution.sn || "None",
      });

      // Test failing deterministic customer number (suffix 99) in sandbox_orders
      const { data: mockOrderFail } = await supabaseAdmin
        .from("sandbox_orders")
        .insert({
          order_id: `TEST-SIM-FAIL-${Date.now()}`,
          sku: "TEST-SKU-SIM",
          product_name: "QA Simulator Failure Test",
          price: 1000,
          total_amount: 1000,
          customer_no: "081234567899",
          status: "Diproses",
          user_id: user.id,
          email: userEmail,
        })
        .select("id, order_id, customer_no, user_id, email, used_balance")
        .single();

      const failResolution = mockOrderFail
        ? await sandboxExecutionSimulator.resolveSandboxOrder({
            id: mockOrderFail.id,
            order_id: mockOrderFail.order_id,
            customer_no: mockOrderFail.customer_no,
            user_id: mockOrderFail.user_id,
            user_email: mockOrderFail.email,
            used_balance: mockOrderFail.used_balance,
          })
        : { resolved: false, finalStatus: "FAILED_TO_INSERT" };

      assertions.push({
        name: "Resolver Deterministic Outcome (Gagal on 99)",
        passed: failResolution.resolved === true && failResolution.finalStatus === "Gagal",
        expected: "resolved: true, finalStatus: Gagal",
        actual: `resolved: ${failResolution.resolved}, status: ${failResolution.finalStatus}`,
      });

      const allPassed = assertions.every((a) => a.passed);

      results.push({
        id: "TC-5",
        name: "Worker & External Vendor Barrier",
        category: "Worker",
        status: allPassed ? "PASS" : "FAIL",
        durationMs: Date.now() - startTime,
        assertions,
        evidence: {
          successResolution: resolution,
          failResolution,
        },
      });
    }

    // =========================================================================
    // TC-6: Invoice & Instant Pay Guard
    // =========================================================================
    if (!targetId || targetId === "TC-6") {
      const startTime = Date.now();
      const assertions: AssertionItem[] = [];
      const testOrderId = `TEST-INV-${Date.now()}`;

      // Insert Pending sandbox order into sandbox_orders
      const { data: testOrder } = await supabaseAdmin
        .from("sandbox_orders")
        .insert({
          order_id: testOrderId,
          sku: "TEST-INVOICE",
          product_name: "QA Invoice Test",
          price: 5000,
          total_amount: 5000,
          payment_method: "QRIS",
          status: "Pending",
          user_id: user.id,
          email: userEmail,
        })
        .select("id, order_id, status")
        .single();

      // Dispatch via simulator
      if (testOrder) {
        const dispatchResult = await sandboxExecutionSimulator.dispatchSandboxOrder({
          id: testOrder.id,
          order_id: testOrder.order_id,
          sku: "TEST-INVOICE",
          customer_no: "081234567800",
        });

        assertions.push({
          name: "Simulator Dispatch Status (PROCESSING)",
          passed: dispatchResult.status === "PROCESSING",
          expected: "PROCESSING",
          actual: dispatchResult.status,
        });
        assertions.push({
          name: "Provider Assigned (SANDBOX_SIMULATOR)",
          passed: dispatchResult.winningProvider === "SANDBOX_SIMULATOR",
          expected: "SANDBOX_SIMULATOR",
          actual: dispatchResult.winningProvider,
        });

        // Verify order status in sandbox_orders became 'Diproses'
        const { data: updatedOrder } = await supabaseAdmin
          .from("sandbox_orders")
          .select("status, provider_used")
          .eq("id", testOrder.id)
          .single();

        assertions.push({
          name: "Database Order Updated to 'Diproses'",
          passed: updatedOrder?.status === "Diproses",
          expected: "Diproses",
          actual: updatedOrder?.status || "Null",
        });
      }

      const allPassed = assertions.every((a) => a.passed);

      results.push({
        id: "TC-6",
        name: "Invoice & Instant Pay Guard",
        category: "Invoice",
        status: allPassed ? "PASS" : "FAIL",
        durationMs: Date.now() - startTime,
        assertions,
        evidence: {
          testOrderId,
        },
      });
    }

    // =========================================================================
    // TC-7: Live Balance Ledger Zero-Bleed Audit
    // =========================================================================
    if (!targetId || targetId === "TC-7") {
      const startTime = Date.now();
      const assertions: AssertionItem[] = [];

      // Scan live balance_logs for any sandbox contamination
      const { data: taintedLogs, error: logErr } = await supabaseAdmin
        .from("balance_logs")
        .select("id, description, created_at")
        .ilike("description", "%sandbox%");

      const contaminatedCount = taintedLogs?.length || 0;

      assertions.push({
        name: "Live Balance Logs Contamination Scan",
        passed: !logErr && contaminatedCount === 0,
        expected: "0 contaminated entries",
        actual: `${contaminatedCount} entries found`,
      });

      // Verify closed primitive get_member_balance_mutation_summary is operative
      const { data: summaryRows, error: procErr } = await supabaseAdmin
        .rpc("get_member_balance_mutation_summary", {
          p_user_id: user.id,
        });

      assertions.push({
        name: "Closed Primitive (get_member_balance_mutation_summary) Operative",
        passed: !procErr && Array.isArray(summaryRows),
        expected: "No error, returns array",
        actual: procErr ? procErr.message : `Array (${summaryRows?.length || 0} rows)`,
      });

      const allPassed = assertions.every((a) => a.passed);

      results.push({
        id: "TC-7",
        name: "Live Balance Ledger Zero-Bleed Audit",
        category: "Audit",
        status: allPassed ? "PASS" : "FAIL",
        durationMs: Date.now() - startTime,
        assertions,
        evidence: {
          contaminatedCount,
          taintedLogs: taintedLogs || [],
          closedPrimitiveOperative: !procErr,
        },
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tester: {
        id: user.id,
        email: userEmail,
      },
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal test runner error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

