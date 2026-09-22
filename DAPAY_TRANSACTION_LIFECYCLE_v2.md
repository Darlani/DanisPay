# DaPay Transaction Lifecycle v2

**Status:** Repository Business Contract  
**Version:** 2.0  
**Project:** DaPay / my-ecommerce  
**Document Type:** Transaction Lifecycle & Business Process Contract

---

## 0. Authority & Document Relationship

This document is subordinate to:

1. `AGENTS.md`
2. `DAPAY_MASTER_SYSTEM_v1.md`
3. `CODEX_MASTER_PROMPT.md`
4. `DAPAY_WALLET_COINS_CONTRACT.md`
5. `DAPAY_STATUS_STANDARD_v1.md` for canonical status definitions
6. Current local source code and current production database state for factual implementation reality

This document does **not** override repository safety policy, database reality, authentication rules, financial contracts, or existing production protections.

This document defines the **transaction journey**.

The canonical meaning and naming of individual statuses are maintained separately in:

`DAPAY_STATUS_STANDARD_v1.md`

---

# 1. Purpose

DaPay requires one consistent transaction lifecycle across:

- Guest checkout
- Member checkout
- Product checkout
- Payment
- Invoice
- Provider fulfillment
- Order completion
- Failure handling
- Refund
- Receipt
- User transaction history
- Admin operations
- Analytics

The objective is to ensure that the same transaction follows a predictable business lifecycle regardless of product category.

Applicable product domains include:

- Game Top Up
- Voucher
- Gift Card
- PPOB
- Pulsa
- Data
- PLN
- PDAM
- BPJS
- Digital Services
- Subscription
- Entertainment
- Hotel
- Flight
- Train
- Marketplace / other supported digital products

---

# 2. Important Principle

A transaction lifecycle contains both:

### A. Transaction States

These describe the state of the order itself.

Canonical order lifecycle:

```text
Pending
   ↓
Diproses
   ↓
Berhasil
   OR
Gagal
```

and:

```text
Pending
   ↓
Kadaluarsa
```

### B. Financial Actions

These are not order states.

Examples:

- Refund Balance
- Refund Coin
- Cashback
- Referral Commission
- Wallet Debit
- Wallet Credit

Financial actions must not be represented by inventing new order statuses.

---

# 3. Canonical Lifecycle

## 3.1 Primary Flow

```text
Guest / Member
      ↓
Select Product
      ↓
Checkout
      ↓
Order Created
      ↓
Payment Required
      ↓
Pending
      ↓
Payment Confirmed
      ↓
Diproses
      ↓
Provider / Fulfillment
      ├──────────────→ Berhasil
      │
      └──────────────→ Gagal
```

## 3.2 Expiry Branch

```text
Pending
   │
   └── payment timeout
          ↓
      Kadaluarsa
```

`Kadaluarsa` is a terminal transaction state.

It represents a checkout/payment opportunity that ended because required payment was not completed within the applicable payment window.

---

# 4. Transaction State Categories

## 4.1 Non-Terminal States

These describe an incomplete transaction.

- `Pending`
- `Diproses`

A non-terminal transaction may continue to another state according to the lifecycle rules.

## 4.2 Terminal States

These represent a completed lifecycle branch.

- `Berhasil`
- `Gagal`
- `Kadaluarsa`

A terminal state must not be silently moved back into an earlier state.

---

# 5. Checkout Creation

## 5.1 Checkout

The customer:

1. Selects a product.
2. Enters required destination/account data.
3. Selects payment method.
4. Confirms checkout.

The system then creates the necessary transaction records.

At this point the transaction enters the payment lifecycle.

---

# 6. Guest Checkout

Guest users may create an order without being authenticated.

The lifecycle remains:

```text
Checkout
→ Order Created
→ Pending
→ Payment
→ Diproses
→ Berhasil / Gagal
```

or:

```text
Pending
→ Kadaluarsa
```

Guest checkout does not automatically gain member-only wallet capabilities.

---

# 7. Member Checkout

Members may have additional payment sources depending on the implemented product/payment flow.

The repository's wallet contract defines:

- Saldo DaPay
- Koin DaPay
- Mixed payment composition

The actual payment composition must be recorded explicitly where wallet payment is used.

Conceptually:

```text
total_amount
used_balance
used_coin
```

The sum of payment components must not exceed the order total.

Reference:

`DAPAY_WALLET_COINS_CONTRACT.md`

---

# 8. Payment Phase

After checkout creation, the transaction may require external payment.

Typical examples include:

- QRIS
- Virtual Account
- E-Wallet
- Other supported payment channels

The exact payment-method behavior is implementation-specific and must be verified against current payment gateway integration before changes are made.

---

# 9. Pending Phase

