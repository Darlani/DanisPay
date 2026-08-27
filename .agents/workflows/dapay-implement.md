# DaPay Implementation Workflow

Status: Operational Workflow

Project: DaPay (`C:\Users\arlan\my-ecommerce`)

Authority: Subordinate to `AGENTS.md` and `CODEX_MASTER_PROMPT.md`.

---

## 1. Purpose

Execute targeted, minimal, and safe code modifications for an **approved logical batch**
under strict scope lock, preserving working tree state, existing contracts,
security boundaries, code integrity, and project governance.

This workflow is an implementation workflow only.

It does not:

- authorize new scope;
- override `AGENTS.md`;
- override project/business contracts;
- authorize production/database mutations;
- authorize migration/deployment;
- replace `dapay-audit.md`;
- replace `dapay-verify.md`.

---

## 2. Trigger & Invocation

This workflow is invoked **only after**:

- An audit/planning phase has completed.
- The user has explicitly approved the Implementation Plan.
- The user has explicitly approved the exact `FILES TO MODIFY` list.
- The implementation scope is clearly defined.

If any of the above is missing:

**STOP.**

Do not infer approval from:

- a general request;
- an old conversation;
- a previous unrelated approval;
- an existing progress document;
- an implementation plan that has not been explicitly approved.

---

## 3. Source of Truth

Use the following priority:

1. Current local repository state.
2. Current database/runtime state when relevant.
3. `AGENTS.md`.
4. Applicable project/business contracts.
5. `DAPAY_MASTER_SYSTEM_v1.md`.
6. `CODEX_MASTER_PROMPT.md`.
7. Relevant progress/checkpoint documents.
8. Secondary snapshots or historical references.

Historical documentation must not override current source.

If current source contradicts a progress document:

- preserve current source as factual reality;
- report the conflict;
- do not silently rewrite history;
- request clarification if the conflict affects implementation scope or behavior.

---

## 4. Precedence & Governance Rules

### 4.1 Scope Lock

- Only modify files explicitly listed in the approved `FILES TO MODIFY` list.
- Do not expand scope for cleanup, refactoring, architecture improvement,
  modernization, performance tuning, or unrelated consistency fixes unless explicitly approved.
- Do not fix unrelated pre-existing issues automatically.
- Do not modify "nearby" files merely because they appear visually or technically related.
- If an unpredicted file must be modified, stop immediately, report the dependency,
  and wait for scope approval.

### 4.2 Working-Tree Protection

- Preserve existing uncommitted changes (WIP).
- Inspect the working tree before editing.
- Never overwrite unrelated WIP.
- Never run destructive git commands:

  - `git reset --hard`
  - `git checkout .`
  - `git clean`
  - `git restore`
  - equivalent destructive operations.

- Do not globally reformat the repository.
- Do not run global auto-formatters against untouched files.
- Do not use global search-and-replace across the repository.
- Do not revert unrelated existing modifications.

If the target file already contains unrelated WIP:

- preserve that work;
- isolate the requested change;
- report the situation if safe isolation is uncertain.

### 4.3 Business Contract & Policy Enforcement

Strictly adhere to `DAPAY_WALLET_COINS_CONTRACT.md`:

- Saldo DaPay is cashable/withdrawable according to applicable rules.
- Koin DaPay is a reward asset and is non-withdrawable/non-cashable.
- No implicit Koin -> Saldo conversion.
- Refunds follow the original payment asset/source.
- Balance-funded value returns to Balance.
- Coin-funded value returns to Coin.
- Mixed payment must preserve Balance + Coin composition.
- Final successful order status remains `Berhasil`.
- Financial amounts must preserve decimal-string / BigInt-safe handling where applicable.
- Avoid floating-point `Number()` arithmetic where precision can affect financial correctness.

Never infer or introduce new financial behavior from UI requirements alone.

### 4.4 Safety & Security Gates

Follow `AGENTS.md` strictly.

High-risk operations remain prohibited without explicit approval, including:

- DDL/DML production mutations;
- migrations;
- RLS/ACL changes;
- authentication architecture changes;
- authorization/role changes;
- secret/key changes;
- deployment;
- destructive data operations;
- production RPC changes;
- production configuration changes.

Server-side authentication must never trust:

- client-supplied actor email;
- client-supplied role;
- client-supplied balance;
- client-supplied authorization claims.

---

## 5. Pre-Implementation Inspection

Before editing:

1. Inspect the exact target files.
2. Inspect relevant neighboring components only as needed.
3. Inspect the working tree:

   - `git status`
   - relevant `git diff`

4. Confirm the approved files match the actual files being edited.
5. Confirm the requested behavior is implementable within the approved scope.
6. Check the current TypeScript state before making changes.

Run:

```bash
npx tsc --noEmit