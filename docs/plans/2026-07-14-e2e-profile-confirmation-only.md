# E2E Profile Confirmation-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `/e2e-testing/profiles/new` as a local-only multi-step form and persist a validated profile exactly once when the user confirms it.

**Architecture:** Remove the persisted-draft/editor workflow. The client form validates each step and changes the local/query step without calling the server; the final action validates the complete payload and inserts the profile and profile form in one transaction with `status: "validated"`. Existing profile workspace and run-history code remains unchanged.

**Tech Stack:** Next.js 16, React 19, TanStack Form, nuqs, Zod, Drizzle ORM, Vitest, Testing Library, PostgreSQL, `@mihc/enrollmate-contract`.

---

## File map and boundaries

Keep the current `/new` route, serialized EnrollMate flow definitions, local mock generator, profile workspace, and run APIs.

Modify the finalization boundary and local form controller:

- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/schema/e2e-profile-form.schema.ts` — remove draft input schema; make finalization input contain only `core` and complete `enrollmateData`.
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/types/e2e-profile-form.types.ts` — remove draft/edit and persisted-editor DTOs; retain the finalization result, form values, fixtures, and serialized step types used by `/new`.
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/actions/e2e-profile-form.action.ts` — expose only final confirmation persistence for this form.
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts` — validate the complete payload and insert both records atomically.
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx` — make Continue local-only and finalize directly from the in-memory complete form.
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx` — remove editor/draft props and flow-lock wiring.
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-core-fields.tsx` — remove the edit-only flow lock.
- `$HOME/Documents/Programming/mihc/nextjs/app/e2e-testing/profiles/new/page.tsx` — pass only the finalization action.
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/utils/e2e-profile-form.util.ts` — remove the step-extraction helper if the reference scan confirms it has no remaining consumer.

Delete the removed editor and draft surfaces:

- `$HOME/Documents/Programming/mihc/nextjs/app/e2e-testing/profiles/[profileId]/edit/page.tsx`
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/services/e2e-profile-form-editor.service.ts`
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/services/e2e-profile-draft.service.ts`

Update focused tests:

- `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/e2e-profile-form.action.test.ts`
- `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`
- `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`
- `$HOME/Documents/Programming/mihc/nextjs/__tests__/integration/e2e-profile-form.persistence.test.ts`

Do not rewrite the existing historical design/plan files that describe the
previous draft workflow. The approved brainstorm and this plan supersede them;
preserve any unrelated work already present in those files.

## Task 1: Lock the new persistence contract with failing tests

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/integration/e2e-profile-form.persistence.test.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/e2e-profile-form.action.test.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Replace the integration test's draft/resume scenario with a confirmation-only scenario.**

Use `createProfileFormData(flowType, email)` as the complete payload. Before
calling the service, query `profiles` by the unique email and assert that no
row exists. Call `finalizeE2eProfileForm` with this exact shape:

```ts
await finalizeE2eProfileForm(
  {
    core,
    enrollmateData: fullData,
    userId,
  },
  db,
);
```

Assert that the returned profile ID identifies one `profiles` row with
`status: "validated"` and one `profileForms` row whose data contains the
complete normalized payload. Keep the duplicate-email test, but call only the
finalization service. Replace editor lookup and draft-lock assertions with a
test that invalid complete data rejects with field errors and leaves no profile
row for that email.

- [ ] **Step 2: Update the action tests to remove draft saves and validate the new final input.**

Remove the `saveE2eProfileDraft` mock and both draft-action cases. Keep the
authentication and malformed-input coverage for
`finalizeE2eProfileFormAction`, but omit `profileId` from the valid input. Add
an authenticated success case that resolves the service with `{ profileId:
"profile-1" }`, asserts the service received `{ ...validCore,
enrollmateData: completeData, userId: "user-1" }`, and asserts only
`/e2e-testing` is revalidated.

- [ ] **Step 3: Add form-level assertions that Continue is local-only.**

Render the creation form with a finalization spy and the existing mock/fixture
test harness. After entering or mocking valid values for the active step,
click Continue and assert that:

```ts
expect(finalize).not.toHaveBeenCalled();
expect(screen.getByText(nextStepTitle)).toBeInTheDocument();
```

Retain the existing mock visibility assertions. Update the finalization test
to assert that one call contains the complete `core` and `enrollmateData` and
does not contain `profileId` or any step-specific save payload.

- [ ] **Step 4: Run the changed tests and verify they fail for the old implementation.**

Run from `$HOME/Documents/Programming/mihc/nextjs`:

```bash
pnpm test -- __tests__/integration/e2e-profile-form.persistence.test.ts __tests__/unit/feature/e2e/e2e-profile-form.action.test.ts __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

Expected result: FAIL because the current service and form still require a
profile ID, expose draft persistence, and call the draft action on Continue.

## Task 2: Replace draft persistence with one atomic finalization insert

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/schema/e2e-profile-form.schema.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/types/e2e-profile-form.types.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/actions/e2e-profile-form.action.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts`
- Delete: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/services/e2e-profile-draft.service.ts`

- [ ] **Step 1: Define the single finalization schema and type contract.**

Keep `e2eProfileCoreSchema` and the record schema. Replace the final schema
with:

```ts
export const finalizeE2eProfileFormSchema = z.object({
  core: e2eProfileCoreSchema,
  enrollmateData: e2eProfileStepDataSchema,
});
```

Remove `SaveE2eProfileDraftInput`, `SaveE2eProfileDraftResult`,
`SaveE2eProfileDraft`, and `E2eProfileFormEditorData`. Change
`FinalizeE2eProfileFormInput` to:

```ts
export type FinalizeE2eProfileFormInput = {
  core: E2eProfileCoreInput;
  enrollmateData: Record<string, unknown>;
};
```

Retain `E2eProfileFormEditorStep` because `/new` consumes the serialized step
definition, even though the persisted editor DTO is removed.

- [ ] **Step 2: Make the finalization service validate before opening its insert transaction.**

Parse `input.core` with `e2eProfileCoreSchema`. Parse
`input.enrollmateData` with `getEnrollmateValidator(core.flowType)`. On either
failure, call the existing field-error helper with the appropriate `core` or
`enrollmate` prefix.

Inside `withTransaction`, check the email for an existing profile, then insert
the profile with the validated core values, `status: "validated"`, and the
authenticated user as both `createdBy` and `updatedBy`. Insert the normalized
validator data into `profileForms` with the current definition hash. Return
the inserted ID:

```ts
const [profile] = await tx
  .insert(profiles)
  .values({
    name: core.name,
    middleName: core.middleName ?? null,
    email: core.email,
    flowType: core.flowType,
    status: "validated",
    createdBy: input.userId,
    updatedBy: input.userId,
  })
  .returning({ id: profiles.id });

