# DaPay Admin UI Progress

## Purpose

Primary checkpoint for DaPay Admin UI/UX and admin-facing feature work.

Goal: let a new Codex session continue safely from current local source without rereading long historical detail or re-auditing CLOSED scopes.

This file must NOT automatically resume unrelated security or financial-flow hardening.

---

## Source Priority

1. ACTUAL CURRENT LOCAL REPOSITORY
2. current DB / migration state when relevant
3. `DAPAY_ADMIN_UI_PROGRESS.md`
4. `DAPAY_PROJECT_PROGRESS.md`
5. Repomix / older reports only as secondary reference

Local source always wins.

---

# CURRENT OBJECTIVE

Current completed UI focus:

`ANALYTICS UI REDESIGN — VISUAL REWORK COMPLETE`

Primary entry:

`app/(dashboard)/admin/analytics/AnalyticsView.tsx`

Status:

`IMPLEMENTED / VISUAL REWORK COMPLETE / READY FOR FINAL MANUAL VERIFICATION`

Current active objective:

`ADMIN DASHBOARD REDESIGN — UI/UX POLISH`

Primary entry:

`app/(dashboard)/admin/page.tsx`

Status:

`IMPLEMENTED / MANUAL UI REWORK IN PROGRESS`

Other current states:

```text
ACCOUNT DATABASE — PHASE 1
VERIFIED / CLOSED

FINAL ORDER STATUS CONTRACT
VERIFIED

DASHBOARD FINAL SUCCESS STATUS FIX
VERIFIED / CLOSED

ANALYTICS TECHNICAL FINANCIAL VALIDATION
DEFERRED FOR FOCUSED CODEX BATCHES

REFERRAL PROVENANCE DESIGN AUDIT
DEFERRED / PLANNED
```

No unrelated security audit or financial-flow hardening is resumed by this UI priority change.

---

# FINAL ORDER STATUS CONTRACT

Status:

`VERIFIED`

Canonical financially-final success:

```text
FINANCIALLY_FINAL_SUCCESS_STATUSES = ["Berhasil"]
```

Semantics:

```text
Pending
-> awaiting payment
-> not final

Diproses
-> payment accepted / fulfillment in progress
-> not financially final

Berhasil
-> final successful order
-> financially final

Gagal
-> final failed order
```

Excluded from final-success reporting:

- Selesai
- Success
- Paid
- settlement
- Sukses

Provider `Sukses` is mapped to persisted `Berhasil`.

Verified production inventory from completed read-only audit:

```text
Berhasil: 39
Diproses: 1
Gagal: 58
```

---

# ANALYTICS UI — CURRENT APPROVED DIRECTION

Status:

`IMPLEMENTED / VISUAL REWORK COMPLETE / READY FOR FINAL MANUAL VERIFICATION`

Primary entry:

`app/(dashboard)/admin/analytics/AnalyticsView.tsx`

The current Analytics visual structure is the approved presentation direction.

Do NOT redesign the Analytics information architecture again unless:

- a visible regression exists;
- a technical dependency requires a compatibility change;
- or the user explicitly requests a redesign.

## Implemented / approved UI

- professional Analytics header
- `BUSINESS PERFORMANCE` eyebrow retained
- main module title remains `ANALYTICS`
- advanced Period selector:
  - Hari Ini
  - Kemarin
  - 7 Hari Terakhir
  - 30 Hari Terakhir
  - Bulan Ini
  - Bulan Lalu
  - Tahun Ini
  - Rentang Tanggal
  - Semua Data
- custom date-range popup
- Current / Comparison / Benchmark reporting context
- exact full selected period remains visible in the top reporting-context area
- concise local period context is repeated inside reporting sections so Admin does not need to scroll to the top repeatedly
- local period examples:
  - Hari Ini -> `Hari Senin · sampai HH.mm`
  - Kemarin -> weekday name
  - Bulan Ini -> `Bulan Agustus`
  - Bulan Lalu -> previous month name
  - Tahun Ini -> `Tahun 2026`
  - Semua Data -> `Semua Data`
- all primary section headings use consistent typography

Current primary section names:

```text
DAPAY OVERVIEW
NEEDS ATTENTION
BUSINESS TRENDS
PROFITABILITY
ORDER PERFORMANCE
CATEGORY PERFORMANCE
CUSTOMER
PLATFORM FEE
MEMBER FUNDS
QUICK INSIGHTS
```

## DAPAY OVERVIEW

Current KPI direction includes:

- Total Order
- Order Berhasil
- Success Rate
- Omzet
- Gross Margin

Selected-period comparison and benchmark context remain visible.

## NEEDS ATTENTION

Operational visibility remains separate from financial reporting.

Current status attention may include:

- Pending
- Diproses
- Gagal

Exact UI behavior remains tied to the current Analytics source.

## BUSINESS TRENDS

Implemented adaptive trend presentation.

### Adaptive Trend Granularity

```text
Hari Ini / Kemarin
-> Per Jam

7 Hari / 30 Hari
-> Harian

Bulan Ini / Bulan Lalu
-> Harian

Tahun Ini / Semua Data
-> Bulanan

Custom <= 31 hari
-> Harian

Custom 32-120 hari
-> Mingguan

Custom > 120 hari
-> Bulanan
```

The badge changes dynamically with the selected period.

The chart currently reports:

- Total Order
- Omzet
- Gross Margin

## PROFITABILITY

Current visible lines include:

- Omzet
- Modal Vendor
- Gross Margin
- Cashback
- Referral
- Order Contribution

`Order Contribution` remains the UI label.

Its UI explanation is:

```text
Order Contribution = Gross Margin setelah dikurangi Cashback & Referral.
Belum termasuk biaya operasional lain, jadi bukan keuntungan bersih DaPay.
```

Do NOT relabel `Order Contribution` as Profit Murni / Net Profit.

## ORDER PERFORMANCE

Status distribution remains visible as a donut chart.

Legend/status values are positioned below the donut where needed so labels do not visually collide or get clipped.

Canonical final success remains:

`Berhasil`

Operational statuses such as `Diproses` and `Gagal` remain visible.

## CATEGORY PERFORMANCE

