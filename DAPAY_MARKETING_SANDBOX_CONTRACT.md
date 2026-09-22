# DaPay Marketing Sandbox — Tester → Member & Sandbox Access Business Contract

## Document Purpose

Freeze approved business rules before implementation planning.

Internal working document. Local-only.

## Final Contract Status

STATUS: **APPROVED / FINAL / FROZEN**

AUTHORITY: **Project Owner**

APPROVAL DATE: **2026-09-10**

PURPOSE: **Single Source of Truth for Marketing Sandbox Product Layer**

NEXT TECHNICAL STEP: **Batch 1A/1B Gap Audit against this frozen contract**

## 1. Account Identity

Tester and Member use the same account.

Conversion does not create a new user.

Preserve:

- same `profiles.id`
- same account/email identity
- same referral relationship
- same profile identity

## 2. Tester → Member Conversion

Conversion changes persona/status only.

Before: Member Tester

After: Member Riil

After successful conversion:

- `is_tester = false`
- Tester history is preserved.
- Sandbox financial data is not migrated into LIVE.
- Sandbox orders remain Sandbox.
- Sandbox wallet remains Sandbox.
- No Sandbox money becomes DaPay Balance.
- Referral/profile metadata remains preserved.
- Conversion must be recorded for audit/history.

Recommended historical timestamp:

- `tester_converted_at` or equivalent audit/event record

Do not delete tester history.

## 3. Sandbox Access Model

Sandbox access is separate from account identity.

Admin/Manager:

- can grant Sandbox access
- can revoke Sandbox access
- can re-activate Sandbox access after Member has returned to LIVE

Member:

- may use Sandbox while Sandbox access is explicitly active
- may choose LIVE
- once Member leaves Sandbox and returns to LIVE, Sandbox becomes LOCKED
- Member cannot self-reactivate a locked Sandbox
- Member must request reactivation through the User/Member Help feature
- Admin/Manager must approve reactivation

The following is not allowed without management approval:

Sandbox → LIVE → Sandbox → LIVE → Sandbox

after Sandbox access has been revoked/locked.

## 4. Persona States

Conceptual lifecycle:

Tester → Sandbox Active → Conversion → Real Member → LIVE Active → Sandbox Request → Admin/Manager Approval → Sandbox Active → LIVE → Sandbox Locked

Important: `is_tester` alone must not automatically become the complete long-term Sandbox access model.

Implementation must distinguish:

- tester history/status
- current Sandbox access
- locked/revoked state
- reactivation approval

Do not decide schema details in this document.

## 5. Sandbox Wallet

Sandbox wallet is completely isolated from LIVE wallet.

Never transfer:

Sandbox balance → DaPay Balance

Never transfer Sandbox financial state into LIVE financial state automatically.

After conversion:

- Sandbox wallet remains stored.
- Sandbox wallet becomes inaccessible for normal Member usage unless Sandbox access is explicitly reactivated.
- Historical Sandbox wallet data remains available to Admin/Manager.

## 6. Sandbox Orders

All Sandbox orders remain in `sandbox_orders`.

Never migrate Sandbox orders into `orders`.

Never convert Sandbox order into LIVE order.

Sandbox history is permanently classified as Sandbox history.

## 7. Sandbox Ledger / Refund / Reward

Sandbox payments, refunds, rewards, and ledger mutations remain entirely inside Sandbox financial tables.

No Sandbox financial operation may create LIVE financial balance.

Existing Sandbox/LIVE financial separation remains a hard constraint.

## 8. Member User Interface

When Sandbox is active, Member may see:

- Sandbox mode indicator
- Sandbox balance
- Sandbox-capable experience
- Sandbox order/history

When Sandbox is not active or locked, Sandbox must disappear completely from the Member dashboard.

Member must not see:

- Sandbox navigation
- Sandbox balance
- Sandbox order history
- Sandbox controls

Normal Member dashboard should appear clean and LIVE-oriented.