`Pending` means:

- The order/invoice has been created.
- Required payment has not yet been confirmed.

The transaction remains pending while the payment window is active.

During this phase:

- Fulfillment must not be treated as completed.
- Provider success must not be assumed.
- Success rewards must not be committed merely because the order exists.

---

# 10. Payment Timeout and Expiry

When a payment-required order reaches its payment deadline without a valid payment confirmation:

```text
Pending
→ Kadaluarsa
```

The expiry operation must:

1. Stop the active payment opportunity.
2. Prevent normal fulfillment from starting from the expired invoice.
3. Mark the transaction as terminal.
4. Preserve a durable audit trail.
5. Prevent the expired order from silently returning to Pending or Diproses.

---

# 11. Important Current Repository Gap — Expired

The current repository does **not yet implement Expired as a canonical order state**.

Current code normalizes:

- `expired`
- `kadaluarsa`
- `refund`
- `refunded`

into:

`Gagal`

and current user-order filtering also groups expired/refund-related values into the Gagal branch.

This is current repository reality and must not be mistaken for the target contract.

The addition of canonical `Kadaluarsa` therefore requires a dedicated audit and implementation batch.

---

# 12. Existing Expired-Related Database Logic

The repository contains:

`20260813190400_refund_expired_mixed_orders_atomic.sql`

with function:

`refund_expired_mixed_order_atomic(uuid)`

The current function:

- locks the order;
- expects order status `Pending`;
- applies a two-hour age condition;
- performs a wallet refund;
- records a `Refund` balance log;
- changes the order to `Gagal`.

Therefore this function represents **existing transition/legacy behavior**, not the final canonical Expired lifecycle.

It must not be silently reinterpreted as proof that the repository already implements:

```text
Pending → Kadaluarsa
```

---

# 13. Critical Expired / Refund Distinction

The canonical target lifecycle distinguishes:

### Unpaid timeout

```text
Pending
→ Kadaluarsa
```

This is not the same business event as a paid provider failure.

### Paid provider failure

```text
Pending
→ Diproses
→ Gagal
→ Refund financial action when eligible
```

Therefore:

- Expired = unpaid timeout.
- Failed = paid transaction that could not be fulfilled.
- Refund = financial resolution, not the order state itself.

---

# 14. Diproses Phase

`Diproses` means:

- payment has been accepted/validated sufficiently to begin fulfillment;
- the order is being processed;
- provider interaction may be occurring.

Typical provider lifecycle:

```text
Payment Confirmed
       ↓
Provider Request
       ↓
Provider Processing
       ↓
Success / Failure
```

Provider-specific statuses must be translated into DaPay canonical statuses before they reach business/UI logic.

---

# 15. Provider Processing

For Digiflazz and similar provider integrations:

```text
DaPay Diproses
      ↓
Provider Request
      ↓
Provider Result
```

Expected conceptual mapping:

```text
Provider Pending
→ DaPay Diproses

Provider Success
→ DaPay Berhasil

Provider Failure
→ DaPay Gagal
```

The exact mapping must always be verified against the current provider implementation before modifying it.

---

# 16. Success Lifecycle

When fulfillment succeeds:

```text
Diproses
→ Berhasil
```

`Berhasil` is the canonical successful terminal state.

Success-dependent business events may then become eligible according to their respective contracts.

Examples:

- Cashback
- Referral Commission
- Final receipt
- Final analytics recognition

---

# 17. Failed Lifecycle

When fulfillment fails after payment has been received:

```text
Diproses
→ Gagal
```

The failure must preserve enough information to determine:

- what failed;
- why it failed;
- whether refund is required;
- which payment source was used;
- what financial action was executed.

`Gagal` is a terminal order state.

---

# 18. Refund Is a Financial Resolution

Refund is not a canonical order state in this lifecycle.

Refund is a financial action triggered by an eligible business condition.

Example:

```text
Gagal
   ↓
Refund Eligibility Evaluation
   ↓
Refund Balance / Coin / Mixed Composition
```

The refund must use the original payment composition.

---

# 19. Wallet Refund Contract

Reference:

`DAPAY_WALLET_COINS_CONTRACT.md`

A wallet-funded order may conceptually contain:

```text
used_balance
used_coin
```

If the transaction is eligible for refund:

```text
refund_balance = original balance component
refund_coin    = original coin component
```

Never:

```text
Refund everything → Balance
```

Never:

```text
Coin refund → Balance
```

Never:

```text
Balance refund → Coin
```

Mixed payment must preserve the original composition.

The wallet contract explicitly requires this separation. :contentReference[oaicite:6]{index=6}

---

# 20. Cashback Lifecycle

Cashback is independent from referral commission.

Canonical conceptual flow:

```text
Order
→ Payment valid
→ Fulfillment
→ Berhasil
→ Cashback evaluation
→ Cashback credited to Koin
```

Pending/Diproses must not automatically generate final cashback.

The wallet contract states that cashback is a Koin reward and should only be committed after the final qualifying event. :contentReference[oaicite:7]{index=7}

---

# 21. Referral Commission Lifecycle

Canonical conceptual flow:

```text
Referral Attribution
→ Valid Transaction
→ Berhasil
→ Commission Calculation
→ Commission Credited to Saldo
```

Referral commission is not the same financial instrument as cashback.

Referral commission credits:

`Saldo DaPay`

Cashback credits:

`Koin DaPay`

The wallet contract establishes this distinction. :contentReference[oaicite:8]{index=8}

---

# 22. Receipt Lifecycle

Receipt presentation follows transaction outcome.

## Pending

Display:

- Order identity
- Invoice/payment information
- Payment instructions
- Remaining payment window where available

## Diproses

Display:

- Payment received
- Processing state
- Provider/fulfillment progress where available

## Berhasil

Display:

- Final success
- Product/service details
- Final amount
- Relevant reference
- Receipt details

## Gagal

Display:

- Failure state
- Failure explanation where available
- Refund information when applicable

## Kadaluarsa

Display:

- Expired state
- Expiry information
- Instruction to create a new order

---

# 23. Invoice Lifecycle vs Order Lifecycle

Invoice and Order are related but should not be conceptually conflated.

## Invoice

Represents the payment request.

## Order

Represents the product/service transaction.

A payment timeout primarily affects the payment/invoice lifecycle.

The canonical target behavior is:

```text
Invoice Payment Window Ends
        ↓
Order becomes Kadaluarsa
```

provided the order has not already been validly paid and processed.

---

# 24. Idempotency

Every financial or state-changing event must be safe against duplication.

Examples:

- Duplicate payment callback
- Duplicate provider callback
- Duplicate refund callback
- Duplicate success callback
- Duplicate cashback event
- Duplicate referral commission event

A single business event must not produce duplicate financial mutation.

This aligns with the wallet contract requirement for refund, cashback, and referral idempotency. :contentReference[oaicite:9]{index=9}

---

# 25. Concurrent State Changes

Order transitions must be protected from race conditions.

Typical race:

```text
Process A: Pending → Diproses
Process B: Pending → Kadaluarsa
```

Only one valid transition may win.

The repository already contains an atomic order state-claim primitive:

`claim_order_transition_atomic`

Future lifecycle implementation should preserve the existing atomic/concurrency protection rather than introducing client-side state races.

---

# 26. Forbidden State Resurrection

Once the order reaches a terminal state:

```text
Berhasil
Gagal
Kadaluarsa
```

it must not be silently resurrected into:

```text
Pending
Diproses
```

Any exceptional reconciliation must be treated as a controlled operational process with an auditable reason.

---

# 27. User Transaction History Lifecycle

Member transaction history should represent the actual order lifecycle.

Canonical user-visible order states:

```text
Pending
Diproses
Berhasil
Gagal
Kadaluarsa
```

Refund is not a separate member order state.

Refund-related financial movement belongs to Wallet/Saldo history.

---

# 28. User Dashboard Lifecycle Visibility

Dashboard overview should remain focused on high-level business metrics.

Pending, Diproses, and Kadaluarsa are operational states and should not automatically become overview KPI metrics.

Detailed transaction status belongs to the transaction-history workspace.

---

# 29. Admin Operational Lifecycle

Admin requires deeper visibility than members.

Admin operations may need to monitor:

- Pending
- Diproses
- Berhasil
- Gagal
- Kadaluarsa
- Refund financial actions

Admin visibility exists because admin needs to operate, reconcile, investigate, and audit transactions.

This does not mean Refund must become an `orders.status`.

---

# 30. Analytics Lifecycle

Analytics must distinguish lifecycle states.

Canonical target interpretation:

| State | Analytics Role |
|---|---|
| Pending | Outstanding payment opportunity |
| Diproses | Active fulfillment queue |
| Berhasil | Successful completed transaction |
| Gagal | Fulfillment failure |
| Kadaluarsa | Unpaid expired checkout |
| Refund | Financial resolution/event, not order state |

Current repository analytics already uses:

```text
orders.status = 'Berhasil'
```

for omzet and vendor-cost calculations. :contentReference[oaicite:10]{index=10}

Any extension to Expired analytics must therefore be implemented as an explicit contract change.

---

# 31. Financial Recognition Rule

Do not recognize normal product revenue solely because an order exists.

Canonical successful business recognition is tied to:

`Berhasil`

The existing analytics contract already uses this rule for omzet and modal vendor.