Current table columns:

```text
KATEGORI
ORDER
BERHASIL
SUCCESS RATE
OMZET
GROSS MARGIN
```

Presentation rules:

- ORDER centered
- BERHASIL centered
- SUCCESS RATE centered
- OMZET right aligned
- GROSS MARGIN right aligned
- compact fixed column proportions
- Gross Margin shows nominal + margin rate
- category sorting:
  1. Gross Margin descending
  2. Total Order descending
  3. category name
- unknown UUID-like category values are not exposed directly to Admin
- unknown UUID-like category values display as:
  `Kategori Tidak Dikenali`
- `Lihat semua kategori` appears only when more than 5 categories exist
- collapsed table shows top categories
- expanded table may grow downward
- no-success periods explain that volume remains visible while Omzet/Gross Margin may remain Rp0

Layout:

```text
CATEGORY PERFORMANCE
-> left side
-> 8/12 desktop

CUSTOMER + PLATFORM FEE
-> right side
-> 4/12 desktop
-> stacked vertically
```

Collapsed behavior:

- CATEGORY PERFORMANCE outer container visually aligns to the combined right-side CUSTOMER + PLATFORM FEE stack.

Expanded behavior:

- CATEGORY PERFORMANCE may extend below the right-side stack.
- CUSTOMER and PLATFORM FEE remain at natural height.
- Expanding categories must not force the right-side stack to grow.

## CUSTOMER

Remains on the right side of CATEGORY PERFORMANCE.

Current breakdown includes:

- Member vs Guest
- Regular vs Special

## PLATFORM FEE

Remains below CUSTOMER in the same right-side column.

Current visible metrics:

- Upgrade Fee
- Withdrawal Admin Fee

These remain separate qualified metrics and are not silently folded into Order Gross Margin.

## MEMBER FUNDS

Remains separated from company sales / Gross Margin reporting.

Current cards:

- Deposit
- Withdrawal
- Refund
- Adjustment

Desktop relationship:

```text
MEMBER FUNDS
-> left

QUICK INSIGHTS
-> right
```

Current outer-container behavior:

- MEMBER FUNDS and QUICK INSIGHTS remain side-by-side on desktop
- current desktop ratio remains 5/12 : 7/12 unless explicitly redesigned later
- outer section containers are intended to have equal visual height
- inner cards do not need identical heights to cards in the opposite section

## QUICK INSIGHTS

Current insight structure includes:

- Revenue Leader
- Order Health
- Margin Concentration
- Needs Attention

Insight rules:

- do not merely repeat top KPI numbers without interpretation
- Revenue Leader identifies the leading final-revenue category where available
- Order Health shows successful / failed / open-order context
- Margin Concentration uses share of total Gross Margin, not share of Omzet
- Needs Attention highlights failed-order conditions
- selected-period context is dynamic and shown locally
- exact period range remains available in the top reporting-context area

## Exports

Excel / PDF export remain available.

Category export includes successful-order count.

Unknown category identifiers should not be exposed as raw UUID-like values in normal Admin-facing export presentation.

---

# ANALYTICS PERIOD / COMPARISON / BENCHMARK

Status:

`IMPLEMENTED / APPROVED MANAGEMENT-ANALYTICS METHODOLOGY`

Methodology:

```text
Current
-> selected reporting period

Comparison
-> equivalent prior period
-> used for growth / decline

Benchmark
-> contextual business reference
-> NOT the growth denominator
```

Examples:

```text
Bulan Ini

Current:
1 Aug -> today

Comparison:
1 Jul -> equivalent date

Benchmark:
previous full month
```

```text
Tahun Ini

Current:
1 Jan -> today

Comparison:
equivalent YTD last year

Benchmark:
previous full year
```

`Semua Data` does not need an artificial growth comparison.

The UI methodology is approved.

Future server-side implementation / scalability remains technical work.

---

# ANALYTICS CURRENT REPORTING CONTRACT

Canonical success filter:

```text
orders.status = 'Berhasil'
```

Current interim formulas:

```text
Omzet
= SUM(orders.price)
WHERE orders.status = 'Berhasil'

Modal Vendor
= SUM(orders.buy_price)
WHERE orders.status = 'Berhasil'

Gross Margin
= Omzet - Modal Vendor

Order Contribution
= Gross Margin
- orders.cashback
- orders.referral_commission
for the same final Berhasil cohort
```

Status:

`INTERIM ANALYTICS FORMULAS / TECHNICAL VALIDATION REQUIRED`

These formulas are acceptable for the current Admin UI prototype and management-layout work.

They must NOT yet be treated as final authoritative accounting definitions.

Do NOT label Gross Margin / Order Contribution as:

- Profit Murni
- Net Profit

---

# ANALYTICS DATA-SEPARATION RULES

## Business Performance

Use financially-final order data only.

## Gross Margin

```text
Financially-final Sales
- Vendor Cost
= Gross Margin
```

Gross Margin is not Net Profit.

## Rewards

Cashback and Referral must use one authoritative source per reported event.

Do not double count:

- `orders.*`
- wallet logs

for the same reward.

## Platform Fee

Keep separate:

- Upgrade Fee
- Withdrawal Admin Fee

Do not silently merge these into Order Gross Margin.

## Member Funds

Keep outside company P&L by default:

- Deposit
- Withdrawal principal
- Refund
- AdminAdjustment

`balance_logs` is a member-wallet mutation ledger, not the default company P&L ledger.

Refund remains heterogeneous until durable source provenance exists.

AdminAdjustment remains a wallet correction without proven P&L meaning.

---

# ANALYTICS TECHNICAL GAPS — FUTURE CODEX WORK

Status:

`DEFERRED FOR FOCUSED CODEX BATCHES`

These gaps do NOT block the completed Analytics visual rework.

Codex should handle them later one logical batch at a time.

## P1 — Canonical Sales Amount / Omzet

Current interim source:

`orders.price`

Potential issue:

Discounted order flows may store product selling-price snapshot in `orders.price` while actual payable transaction value is lower.

Future Codex task:

`CANONICAL SALES AMOUNT AUDIT — READ-ONLY`