## 9. Sandbox History Visibility

After Tester → Member conversion, Member must not see Sandbox history.

Sandbox data remains stored in Supabase.

Admin/Manager can continue to see Sandbox history.

If Admin/Manager later re-activates Sandbox access:

- Sandbox UI becomes available again.
- Member can see historical Sandbox data again.
- Member can access Sandbox again.

When Sandbox access is revoked or locked again:

- Sandbox disappears from Member UI again.
- Sandbox data is retained.

## 10. Referral / Profile Metadata

Conversion must preserve existing referral/profile metadata.

Do not reset:

- referral relationship
- profile identity
- unrelated Member metadata

Tester status/history is separate from referral identity.

## 11. Conversion Eligibility

Tester may self-convert to Member.

No requirement that Sandbox balance be zero.

No requirement that Sandbox balance be spent before conversion.

Conversion should validate:

- authenticated current account
- eligible Tester state
- conversion has not already completed
- required business conditions

Do not define implementation details here.

## 12. Conversion Atomicity

Conversion must be atomic.

Conceptual transaction:

BEGIN
→ validate Tester eligibility
→ change Tester to Member
→ revoke/lock Sandbox access
→ record conversion event/history
→ COMMIT

On failure:

- do not leave partial state

No partial conversion is acceptable.

## 13. Who Can Convert / Reactivate

Tester:

- may self-convert to Member
- may request Sandbox reactivation

Admin/Manager:

- may perform management override where required
- may grant/revoke Sandbox access
- may approve Sandbox reactivation

Admin/Manager are Management/QA Persona, not customer personas.

## 14. Conversion Event / Funnel

Conversion should be auditable as a business event.

Suggested event: `tester_converted_to_member`

Minimum conceptual information:

- `user_id`
- `occurred_at`
- `source = marketing_sandbox`

Future Marketing Funnel may track:

- CTA viewed
- application started
- tester approved
- Sandbox activated
- first simulated order
- conversion to Member

Do not mix Sandbox financial activity into LIVE accounting.

## 15. Hard Security Constraints

The following existing constraints must remain intact:

- Sandbox uses `sandbox_orders`.
- LIVE uses `orders`.
- Sandbox provider execution uses `SANDBOX_SIMULATOR`.
- Sandbox wallet/logs remain separate.
- Sandbox authorization remains server-side.
- Client-controlled state is not authorization evidence.
- Admin/Manager cannot act as customer Sandbox persona.
- LIVE Analytics must not consume Sandbox financial tables.
- Existing F-01/F-02/F-03 security boundaries remain protected.
- Existing hardened financial primitives remain untouched unless a direct dependency is proven.

## 16. Implementation Principle

Tester → Member is a persona/access transition.

It is not:

- a wallet transfer
- a transaction migration
- an order migration
- a financial conversion
- a duplicate account creation

Core principle:

Sandbox data remains Sandbox. LIVE data remains LIVE. Only account persona/access changes.

## 17. Out of Scope for This Contract

This document does not decide:

- exact database table design
- exact column names
- exact RPC names
- exact API routes
- exact UI component structure
- exact marketing copy
- exact funnel analytics schema
- migration implementation

Those decisions belong to the implementation planning phase.

## 18. Approval Status

Status: APPROVED BUSINESS CONTRACT

Approved by project owner: YES

Implementation status: NOT STARTED

Migration status: NOT STARTED

Database mutation: NONE

Application changes: NONE

## 19. Product Layer Planning Addendum

This section defines the product-planning boundary for Marketing Sandbox. It does not authorize application, database, API, RPC, authentication, RLS, or migration changes.

### 19.1 Frozen Product Constraints

The Product Layer must preserve these rules:

- Tester and Member remain one account identity.
- Sandbox access is distinct from Tester history/persona.
- Sandbox wallet, orders, ledger, refunds, and rewards remain isolated from LIVE.
- Sandbox authorization requires current server-side authorization; client state is not authority.
- Admin/Manager remain Management/QA Persona, not customer Sandbox persona.
- Conversion preserves profile/referral identity and Tester history.
- Conversion does not transfer money, orders, or wallet data into LIVE.
- Locked or revoked access requires the existing reactivation approval model.
- Product analytics must distinguish marketing/operational events from financial accounting.

### 19.1.1 Dual Workspace Decision

One account may use two workspace experiences:

- LIVE
- SANDBOX

Identity remains one account:

- same `profiles.id`
- same account
- same email identity
- no second account
- no financial migration

LIVE is the default workspace and uses the existing User/Member dashboard, sidebar, wallet, data, orders, and DaPay presentation.

When `sandbox_access.state = 'ACTIVE'` and the user chooses Sandbox, the same account may switch between:

```text
LIVE ↔ SANDBOX
```

Sandbox provides Sandbox navigation, wallet/data/orders, and simulation content while retaining the existing User/Member dashboard design system.

When Sandbox access is `NONE`, `LOCKED`, or `REVOKED`:

- Sandbox cannot be selected by the customer.
- Sandbox navigation/workspace is hidden.
- The customer remains in or returns to LIVE.

Cookie/session state may represent the selected mode/session experience. It is not authorization evidence. Server-side Sandbox access remains authoritative.

### 19.1.2 Visual Design Decision

LIVE and SANDBOX use the same User/Member dashboard design system.

Sandbox must preserve, as far as practical:

- visual language
- layout principles
- sidebar style
- header style
- cards
- buttons
- typography
- spacing
- responsive behavior
- interaction patterns
- component conventions

The difference between LIVE and SANDBOX is mode, workspace/content, data source, wallet, orders, simulation behavior, and clear Sandbox labeling—not a new design system.

Sandbox may use a consistent visual indicator such as `SANDBOX` or `SANDBOX • SIMULASI`, but must still feel like one DaPay User Dashboard.

### 19.1.3 Final Product Principle

Marketing Sandbox is a product experience for prospective and current retail users to learn and try digital business safely.

**Satu design system, dua workspace experience; Sandbox memiliki fitur khusus simulasi yang tidak ditambahkan ke LIVE kecuali ada keputusan produk LIVE terpisah.**

LIVE remains the default and preserves the existing User/Member dashboard, LIVE data, LIVE wallet, and LIVE orders. LIVE does not receive Sandbox-specific simulation or education features by implication.

SANDBOX uses the same design system but may provide the Sandbox-specific workspace, content, state, simulation, and educational experience required by this Product Layer.

### 19.1.4 Sandbox-Only Feature Boundary

| SANDBOX-ONLY | LIVE PRESERVATION |
|---|---|
| Simulated Transaction | Existing LIVE transaction flow |
| Margin Simulation | Existing LIVE wallet |
| Virtual Sandbox Balance | Existing LIVE order flow |
| Curated Demo Catalog | Existing LIVE dashboard |
| Sandbox Orders/History | LIVE data only |
| Sandbox onboarding/guided experience | No Sandbox onboarding by implication |
| Sandbox milestones/progress | No Sandbox progress by implication |
| Sandbox educational prompts | No Sandbox educational prompts by implication |
| Sandbox mode indicator | Normal LIVE presentation |

Sandbox-specific features must not modify LIVE wallet, LIVE orders, LIVE ledger, or LIVE accounting semantics. They must not automatically appear after the user returns to LIVE. Any LIVE equivalent requires a separate approved LIVE Product Layer decision.

### 19.2 Product Layer Scope

The intended product experience covers:

1. Public acquisition and explanation.
2. Self-service eligibility check and Sandbox activation.
3. Sandbox onboarding.
4. Curated business-product exploration.
5. Simulated ordering and virtual balance experience.
6. Margin education using non-accounting simulation.
7. Repeat Sandbox usage.
8. Conversion decision and same-account Member LIVE experience.
9. Reactivation request and approved return to Sandbox.

