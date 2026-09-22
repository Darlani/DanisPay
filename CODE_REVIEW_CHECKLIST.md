# DaPay Code Review Checklist

Post-implementation review and QA gate for application and governance changes.

## 1. Scope

- [ ] Requested task scope is explicit.
- [ ] Only approved files changed.
- [ ] No unrelated refactor or cleanup occurred.
- [ ] Existing WIP was preserved.
- [ ] Diff matches implementation plan.

## 2. Regression

- [ ] Approved/closed Dashboard batches remain intact.
- [ ] Existing behavior remains compatible.
- [ ] No accidental changes to navigation, responsive behavior, modal stacking, or shared components.
- [ ] No unrelated files, generated files, secrets, or environment files changed.

## 3. Business Contract

- [ ] Final success status remains `Berhasil`.
- [ ] Analytics remains Business Intelligence, not Accounting.
- [ ] `Order Contribution` is not labeled Net Profit.
- [ ] Deposit, Withdraw, Refund, Cashback, Referral, Bonus, Upgrade, and Admin Adjustment flows remain unchanged unless explicitly scoped.
- [ ] API paths, response shapes, auth flow, database schema, migrations, RPCs, triggers, and payment state machines remain unchanged.

## 4. Backend, Database, and Security

- [ ] No unauthorized production mutation was executed.
- [ ] No migration was applied without required approval.
- [ ] No RLS, ACL, GRANT, REVOKE, Auth, Storage, or secret changes occurred outside scope.
- [ ] Server-side authorization remains intact.
- [ ] Client-provided identity is not treated as authorization evidence.

## 5. UI/UX

- [ ] Information hierarchy is clear.
- [ ] Typography follows existing design tokens and hierarchy.
- [ ] Spacing and radius remain consistent.
- [ ] Card, table, badge, button, modal, empty, loading, and error patterns are reused where possible.
- [ ] Visual density matches the requested context.
- [ ] Hover, active, disabled, and focus states are present where relevant.

## 6. Accessibility

- [ ] Semantic HTML is used.
- [ ] Interactive elements are keyboard reachable.
- [ ] `aria-label`, `aria-labelledby`, and `aria-modal` are present where needed.
- [ ] Escape and close behavior works for dialogs.
- [ ] Focus-visible states are visible.
- [ ] Text and status colors have usable contrast.
- [ ] Content does not rely on color alone.

## 7. Responsive

- [ ] Desktop layout verified.
- [ ] Tablet layout verified.
- [ ] Mobile layout verified.
- [ ] No unintended horizontal overflow.
- [ ] Modals stay within viewport and internal scroll behaves correctly.
- [ ] Touch targets are comfortable.
- [ ] Long labels, IDs, emails, nominal values, and timestamps do not break layout.

## 8. TypeScript and Lint

- [ ] `npx tsc --noEmit` passes with zero TypeScript errors.
- [ ] Targeted ESLint passes with zero errors.
- [ ] Pre-existing warnings/errors are identified and not falsely attributed to the patch.
- [ ] No unnecessary `any` was added.
- [ ] Types are reused where available.

## 9. Diff and Documentation

- [ ] `git diff --check` passes.
- [ ] Progress checkpoint updated only when work is genuinely complete.
- [ ] Documentation changes match actual source state.
- [ ] No commit, push, reset, checkout, rebase, or cleanup was performed unless requested.

## 10. Manual Verification

- [ ] Required user flows were tested.
- [ ] Loading state tested.
- [ ] Empty state tested.
- [ ] Error state tested where applicable.
- [ ] Normal state tested.
- [ ] Role-specific behavior tested where applicable.
- [ ] Browser viewport checks completed for requested sizes.
- [ ] Production mutation was not used as a UI test substitute.

## Final Verdict

Choose exactly one:

- [ ] PASS â€” scope complete, checks pass, manual verification complete, no known regression.
- [ ] PASS WITH NOTES â€” implementation safe, but documented manual or pre-existing issue remains.
- [ ] BLOCKED â€” required approval, dependency, validation, or manual verification is missing.
- [ ] FAIL â€” regression, contract violation, unauthorized change, or validation failure.

## Review Record

```text
Task:
Scope:
Files changed:
Files intentionally untouched:
Business contract impact:
Security/authorization impact:
Database impact:
TypeScript:
ESLint:
git diff --check:
Manual verification:
Final verdict:
```