Inspect at minimum:

- `orders.price`
- `orders.discount`
- `orders.voucher_amount`
- `orders.total_amount`
- `orders.unique_code`
- `orders.used_balance`
- current checkout writers
- legacy writers
- Pascabayar writers

Do not change Analytics revenue formula until one durable contract is proven.

## P2 — Canonical Vendor Cost / Gross Margin

Current interim source:

`orders.buy_price`

Potential issue:

Historical / Pascabayar flows may not share one identical `buy_price` meaning.

Future task:

`CANONICAL VENDOR COST AUDIT — READ-ONLY`

Gross Margin becomes authoritative only after both:

- canonical Sales Amount
- canonical Vendor Cost

are settled.

## P3 — Financial Recognition Timestamp

Current Analytics period basis:

`created_at`

Known limitation:

order creation time may differ from final fulfillment time.

Future design should decide whether a durable field such as:

- `financially_final_at`
- `fulfilled_at`
- `success_at`

is required.

Potential target:

```text
Operational Total Order
-> created_at

Financial final sales / vendor cost / gross margin
-> final-success timestamp
```

No migration until design and all required writers are reviewed.

## P4 — Business Timezone

Future reporting contract should explicitly use:

`Asia/Jakarta`

Same timezone must govern:

- period boundaries
- trend buckets
- comparison
- benchmark
- export dates

## P5 — Server-side Reporting Aggregation

Current Analytics performs substantial client-side aggregation.

This remains acceptable for the current UI stage.

It is NOT the final production-scale reporting architecture.

Future target:

```text
Analytics UI
-> authorized Admin reporting endpoint / RPC
-> PostgreSQL aggregation
-> compact reporting payload
```

Future aggregate reporting should eventually cover:

- total order
- final-success order
- status distribution
- canonical sales amount
- canonical vendor cost
- Gross Margin
- comparison
- benchmark
- trend buckets
- category performance
- approved Platform Fee metrics
- approved Member Funds metrics

Do not build the final reporting RPC before P1 / P2 / P3 / P4 are approved.

## P6 — Reward Timing / Provenance

Known issue:

legacy flows may issue Cashback / Referral before final `Berhasil`.

Status:

`DEFERRED REPORTING / WRITER MISMATCH`

Current UI uses order-attributed reward fields for the final `Berhasil` cohort to avoid wallet-log double counting.

Do not fix this during Admin visual UI work.

## P7 — Success Rate Definition

Current management KPI:

```text
Overall Success Rate
= Berhasil / Total Order
```

Possible future additional metrics:

```text
Finalized Success Rate
= Berhasil / (Berhasil + Gagal)

Open Order Rate
= (Pending + Diproses) / Total Order
```

Do not replace the current KPI until the reporting contract is approved.

---

# ANALYTICS — DIVISION OF WORK

## ChatGPT / Manual UI Work

Use for:

- UI/UX
- layout
- wording
- responsive design
- chart readability
- period UX
- comparison / benchmark presentation
- screenshot review
- visual polish
- small presentation changes

Do not spend Codex credits on visual redesign that can be completed directly.

## Codex

Use only for focused repository-dependent technical work.

Recommended order:

```text
BATCH 1
Canonical Sales Amount Audit
READ-ONLY

BATCH 2
Canonical Vendor Cost Audit
READ-ONLY

BATCH 3
Financial Recognition Timestamp Design

BATCH 4
Business Timezone Contract

BATCH 5
Server-side Analytics Aggregation

BATCH 6
Reward Timing / Provenance

BATCH 7
Success Rate Contract
```

One logical batch at a time.

Do NOT combine all seven.

Codex must NOT redesign the approved Analytics UI.

---

# ADMIN DASHBOARD — CURRENT ACTIVE UI WORK

Status:

`IMPLEMENTED / MANUAL UI REWORK IN PROGRESS`

Primary entry:

`app/(dashboard)/admin/page.tsx`

The Dashboard is now the active Admin UI focus.

Explore status:

Explore — WORK IN PROGRESS

Current source already implements:

- Dashboard header
- order-period control
- refresh
- Perlu Perhatian:
  - Pending Deposit
  - Pending Withdraw
  - Pending Order
- period-consistent order KPIs
- compact 7-day order trend
- latest-order activity
- Order Status State Machine & Final Status Lock (CLOSED)
- existing Detail/action modal
- internal shortcuts:
  - Deposit
  - Withdraw
  - Explore
  - Analytics
- single `/admin` shell with internal menu state

Detailed financial reporting remains delegated to Analytics.

## Dashboard Final Success Status Fix

Status:

`VERIFIED / CLOSED`

Canonical success rule:

```text
status === "Berhasil"
```

Used for:

- Order Berhasil
- Omzet Berhasil
- success-rate numerator
- any other success-only Dashboard calculation

Total Order continues counting all orders in the selected period.

Recent order activity must continue showing operational statuses such as:

- Berhasil
- Diproses
- Gagal

Do not hide operational status rows.

## Dashboard UI rework scope

Current UI work may refine:

- main Dashboard header / hierarchy
- period selector UX
- attention-center visual hierarchy
- KPI visual hierarchy
- order trend presentation
- quick-access presentation
- latest-order table / mobile cards
- spacing / container proportions
- desktop / mobile consistency
- Admin / Manager presentation consistency

Do NOT:

- redesign Analytics from Dashboard work
- modify database
- modify order writers
- resume financial hardening
- resume security audit
- deploy

unless explicitly requested.

## Dashboard remaining manual verification

- desktop
- mobile
- period controls
- attention states
- refresh / realtime
- detail modal / actions
- shortcuts
- Admin role
- Manager role

Do not mark the entire Dashboard redesign CLOSED until these are manually verified.

## Dashboard UI Polish Batch â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REMAINING`

Scope: `app/(dashboard)/admin/page.tsx` + `app/(dashboard)/admin/SidebarAdmin.tsx`.
UI/UX polish only. No data flow, API contract, database, RPC, or security behavior changed.

Fixed / improved:

- Order Detail modal raised to `z-100` so it can no longer be hidden behind the mobile sidebar overlay (`z-60`/`z-70`).
- Order Detail modal now closes on `Escape` and locks body scroll while open (mirrors Admin Finance modal behavior).
- Order Detail modal close button gained an accessible `aria-label`.
- Broken attention empty-state class `rounded-2xl-emerald-100/85` corrected to `rounded-2xl bg-emerald-100/85` (shield tile background renders again).
- Full-dashboard skeleton now shows only on first load; later refresh/realtime refetches keep content visible and rely on the refresh spinner instead of flashing the skeleton.
- Dashboard container exposes `aria-busy` while refreshing; period-filter buttons expose `aria-pressed`; refresh button is disabled while loading.
- Consistent `focus-visible` ring/underline states added to: period filter, refresh, Attention cards, shortcuts, detail actions, modal close buttons, deposit/withdraw approve-reject actions, sidebar navigation.
- Sidebar menu items are now keyboard-accessible (`role="button"`, `tabIndex`, Enter/Space handling) with `aria-current`.

Static checks:

```text
npx tsc --noEmit    -> PASS
eslint page.tsx     -> PASS (no errors)
eslint SidebarAdmin -> 3 PRE-EXISTING errors only (set-state-in-effect at line 41, unescaped quotes at line 161) â€” not introduced by this batch
git diff --check    -> PASS
```

Remaining before CLOSED (manual, not done yet):

- desktop / mobile visual walkthrough
- modal usability on mobile (Order Detail + Finance)
- keyboard focus order walkthrough
- role Admin & Manager walkthrough
- no horizontal overflow on small viewports

Do not mark Dashboard CLOSED until the manual verification above is actually performed.

## Dashboard Mobile Polish Batch â€” 2026-08-19

Status:

`IMPLEMENTED / MOBILE POLISH COMPLETE / MANUAL VERIFICATION REQUIRED`

Scope: `app/(dashboard)/admin/page.tsx` only.
Desktop layout preserved via `sm:`/`md:` overrides; no business logic or data flow changed.
No API, database, RPC, auth, or order-status-contract change.

Mobile responsive fixes:

- Header: period filter pills get larger touch target on <640px (`py-2.5`, back to `py-2` from `sm:`); refresh button grows to `h-11 w-11` on mobile (`sm:h-10 sm:w-10`).
- KPI: value font slightly reduced on mobile only (`text-[19px]`, back to `21px`/`22px` from `md:`/`xl:`) so long nominal values no longer risk clipping while the sparkline/background stays intact.
- Latest Orders mobile card: nominal uses `tabular-nums`; Detail button enlarged (`px-4 py-2.5 text-[11px]`).
- Finance modal (Deposit + Withdraw): approve/reject icon buttons now `h-11 w-11` on mobile (`md:h-10 md:w-10`); mobile Deposit text buttons enlarged; Pending Withdraw fee input enlarged on mobile (`w-28 text-[11px]`, back to desktop sizing from `sm:`).
- Order Detail modal: header uses `px-5 py-4` (desktop `sm:px-6 sm:py-5`), body `p-4` (desktop `sm:p-6`), dark finance block `p-4` (desktop `sm:p-5`), action grid gap relaxed to `gap-2.5` on mobile.

Analyzed viewports (code-level):

```text
360 x 800
390 x 844
430 x 932
768 x 1024
1280 / 1440 desktop regression (no desktop class changed without an sm/md/xl guard)
```

Static checks:

```text
npx tsc --noEmit          -> PASS
eslint page.tsx           -> PASS (0 errors)
git diff --check          -> PASS
```

Still required before CLOSED (manual, user-side):

- actual visual walkthrough on the viewports above in browser
- check no horizontal overflow at 360px
- check modal scroll/touch behavior at 360px
- check tablet 768px table scroll behavior ("Aktivitas Order Terbaru", Deposit, Withdraw)
- desktop 1280px / 1440px visual regression

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Order Attention Popup Scale to Work Panel â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: `OrderAttentionModal` sizing/typography/spacing only. Filter logic,
table structure, mobile cards, and every other Dashboard part unchanged.

Changes (referenced to `AdminFinanceModal` scale):

- Modal container now mirrors the finance dialog: `max-w-6xl`,
  `max-h-[92vh]`, `sm:rounded-[30px]`, same border/shadow/overflow-hidden.
- Header aligned to finance modal scale: `px-4 py-4 sm:px-6 sm:py-5`,
  title `text-xl sm:text-2xl font-black`, count detail line
  `max-w-2xl text-[11px] leading-4`; eyebrow, status icon, and close button
  preserved.
- Desktop table scaled up proportionally: thead `text-[10px]` with
  `px-6 py-4`; new popup-local `OrderAttentionRow` (same visual language as
  `RecentOrderRow`, larger density: `px-6 py-5`, order ID `12px`, product
  `12px`/`10px`, customer `11px`, nominal `12px`, status badge `10px`
  `px-3 py-1`, waktu `10px`, Lihat Detail `11px`).
- `RecentOrderRow` untouched â€” `Aktivitas Order Terbaru` unchanged. Mobile
  (`RecentOrderMobileCard`) unchanged. Column set and filters unchanged.

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Manual verification: compare popup scale with Deposit/Withdraw popups at
768x1024 / 1024x768 / 1280x800 / 1440x900; internal vertical scroll with many
orders; mobile 360/390/430 unchanged and overflow-free.

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Order Attention Popup Desktop Table Fit â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: desktop/tablet table of the `Order Pending` / `Order On Process`
popup only. Filter logic, mobile presentation, Order Detail, and every other
Dashboard part unchanged.

Problem fixed:

- Popup table previously used `min-w-225` (900px) inside a `max-w-3xl`
  modal, so Waktu/Detail columns pushed out and a horizontal scrollbar
  appeared on desktop.

Changes:

- Removed the forced `min-w-225` and the `overflow-x-auto` wrapper from the
  popup table (`hidden md:block`). The table is now `w-full table-fixed` with
  realistic percentage columns (11/22/17/14/12/15/9) that total 100% and fit
  inside the modal width; long cells stay bounded (Produk/Pelanggan already
  truncate, Order uses the short ID slice like Aktivitas Order Terbaru).