This scope is product structure only. It does not define routes, components, schema, RPCs, API contracts, or migrations.

## 20. Target User and Value Proposition

### 20.1 Primary Target

Primary candidates are small retail operators who need to understand digital-product selling before risking LIVE funds:

- counter HP operators
- kios pulsa operators
- UMKM retail sellers
- individuals testing whether digital-product resale fits their business

Typical characteristics:

- needs simple catalog and pricing explanation
- has limited tolerance for financial mistakes
- wants to understand margin before committing LIVE balance
- may begin as a prospective seller rather than an established Member

The following are not primary targets unless separately approved:

- end users seeking personal consumption only
- users expecting real cash, credit, or guaranteed profit from Sandbox
- wholesale or enterprise operators requiring production settlement controls
- users attempting to bypass management approval or LIVE controls

### 20.2 Value Proposition

Marketing Sandbox lets a prospective seller learn the DaPay business experience with virtual Sandbox state before using LIVE funds.

The experience should help users:

- understand catalog and product flow
- practice a simulated transaction
- see illustrative cost, selling price, and margin
- learn repeat-selling behavior
- decide whether to become a LIVE Member

“Tanpa risiko” means no LIVE financial exposure from Sandbox activity. It must not imply guaranteed profit, guaranteed approval, or transferability of Sandbox funds.

## 21. Customer Journey Model

| Stage | Product goal |
|---|---|
| Guest | Understand who Sandbox is for and why it exists. |
| Landing | Establish trust and explain virtual, isolated experience. |
| CTA | Start eligibility check or learn how Sandbox works. |
| Eligibility Check | Verify account, email, persona, and blocking conditions. |
| Onboarding | Explain mode, balance, catalog, simulation, and limits. |
| Sandbox Active | Let user safely explore the business flow. |
| Explore Catalog | Connect familiar retail products to seller use cases. |
| Simulated Transaction | Demonstrate order flow without LIVE settlement. |
| Margin Understanding | Explain illustrative cost, price, and margin. |
| Repeat Usage | Encourage learning through additional simulations. |
| Conversion Decision | Explain LIVE Member benefits and boundaries. |
| Member LIVE | Keep LIVE dashboard clean and preserve Sandbox isolation. |

## 22. Product Information Architecture

### Public

- Marketing Sandbox landing
- How it works
- FAQ
- Trial/application entry

### User

- Existing LIVE workspace
- Sandbox onboarding
- Sandbox workspace
- Sandbox Home
- Catalog
- Product Detail
- Simulated Checkout
- Sandbox Orders
- Virtual Wallet
- Margin Simulation
- Conversion decision
- Reactivation request when eligible

### Management

- Application/approval work queue
- Sandbox access monitoring
- Reactivation queue
- Tester history/persona information
- Sandbox operational monitoring

The Product Layer must not create a second authority model. Existing account, access, history, and isolation contracts remain authoritative.
The Product Layer must not imply that the LIVE dashboard needs Sandbox-specific pages or features.
The Product Layer must not create a second dashboard design system. LIVE and SANDBOX are two workspace experiences inside one DaPay User Dashboard.

## 23. Product Experience Requirements

### 23.1 Landing and Acquisition

Landing must explain:

- target user
- virtual Sandbox nature
- no LIVE money transfer
- what a user can learn
- eligibility requirements
- path to LIVE Member conversion

Primary CTA, secondary CTA, final copy, FAQ wording, testimonials, and social-proof requirements are implementation copy/details governed by the approved Product Policy.

### 23.2 Self-Service Eligibility and Activation

The default user experience is LIVE. Account creation does not automatically activate Sandbox.

User explicitly chooses `Coba Sandbox`. Activation then runs an eligibility check before granting first access.

Basic eligibility:

- account is registered
- email is verified
- account is not Admin/Manager customer persona
- account is not blocked

