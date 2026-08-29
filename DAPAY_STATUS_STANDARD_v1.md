# DaPay Status Standard v1

**Status:** Repository Business Contract  
**Version:** 1.0  
**Project:** DaPay / my-ecommerce  
**Document Type:** Canonical Status Dictionary

---

# 0. Authority

This document is subordinate to:

1. `AGENTS.md`
2. `DAPAY_MASTER_SYSTEM_v1.md`
3. `CODEX_MASTER_PROMPT.md`
4. `DAPAY_TRANSACTION_LIFECYCLE_v2.md`
5. `DAPAY_WALLET_COINS_CONTRACT.md`

Current local source and current database state remain the factual authority for existing implementation.

This document defines the **target canonical status vocabulary**.

Where current source differs from this document, the implementation difference must be recorded as a gap and resolved through an approved change.

---

# 1. Purpose

This document defines the canonical vocabulary for statuses and status-like enums used across the DaPay ecosystem.

It exists to prevent:

- duplicate status names;
- inconsistent terminology;
- accidental semantic changes;
- frontend/backend mismatch;
- gateway/provider status leakage into business logic;
- refund being incorrectly treated as an order state;
- cashback being incorrectly treated as balance;
- status-specific UI inconsistencies.

---

# 2. Status Architecture

DaPay distinguishes five categories.

## 2.1 Transaction Status

Describes the state of an order.

Canonical:

- Pending
- Diproses
- Berhasil
- Gagal
- Kadaluarsa

## 2.2 Payment Status

Describes payment/invoice state.

Target canonical payment vocabulary must remain separate from order state.

## 2.3 Financial Mutation Type

Describes a wallet/ledger event.

Examples:

- Deposit
- Withdraw
- Refund
- Cashback
- Referral
- Adjustment
- Payment

These are not order statuses.

## 2.4 Reward Status

Describes reward eligibility or completion.

Examples:

- Pending
- Granted
- Cancelled

## 2.5 Notification Status

Describes notification lifecycle.

Examples:

- Unread
- Read
- Archived

---

# 3. Canonical Order Status Registry

| Canonical Enum | Indonesian UI | Terminal | Meaning |
|---|---|---:|---|
| `pending` | Pending | No | Waiting required payment |
| `processing` | Diproses | No | Payment/fulfillment processing |
| `success` | Berhasil | Yes | Order fulfilled successfully |
| `failed` | Gagal | Yes | Fulfillment failed |
| `expired` | Kadaluarsa | Yes | Payment window ended unpaid |

---

# 4. Order Status Definitions

## 4.1 pending

Definition:

The order exists and is waiting for required payment confirmation.

Do:

- keep payment opportunity active while valid;
- show payment instructions where applicable;
- preserve expiry information.

Do not:

- treat it as success;
- trigger final success rewards;
- start provider fulfillment without valid payment.

---

## 4.2 processing

Definition:

Payment has been sufficiently confirmed and fulfillment has started or is being processed.

Do:

- allow provider processing;
- await provider result;
- preserve processing timestamps.

Do not:

- treat processing as final success;
- create final success rewards prematurely.

---

## 4.3 success

Definition:

The transaction reached successful fulfillment.

Success is terminal.

Canonical UI label:

`Berhasil`

---

## 4.4 failed

Definition:

The transaction failed after reaching a paid/processing stage.

Failed is terminal.

If refund is required, refund is a separate financial action.

---

## 4.5 expired

Definition:

The payment window ended without valid payment completion.

Expired is terminal.

Expired is not equivalent to provider failure.

Expired is not a synonym for refund.

---

# 5. Forbidden Order Status Values

These values must not be introduced as canonical order statuses:

```text
refund
refunded
timeout
completed
done
finish
cancel
cancelled
canceled
reject
rejected
```

These may appear in legacy data, provider mappings, or other domains where applicable, but they must not be introduced as new canonical `orders.status` values without an explicit contract update.

