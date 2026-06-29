<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Agent Contribution Guide

## Purpose  
Define strict operating rules for AI agents contributing to this repository so changes remain safe, minimal, and production-ready.

## Agent Role  
The agent is an implementation assistant, not a product owner or architecture authority.  
The agent must deliver scoped code changes that align with existing patterns in this codebase.  
The agent must prefer predictability, readability, and type safety over novelty.

## Source of Truth  
Agents must reference and comply with:

- `code-style.md` (code structure, conventions, React patterns, effect policy)
- `../docs/` (shared project references, brainstorms, plans, agreements, and durable working notes)
- This document (`AGENTS.md`) for behavioral and process constraints

When conflicts arise:
- `code-style.md` governs code conventions and structure.
- `AGENTS.md` governs scope, discipline, and contribution behavior.

Agents must not introduce code that violates `code-style.md`.

---

## Docs Audit Trail

Agents must treat `../docs/` as the repository source of truth for shared project references, brainstorms, plans, agreements, and other durable working notes.

Agents must check relevant files under `../docs/` before planning or implementing changes.

Brainstorms must be saved under `../docs/brainstorm/`. Capture the full useful conversation trail, including context, options considered, decisions, rejected paths, and open questions. Do not rely on chat history as the only audit trail.

Plans must be saved under `../docs/plans/`. Each plan must distill the concrete implementation path from the related brainstorm or agreement, including scope, steps, validation, risks, and unresolved questions.

If the user and agent reach a concrete agreement, the agent must ask whether to write it as a Markdown file under `../docs/`. When the agreement is a brainstorm, use `../docs/brainstorm/`; when it is an execution plan, use `../docs/plans/`; otherwise use the most relevant `../docs/` subfolder.

This repository-local directive overrides any global or parent `AGENTS.md` instruction that would place brainstorms, plans, or durable project notes outside this repository.

---

## Repository Context  
This is a TypeScript-first Next.js App Router application with server actions, route handlers, feature services, repositories, Drizzle-backed persistence, and React hooks-based UI architecture.

Canonical import alias: `@/*`.

Core structure may be root-level (`app/`, `components/`, `lib/`, `hooks/`) or `src/`-scoped (`src/app`, `src/components`, `src/lib`, `src/hooks`). Use the layout already present in the touched area.

Common directories:
- `app` or `src/app`: routes, layouts, page entrypoints, loading states, and API route handlers
- `components` or `src/components`: shared UI primitives and reusable block components
- `components/ui` or `src/components/ui`: reusable UI primitives
- `features` or `src/features`: feature modules with actions, components, repositories, schemas, services, queries/hooks, errors, and types
- `lib` or `src/lib`: shared integrations and infrastructure (`better-auth`, Drizzle, TanStack Query, nuqs, Resend)
- `hooks` or `src/hooks`: shared hooks
- `utils`, `constants`, `types`, `i18n`, and `messages` may be root-level or `src/`-scoped depending on the app layout

---

## Behavioral Rules  
Agent changes must be minimal and directly tied to the request.  
Reuse existing utilities, hooks, components, and API helpers before creating new ones.  
Follow nearby implementation patterns in the same feature area before introducing new structure.  
Preserve existing naming, file placement, and import style in touched files.  
Keep logic local unless cross-feature reuse is clearly required by the request.  
Do not change unrelated files.  
Do not reformat broad file regions unless required for the change.  
All implementations must comply with `code-style.md`.

---

## Implementation Philosophy  
Prefer the smallest correct diff.  
Fix root cause inside the current flow before proposing abstractions.  
Avoid architecture drift.  
Use strict TypeScript contracts and narrow types where possible.  
Treat `any` as a last resort and only when legacy boundaries require it.  
For user messaging, follow existing toast, loading, empty, and error-state behavior patterns.  
For API and persistence changes, keep request/response handling consistent with existing route handlers, server actions, services, repositories, and Drizzle helpers.  
Follow the Effect Usage Policy defined in `code-style.md`.

---

## PR Expectations  
PRs must be concise, scoped, and reviewable in one pass.  
All changes must align with `code-style.md`.

PR description must include:
- What changed
- Why it changed
- Evidence (lint output, screenshots, or manual validation steps as appropriate)
- Risk and rollback notes for non-trivial behavior changes
- Jira/issue reference when available

Align with the existing project PR format and terminology when one is available.  
Assume QA handoff; include explicit steps for reproducing and verifying behavior.

---

## Self-Review Expectations  
Before opening or finalizing a PR, the agent must verify:

- The implementation complies with `code-style.md`
- No unrelated edits are included
- Type signatures are explicit and stable
- Hook usage complies with the Effect Usage Policy
- Existing alerts/loading/error states still behave correctly
- Edge cases and empty/error API responses are handled
- `pnpm lint` passes, or failures are explained if pre-existing

---

## When To Ask For Clarification  
Ask before implementation when any of the following is true:

- Requirement conflicts with an existing feature contract
- Multiple valid UX behaviors exist and choice affects business behavior
- Change touches authentication, permissions, payment, workflow state transitions, or data integrity rules
- API contract is ambiguous or undocumented
- Request implies broad refactor but only scoped change is expected
- Proposed implementation may violate `code-style.md`

---

## Non-Goals  
Do not perform speculative refactors.  
Do not rename/move files for style preference.  
Do not replace established patterns with new libraries or paradigms.  
Do not "clean up" unrelated legacy code in the same PR.  
Do not optimize prematurely without measured evidence.  
Do not introduce patterns that contradict `code-style.md`.

---

## Safe Implementation Checklist  
Use this checklist before writing code:

- Read and understand `code-style.md`
- Confirm exact scope and acceptance criteria from the request
- Locate similar existing implementation and mirror it
- Identify the smallest set of files to touch
- Verify expected types and API payload/response shapes
- Plan user-facing states (loading, success, failure, empty)
- Ensure no architecture or folder convention drift
- Confirm Effect usage complies with repository policy

---

## Pre-PR Audit Checklist  
Use this checklist before PR handoff:

- Diff is minimal and scoped to the requested change
- No debug logs, dead code, or commented-out blocks remain
- Imports are clean and consistent with local conventions
- TypeScript and lint issues were checked
- UI changes were validated for impacted states and responsive behavior
- Alert/toast behavior follows existing patterns
- No unnecessary `useEffect` or derived state logic was introduced
- PR description includes evidence and QA steps

---

## Do Not  
Do not make repository-wide formatting changes.  
Do not introduce new global state patterns when local/context state is sufficient.  
Do not silently alter API contracts or response assumptions.  
Do not bypass existing permission checks or guard logic.  
Do not ship behavior changes without describing impact in the PR.  
Do not introduce redundant state or effect-driven state synchronization.

---

## When In Doubt Protocol  
Follow this fallback sequence:

1. Stop expanding scope.  
2. Match the closest existing implementation pattern.  
3. Choose the least risky, reversible change.  
4. Verify compliance with `code-style.md`.  
5. Document assumptions and residual risk in the PR notes.  
6. Ask for clarification if behavior choice can impact production outcomes.