First Sandbox access is self-service after eligibility passes. Email verification is the first verification channel. WhatsApp is deferred to a later phase.

Eligibility failure must show a business-readable reason. It must not expose raw security, database, or internal abuse signals.

Abuse protection uses rate limiting and activity quota. Exact thresholds remain operational configuration.

Implementation details governed by the approved Product Policy:

- minimum submitted data
- duplicate pending application behavior
- detailed rejection taxonomy

There is no management approval step for first self-service activation when eligibility passes. LOCKED and REVOKED access still use the existing management reactivation approval flow.

### 23.3 Onboarding

First Sandbox experience should explain:

- Sandbox mode indicator
- virtual balance
- simulated transaction meaning
- catalog exploration
- illustrative margin
- Sandbox limitations
- next recommended action

Onboarding must never imply that Sandbox balance is LIVE balance.

### 23.4 LIVE Preservation Constraint

Product Layer implementation MUST preserve the current LIVE User/Member dashboard experience.

The implementation must not assume that LIVE needs:

- Margin Simulation
- Simulated Checkout or Simulated Transaction
- Virtual Balance
- Curated Demo Catalog
- Sandbox onboarding
- Sandbox milestones or progress
- Sandbox educational prompts

LIVE changes require a separate approved LIVE Product Layer decision.

### 23.5 Workspace and Mode Presentation

LIVE remains the default User/Member experience. Sandbox is available only after the user explicitly chooses it and current Sandbox access is ACTIVE.

Across sidebar, header, workspace, catalog, product detail, simulated checkout, Sandbox orders, virtual wallet, and history, the interface must make clear:

- this is Sandbox
- this is simulation
- balance is virtual
- transactions are not LIVE
- Sandbox money does not become LIVE money

These indicators must use the existing User/Member dashboard language and component conventions. They must not introduce a separate Sandbox application or design system.

### 23.6 Guided Experience

Recommended guidance primitives:

- one recommended first action
- short onboarding checklist
- contextual tooltip or explanation
- simulated first transaction
- milestone/progress feedback
- educational margin prompt

Exact guidance sequence, dismissal rules, and persistence remain implementation details governed by the approved Product Policy.

## 24. Demo Catalog and Margin Simulation

The initial Product Layer uses a curated, easy-to-understand retail catalog rather than exposing every production catalog item.

Candidate categories include:

- mobile credit
- data packages
- utility/payment products familiar to kiosks
- simple repeat-purchase retail products

Catalog inclusion, ordering, pricing source, and relationship to production catalog remain implementation details governed by the approved Product Policy.

Margin education is illustrative only:

```text
illustrative margin = example selling price - example cost price
illustrative revenue = example selling price × example quantity
```

Example only:

- example cost: Rp10.000
- example selling price: Rp11.000
- example illustrative margin: Rp1.000

These examples are not accounting entries, wallet mutations, settlement values, or profit guarantees. Production accounting formulas remain outside Product Layer scope.

## 25. Conversion Product Experience

Conversion should be presented when the user has enough Sandbox understanding to evaluate LIVE participation. The exact trigger is defined by the approved Product Policy.

Conversion explanation must state:

- same account continues
- LIVE Member access becomes the primary experience
- Sandbox data remains Sandbox
- Sandbox money does not become LIVE money
- Sandbox orders are not migrated
- referral/profile identity remains preserved
- Sandbox can return only through the approved reactivation path when applicable

Post-conversion experience must remain LIVE-oriented. Sandbox navigation, balance, and history are hidden when access is not active, while retained data remains available to authorized management.

## 26. Reactivation Product Experience

User-facing reactivation stages:

1. Locked or revoked explanation.
2. Request reactivation.
3. Pending/waiting state.
4. Approved state with Sandbox return.
5. Rejected state with management reason where available.

This experience must use the existing management approval model. It must not self-activate access or create a parallel approval path.

## 27. Marketing Funnel and Metrics