await tx.insert(profileForms).values({
  profileId: profile.id,
  definitionHash: getEnrollmateDefinitionHash(),
  data: normalizedResult.data,
});
```

Keep the existing unique-violation-to-`EMAIL_CONFLICT` mapping and transaction
helper. Remove profile lookup, row locks, draft merge logic, flow/definition
conflict checks, `LOCKED` handling, and all update paths.

- [ ] **Step 3: Remove the draft action and edit-path revalidation.**

Delete the draft action export and its schema/service imports. Keep
`finalizeE2eProfileFormAction`, passing the parsed no-ID input plus `userId` to
the new insert service. Revalidate `/e2e-testing` after success; remove the
`/e2e-testing/profiles/${profileId}/edit` revalidation path because that route
no longer exists.

- [ ] **Step 4: Delete the draft service and run the server-focused tests.**

Delete `e2e-profile-draft.service.ts`, then run:

```bash
pnpm test -- __tests__/integration/e2e-profile-form.persistence.test.ts __tests__/unit/feature/e2e/e2e-profile-form.action.test.ts
```

Expected result: PASS, including confirmation that no row is inserted when
complete validation fails and that a successful finalization inserts a
validated profile and form record together.

## Task 3: Make the `/new` form local-only until confirmation

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-core-fields.tsx`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/app/e2e-testing/profiles/new/page.tsx`

- [ ] **Step 1: Remove editor-only controller inputs and state.**

The controller should accept only `flows`, `fixtures`, `finalize`, and
`onFinish`. Initialize the query step to `1` and `validatedSteps` to an empty
set. Remove `profileId`, `profileIdRef`, `initialValues`,
`initialValidatedSteps`, `initialStep`, `saveDraft`, and the flow-lock condition
from the flow-type listener.

- [ ] **Step 2: Replace `saveAndContinue` with local navigation.**

Keep active-step validation and pending-button behavior, but do not call a
server action or mark fields pristine. On successful validation, add the
current step to `validatedSteps`, clear errors, and advance with
`setQueryStep(clampStep(activeStepNumber + 1, steps.length))`:

```ts
async function continueToNextStep() {
  if (pendingRef.current) return;
  if (!validateActiveStep()) return;

  pendingRef.current = true;
  setPendingAction("continue");
  try {
    setValidatedSteps((current) => new Set(current).add(activeStep.step));
    clearErrors();
    await setQueryStep(clampStep(activeStepNumber + 1, steps.length));
  } finally {
    pendingRef.current = false;
    setPendingAction(undefined);
  }
}
```

Use the final function name in the returned controller object and page callback
so the implementation no longer claims to save on Continue.

- [ ] **Step 3: Make finalization submit the complete local form once.**

Keep active-step validation and complete-flow validation. Remove the
"Save at least one profile step" guard and the draft-save call. Call only:

```ts
const result = await finalize({
  core: validation.core,
  enrollmateData: completeValidation.data,
});
```

On success, clear errors and invoke `onFinish(result.data.profileId)`. Keep the
existing action-error mapping and pending guard so duplicate final clicks are
ignored and server field errors still route to the correct step.

- [ ] **Step 4: Remove editor-only page props and flow locking.**

Reduce `E2eProfileFormPageBaseProps` to `flows` and optional `onFinish`; make
`E2eProfileFormPageProps` add only `fixtures` and `finalize`. Pass the new
controller callback to `E2eProfileFormActions`, and remove `saveDraft`, profile
ID, initial values, and initial validated-step props from the page.

Remove `isFlowLocked` from `E2eProfileCoreFields`. Render the flow select in
its normal fieldset without the disabled state or the message about a saved
draft. The `/new` form remains visually the same for users.

- [ ] **Step 5: Remove the draft action from the new page.**

`nextjs/app/e2e-testing/profiles/new/page.tsx` should import only
`finalizeE2eProfileFormAction` from the form action module and pass only
`flows`, `fixtures`, and `finalize` to `E2eProfileFormRoute`.

- [ ] **Step 6: Run the form unit tests.**

Run:

```bash
pnpm test -- __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx __tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx
```

Expected result: PASS, with Continue changing only local step state and final
confirmation making the one mocked persistence call.

## Task 4: Purge the existing-profile editor and unused draft helpers

**Files:**

- Delete: `$HOME/Documents/Programming/mihc/nextjs/app/e2e-testing/profiles/[profileId]/edit/page.tsx`
- Delete: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/services/e2e-profile-form-editor.service.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/utils/e2e-profile-form.util.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Delete the editor route and service.**

Remove the route directory/file and the service that loads saved drafts,
checks definition hashes, computes resumable steps, and returns editor DTOs.
Do not change the profile workspace route or the profile list's review link.

- [ ] **Step 2: Remove the step-extraction helper if it is unused.**

Run:

```bash
rg -n "extractE2eProfileStepValues" nextjs
```

After the draft service and its integration test are gone, remove the helper
from `e2e-profile-form.util.ts` and remove its import and assertion from
`profile-form-definition.test.ts`. Keep the contract-derived default,
visibility, cleanup, and mock-generator tests.

- [ ] **Step 3: Remove edit/resume/flow-lock assertions from page tests.**

Delete test helpers and cases that construct `profileId`, `initialValues`,
`initialStep`, `initialValidatedSteps`, or `saveDraft`. Remove the harness case
that asserts the flow select is disabled for an existing profile. Keep tests
for `/new`, local navigation, validation, pending controls, mocking, and final
confirmation.

- [ ] **Step 4: Verify the editor surface is unreachable in source.**

Run:

```bash
rg -n "profiles/\[profileId\]/edit|saveE2eProfileDraft|SaveE2eProfileDraft|E2eProfileFormEditorData|getE2eProfileFormEditorData|e2e-profile-draft|e2e-profile-form-editor|extractE2eProfileStepValues|isFlowLocked" nextjs
```

Expected result: no matches. References to generic `profileId` in the profile
workspace, run APIs, and finalization result are expected and must remain.

## Task 5: Full verification and handoff

**Files:**

- Verify all intentional implementation and test changes from Tasks 1–4.

- [ ] **Step 1: Run all E2E profile unit and integration tests.**

From `$HOME/Documents/Programming/mihc/nextjs`, run:

```bash
pnpm test -- __tests__/unit/feature/e2e __tests__/integration/e2e-profile-form.persistence.test.ts
```

Expected result: PASS. If the integration database is unavailable, report the
environment failure separately from code failures and retain the unit-test
results.

- [ ] **Step 2: Run lint and TypeScript validation.**

```bash
pnpm lint
pnpm exec tsc --noEmit
```

Expected result: both commands exit successfully with no new diagnostics.

- [ ] **Step 3: Inspect the final diff and preserve unrelated work.**

From `$HOME/Documents/Programming/mihc`, run:

```bash
git diff --check
git status --short
git diff --stat
```

Confirm that the diff contains only the confirmation-only form, editor/draft
purge, focused tests, and directly related docs. Do not stage or revert the
pre-existing modified files listed in the initial worktree audit unless they
are intentionally part of this change.

- [ ] **Step 4: Commit only the implementation files for this task if requested by the execution workflow.**

Stage explicit paths rather than the entire worktree. Do not include the
pre-existing modified mocking/plan files unless the implementation directly
changed them and that change is reviewed as part of this task.