- Modal width raised to `md:max-w-4xl` (896px) so the table has comfortable
  room on tablet/desktop while keeping healthy screen margins.
- Same visual language as Aktivitas Order Terbaru (same thead, badges,
  rows via `RecentOrderRow`, columns ORDER/PRODUK/PELANGGAN/NOMINAL/STATUS/
  WAKTU/DETAIL). No column removed, no data changed.

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Manual verification: open both popups at 768x1024 / 1024x768 / 1280x800 /
1440x900 â€” no horizontal scrollbar, all columns including Waktu and Detail
visible; mobile 360/390/430 unchanged.

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Order Attention Popup Responsive Presentation â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: `OrderAttentionModal` presentation only (Order Pending / Order On
Process popup). Filter logic, counts, Order Detail modal, Latest Orders, and
all other Dashboard parts unchanged.

Changes:

- Desktop/tablet (`md:` and up): popup now renders the same professional
  table used by `Aktivitas Order Terbaru` â€” same colgroup widths, thead
  styling, row styling via reused `RecentOrderRow` (columns ORDER / PRODUK /
  PELANGGAN / NOMINAL / STATUS / WAKTU / DETAIL), status badges, nominal
  alignment, detail action.
- Mobile (`<768px`): unchanged card list via reused `RecentOrderMobileCard`.
- Modal width grows to `md:max-w-3xl` on desktop so the table breathes;
  internal horizontal scroll (`overflow-x-auto`) matches Latest Orders
  behavior on narrower tablet widths.
- Internal vertical scroll: modal body is `min-h-0 flex-1 overflow-y-auto`;
  header (icon, title, count, close) stays fixed while the list scrolls.
  Modal capped at `max-h-[85vh]`, so many orders never grow the modal taller
  than the viewport. Body scroll lock + Escape behavior kept.

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Manual verification: popup table on 768/1024/1280/1440, card list on
360/390/430, internal scroll with many rows, close button always visible.

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard KPI Sparkline Background Treatment â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: KpiCard sparkline positioning only. Section structure, heading, KPI
values/formulas/data, tones, grid, and all other Dashboard parts unchanged.

Change:

- Sparkline is no longer a layout row after description. It is now an absolute
  decorative background (`absolute bottom-0 right-0 z-0 pointer-events-none`),
  sized `h-16 w-2/5` on mobile and `sm:h-20 sm:w-1/2` on desktop/tablet.
- Card content (label+icon, value, description) sits at `relative z-10`, so
  the sparkline stays behind text and never pushes content down.
- Gradient fill made more subtle (top stop `0.72` -> `0.45`); wrapper opacity
  `0.7`. Card height is now content-driven only (`mt-auto` layout strip removed).

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Manual verification: sparkline bottom-right behind content at 360/390/430 and
1280/1440; value stays the visual focus; no overflow.

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Ringkasan KPI Section Redesign â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: `Ringkasan KPI` section only. KPI values/formulas/data/sparkline
inputs/labels unchanged. No other section, modal, query, or backend change.

Changes:

- KPI section wrapped in a white container card matching the other Dashboard
  sections (`rounded-[22px] border-slate-200/80 bg-white p-5 md:p-6`), so the
  heading no longer floats alone on the page background.
- Subtitle fixed to "Metrik utama performa order".
- KpiCard redesigned to a unified neutral base: subtle slate border+shadow,
  color only on the icon accent and sparkline. Removed per-tone card borders,
  gradient icon double-shell, and background fill overlays.
- New card hierarchy: label + icon row, value (primary, with `title` fallback
  for long nominal), helper text, then compact sparkline strip pinned to the
  bottom (`mt-auto`), keeping nominal safe from clipping and cards equal
  height in the grid.
- Responsive grid unchanged: 1 column mobile, 2 columns `sm:`, 4 columns `xl:`.
- Sparkline SVG now fills its strip container (`h-full`).

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Heading Visual Hierarchy Fix â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: Needs Attention heading structure only. No data/query/filter/modal/
card/backend change. KPI, Trend, Akses Cepat, Latest Orders headings unchanged
(already matched the final pattern).

Change:

- Needs Attention section header no longer uses the amber uppercase eyebrow
  "NEEDS ATTENTION" with count as title. Title is now `Needs Attention`
  styled identically to the other section titles, with the count as subtitle:
  `{n} antrean memerlukan tindakan`.
- Redundant right-side caption "Antrean operasional saat ini" removed.
- Amber card border/background preserved.

Final shared heading pattern (all five sections):

```text
title:    h2  text-[15px] font-bold text-slate-950
subtitle: p   mt-1 text-[10px] text-slate-500 (only where informative)
```

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Heading Consistency Audit â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: Dashboard heading styling only. No layout/data/logic/modal/filter
change; no API/backend/database/RPC/auth change.

Audit result:

- Needs Attention (`attention-heading`): `text-[15px] font-bold
  text-slate-950` with amber eyebrow; no subtitle (not needed).
- Ringkasan KPI (`kpi-heading`): same title pattern + useful period subtitle.
- Aktivitas Order (`trend-heading`): same title pattern + useful subtitle.
- Aktivitas Order Terbaru (`recent-orders-heading`): same title pattern +
  useful subtitle.

Shared pattern confirmed:

```text
title:    text-[15px] font-bold text-slate-950
subtitle: text-[10px] text-slate-500 mt-1 (only where informative)
```

Change made:

- Ringkasan KPI header-to-content gap aligned `mb-3` -> `mb-4` so its vertical
  rhythm matches Needs Attention (`mb-4`). No other heading changed.

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Need Attention Filter + Unified Order List Batch â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: Need Attention only in `app/(dashboard)/admin/page.tsx`. No other
Dashboard section touched; no API/backend/database/RPC/auth change.

Changes:

- Attention cards now render only categories with `count > 0`
  (`attentionItems` filtered array). Zero-count categories are hidden
  completely; when all counts are zero the existing "Operasional dalam
  kondisi baik" empty state shows.