Conceptual funnel:

```text
Landing viewed
→ CTA clicked
→ Eligibility check started
→ Eligibility passed
→ Sandbox activated
→ First Sandbox session
→ First simulated order
→ Repeat usage
→ Conversion started
→ Conversion completed
→ Member active
```

### Marketing KPI

- landing visitors
- CTA conversion
- eligibility pass rate
- activation rate
- first simulated transaction rate
- repeat usage rate
- conversion rate

### Operational KPI

- pending applications
- time to first Sandbox session
- time to first simulated transaction
- reactivation pending count
- reactivation turnaround time
- rejection rate

### Financial Accounting Boundary

Marketing and operational metrics must not be treated as LIVE revenue, balance, margin, settlement, or accounting data.

Funnel event names, attribution, analytics mechanism, retention, and reporting follow the approved Product Policy in Section 29.3.

## 28. Product Lifecycle States

Product lifecycle language must distinguish application, persona/history, and access:

- Guest
- Eligibility Check Started
- Eligibility Failed
- Eligibility Passed
- Sandbox Active
- Sandbox Locked
- Sandbox Revoked
- Reactivation Pending
- Converted Member
- Member LIVE Active

These labels are conceptual. Existing `sandbox_access.state` and Tester history semantics remain the technical authority. No new schema state is implied by this list.

## 29. Business Rules vs Product Rules

### 29.1 Existing Frozen Business Rules

- same account identity
- Sandbox/LIVE financial isolation
- Sandbox-specific orders and wallet
- server-side Sandbox authorization
- Tester history preservation
- atomic conversion requirement
- management approval for reactivation
- Admin/Manager management persona separation

### 29.2 Product Layer Structure

- public acquisition explanation
- eligibility/onboarding journey
- curated learning experience
- simulated catalog and margin education
- conversion education
- reactivation presentation
- marketing and operational funnel measurement

### 29.3 Final Approved Product Policy

Decision status: **APPROVED / FROZEN**

Approval authority: **Project Owner**

Approval date: **2026-09-10**

The following Product Layer decisions are final and authoritative:

1. Target users are beginner resellers, HP counters, pulsa kiosks, and small UMKM retail users. Marketing Sandbox is not positioned for personal consumption or enterprise/wholesale use without separate approval.
2. First Sandbox activation requires no application record. The user chooses Coba Sandbox and completes self-service eligibility and activation.
3. Duplicate application handling does not apply to first activation. Reactivation has at most one active request per account.
4. Eligibility requires a registered account, verified email, non-Admin/Manager customer persona, and no blocking condition.
5. Eligibility failure shows a business-readable reason and does not expose internal fraud or risk signals.
6. Retry is allowed after the blocking eligibility condition is resolved. Abuse and rate-limit restrictions remain applicable.
7. Activity protection combines session and simulation controls with daily and rolling limits. Numeric values are operational configuration, not frozen business-contract values.
8. Meaningful activity includes catalog/product exploration, product detail, margin view, simulated transaction, and order/history review. Passive login alone is not meaningful activity.
9. Abuse evaluation uses rate, repetition, failure, and usage-pattern signals. No single fixed threshold defines all abuse.
10. Blocking uses temporary restriction followed by review. Severe abuse may follow existing security policy.
11. Sandbox uses a curated demo catalog, not automatically the complete LIVE catalog, prioritizing products relevant to beginner reseller learning.
12. Demo pricing and margin are fixed illustrative snapshots, not LIVE pricing or profit guarantees. Margin is educational simulation information.
13. Onboarding uses a short checklist, recommended next action, and limited purposeful tooltips.
14. Primary conversion CTA appears after the first simulated transaction and margin view, with a low-emphasis CTA remaining available.
15. Reactivation uses state-specific messaging for LOCKED, REVOKED, PENDING, APPROVED, and REJECTED. Management approval semantics remain unchanged.
16. Email is used for verification and important status communication. WhatsApp is deferred.
17. After reactivation, the user may see relevant historical Sandbox information belonging to that user. Sandbox history remains isolated from LIVE. Management visibility follows management authorization.
18. Analytics uses the existing analytics mechanism first. A dedicated Sandbox event-store schema is not introduced merely for Sandbox without separate approval.
19. Funnel events cover landing/CTA, eligibility started, eligibility pass/fail, activation, first Sandbox session, catalog/product exploration, first simulation, repeat activity, conversion, and reactivation.
20. Attribution uses a 30-day window.
21. Retention means meaningful Sandbox activity on at least two distinct days within 14 days.
22. Reporting uses weekly operational reporting and monthly Product Owner review.
23. Marketing and operational Sandbox metrics are never LIVE revenue, balance, margin, settlement, or accounting data.

