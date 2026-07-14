# E2E Profile Form Save-on-Step-Completion Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints. Steps use checkbox syntax for tracking.

**Goal:** Replace the profile form’s two draft-saving actions with one `Continue` action that validates and saves the active step before advancing.

**Architecture:** Keep the existing server draft action and persistence contract. Simplify the client action component and controller so the forward path has one operation: validate the active step, persist it, mark it pristine, and move to the next step. Remove only the unused exit callback and save-intent branch; keep Previous navigation and final save-before-finalize behavior.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TanStack Form, Vitest, Testing Library, pnpm.

---

## Context and file map

- `nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx` owns
  the visible Previous/Continue/finish controls and their callback props.
- `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
  composes the controller and action component.
- `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
  validates, saves, marks fields pristine, and updates the step query.
- `nextjs/feature/e2e/components/profile-form/e2e-profile-form-route.tsx`
  owns route-level navigation callbacks; only finalization navigation remains.
- `nextjs/feature/e2e/types/e2e-profile-form.types.ts` contains an unused
  save-intent union that should be removed with the client intent branch.
- `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`
  covers action rendering and end-to-end client-controller behavior.
- `docs/brainstorm/2026-07-13-e2e-profile-form-phased-delivery.md` and
  `docs/plans/2026-07-13-e2e-profile-form-phased-delivery.md` contain the
  current durable E2E flow record and need a short amendment so their former
  two-save-action wording is not treated as current behavior.

## Task 1: Update focused action and page tests first

**Files:**

- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Replace the action-component expectations**

Change the action harness callbacks from `onSaveAndContinue` and
`onSaveAndExit` to `onContinue`. Assert that a non-confirmation step renders
`Previous` and `Continue`, and does not render either `Save and continue` or
`Save draft and exit`. Click `Continue` and assert the new callback runs once.
For the pending-state test, pass only `onPrevious`, `onContinue`, and
`onFinalize`; assert every rendered button is disabled and the saving status
remains visible. Keep the confirmation assertion that only `Validate and
finish` replaces `Continue`.

- [ ] **Step 2: Update page-controller interaction labels and setup**

Replace every page test query for `Save and continue` with `Continue`. Remove
the exit-specific test assertion and instead verify that `Previous` changes the
step without calling `saveDraft`, while `Continue` from that step calls
`saveDraft` and advances. Add an optional `profileId` to the test renderer’s
page props so the confirmation test can start with an existing persisted draft.
That test should click `Validate and finish` directly and assert the active step
is saved before `finalize` is called; it should no longer use an exit action to
create the profile first.

- [ ] **Step 3: Run the focused test file and verify the expected failures**

Run:

```powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

Expected: the test run fails only because the implementation still exposes the
old action names/props and exit branch.

## Task 2: Simplify the client action boundary

**Files:**

- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx`
- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- Modify: `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-route.tsx`
- Modify: `nextjs/feature/e2e/types/e2e-profile-form.types.ts`

- [ ] **Step 1: Make the action component expose one forward callback**

Rename the `onSaveAndContinue` prop to `onContinue`, remove `onSaveAndExit`,
remove the ghost exit button, and render this non-confirmation button:

```tsx
<Button type="button" disabled={isPending} onClick={onContinue}>
  Continue
</Button>
```

Keep Previous, the pending status, `aria-busy`, and the confirmation
`Validate and finish` button unchanged apart from its surrounding layout.

- [ ] **Step 2: Remove the controller’s exit intent**

Remove `onExit` from the page base props and controller input. Rename
`runDraft(intent: "continue" | "exit")` to the single no-argument handler
`saveAndContinue`. Preserve its existing validation, pending guard, draft
input, action-error mapping, profile ID assignment, validated-step update,
pristine-field update, and query-step update. Delete only the conditional exit
callback branch; after a successful draft save, always calculate the next step
and call `setQueryStep`.

