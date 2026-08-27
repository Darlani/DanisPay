# DAPAY PROJECT — AGENT POLICY

This repository is connected to a real Supabase production environment.

Use a risk-based execution policy.

## SOURCE PRIORITY

Always use this priority:

1. Actual current local repository files
2. Current migration/database state
3. Latest Repomix snapshot only as baseline/reference
4. Previous reports only as secondary context

Never assume an older Repomix snapshot is newer than the local source.

## LOW-RISK ACTIONS

Proceed automatically for clearly read-only actions such as:

- reading repository files
- searching/grepping source code
- git status
- git diff
- git diff --check
- TypeScript typecheck
- targeted ESLint
- SHA/checksum calculation
- listing local migrations
- checking package/types
- read-only production inspection
- SELECT queries
- pg_catalog inspection
- information_schema inspection
- migration history inspection
- checking indexes/functions/ACL
- table size and row counts
- EXPLAIN without mutating behavior
- read-only Supabase RPC calls
- other clearly read-only diagnostic commands

Do not interrupt the user for each low-risk read-only command.

## HIGH-RISK ACTIONS

STOP and require explicit user approval before:

- supabase db push
- applying/executing migrations
- CREATE
- ALTER
- DROP
- TRUNCATE
- INSERT
- UPDATE
- DELETE
- production data mutation
- mutating production RPC calls
- RLS changes
- ACL/GRANT/REVOKE changes
- production Auth changes
- production Storage changes
- application deployment
- VPS deployment
- git push
- destructive git operations
- git reset --hard
- git clean
- destructive restore/checkout
- deleting files
- package/system installation
- secret rotation/exposure
- any uncertain command that may mutate production or the machine

If safety is ambiguous, treat the action as HIGH-RISK.

## SUPABASE RULE

Do not classify a command as safe merely because it uses:

`supabase db query --linked`

Judge the SQL/RPC behavior itself.

Examples:

- SELECT / catalog inspection / read-only RPC → low risk
- DDL / DML / mutating RPC → high risk

## PRODUCTION WARNING

Local `npm run dev` may use Supabase production.

Any database mutation performed from localhost may therefore be a real production mutation.

Never create fake production transactions just for UI testing unless the user explicitly approves it.

## DATABASE MIGRATIONS

Before any migration push:

1. inspect migration SQL
2. compute SHA-256
3. check local/remote migration history
4. check function/index collisions
5. check unexpected pending migrations
6. report pre-push verdict
7. wait for explicit approval

After push:

1. verify migration history
2. verify function/index metadata
3. verify ACL/effective privileges
4. perform read-only functional checks
5. do not immediately start another module

## ACCOUNT DATABASE

Current Account Database principles:

- Team and Members are separate views in one Account Database module.
- Member wallet balance belongs only to Members.
- Team rows must not expose member wallet actions.
- Member transaction activity is separate from Last Login.
- Wallet mutation history is separate from transaction activity.
- Member Activity must not be driven by balance_logs.

Member Activity business states:

- 0–14 days: ACTIVE / Aktif
- 15–30 days: PASSIVE / Pasif
- 31–90 days: INACTIVE / Tidak Aktif
- >90 days: DORMANT / Dormant
- no qualifying transaction: NEVER / Belum Transaksi

"INACTIVE / Tidak Aktif" means transaction inactivity, not disabled account.

Qualifying transaction activity is based on the existing verified member-activity primitive.

Do not use these wallet events to change Activity Status:

- Refund
- Cashback
- Referral
- Bonus
- AdminAdjustment
- Upgrade
- other balance-only events

## MUTASI SALDO

Mutasi Saldo is read-only.

Ledger columns:

- Waktu
- Jenis
- Keterangan
- Masuk
- Keluar
- Saldo Awal
- Saldo Akhir

Direction is determined from amount sign:

- amount > 0 → Masuk
- amount < 0 → Keluar

Do not infer direction from type name.

Known wallet types:

- Deposit
- Payment
- Withdraw
- Refund
- Cashback
- Referral
- Bonus
- AdminAdjustment
- Upgrade

Unknown legacy types must remain visible and must not be silently dropped.

Display:

- AdminAdjustment → Admin Adjustment
- Other → Lainnya

## WALLET SUMMARY

Verified production primitive:

`public.get_member_balance_mutation_summary(uuid)`

Do not modify or re-audit it unless:

- regression appears
- dependency/schema changes
- runtime error appears
- user explicitly asks

It is service-role-only and returns all-time wallet-summary values as decimal strings.

Wallet summary must be based on recorded `balance_logs`.

Do not force:

`profiles.balance == historical net mutation`

Historical ledger may be incomplete.

## CLOSED DATABASE PRIMITIVES

Treat these as CLOSED unless regression/dependency change/user request:

- `public.get_member_last_activity_for_ids(uuid[])`
- migration `20260813190900_member_activity_aggregate.sql`
- `public.get_member_balance_mutation_summary(uuid)`
- migration `20260813191000_member_balance_mutation_summary.sql`

Do not casually rewrite or recreate them.

## FINANCIAL FLOWS

Do not modify existing hardened financial RPCs/routes unless directly required by the current task.

Do not broaden a UI task into:

- withdrawal hardening
- deposit hardening
- Full-Koin audit
- Mixed-Koin audit
- Digiflazz/provider hardening
- Member Upgrade security audit
- RLS/ACL cleanup
- legacy wallet-writer audit

unless the user explicitly requests it.

Security audit is currently paused unless explicitly resumed.

## UI WORKFLOW

For Admin UI work follow:

INSPECT CURRENT UI
→ LIST GAPS
→ PRIORITIZE
→ IMPLEMENT ONE LOGICAL BATCH
→ STATIC CHECK
→ MANUAL UI TEST
→ UPDATE PROGRESS CHECKPOINT
→ STOP

Do not start another Admin module automatically.

## STATIC CHECKS

After TS/TSX changes run:

`npx tsc --noEmit`

Run targeted ESLint only on changed files.

Run:

`git diff --check`

Do not fix unrelated pre-existing lint issues unless requested.

## CODE CHANGE RULE

Before editing:

1. inspect actual current files
2. identify exact files expected to change
3. keep scope minimal
4. do not invent schema/routes/types
5. if repository reality conflicts with the task assumptions, follow current source and report the mismatch

## FINAL REPORT

After each logical batch report:

- files changed
- behavior implemented
- security/authorization impact
- database impact
- static checks
- manual checks still required
- exact final verdict

Then STOP.