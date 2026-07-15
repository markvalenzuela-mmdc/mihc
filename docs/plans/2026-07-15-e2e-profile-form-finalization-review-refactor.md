# E2E Profile Form Finalization Review Refactor Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Remove unnecessary local helper abstractions from the E2E profile-form finalization service while preserving its DbExecutor contract and runtime behavior.

**Architecture:** Keep finalizeE2eProfileForm as the only database-orchestration function. It will call db.transaction directly, perform the email preflight inside the transaction, and retain the existing unique-violation mapping. Pure validation helpers will be grouped before the service function, with validation errors thrown at their call sites.

**Tech Stack:** Next.js 16, TypeScript 5, Drizzle ORM with PostgreSQL, Vitest, pnpm.

---

## Scope and constraints

Modify only:

- nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts

Do not modify:

- nextjs/types/db-transaction.ts
- DbExecutor or DrizzleTransaction
- the exported service input/return behavior
- unrelated working-tree files, including nextjs/repomix-output.xml

Preserve the existing working-tree change that makes
FinalizeE2eProfileFormServiceInput a non-exported type and keeps the current
formatting in the service.

The approved design is recorded in:

- docs/brainstorm/2026-07-15-e2e-profile-form-finalization-review-refactor.md

## Task 1: Establish the baseline and inspect user-owned changes

**Files:**

- Read: nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts
- Read: nextjs/__tests__/integration/e2e-profile-form.persistence.test.ts
- Read: current Git status and diff

- [x] **Step 1: Confirm the current working tree**

Run:

~~~powershell
git status --short --branch
git diff -- nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts
~~~

Expected: the pre-existing service diff remains visible. Treat every other
modified or untracked file as user-owned or unrelated unless explicitly in the
scope above; do not reset, clean, or revert it.

- [x] **Step 2: Run characterization coverage before editing**

Run:

~~~powershell
pnpm --dir nextjs exec vitest run __tests__/integration/e2e-profile-form.persistence.test.ts
~~~

Expected: the persistence tests pass before the refactor. These tests cover
atomic profile/profile-form creation, invalid complete input not persisting a
profile, and duplicate-email mapping.

## Task 2: Replace the local transaction wrapper with db.transaction

**Files:**

- Modify: nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts

- [x] **Step 1: Remove only the withTransaction helper**

Delete the module-local withTransaction function. Keep this import and service
parameter unchanged:

~~~ts
import type { DbExecutor } from "@/types/db-transaction";

export async function finalizeE2eProfileForm(
  input: FinalizeE2eProfileFormServiceInput,
  db: DbExecutor = getDb(),
): Promise<{ profileId: string }> {
~~~

Do not remove or narrow DbExecutor. The installed Drizzle types expose
transaction on both the root database and transaction executor used by
DbExecutor.

- [x] **Step 2: Call the real transaction API directly**

Change only the transaction entry point from:

~~~ts
return withTransaction(db, async (tx) => {
~~~

to:

~~~ts
return db.transaction(async (tx) => {
~~~

Leave the existing profile insert, profile-form insert, return value, and
outer unique-violation catch unchanged at this step.

## Task 3: Inline single-use helpers and order the remaining functions

**Files:**

- Modify: nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts

- [x] **Step 1: Remove throwValidationError and inline its behavior**

Delete the throwValidationError helper. In validateCore, use:

~~~ts
if (!result.success) {
  throw new E2eProfileFormError(
    E2eProfileFormErrorCode.UNEXPECTED,
    "The complete profile contains invalid values.",
    getIssueErrors(result.error.issues, "core"),
  );
}
~~~

In validateEnrollmate, use the same error code and message with the
enrollmate prefix:

~~~ts
if (!result.success) {
  throw new E2eProfileFormError(
    E2eProfileFormErrorCode.UNEXPECTED,
    "The complete profile contains invalid values.",
    getIssueErrors(result.error.issues, "enrollmate"),
  );
}
~~~

Keep getIssueErrors; both validators still use it.

- [x] **Step 2: Move validators above database orchestration**

Keep the remaining module-level functions in this order:

~~~text
getIssueErrors
validateCore
validateEnrollmate
isUniqueViolation
finalizeE2eProfileForm
~~~

The validators must appear before the exported function that opens the
transaction. Do not introduce a replacement section-divider abstraction or
change any validation schema or return type.

- [x] **Step 3: Remove assertEmailAvailable and inline its query**

Delete the single-use assertEmailAvailable helper. At the beginning of the
db.transaction callback, before inserting into profiles, add the existing
query and domain error directly:

~~~ts
const [existingProfile] = await tx
  .select({ id: profiles.id })
  .from(profiles)
  .where(eq(profiles.email, core.email))
  .limit(1);

if (existingProfile) {
  throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
}
~~~

Keep the profile insert immediately after this check. Keep the outer
isUniqueViolation catch so concurrent duplicate inserts still become the same
domain error.

- [x] **Step 4: Confirm the resulting service shape**

The final service must preserve:

- the existing FinalizeE2eProfileFormServiceInput shape;
- the DbExecutor parameter;
- validation before opening the transaction;
- both inserts inside the transaction;
- the existing profileId guard;
- the existing unique-violation mapping;
- the existing return shape.

After the edits, inspect the complete function to confirm that the validation
calls occur before db.transaction, the email query occurs before the profile
insert, both inserts remain inside the callback, and the existing profileId
guard and outer catch remain unchanged.

Do not remove the existing FinalizeE2eProfileFormServiceInput privacy change or
alter the service input and result shapes while applying this cleanup.

## Task 4: Verify behavior, types, lint, and diff safety

**Files:**

- Verify: nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts
- Verify: all pre-existing working-tree files remain unchanged

- [x] **Step 1: Run the focused persistence tests**

Run:

~~~powershell
pnpm --dir nextjs exec vitest run __tests__/integration/e2e-profile-form.persistence.test.ts
~~~

Expected: all tests pass, including atomic creation, invalid-input rollback,
and duplicate-email conflict behavior.

- [x] **Step 2: Run the Next.js typecheck**

Run:

~~~powershell
pnpm --dir nextjs exec tsc --noEmit
~~~

Expected: no new TypeScript errors. If an unrelated pre-existing error is
reported, record it without changing unrelated files.

- [x] **Step 3: Run the Next.js lint check**

Run:

~~~powershell
pnpm --dir nextjs run lint
~~~

Expected: exit code 0. Existing unrelated warnings or failures must be
reported separately rather than fixed as part of this refactor.

- [x] **Step 4: Inspect whitespace, diff, and status**

Run:

~~~powershell
git diff --check
git diff --stat
git diff -- nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts
git status --short --branch
~~~

Expected: the service diff contains only the four approved review changes plus
the already-present service edits. DbExecutor, DrizzleTransaction, callers, and
unrelated files are untouched. Do not stage or commit unless the user
explicitly requests it.

## Self-review

- Spec coverage: Tasks 2 and 3 cover direct transaction use, helper ordering,
  email-check inlining, and direct validation errors. Task 4 covers all
  behavior and diff invariants.
- Completeness scan: no unfinished markers, deferred steps, or vague
  implementation instructions remain.
- Type consistency: the plan consistently keeps DbExecutor as the service
  parameter and uses tx only inside db.transaction.

## Execution results

- The focused persistence suite passed: 3 tests passed.
- Targeted ESLint for the finalization service passed with no warnings after
  removing the unused EnrollmateFlowType import.
- The full TypeScript check still reports the pre-existing align prop error in
  nextjs/app/_components/login-form.tsx; no service error was reported.
- Diff whitespace validation passed.
