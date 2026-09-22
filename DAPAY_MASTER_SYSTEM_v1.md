# DaPay Master System v1

Status: Governance map
Project: DaPay

## Purpose

Define how DaPay repository policy, AI operating rules, project checkpoints, Admin UI checkpoints, and review gates relate to one another.

This document maps governance. It does not replace `AGENTS.md`, authorize source changes, authorize production changes, or define implementation behavior for application code.

## Document Hierarchy

### 1. `AGENTS.md` â€” Repository Safety Authority

Owns:

- repository safety rules;
- source priority;
- production/database mutation gates;
- migration, RLS, ACL, Auth, Storage, deployment, and secret protections;
- financial-flow protection;
- canonical Admin UI workflow;
- repository static-check requirements.

`AGENTS.md` remains highest repository-level authority and must not be overridden by this document or AI prompts.

### 2. `CODEX_MASTER_PROMPT.md` â€” AI Operating Policy

Owns:

- model-agnostic AI behavior;
- READ â†’ AUDIT â†’ REVIEW â†’ PLAN â†’ APPROVAL â†’ IMPLEMENT â†’ VALIDATE;
- scope lock and files contract;
- working-tree protection;
- regression guard;
- distinction between application and governance tasks;
- output and handoff format.

It governs AI behavior only and does not replace repository safety policy.

### 3. `DAPAY_MASTER_SYSTEM_v1.md` â€” Governance Map

Owns:

- document ownership;
- precedence and conflict resolution;
- project lifecycle map;
- separation between policy, AI workflow, project checkpoint, UI checkpoint, and QA review.

It is descriptive governance documentation, not implementation authority.

### 4. `DAPAY_PROJECT_PROGRESS.md` â€” Project-Wide Checkpoint

Owns project-wide status and historical checkpoint context for:

- security and financial milestones;
- database and migration milestones;
- deployment policy;
- shared payment and MacroDroid milestones;
- open backlog and deferred scopes;
- project-wide residual risks.

It must not override current local source or current database state.

### 5. `DAPAY_ADMIN_UI_PROGRESS.md` â€” Admin UI Checkpoint

Owns Admin UI-specific status and checkpoint context for:

- approved UI direction;
- Dashboard and Analytics UI batches;
- Admin modules;
- manual verification state;
- UI roadmap and deferred UI work.

Its canonical Admin UI workflow remains:

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

It must not override `AGENTS.md`, current source, or project-wide safety rules.

### 6. `CODE_REVIEW_CHECKLIST.md` â€” QA and Review Gate

Owns post-implementation review:

- scope and diff review;
- regression review;
- business contract review;
- UI/UX, accessibility, responsive, TypeScript, lint, and whitespace checks;
- manual verification;
- final verdict.

It evaluates work. It does not authorize work or override repository policy.

## Precedence and Conflict Resolution

Use this order:

1. System/developer instructions.
2. Explicit user instruction for current task.
3. `AGENTS.md` repository safety policy.
4. Actual current local source and current database state for factual reality.
5. `DAPAY_MASTER_SYSTEM_v1.md` governance map.
6. `CODEX_MASTER_PROMPT.md` AI operating rules where compatible with higher authority.
7. Project/UI progress documents for checkpoint context.
8. Repomix and other snapshots as read-only secondary references.

Resolution rules:

- Local source wins when documentation is stale about implementation.
- Current database/migration state wins when progress text is stale about schema/runtime state.
- `AGENTS.md` wins on safety, production, database, migration, auth, deployment, and scope rules.
- `DAPAY_PROJECT_PROGRESS.md` wins over UI progress for project-wide security/financial/database/deployment checkpoint context.
- `DAPAY_ADMIN_UI_PROGRESS.md` wins for Admin UI batch status when it does not conflict with `AGENTS.md` or project-wide safety rules.
- If conflict remains material, stop and request clarification. Do not silently reconcile by editing documents.

## AI and Project Lifecycle

```text
READ
-> AUDIT
-> REVIEW
-> PLAN
-> APPROVAL
-> IMPLEMENT
-> VALIDATE
-> CHECKPOINT
-> STOP
```

### Read and Audit

Read applicable policy, checkpoint, and source files. Check working tree. Establish exact scope and current behavior.

### Review and Plan

Identify conflicts, risks, dependencies, files to modify, regression guards, and validation. No edits before approval.

### Approval

User approval is required before implementation. Additional explicit approval gates in `AGENTS.md` apply to production and high-risk actions.

### Implementation

Edit only approved files. Preserve business contracts, APIs, schema, RPCs, auth, and existing WIP.

### Validation

Run relevant typecheck, lint, diff, documentation, and manual checks. Separate new failures from pre-existing issues.

### Checkpoint

Update the correct progress document only when the logical batch is genuinely complete and the update is within approved scope.

## Governance vs Application Work

Governance work may create or update documentation files only. It must not alter application behavior, API routes, database, migrations, RPCs, authentication, financial flows, or production state.

Application work must follow `AGENTS.md`, preserve governance documents, and update the relevant checkpoint only when approved.

## Model-Agnostic Compatibility

All AI models and 9Router engines use the same:

- authority hierarchy;
- read-only-first behavior;
- approval gate;
- scope lock;
- regression guard;
- validation contract;
- final reporting format.

Model specialization may change speed or reasoning style, but never safety or authority.

## Change Control

- Do not overwrite existing governance documents without audit and approval.
- Do not treat missing documentation as permission to infer business rules.
- Do not use Repomix as current source.
- Do not commit, push, reset, checkout, rebase, clean, deploy, migrate, or mutate production without explicit authorization and applicable safety gates.
- Preserve all existing canonical rules and terminology.

