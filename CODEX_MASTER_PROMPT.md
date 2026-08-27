# DaPay Codex Master Prompt

Status: Governance document
Project: DaPay
Repository: `C:\Users\arlan\my-ecommerce`

## Purpose

Define model-agnostic operating rules for AI systems working on DaPay through Codex CLI, 9Router, or another compatible runtime.

This document applies equally to GPT, Claude, Qwen, Gemini, GLM, DeepSeek, and other supported models. Model choice must not change safety, scope, review, approval, or validation behavior.

## Authority

`AGENTS.md` is repository policy and safety authority. This document must not override it.

When rules conflict, use this precedence:

1. Direct system/developer instructions.
2. Explicit user instruction for current task.
3. `AGENTS.md`.
4. Current local source and database state for factual implementation reality.
5. `DAPAY_MASTER_SYSTEM_v1.md`.
6. `DAPAY_PROJECT_PROGRESS.md` and `DAPAY_ADMIN_UI_PROGRESS.md` for checkpoint context.
7. Repomix or other snapshots as read-only secondary references.

Current local source wins over stale documentation when describing implementation state. Existing closed checkpoint items remain protected unless regression, dependency change, runtime failure, or explicit re-audit request exists.

## Required Workflow

```text
READ
-> AUDIT
-> REVIEW
-> PLAN
-> APPROVAL
-> IMPLEMENT
-> VALIDATE
```

### READ

- Read applicable `AGENTS.md` files.
- Read relevant progress/checkpoint documents.
- Inspect actual local files in requested scope.
- Check `git status` before editing.
- Never treat Repomix as current source.

### AUDIT

Report repository context, active scope, WIP status, relevant existing behavior, risks, and out-of-scope areas.

### REVIEW

Identify findings under Information Architecture, Visual Hierarchy, UX, UI Consistency, Responsive, Accessibility, Technical Debt, and Regression Risk. Prioritize Critical, High, Medium, and Low.

### PLAN

List scope, exact files, components, layout/styling changes, regression guards, and validation. Do not edit during READ, AUDIT, REVIEW, or PLAN.

### APPROVAL

Stop and wait for explicit user approval before implementation. High-risk production/database/deployment actions always require the approval gates defined by `AGENTS.md`.

### IMPLEMENT

- Edit only approved files.
- Keep diff minimal and focused.
- Reuse existing components, utilities, types, and design patterns.
- Do not refactor unrelated code.
- Do not change business logic during UI-only work.

### VALIDATE

- Review final diff against approved scope.
- Run required typecheck, targeted lint, and `git diff --check`.
- Run documentation-only checks for documentation-only changes.
- Report manual verification still required.

## Task Classification

### Application Task

Changes to application source, UI, components, API routes, configuration, or tests. Follow applicable repository instructions and preserve business/API/database/auth contracts.

### Governance/Meta Task

Changes only to governance or documentation files. Do not touch application source, database, migrations, RPC, API routes, auth, financial flows, or WIP unrelated to documentation.

### Read-Only Audit

No file mutation. Permitted actions include reading, searching, `git status`, `git diff`, typecheck, targeted lint, checksum, catalog inspection, and other clearly read-only diagnostics.

## Scope Lock

Before implementation, define `FILES TO MODIFY`. Only those files may change. If another file becomes necessary, stop, report dependency, and request approval.

Default Admin UI scope is `app/(dashboard)/admin/**` only when user requests Admin UI work. Governance tasks use explicit governance-file scope and do not inherit the Admin UI default.

## Working-Tree Protection

- Existing WIP is part of repository state.
- Do not reset, checkout, clean, rebase, restore, delete, or overwrite unrelated changes.
- Do not run global formatters or cleanup.
- Do not remove apparently unused code without scope approval.
- Inspect `git diff` and `git status` before and after implementation.
- Do not commit, push, deploy, or modify VPS configuration unless explicitly requested and permitted.

## Business Contract Protection

Preserve existing contracts unless the user explicitly requests a contract change and the required review is complete:

- Final financially successful order status: `Berhasil`.
- Analytics is Business Intelligence, not Accounting.
- `Order Contribution` is not Net Profit.
- Deposit, Withdraw, Refund, Cashback, Referral, Bonus, Upgrade, and Admin Adjustment follow existing backend contracts.
- Existing API response shapes, endpoint paths, authentication flow, database schema, migrations, RPCs, triggers, and payment state machines remain unchanged.

## Approved/CLOSED Scope Protection

Do not casually redesign or re-audit items marked approved, verified, closed, or deferred. Revisit only for visible regression, dependency/schema change, runtime error, or explicit user request.

For Admin UI, preserve this canonical workflow:

```text
INSPECT CURRENT UI
-> LIST GAPS
-> PRIORITIZE
-> IMPLEMENT ONE LOGICAL BATCH
-> STATIC CHECK
-> MANUAL UI TEST
-> UPDATE PROGRESS CHECKPOINT
-> STOP
```

## Safety

Follow `AGENTS.md` for production/database safety. Never infer that a command is safe from its command name alone; judge behavior. Do not apply migrations, mutate production data, change RLS/ACL/auth/storage, deploy, or rotate secrets without the required explicit approval.

## Output Contract

Before implementation:

```text
## AUDIT
## REVIEW
## IMPLEMENTATION PLAN
## FILES TO MODIFY
```

After implementation:

```text
## IMPLEMENTATION
## VALIDATION
## NOTES
```

Keep reports concise, factual, and explicit about changed files, untouched files, security/authorization impact, database impact, checks, manual checks, and final verdict.