- `OrderAttentionModal` now reuses `RecentOrderMobileCard` (the same card
  used by `Aktivitas Order Terbaru`) in a `divide-y divide-slate-100`
  white container, so Order Pending / Order On Process popups share the
  exact same card structure, typography, spacing, status badge, order id,
  product, customer, nominal, timestamp, Detail action, and responsive
  behavior as the Latest Orders list. Only the data is filtered
  (`Pending` / `Diproses`).
- Popup filters unchanged: Order Pending -> only `status === "Pending"`;
  Order On Process -> only `status === "Diproses"`. Other statuses never
  appear.

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Manual verification:

- zero-count categories hidden; single-item and mixed combinations render
  only >0 cards
- popup list visually identical to Aktivitas Order Terbaru
- Escape stack: detail -> attention list -> dashboard

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard UX Fix Batch â€” 2026-08-19

Status:

`IMPLEMENTED / MANUAL UX FIX COMPLETE / MANUAL VERIFICATION REQUIRED`

Scope: `app/(dashboard)/admin/page.tsx` only. No API/backend/database/RPC/auth
change. Final Order Status Contract unchanged. `Need Attention Actionable`
behavior preserved.

Changes:

- Order Detail modal compact mobile layout: tightened mobile paddings/gaps
  (`p-3.5`, `space-y-3.5`, `px-4 py-3.5` header), Produk/Pelanggan tiles now
  2-column on mobile (desktop unchanged), finance block rows compacted
  (`space-y-1.5 py-3`, tighter profit row), action buttons 3-across on mobile
  with comfortable touch height, check-status button slightly compacted.
- Order ID displays FULL with wrapping in the modal (`break-all`), never
  truncated. Latest Orders keeps short `order_id` slice/truncate (no overflow).
- Modal stacking: Need Attention modal now accepts `blockEscape`; while the
  Order Detail modal is open (`selectedOrder != null`) its Escape handler is
  inert, so Escape closes Order Detail first and returns to the attention list.
- Consistent container headings: all Dashboard section titles use
  `text-[15px] font-bold text-slate-950` with `text-[10px] text-slate-500`
  subtitle (`mt-1`) â€” applies to Need Attention, KPI (new `Ringkasan KPI`
  heading with period context), Trend, Shortcut, Latest Orders.
- Need Attention grid intact: 4 actionable cards, pending-only popups,
  empty state, responsive at 360/390/430/768/1280/1440 unchanged.

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Manual verification still required (user-side):

- Order Detail fits one screen on 360 x 800 / 390 x 844 / 430 x 932
- full Order ID visible/wrapped, no horizontal overflow
- Escape behavior: detail -> attention list -> dashboard (one level at a time)
- heading consistency walkthrough across sections

Do not mark Dashboard CLOSED until user verifies visually.

## Dashboard Need Attention Actionable Batch â€” 2026-08-19

Status:

`IMPLEMENTED / STATIC CHECKS PASSED / MANUAL VERIFICATION REQUIRED`

Scope: `app/(dashboard)/admin/page.tsx` only. No API/backend/database/RPC/auth
change. Final Order Status Contract unchanged.

Behavior change (intended):

- Need Attention items are now actionable modals instead of page scrolls.
- `Order Pending` click -> modal filtered to `status === "Pending"` only.
- `Order On Process` click -> modal filtered to `status === "Diproses"` only.
- `Deposit Pending` click -> Deposit panel filtered to `status "Pending"` only.
- `Withdraw Pending` click -> Withdraw panel filtered to `status "Pending"` only.
- Existing approve/reject actions and Lihat Detail action are kept.
- Attention grid now has 4 cards (`md:grid-cols-2 xl:grid-cols-4`).
- `totalAttentionCount` now includes on-process orders, so the "baik" empty
  state only appears when there is truly nothing pending/in-process.

New component:

`OrderAttentionModal` â€” title, count, filtered order cards (order id, product,
customer, nominal, time, status), empty state, close button, Escape close,
body scroll lock, `focus-visible` states, responsive card list (no desktop table
forced on mobile), rendered at `z-90` so the existing Order Detail modal
(`z-100`) stays above it.

Finance panels accept `pendingOnly` prop; Shortcut entries keep full unfiltered
list, Attention entries open pending-only list.

Static checks:

```text
npx tsc --noEmit   -> PASS
eslint page.tsx    -> PASS (0 errors; 2 pre-existing exhaustive-deps warnings)
git diff --check   -> PASS
```

Manual verification still required (user-side):

- click each of the 4 attention cards and confirm only matching statuses appear
- 360 / 390 / 430 / 768 / 1280 / 1440 viewports
- Escape behavior: pressing Escape with Order Detail open from the attention
  list closes both modals (both listeners active) â€” confirm acceptable
- approve/reject inside pending-only Deposit/Withdraw panels still works

Do not mark Dashboard CLOSED until user verifies visually.

---

# ACCOUNT DATABASE — PHASE 1

Status:

`VERIFIED / CLOSED`

Main component:

`app/(dashboard)/admin/account-database/AccountDatabaseManagement.tsx`

Admin state:

`AccountDatabase`

Visible label:

`ACCOUNT DATABASE`

No standalone route was created.

Old `TeamManagement.tsx` naming is retired.

Tabs:

- TEAM
- MEMBERS

Member actions:

- Detail
- Adjust Saldo
- Mutasi Saldo

Desktop / mobile implemented.

---

# MEMBER ACTIVITY

Status:

`VERIFIED / CLOSED`

Classification:

```text
0-14 days
-> Aktif

15-30 days
-> Pasif

31-90 days
-> Tidak Aktif

>90 days
-> Dormant

No qualifying transaction
-> Belum Transaksi
```

`Tidak Aktif` means transaction inactivity, not account disabled.

Verified RPC:

`public.get_member_last_activity_for_ids(uuid[])`

Migration:

`20260813190900_member_activity_aggregate.sql`

Wallet-only events do NOT affect activity.

Examples excluded:

- Refund
- Cashback
- Referral
- Bonus
- AdminAdjustment
- Upgrade

Do not re-audit this CLOSED primitive without:

- regression
- dependency / schema change
- runtime failure
- explicit request

---

# MEMBER DETAIL / ADJUST SALDO / MUTASI SALDO

Status:

`VERIFIED / CLOSED`

## Member Detail

Separates:

- Informasi Akun
- Aktivitas Transaksi
- Aktivitas Login
- Wallet

Last Login is loaded on demand.

## Adjust Saldo

Current endpoint:

`POST /api/admin/members/[userId]/balance-adjustments`

Body:

```json
{
  "delta": "25000",
  "reason": "..."
}
```

Target UUID comes only from `[userId]`.

Verified flow:

```text
Browser Bearer
-> requireAdminOrManager
-> validate target UUID
-> reject Manager/Admin target
-> service-role RPC
-> adjust_profile_balance_atomic
```

Do not rewrite this flow without explicit reason.

## Mutasi Saldo

Read-only member wallet ledger.

Columns:

- Waktu
- Jenis
- Keterangan
- Masuk
- Keluar
- Saldo Awal
- Saldo Akhir

Direction:

```text
amount > 0
-> Masuk

amount < 0
-> Keluar
```

Search operates on:

`balance_logs.description`

Mutation-type dropdown remains responsible for type filtering.

---

# RINGKASAN MUTASI

Status:

`VERIFIED / CLOSED`

Verified production RPC:

`public.get_member_balance_mutation_summary(uuid)`

Migration:

`20260813191000_member_balance_mutation_summary.sql`

Returns categories:

- ALL
- Deposit
- Payment
- Withdraw
- Refund
- Cashback
- Referral
- Bonus
- AdminAdjustment
- Upgrade
- Other

Metrics are decimal strings:

- mutation_count
- total_in
- total_out
- net_amount

Do not convert monetary aggregate strings to JavaScript Number.

Ringkasan Mutasi remains ALL-TIME and independent from:

- search
- mutation filter
- date range
- sort
- pagination

Do not re-audit / modify this CLOSED primitive without a real trigger.

---

# ACCOUNT DATABASE API / NAMING CLEANUP

Status:

`VERIFIED / CLOSED`

Current Account Database dataset endpoint:

`GET /api/admin/account-database/users`

Current balance adjustment endpoint:

`POST /api/admin/members/[userId]/balance-adjustments`

Removed legacy paths:

- `/api/admin/team/users`
- `/api/admin/team/balance-adjustments`
- empty `/api/admin/team` directories

Old component:

`app/(dashboard)/admin/team/TeamManagement.tsx`

retired.

---

# REFERRAL PROVENANCE

Status:

`DEFERRED / PLANNED`

Current architecture direction:

`HYBRID`

Account Database responsibility:

```text
Where did this member wallet mutation come from?
```

Future Referral Admin responsibility may include:

- who invited whom
- referral network
- referral-bearing orders
- commission
- conversion
- top referrers
- program analytics

Known relationship fields:

- `profiles.referral_code`
- `profiles.referred_by`
- `orders.referred_by`
- `orders.referral_commission`

Current `balance_logs` lacks durable structured referral source fields.

Do not treat description parsing as durable provenance.

When resumed:

- start READ-ONLY
- no migration
- no writer change
- no Referral Admin page in initial audit

---

# DEFERRED / OUT OF CURRENT SCOPE

Do not automatically resume:

- broad security audit
- Full-Koin hardening
- Mixed-Koin hardening
- Digiflazz/provider hardening
- Member Upgrade auth/security
- RLS/ACL cleanup
- legacy wallet security review
- VPS deployment

Explicit user direction required.

---

# ADMIN UI WORKFLOW

```text
INSPECT CURRENT SOURCE
-> LIST GAPS
-> PRIORITIZE
-> IMPLEMENT ONE LOGICAL BATCH
-> STATIC CHECK
-> MANUAL UI TEST
-> UPDATE CHECKPOINT
-> STOP
```

Do not automatically continue to another Admin module.

Do not trigger a broad security audit unless explicitly requested.

---

# STATIC VALIDATION

After Admin TS/TSX changes:

```text
npx tsc --noEmit
```

Then targeted ESLint on changed files.

Then:

```text
git diff --check
```

Do not fix unrelated pre-existing issues.

---

# AUTHORITATIVE ROADMAP

```text
ACCOUNT DATABASE — PHASE 1
VERIFIED / CLOSED

ACCOUNT DATABASE RENAME
VERIFIED / CLOSED

ADMIN API DOMAIN RENAME
VERIFIED / CLOSED

MEMBER ACTIVITY DB PRIMITIVE
VERIFIED / CLOSED

MEMBER WALLET SUMMARY DB PRIMITIVE
VERIFIED / CLOSED

FINAL ORDER STATUS CONTRACT
VERIFIED

DASHBOARD FINAL SUCCESS STATUS FIX
VERIFIED / CLOSED

ANALYTICS UI REDESIGN
IMPLEMENTED / VISUAL REWORK COMPLETE / READY FOR FINAL MANUAL VERIFICATION

ANALYTICS PERIOD / COMPARISON / BENCHMARK
IMPLEMENTED

ANALYTICS ADAPTIVE TREND GRANULARITY
IMPLEMENTED

ANALYTICS LOCAL PERIOD CONTEXT
IMPLEMENTED

ANALYTICS CURRENT FINANCIAL FORMULAS
INTERIM / TECHNICAL VALIDATION REQUIRED

CURRENT ACTIVE UI
ADMIN DASHBOARD REDESIGN — UI/UX POLISH
Primary entry:
app/(dashboard)/admin/page.tsx

NEXT UI
REWORK / POLISH ADMIN DASHBOARD

NEXT CODEX WHEN REQUESTED
CANONICAL SALES AMOUNT AUDIT — READ-ONLY

AFTER THAT
CANONICAL VENDOR COST AUDIT — READ-ONLY
FINANCIAL RECOGNITION TIMESTAMP DESIGN
BUSINESS TIMEZONE CONTRACT
SERVER-SIDE ANALYTICS AGGREGATION
REWARD TIMING / PROVENANCE
SUCCESS RATE CONTRACT

REFERRAL PROVENANCE DESIGN AUDIT
DEFERRED / PLANNED
```

---

# CODEX CONTINUATION RULES

A new Codex session must:

1. Read `AGENTS.md`.
2. Read `DAPAY_ADMIN_UI_PROGRESS.md`.
3. Read `DAPAY_PROJECT_PROGRESS.md`.
4. Inspect the actual current local repository.
5. Use local source as highest priority.
6. Do not rely on old chat history.
7. Do not re-audit CLOSED scopes without:
   - regression;
   - dependency / schema change;
   - runtime error;
   - explicit request.
8. Treat `DASHBOARD FINAL SUCCESS STATUS FIX` as `VERIFIED / CLOSED`.
9. Treat Analytics UI visual rework as implemented and visually approved.
10. Do NOT redesign, simplify, or recreate Analytics UI.
11. Analytics financial formulas remain INTERIM until focused technical validation.
12. If Analytics technical work is resumed, start with:
    `CANONICAL SALES AMOUNT AUDIT — READ-ONLY`.
13. Current Admin UI focus is:
    `app/(dashboard)/admin/page.tsx`
    Dashboard UI/UX polish.
14. Do not automatically begin Analytics technical work while Dashboard visual rework is active.
15. Stop after one logical batch.

Future Codex Analytics work exists to validate and harden the data contract behind the approved UI, not recreate the UI.


---

# Dashboard Order Status State Machine & Final Status Lock — 2026-08-20

Status:

CLOSED

Scope:

- app/(dashboard)/admin/page.tsx
- app/api/orders/manage/route.ts

## Completed

Canonical order statuses:

- Pending
- Diproses
- Berhasil
- Gagal

Valid transitions:

- Pending → Diproses
- Pending → Gagal
- Diproses → Berhasil
- Diproses → Gagal

Final states:

- Berhasil = final successful order
- Gagal = final failed order

Final states cannot be changed through normal status transition flow.

Frontend:

- Pending shows only valid next actions.
- Diproses shows only valid next actions.
- Berhasil is read-only final state.
- Gagal is read-only final state.
- Current status indicator added to Order Detail.
- Client-side transition guard added.

Backend:

- Canonical target status validation.
- Strict current-status validation.
- Transition matrix enforcement.
- Final-state lock.
- Conditional update using expected old status.
- Stale/concurrent update protection.
- Invalid transitions stop before update, audit log, financial side effects, and provider execution.

Strict current-status fix:

- Null, empty, and unknown database statuses are no longer normalized to Pending.
- Invalid current status returns 409 and does not proceed.

Existing business contract preserved:

- Provider Sukses maps to persisted Berhasil.
- Berhasil remains the only financially-final success status.
- Existing valid financial/provider side effects remain preserved.

## Validation

- TypeScript: PASS
- git diff --check: PASS
- Targeted ESLint: FAIL due pre-existing errors/warnings only; no unrelated lint cleanup performed.
- Production runtime mutation test: NOT RUN.
- Non-production transition matrix runtime test: DEFERRED because isolated test environment is not available in this batch.

## Regression / Scope

- No database/schema/migration/RPC changes.
- No unrelated security hardening.
- No production mutation.
- Existing WIP preserved.
- Only the two approved application files were changed for implementation.
- Progress document is the only file being modified in this task.

## Final state

The normal order-status transition flow is now enforced by both UI and backend.
Any future correction of a final status (Berhasil / Gagal) must be handled as a separate controlled workflow and must not reopen the normal transition buttons.

---

# Explore Admin Frontend Rework — WORK IN PROGRESS

Date:

2026-08-20

Status:

`IMPLEMENTED / MANUAL UI REWORK IN PROGRESS`

## Current state

Explore content/data semantics remain based on the existing repository implementation.

Current Explore categories / navigator remain:

- Top Produk
- Top Paket
- Top Item
- Member Special
- Member Regular
- Belanja Member
- Belanja Guest
- Riwayat Depo
- Riwayat WD
- Upgrade
- Komisi User
- Fee WD
- Voucher

Current work is primarily frontend/presentation rework.

Current visual direction agreed:

- premium;
- modern;
- clean;
- professional;
- enterprise admin;
- aligned with approved Dashboard visual language.

Preserve the core Explore concept:

```text
EXPLORE DATABASE
AUDIT 360° · DAPAY SYSTEM
```

Preserve:

- category navigation;
- date filter;
- search;
- dynamic table;
- existing data source;
- existing category data mapping;
- existing date semantics.

## Current visual progress

Current manual rework has already improved:

- Explore page header;
- Explore Navigator;
- category card container;
- horizontal card layout;
- icon + title + subtitle arrangement;
- active card treatment;
- typography;
- border/radius;
- spacing;
- accessibility semantics for category controls.

The category card direction is inspired by the approved reference mockup, but the reference is CONTENT/STRUCTURE inspiration only and is NOT a source of truth for actual data/business behavior.

## Important design decisions

1. Mockup reference is used to guide content hierarchy and card container form.
2. Existing repository data/function remains authoritative.
3. No categories, data fields, database semantics, or business logic are to be invented.
4. Frontend visual rework must not change query/data behavior unless separately approved.
5. Explore is still subject to manual visual refinement.
6. Card navigator is NOT final yet.
7. Workspace/table redesign is NOT final yet.
8. Responsive verification is NOT final yet.
9. Error/loading/empty-state rework is NOT declared complete unless separately implemented and verified.

## Current Explore status

`WORK IN PROGRESS`

> Explore Admin is currently undergoing manual frontend rework. The navigator/card container direction has been improved toward a premium DaPay admin style, while preserving existing Explore data semantics. Further visual refinement and workspace/table review remain open.

## Scope protection

The following remain untouched unless separately approved:

- Explore API/data sources.
- Supabase schema.
- migrations.
- RPC.
- auth/security.
- financial logic.
- order status contract.
- Dashboard closed batches.
- Analytics semantics.
- project-wide governance documents.

## Regression / WIP note

- Existing WIP must remain preserved.
- Do not treat current Explore implementation as complete.
- Do not automatically reopen closed Dashboard batches.
- Do not perform broad refactor.
- Do not change data semantics during visual rework.
- Manual screenshots/review remain the acceptance method for visual direction.

## Current next step

`Continue manual Explore UI refinement before implementation is considered final.`