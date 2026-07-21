# EnrollMate Guardian Assignment Rule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Guardian Assignment reflect parent availability, keep Specify Guardian Relationship disabled and clear unless needed, and ensure mocks obey the same contract rule.

**Architecture:** Add one option-filtering helper to `@mihc/enrollmate-contract` and reuse it in shared Zod validation and the Next.js field adapter. Extend the existing Next.js rendered/disabled/cleanup predicates for the specify field; the mocker inherits assignment filtering through the adapter it already calls.

**Tech Stack:** TypeScript, Zod 4, Next.js 16, TanStack Form, Vitest, Node test runner, pnpm.

**Execution note:** The selected execution mode leaves implementation and plan changes uncommitted for review. Commit checkpoints below are therefore verification boundaries, not `git commit` operations.

---

## File Map

- Create `packages/enrollmate-contract/src/guardian-assignment.ts` — pure shared option-filtering rule.
- Modify `packages/enrollmate-contract/src/index.ts` — export the shared helper.
- Modify `packages/enrollmate-contract/src/form-data.schema.ts` — enforce the helper's result in full and step validators.
- Modify `playwright/server/__tests__/unit/enrollmate-contract.test.ts` — table-driven shared rule and validator coverage.
- Modify `nextjs/feature/e2e/utils/e2e-profile-form.util.ts` — reuse the helper for options, disabled state, rendering, and cleanup.
- Modify `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx` — trigger cleanup when either guardian selector changes.
- Modify `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts` — adapter, cleanup, and mocker coverage.
- Modify `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx` — rendered and disabled interaction coverage.

### Task 1: Shared guardian assignment rule

**Files:**
- Create: `packages/enrollmate-contract/src/guardian-assignment.ts`
- Modify: `packages/enrollmate-contract/src/index.ts`
- Modify: `packages/enrollmate-contract/src/form-data.schema.ts`
- Test: `playwright/server/__tests__/unit/enrollmate-contract.test.ts`

- [ ] **Step 1: Add failing table-driven helper and validator tests**

Import `getAvailableEnrollmateGuardianAssignments` and add cases equivalent to:

```ts
const guardianCases = [
  ["Living", "Living", ["Father", "Mother", "Others"]],
  ["Living", "Unknown", ["Father", "Others"]],
  ["Living", "Deceased", ["Father", "Others"]],
  ["Unknown", "Living", ["Mother", "Others"]],
  ["Deceased", "Living", ["Mother", "Others"]],
  ["Unknown", "Unknown", ["Others"]],
  ["Unknown", "Deceased", ["Others"]],
  ["Deceased", "Unknown", ["Others"]],
  ["Deceased", "Deceased", ["Others"]],
] as const;
```

For each case, resolve the captured `guardian` field options and assert the exact
filtered values. For the four both-unavailable cases, build a valid fixture with
`guardian: "Others"`, assert it passes, then assert `Father` and `Mother` fail with
an issue whose path is `["guardian"]`.

- [ ] **Step 2: Run the contract test and confirm the missing export fails**

Run:

```powershell
pnpm test:unit -- --test-name-pattern "guardian"
```

Working directory: `playwright/`.

Expected: FAIL because `getAvailableEnrollmateGuardianAssignments` does not exist.

- [ ] **Step 3: Implement the pure shared helper**

Create `guardian-assignment.ts` with this interface and filtering behavior:

```ts
import type { EnrollmateOption } from "./types";

export function getAvailableEnrollmateGuardianAssignments(
  options: readonly EnrollmateOption[],
  values: Record<string, unknown>,
) {
  return options.filter(({ value }) => {
    if (value === "Father") return values.fthrDeceased === "Living";
    if (value === "Mother") return values.mthrDeceased === "Living";
    return value === "Others";
  });
}
```

Export it from `src/index.ts`. This preserves the captured labels/order and excludes
unknown future values until the business rule explicitly supports them.

- [ ] **Step 4: Enforce the helper in shared validation**

In `form-data.schema.ts`, add a focused validator called from the existing
`superRefine` loop:

```ts
function validateGuardianAssignment(
  field: EnrollmateField,
  data: Record<string, unknown>,
  context: z.RefinementCtx,
) {
  if (field.name !== "guardian") return;
  const value = data[field.name];
  if (typeof value !== "string") return;

  const available = getAvailableEnrollmateGuardianAssignments(
    field.options,
    data,
  );
  if (available.some((option) => option.value === value)) return;

  context.addIssue({
    code: "custom",
    path: [field.name],
    message: `${field.label} is not available for the selected parent statuses.`,
  });
}
```

Call it for each validated field after base field validation. Both full and step
validators use `buildFieldSetValidator`, so no duplicate integration is needed.

- [ ] **Step 5: Run the contract tests**

Run `pnpm test:unit` from `playwright/`.

Expected: all server unit tests PASS, including every unavailable-parent combination.