---

# 6. Current Repository Compatibility Note

The current repository contains legacy normalization that groups:

```text
expired
kadaluarsa
refund
refunded
reject
batal
canceled
```

into `Gagal`.

This is implementation reality, not canonical target behavior.

The canonical target is:

```text
expired → Kadaluarsa
```

and:

```text
refund → financial action
```

This compatibility gap must be resolved through a dedicated migration/hardening effort.

---

# 7. Canonical Order State Transition Matrix

| From | Allowed Target |
|---|---|
| Pending | Diproses |
| Pending | Kadaluarsa |
| Diproses | Berhasil |
| Diproses | Gagal |

No other automatic transition is canonical.

---

# 8. Forbidden Transitions

Never automatically perform:

```text
Berhasil → Pending
Berhasil → Diproses
Berhasil → Gagal

Gagal → Pending
Gagal → Diproses
Gagal → Berhasil

Kadaluarsa → Pending
Kadaluarsa → Diproses
Kadaluarsa → Berhasil
Kadaluarsa → Gagal
```

Any reconciliation of a terminal order requires a controlled operational process.

---

# 9. Deposit Status Standard

Target canonical vocabulary:

```ts
type DepositStatus =
  | "pending"
  | "success"
  | "failed"
  | "expired";
```

| Enum | UI |
|---|---|
| `pending` | Pending |
| `success` | Berhasil |
| `failed` | Gagal |
| `expired` | Kadaluarsa |

Current repository already uses `Pending` for deposit creation and has atomic approval paths around deposit processing.

Existing database logic must remain the factual source when auditing current state.

---

# 10. Withdrawal Status Standard

Target canonical vocabulary:

```ts
type WithdrawStatus =
  | "pending"
  | "processing"
  | "success"
  | "rejected";
```

| Enum | UI |
|---|---|
| `pending` | Pending |
| `processing` | Diproses |
| `success` | Berhasil |
| `rejected` | Ditolak |

Use `rejected` for a business rejection/approval outcome.

Do not reinterpret withdrawal rejection as order failure.

Existing verified withdrawal semantics must remain preserved.

---

# 11. Payment / Invoice Status Standard

Payment and invoice are separate from order status.

Target conceptual invoice vocabulary:

```ts
type InvoiceStatus =
  | "active"
  | "paid"
  | "expired"
  | "closed";
```

| Enum | Meaning |
|---|---|
| `active` | Payment request is active |
| `paid` | Payment received |
| `expired` | Payment window ended |
| `closed` | Invoice lifecycle closed |

Invoice state must not be copied blindly into `orders.status`.

---

# 12. Payment Gateway Mapping Rule

Gateway statuses are provider-specific.

Canonical architecture:

```text
Gateway Status
     ↓
Gateway Adapter / Mapping
     ↓
DaPay Canonical Payment State
     ↓
DaPay Business Logic
     ↓
UI
```

Do not expose raw gateway status strings directly to user-facing components.

---

# 13. Provider Status Mapping Rule

Provider statuses are also provider-specific.

For a provider such as Digiflazz:

```text
Provider Pending
→ DaPay Diproses

Provider Success
→ DaPay Berhasil

Provider Failure
→ DaPay Gagal
```

This mapping must be verified against the current implementation before changing provider integrations.

---

# 14. Wallet Mutation Type Standard

Wallet mutation types are not transaction statuses.

Canonical target mutation vocabulary:

```ts
type WalletMutationType =
  | "deposit"
  | "withdraw"
  | "payment"
  | "refund"
  | "cashback"
  | "referral"
  | "bonus"
  | "admin_adjustment";
```

Existing repository data currently includes values such as:

- Payment
- Refund
- Withdraw
- Deposit
- AdminAdjustment

and also legacy reward entries.

The current database `balance_logs.type` is plain text and is not protected by a database enum/check constraint.