The resulting success path must remain equivalent to:

```tsx
profileIdRef.current = result.data.profileId;
setProfileId(result.data.profileId);
setValidatedSteps((current) => new Set(current).add(activeStep.step));
clearErrors();
markFieldsPristine([
  ...CORE_FIELD_ORDER,
  "enrollmate",
  ...activeStep.sections.flatMap((section) =>
    section.fields.map((field) => `enrollmate.${field.name}`),
  ),
]);
await setQueryStep(clampStep(result.data.nextStep ?? activeStepNumber + 1, steps.length));
```

Do not change `finalizeProfile`: it must continue saving the active confirmation
step before calling `finalize`.

- [ ] **Step 3: Wire the new callback through the page and route**

Pass `onContinue={() => void controller.saveAndContinue()}` from the page. Keep
`onFinish` in the route wrapper for the workspace redirect, but remove the
`onExit` prop and the unused `/e2e-testing` push. Remove the unused
`E2eProfileFormIntent` union from the shared form types if it has no remaining
references after the wiring change.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run:

```powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

Expected: all action, validation, persistence-before-advance, Previous,
pending, dirty-state, and finalization tests pass with no old save-action
labels rendered.

## Task 3: Amend the durable E2E flow records

**Files:**

- Modify: `docs/brainstorm/2026-07-13-e2e-profile-form-phased-delivery.md`
- Modify: `docs/plans/2026-07-13-e2e-profile-form-phased-delivery.md`

- [ ] **Step 1: Append a behavior amendment**

Add a dated amendment stating that the former “Save and continue” and “Save
draft and exit” controls are replaced by `Continue`, which validates and saves
the active step before advancing; Previous remains navigation-only; and
Validate and finish retains save-before-finalize. Make clear that the existing
server draft contract is unchanged. Do not rewrite historical task details;
the amendment is the current override.

- [ ] **Step 2: Check the repository for stale runtime references**

Run:

```powershell
rg -n -F -e 'Save and continue' -e 'Save draft and exit' -e 'onSaveAndExit' -e 'onSaveAndContinue' -e 'runDraft("exit")' nextjs
```

Expected: no matches in application code or focused tests. Historical docs may
still contain the old wording where they describe the superseded behavior, but
the new amendment must state the current behavior.

## Task 4: Run the regression checks and inspect the diff

**Files:** No additional files expected.

- [ ] **Step 1: Run the E2E profile-form unit suite**

Run:

```powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form
```

Expected: all focused profile-form unit tests pass.

- [ ] **Step 2: Run TypeScript validation**

Run:

```powershell
pnpm --dir nextjs exec tsc --noEmit
```

Expected: TypeScript exits successfully with no new errors.

- [ ] **Step 3: Check whitespace and the final scoped diff**

Run:

```powershell
git diff --check
git diff -- nextjs/feature/e2e/components/profile-form nextjs/feature/e2e/types/e2e-profile-form.types.ts nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx docs/brainstorm/2026-07-14-e2e-profile-form-save-on-step-completion.md docs/plans/2026-07-14-e2e-profile-form-save-on-step-completion.md docs/brainstorm/2026-07-13-e2e-profile-form-phased-delivery.md docs/plans/2026-07-13-e2e-profile-form-phased-delivery.md
```

Expected: no whitespace errors; the diff contains only the approved save-on-
step-completion behavior plus its tests and durable documentation, and all
pre-existing user changes remain present.

## Self-review

- Spec coverage: the action-label, save boundary, Previous behavior, final
  confirmation save, unchanged server contract, and preservation requirements
  are covered by Tasks 1–4.
- Placeholder scan: no TODO, TBD, FIXME, or vague implementation placeholders
  are used in the plan.
- Type consistency: `onContinue` and `saveAndContinue` are introduced once and
  used consistently through the action component, page, and controller; the
  server-side `saveDraft` type is intentionally unchanged.