- [ ] **Step 6: Review checkpoint**

Run `git diff --check` and inspect only the four Task 1 files. Do not commit under
the selected execution mode.

### Task 2: Next.js option filtering and cleanup

**Files:**
- Modify: `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`
- Modify: `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

- [ ] **Step 1: Add failing option and cleanup tests**

Add table-driven assertions that `getEnrollmateFieldOptions(guardian, values)`
returns the exact value arrays from Task 1. Add cleanup assertions that:

```ts
clearUnavailableE2eProfileFormValues(bachelors, {
  fthrDeceased: "Deceased",
  mthrDeceased: "Unknown",
  guardian: "Father",
})
```

does not retain `guardian`, and that `grdnOtherApplRelationship` becomes `""` when
`guardian` is `Others` but `grdnApplRelationship` is `Grandparent`.

- [ ] **Step 2: Run the focused Vitest file and confirm failure**

Run from `nextjs/`:

```powershell
pnpm test -- __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts
```

Expected: FAIL because Guardian Assignment is not filtered and the specify field is
currently removed/hidden rather than retained disabled and empty.

- [ ] **Step 3: Reuse the shared helper in the option adapter**

Import `getAvailableEnrollmateGuardianAssignments`. In
`getEnrollmateFieldOptions`, special-case only `field.name === "guardian"`:

```ts
if (field.name === "guardian") {
  return getAvailableEnrollmateGuardianAssignments(field.options, values);
}
```

Leave dependent, cascade, external, and ordinary inline fields unchanged.

- [ ] **Step 4: Add focused specify-field predicates**

Add private checks for `grdnOtherApplRelationship`. Make it rendered when
`values.guardian === "Others"`, disabled when rendered and
`values.grdnApplRelationship !== "Others"`, and otherwise preserve existing
conditional rendering. In cleanup, set it to its empty text value while disabled.

Also validate the selected Guardian Assignment against the helper-filtered options
inside `clearUnavailableE2eProfileFormValues`; remove it when no longer allowed.

- [ ] **Step 5: Trigger cleanup from guardian changes**

Extend the existing `onChange` cleanup condition to include:

```ts
fieldApi.name === "enrollmate.guardian" ||
fieldApi.name === "enrollmate.grdnApplRelationship"
```

Reuse `clearUnavailableE2eProfileFormValues` and keep the existing
`dontRunListeners`, `dontUpdateMeta`, and `dontValidate` flags.

- [ ] **Step 6: Run the focused adapter tests**

Run the focused Vitest command from Step 2.

Expected: all profile-form-definition tests PASS.

- [ ] **Step 7: Review checkpoint**

Run `git diff --check`; confirm the changes are limited to the shared helper call,
specific guardian predicates, cleanup, controller triggers, and tests.

### Task 3: Renderer and mock generation

**Files:**
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

- [ ] **Step 1: Add renderer behavior tests**

Render `grdnOtherApplRelationship` with Guardian Assignment `Others` and assert:

```ts
expect(specifyField).toBeDisabled();
expect(specifyField).not.toHaveAttribute("aria-required", "true");
```

when Relationship to Applicant is `Grandparent`. With relationship `Others`, assert
the same field is enabled, `aria-required="true"`, and the required marker is shown.
With Guardian Assignment `Father`, assert the field is not rendered.

- [ ] **Step 2: Add parent-status mocker cases**

For each Task 1 parent-status pair, run partial mocking for bachelors step 2 with
those statuses already populated. Merge generated values, assert the generated
`guardian` belongs to the exact allowed list, and validate with
`getEnrollmateStepValidator("bachelors", 2)` after cleanup.

Retain the existing full/partial every-step test as coverage that randomly generated
statuses and relationship details remain coherent.

- [ ] **Step 3: Run both focused Next.js test files**

Run from `nextjs/`:

```powershell
pnpm test -- __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts __tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
```

Expected: both files PASS, including disabled, required, clearing, and mocker cases.

- [ ] **Step 4: Review checkpoint**

Confirm tests use the official `Others` value and do not alter the Relationship to
Applicant option catalog.

### Task 4: Final verification

**Files:** All files listed in the File Map.

- [ ] **Step 1: Run complete relevant suites**

Run:

```powershell
pnpm test:unit
pnpm typecheck
```

from `playwright/`, then:

```powershell
pnpm test
pnpm lint
```

from `nextjs/`.

Expected: all commands PASS. If a broad pre-existing failure appears, rerun the
focused tests and report the exact unrelated failure without changing unrelated code.

- [ ] **Step 2: Inspect final repository state**

Run:

```powershell
git status --short
git diff --check
git diff --stat
git diff --
```

Confirm the implementation is present, the committed design remains intact, and no
unrelated files or code paths changed.

- [ ] **Step 3: Hand off uncommitted implementation**

Summarize the exact behavioral changes and verification results, link the plan and
changed files, and ask whether the user wants the implementation committed.