Therefore this section defines target vocabulary, not an assertion that production schema already enforces it.

---

# 15. Wallet Mutation Semantics

| Type | Asset | Direction |
|---|---|---|
| Deposit | Saldo | + |
| Withdraw | Saldo | - |
| Payment | Saldo and/or Coin according to payment source | - |
| Refund | Original payment asset | + |
| Cashback | Koin | + |
| Referral | Saldo | + |
| Bonus | Per applicable contract | + |
| Admin Adjustment | Per authorized admin action | +/- |

---

# 16. Refund Standard

Refund is:

`Financial Mutation`

not:

`Order Status`

Canonical refund rule:

```text
Original Payment Composition
        ↓
Refund Composition
```

Examples:

```text
Balance payment
→ Balance refund
```

```text
Coin payment
→ Coin refund
```

```text
Balance + Coin
→ Balance refund + Coin refund
```

The wallet contract explicitly requires original-source refund handling and idempotency. :contentReference[oaicite:11]{index=11}

---

# 17. Cashback Standard

Target vocabulary:

```ts
type CashbackStatus =
  | "pending"
  | "granted"
  | "cancelled";
```

| Status | Meaning |
|---|---|
| `pending` | Waiting qualifying event |
| `granted` | Cashback credited |
| `cancelled` | No longer eligible |

Cashback credits:

`Koin DaPay`

Never automatically:

`Cashback → Saldo`

The wallet contract explicitly defines cashback as Koin. :contentReference[oaicite:12]{index=12}

---

# 18. Affiliate Commission Standard

Target vocabulary:

```ts
type AffiliateCommissionStatus =
  | "pending"
  | "approved"
  | "paid";
```

| Status | Meaning |
|---|---|
| `pending` | Awaiting qualifying transaction |
| `approved` | Commission validated |
| `paid` | Commission credited |

Affiliate commission credits:

`Saldo DaPay`

Never:

`Affiliate Commission → Koin`

The wallet contract defines this destination. :contentReference[oaicite:13]{index=13}

---

# 19. Notification Status Standard

Target vocabulary:

```ts
type NotificationStatus =
  | "unread"
  | "read"
  | "archived";
```

| Status | Meaning |
|---|---|
| `unread` | Not yet read |
| `read` | Read |
| `archived` | Removed from active inbox |

---

# 20. Analytics Is Not a Transaction Status

Analytics values must not be introduced into `orders.status`.

Examples:

- Revenue
- Gross Margin
- Success Rate
- Failed Rate
- Expired Rate
- Conversion Rate
- Outstanding Orders
- Processing Queue

These are derived metrics.

---

# 21. Analytics Status Semantics

| Metric | Primary Source State |
|---|---|
| Revenue / Omzet | Berhasil |
| Vendor Cost | Berhasil |
| Gross Margin | Berhasil |
| Failed Rate | Gagal |
| Expired Rate | Kadaluarsa |
| Outstanding Payment | Pending |
| Processing Queue | Diproses |

Current repository already uses `orders.status = 'Berhasil'` for omzet and vendor cost. :contentReference[oaicite:14]{index=14}

---

# 22. User UI Visibility Standard

## Dashboard Overview

Do not use operational order states as primary KPI cards merely because they exist.

Primary dashboard KPIs should remain business/financial summaries.

---

# 23. User Transaction History

Canonical filter vocabulary:

```text
Semua
Pending
Diproses
Berhasil
Gagal
Kadaluarsa
```

Refund is intentionally excluded as a transaction status filter because refund is a financial mutation.

Refund belongs to wallet/financial history.

---

# 24. User Wallet History

Wallet history may display financial mutation types such as:

```text
Deposit
Payment
Withdraw
Refund
Cashback
Referral
Bonus
Adjustment
```

Exact UI wording may be localized without changing canonical stored values.

---

# 25. Admin Orders

