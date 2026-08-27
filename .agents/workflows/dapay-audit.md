# DaPay Audit Workflow

Status: Operational Workflow  
Project: DaPay (`C:\Users\arlan\my-ecommerce`)  
Authority: Subordinate to `AGENTS.md` and `CODEX_MASTER_PROMPT.md`.

---

## 1. Purpose

Execute a thorough, **100% read-only** investigation, architecture review, consistency check, or gap analysis across the DaPay codebase without mutating repository files, database state, or configuration.

---

## 2. Trigger & Invocation

This workflow is invoked when:
- The user requests an audit, architecture exploration, code review, gap analysis, or investigation of a bug/issue.
- Starting investigation for a new feature, UI batch, or backend subsystem before planning.

---

## 3. Precedence & Governance Rules

1. **Source Priority**:
   - 1. Actual current local files (`app/`, `components/`, `utils/`, `lib/`, etc.)
   - 2. Current database / migration state
   - 3. Checkpoint documents (`DAPAY_ADMIN_UI_PROGRESS.md`, `DAPAY_PROJECT_PROGRESS.md`)
   - 4. Governance documents (`AGENTS.md`, `CODEX_MASTER_PROMPT.md`, `DAPAY_MASTER_SYSTEM_v1.md`, `DAPAY_WALLET_COINS_CONTRACT.md`)
   - 5. Repomix / older reports as secondary reference only.
2. **Business Contract Awareness**:
   - Saldo DaPay = cashable/withdrawable balance.
   - Koin DaPay = non-withdrawable internal reward, used for checkout discounts/allowances.
   - Refunds must respect original payment composition (never convert coin to cashable balance).
   - Financially final successful order status = `Berhasil`.
   - `Order Contribution` is Gross Margin minus rewards, not Net Profit.
3. **Closed Scope Protection**:
   - Respect verified/closed modules (e.g. Account Database Phase 1, Withdrawal/Deposit V5 hardened RPCs, MacroDroid resolver).
   - Do not re-audit closed scopes unless there is an active regression, runtime failure, or explicit user request.

---

## 4. Execution Steps

1. **Source Inspection & Working-Tree Status**:
   - Inspect actual local files in the target scope.
   - Run read-only repository diagnostics (`git status`, `git diff`).
   - Identify active WIP to avoid recommending destructive or colliding actions.
2. **Read-Only Code & Contract Inspection**:
   - Use search, grep, and targeted file reads.
   - Inspect type definitions, server authentication boundaries, and UI components.
   - If database inspection is needed, execute read-only queries only (e.g., `SELECT` / `information_schema` / `pg_catalog`).
3. **Gap & Consistency Analysis**:
   - Identify gaps across Information Architecture, UX, UI consistency, responsive layout, accessibility, and TypeScript types.
   - Check data flow, payment composition contracts, and state handling.
4. **Findings Categorization**:
   - Group findings by severity (Critical, High, Medium, Low) and topic (UI/UX, Architecture, Security, Technical Debt).
   - Differentiate in-scope items from out-of-scope/closed areas.
5. **Formulate Report & Proposed Next Steps**:
   - Detail findings clearly and factually.
   - Provide recommended scope lock (`FILES TO MODIFY`) if implementation will follow.

---

## 5. Approval Gate

- **Strict Read-Only**: Do not edit, create, or delete application or configuration files during this workflow.
- **Stop & Report**: Present findings to the user and wait for explicit instructions/approval before proceeding to implementation planning or code modification.

---

## 6. Validation Gate

- All executed commands must be strictly read-only (`git status`, `git diff`, `npx tsc --noEmit`, file viewing).
- Zero working-tree mutations introduced by the audit.