## 30. Conflict Check

Status: **RESOLVED**

The previously identified Product Layer conflicts are resolved:

1. Conversion trigger is after first simulated transaction plus margin view.
2. First activation does not require an application record.
3. Retry is allowed after the blocking eligibility condition is resolved, subject to abuse/rate limits.
4. Analytics uses the existing mechanism first; no dedicated event-store schema is implied.
5. Historical Sandbox visibility after reactivation is allowed for the user's relevant Sandbox information and remains isolated from LIVE.

No conflict exists with Sections 1–18, including same-account identity, Sandbox/LIVE isolation, Tester history, reactivation approval, or Admin/Manager persona separation.

## 31. Implementation Gate

Implementation-critical Product Layer decisions are now resolved and approved. This contract is frozen as business/product authority.

Technical planning may proceed as a separate next step, beginning with the Batch 1A/1B Gap Audit against this contract. This document does not authorize application implementation, database changes, migrations, API/RPC/RLS/auth changes, or deployment automatically.

## 32. Product Decision Record

Sections 29.3, 30, 34, and this status block together form the authoritative final Product Layer decision record. No older Product Layer recommendation or superseded recommendation list overrides them.

## 33. Final Approved Product Policy Notes

- Numeric activity quota values are operational configuration and remain outside the frozen business contract.
- Abuse thresholds are evaluated through approved risk signals rather than one universal number.
- Eligibility reasons must remain business-readable and must not expose internal fraud/risk signals.
- Sandbox-specific simulation and education do not enter LIVE by implication.
- Product metrics remain separate from LIVE accounting.

## 34. Dual Workspace and Visual Design Approval

Decision status: **APPROVED / FROZEN**

Approval authority: **Project Owner**

Approval date: **2026-09-10**

The following visual/workspace decisions are frozen:

1. DaPay provides one User Dashboard with two workspace experiences: LIVE and SANDBOX.
2. LIVE is the default workspace.
3. The user explicitly chooses Sandbox; account creation does not automatically select or activate Sandbox.
4. Sandbox selection requires current sandbox_access.state = ACTIVE.
5. NONE, LOCKED, and REVOKED hide or disable Sandbox workspace selection and keep the customer in LIVE.
6. Cookie/session state represents mode experience only and never replaces server-side authorization.
7. LIVE and SANDBOX use the same User/Member dashboard design system.
8. Sandbox distinction comes from mode, workspace/content, data source, state, simulation behavior, and clear SANDBOX / SANDBOX • SIMULASI labeling—not from a new design system.
9. Sandbox wallet, data, orders, and simulation remain isolated from LIVE.

## 35. Contract / Implementation Status Note

This document defines business and product authority.

Some technical Sandbox foundation already exists from Batch 1A/1B. That technical foundation does not redefine or override this contract.

Product Layer implementation remains future work. Finalizing this contract does not mean that all Product Layer code, catalog, analytics, onboarding, or UX exists.

The next technical step is a targeted Batch 1A/1B Gap Audit against this frozen contract. No implementation, migration, database change, deployment, commit, or push is part of this document finalization.