Admin requires deeper operational visibility.

Canonical order states remain:

```text
Pending
Diproses
Berhasil
Gagal
Kadaluarsa
```

Refund may be shown as an operational financial event/action associated with an order.

It must not require `orders.status = 'refund'`.

---

# 26. Status vs Action Rule

The following distinction is mandatory:

| Item | Type |
|---|---|
| Pending | Transaction status |
| Diproses | Transaction status |
| Berhasil | Transaction status |
| Gagal | Transaction status |
| Kadaluarsa | Transaction status |
| Refund | Financial action |
| Cashback | Reward action / financial mutation |
| Referral Commission | Reward/financial action |
| Deposit | Financial mutation |
| Withdraw | Financial workflow |

Never create a new order status solely because a financial action exists.

---

# 27. Status Localization Rule

Database/API canonical value:

English machine-safe enum.

UI value:

Indonesian localized label.

Example:

```text
processing
↓
Diproses
```

```text
success
↓
Berhasil
```

```text
expired
↓
Kadaluarsa
```

Do not store localized strings as canonical database enums.

---

# 28. API Contract

API responses should expose canonical machine status where appropriate.

Example:

```json
{
  "status": "success",
  "status_label": "Berhasil"
}
```

Frontend should not infer semantics from arbitrary human-readable status text when a canonical enum can be provided.

---

# 29. Database Contract

Target relationship:

```text
Database Status
        ↓
Canonical Domain Enum
        ↓
Application Mapping
        ↓
Localized UI
```

The current repository contains plain text fields in several areas.

Therefore:

- Do not claim enum enforcement where it does not exist.
- Do not migrate schema merely because this document exists.
- Audit current schema before introducing constraints.

---

# 30. Current Repository Gap Register

Known status-related gaps include:

### Gap A — Expired

Current implementation collapses expired-like values into Gagal.

Target:

```text
expired → Kadaluarsa
```

### Gap B — Refund as Order Status

Current code contains refund/refunded matching inside failure normalization/filter logic.

Target:

```text
Refund → financial action
```

### Gap C — Status Names

Current code accepts many aliases:

- berhasil
- success
- successful
- selesai
- lunas
- proses
- diproses
- processing
- process
- gagal
- failed
- reject
- rejected
- expired
- kadaluarsa
- batal
- canceled
- refund
- refunded

Aliases may remain as compatibility inputs temporarily, but they must normalize into a single canonical domain status.

---

# 31. Canonical Normalization Rule

Legacy inputs may be normalized at application boundaries.

Example:

```text
success
successful
selesai
lunas
        ↓
Berhasil
```

```text
proses
diproses
processing
process
        ↓
Diproses
```

For the target architecture:

```text
expired
kadaluarsa
        ↓
Kadaluarsa
```

not:

```text
expired
        ↓
Gagal
```

Refund-related values must not become a transaction status.

---

# 32. Badge Color Standard

Target semantic palette:

| Status | Semantic Tone |
|---|---|
| Pending | Attention / Amber |
| Diproses | Informational / Blue |
| Berhasil | Positive / Emerald |
| Gagal | Error / Red |
| Kadaluarsa | Neutral / Slate |

The precise Tailwind class may differ by component theme, but semantic meaning must remain consistent.

---

# 33. Icon Standard

Suggested semantic pairing:

| Status | Icon |
|---|---|
| Pending | Clock |
| Diproses | Loader / LoaderCircle |
| Berhasil | CircleCheck |
| Gagal | CircleX |
| Kadaluarsa | TimerOff |

Icons are presentation, not the status authority.

---

# 34. Search & Filter Rules

Search/filter logic should operate on canonical status categories.

Do not rely on fuzzy text matching where exact canonical mapping is possible.

Never allow a filter named:

```text
Refund
```

to silently query:

```text
orders.status = refund
```

when refund is not an order state.

---

# 35. Notification Mapping