---

# 32. Expired Analytics Rule

Expired should be measured separately from operational failure.

Conceptually:

```text
Expired Rate
=
Expired Checkouts / Applicable Checkout Population
```

This metric represents abandoned/expired payment opportunities, not provider failure.

The exact population definition must be finalized during analytics implementation.

---

# 33. Edge Case — Late Payment After Expiry

If payment arrives after the invoice/payment window has already expired:

1. Do not silently revive the order.
2. Do not silently return it to Pending.
3. Do not silently process the provider.
4. Reconciliation is required.
5. The financial disposition must be determined according to the payment gateway's actual behavior.

This case must be tested against the actual gateway integration before production implementation.

---

# 34. Edge Case — Provider Success After Failure

If a provider callback reports success after DaPay has already marked the order failed:

- Do not silently overwrite the state.
- Preserve the current terminal state.
- Create a reconciliation event.
- Require controlled operational handling.

This protects against delayed or duplicated provider callbacks.

---

# 35. Edge Case — Duplicate Callback

If the same callback is received more than once:

- The first valid event establishes the transition.
- Subsequent identical events must be idempotently ignored.
- No duplicate financial reward/refund may be generated.

---

# 36. Edge Case — Payment Confirmed After Expiry Race

Potential race:

```text
Payment callback
      +
Expiry worker
```

The system must serialize or atomically claim the state transition so only one valid terminal path wins.

This must be implemented server-side/atomically.

---

# 37. Current Repository vs Canonical Target

## Current Repository Reality

Current source contains:

- Pending
- Diproses / Proses
- Berhasil
- Gagal
- Various legacy strings including expired/refund/refunded
- Expired-related database logic that currently resolves an order into Gagal

## Canonical Target

```text
Pending
   ├──→ Diproses → Berhasil
   │             └→ Gagal → refund financial action if eligible
   │
   └──→ Kadaluarsa
```

The implementation must be migrated carefully rather than by broad search-and-replace.

---

# 38. Implementation Requirements for Expired

Adding Expired requires an end-to-end audit of:

- Order creation
- Payment creation
- Payment timeout
- QRIS/VA handling
- Payment callbacks
- Provider callbacks
- Order status writers
- Order state-claim logic
- Refund functions
- Wallet mutations
- Receipt/invoice pages
- User orders
- Admin orders
- Analytics
- Notifications
- Cleanup jobs/cron
- Idempotency
- Reconciliation

No single frontend change is sufficient.

---

# 39. Required Audit Before Implementation

Before introducing canonical Expired:

```text
READ
→ AUDIT
→ REVIEW
→ PLAN
→ APPROVAL
→ IMPLEMENT
→ VALIDATE
→ CHECKPOINT
→ STOP
```

The audit must determine:

1. Where Pending is created.
2. Who owns the payment timer.
3. Who decides expiry.
4. What database field represents payment deadline.
5. What callback can arrive after expiry.
6. Whether any current refund function assumes expiry == failure.
7. Which API routes expose order status.
8. Which UIs normalize expired to Gagal.
9. Which analytics queries count failure.
10. Whether existing cleanup jobs already perform expiry behavior.

---

# 40. Non-Goals

This document does not authorize:

- Production schema changes
- Migration push
- RPC mutation
- Order writer replacement
- Payment gateway replacement
- Provider replacement
- Wallet architecture migration
- Production deployment
- Historical data rewrite
- Automatic data backfill

Those activities require separate review and explicit approval.

---

# 41. Final Canonical Lifecycle

The target lifecycle for DaPay is:

```text
CHECKOUT
   ↓
ORDER CREATED
   ↓
PENDING
   ├──────────────→ KADALUARSA
   │
   ↓
DIPROSES
   ├──────────────→ BERHASIL
   │
   └──────────────→ GAGAL
                         ↓
                REFUND FINANCIAL ACTION
```

Where:

- `Pending` = waiting payment.
- `Diproses` = fulfillment in progress.
- `Berhasil` = successful terminal result.
- `Gagal` = failed terminal result after payment/processing.
- `Kadaluarsa` = unpaid payment window ended.
- `Refund` = financial action, not order status.

---

# 42. Final Contract Statement

The DaPay transaction lifecycle must always distinguish:

```text
Transaction State
vs
Payment State
vs
Financial Action
vs
Reward Event
vs
Operational Audit Event
```

The system must not collapse these domains merely to simplify UI code.

Any implementation that changes lifecycle semantics must be reviewed against:

- `DAPAY_STATUS_STANDARD_v1.md`
- `DAPAY_WALLET_COINS_CONTRACT.md`
- Current database state
- Current order writers
- Current payment integrations
- Current provider callbacks
- Current analytics behavior