# DaPay Verification Workflow

Status: Operational Workflow  
Project: DaPay (`C:\Users\arlan\my-ecommerce`)  
Authority: Subordinate to `AGENTS.md` and `CODEX_MASTER_PROMPT.md`.

---

## 1. Purpose

Execute rigorous post-implementation checks, static verification, checklist evaluation, and manual verification mapping to guarantee quality, prevent regressions, and enforce governance rules.

---

## 2. Trigger & Invocation

This workflow is invoked:
- Immediately following the completion of `dapay-implement.md`.
- When verifying the health and integrity of changes before closing a batch.

---

## 3. Precedence & Governance Rules

1. **Static Quality Gate**:
   - TypeScript check (`npx tsc --noEmit`) must pass with 0 errors.
   - Targeted ESLint must pass on changed files.
   - Whitespace and formatting checks (`git diff --check`) must be clean.
2. **Progress Document Update Policy**:
   - **Do NOT automatically modify** `DAPAY_ADMIN_UI_PROGRESS.md` or `DAPAY_PROJECT_PROGRESS.md`.
   - Only update progress/checkpoint documents when:
     - Explicitly requested by the user, or
     - The approved implementation scope explicitly includes documentation updates.
3. **Manual Verification Evidence Rule**:
   - **Do not claim manual UI verification as PASS unless actual verification evidence exists.**
   - The workflow may define manual test scenarios, but it must clearly distinguish **required manual verification** from **verified manual verification**.
4. **Non-Expansion of Scope**:
   - Do not start the next module or batch automatically.
   - Stop and wait for user review after presenting verification results.

---

## 4. Execution Steps

1. **Static Checks Execution**:
   - Run `npx tsc --noEmit`.
   - Run targeted lint on touched files.
   - Run `git diff --check` to catch whitespace or patch formatting anomalies.
2. **Code Review Checklist Review**:
   - Evaluate the diff against [`CODE_REVIEW_CHECKLIST.md`](file:///c:/Users/arlan/my-ecommerce/CODE_REVIEW_CHECKLIST.md):
     - Scope & Working Tree integrity.
     - Regression protection across closed/approved modules.
     - Business contract compliance (Saldo vs Koin, `Berhasil` final order status, fee separation).
     - Security/Auth boundary compliance (`utils/serverAuth.ts`).
     - UI/UX, accessibility (ARIA, semantic HTML, keyboard navigation), and mobile-first responsiveness.
3. **Manual Verification Mapping**:
   - Define exact scenarios for manual testing:
     - Normal, Loading, Empty, and Error states.
     - Mobile, Tablet, and Desktop viewport checks.
   - Explicitly list which scenarios have been verified vs which remain pending manual verification by the user/tester.
4. **Final Reporting & Verdict**:
   - Report:
     - Files modified.
     - Static check outputs.
     - Manual checks pending/completed.
     - Final verdict: `PASS` | `PASS WITH NOTES` | `BLOCKED` | `FAIL`.

---

## 5. Approval Gate

- Present the comprehensive verification report to the user.
- **STOP** and wait for explicit user confirmation before proceeding to any new task or batch.

---

## 6. Validation Gate

- `npx tsc --noEmit` exits with code 0.
- `git diff --check` returns no whitespace issues.
- Verification report clearly distinguishes verified items from required manual tests.