| Event | Notification Concept |
|---|---|
| Pending | Payment reminder |
| Diproses | Payment received / processing |
| Berhasil | Transaction successful |
| Gagal | Transaction failed |
| Kadaluarsa | Payment expired |
| Refund | Financial refund notification |
| Cashback | Reward credited |
| Referral | Commission credited |

Refund remains an event/action notification.

---

# 36. AI Agent Rules

Every AI agent working on DaPay must:

1. Reuse canonical status values.
2. Reuse canonical domain mappings.
3. Distinguish state from action.
4. Distinguish order status from payment status.
5. Distinguish wallet mutation from order status.
6. Never invent a new status casually.
7. Check current repository compatibility before changing status logic.
8. Report legacy compatibility gaps instead of silently rewriting them.
9. Preserve terminal-state semantics.
10. Follow approval gates from `AGENTS.md`.

---

# 37. Forbidden Semantic Collapses

Never collapse:

```text
Expired → Failed
Refund → Failed
Cashback → Balance
Referral → Cashback
Withdraw Rejected → Order Failed
Provider Pending → User Payment Pending
```

unless a specific, documented domain mapping explicitly requires it.

---

# 38. Cross-Domain Status Ownership

| Domain | Owns |
|---|---|
| Order | Pending, Diproses, Berhasil, Gagal, Kadaluarsa |
| Deposit | Deposit lifecycle |
| Withdraw | Withdrawal approval lifecycle |
| Payment/Invoice | Payment/invoice lifecycle |
| Wallet | Financial mutation |
| Cashback | Cashback reward lifecycle |
| Affiliate | Commission lifecycle |
| Notification | Notification lifecycle |
| Analytics | Derived metrics |

One domain must not silently redefine another domain's status.

---

# 39. User vs Admin Visibility

## Member

Transaction statuses:

```text
Pending
Diproses
Berhasil
Gagal
Kadaluarsa
```

Financial refund:

Displayed in wallet/financial context.

## Admin

Same canonical order states plus operational visibility of:

- refund event;
- reconciliation;
- audit trail;
- payment gateway events;
- provider events.

Admin may expose more operational information without changing the underlying order status vocabulary.

---

# 40. Validation Rules

Before modifying status behavior, verify:

- Current database values.
- Existing order writer logic.
- API mapping.
- UI normalization.
- Analytics queries.
- Provider mapping.
- Payment callback mapping.
- Refund behavior.
- Wallet ledger behavior.
- Idempotency.

---

# 41. Non-Goals

This document does not authorize:

- database migration;
- enum creation;
- production DDL;
- DML;
- RLS changes;
- RPC changes;
- payment gateway changes;
- provider changes;
- historical data rewrite;
- deployment.

Those require explicit implementation scope and approval.

---

# 42. Final Canonical Registry

## Transaction

```text
Pending
Diproses
Berhasil
Gagal
Kadaluarsa
```

## Refund

```text
Financial Action
```

## Wallet Mutation

```text
Deposit
Payment
Withdraw
Refund
Cashback
Referral
Bonus
Adjustment
```

## Cashback

```text
Pending
Granted
Cancelled
```

## Affiliate

```text
Pending
Approved
Paid
```

## Notification

```text
Unread
Read
Archived
```

---

# 43. Final Standard

DaPay must maintain this separation:

```text
ORDER STATUS
        ≠
PAYMENT STATUS
        ≠
WALLET MUTATION
        ≠
REWARD STATUS
        ≠
NOTIFICATION STATUS
        ≠
ANALYTICS METRIC
```

The purpose of this contract is to make status semantics predictable across:

- Database
- Supabase
- API
- Checkout
- Invoice
- Receipt
- Provider integrations
- Wallet
- User Dashboard
- Admin Dashboard
- Analytics
- Notifications
- AI agents

Any future change to status semantics must update this document and the relevant lifecycle/business contract before implementation.