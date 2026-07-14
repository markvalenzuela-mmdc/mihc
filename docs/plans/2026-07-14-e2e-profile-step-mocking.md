# E2E Profile Current-Step Mocking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a confirmed two-mode `Mock current step` action that generates unique, variable, coherent values from the shared EnrollMate contract without saving or finalizing.

**Architecture:** A pure utility under the E2E feature will generate either a complete overwrite or a random partial mutation using Faker-backed identity/scalar values and contract-resolved choices. It will walk conditional/dependent fields until the selected step validates, while the action bar confirms the mode and the controller applies values individually with normal TanStack Form updates.

**Tech Stack:** Next.js 16, React 19, TanStack Form, Zod, Vitest, Testing Library, `@mihc/enrollmate-contract`, `@faker-js/faker`.

---

## File map

- Create: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts` — pure contract-driven current-step mock generator.
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx` — generate and apply mock values through normal field updates.
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx` — pass the active step’s mock handler and visibility state to the action bar.
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx` — render the `Mock current step` button separately from continue/finalize.
- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts` — test valid generated values, option compliance, and fill-only behavior.
- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx` — test the visible action and prove it does not submit.
- Modify: `$HOME/Documents/Programming/mihc/nextjs/package.json` and `$HOME/Documents/Programming/mihc/nextjs/pnpm-lock.yaml` — add the approved Faker dependency.

No shared-contract, backend, Playwright, or checkbox-layout changes are planned.

## Task 1: Add failing generator tests

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

- [ ] **Step 1: Import the generator and supporting validators/types.**

Add imports for `getEnrollmateStepValidator`, `getEnrollmateValidator`, `type EnrollmateField`, `E2eProfileFormValues`, and the new `getE2eProfileStepMockValues` utility. Keep existing definition adapter tests unchanged.

- [ ] **Step 2: Add a validity test for every data-bearing flow step.**

Use the real contract definitions and default values:

```ts
it.each(["bachelors", "microcredentials"] as const)(
  "generates valid empty-step values for %s",
  (flowType) => {
    const flow = getEnrollmateFlowDefinition(flowType);
    const current: E2eProfileFormValues = {
      core: {
        name: "",
        middleName: "",
        email: "",
        flowType,
      },
      enrollmate: getDefaultE2eProfileFormValues(flow),
    };

    for (const step of flow.steps) {
      const generated = getE2eProfileStepMockValues(
        flow,
        step.step,
        current,
        [],
      );
      const enrollmate = { ...current.enrollmate, ...generated.enrollmate };
      const stepResult = getEnrollmateStepValidator(flowType, step.step).safeParse(
        enrollmate,
      );

      expect(stepResult.success, `${flowType} step ${step.step}`).toBe(true);
    }
  },
);
```

The confirmation step must remain valid with no generated fields.

- [ ] **Step 3: Add select-option compliance assertions.**

For generated select/combobox fields, resolve the actual option list from the
merged values and assert that every generated value is included. Also assert
that every generated non-dependent choice belongs to `field.options`:

```ts
function getFields(flow: EnrollmateFlowDefinition) {
  return flow.steps.flatMap((step) =>
    step.sections.flatMap((section) => section.fields),
  );
}

it("uses only contract-resolved options for generated choices", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const current = {
    core: { name: "", middleName: "", email: "", flowType: "bachelors" },
    enrollmate: getDefaultE2eProfileFormValues(flow),
  } satisfies E2eProfileFormValues;
  const generated = getE2eProfileStepMockValues(flow, 1, current, []);
  const values = { ...current.enrollmate, ...generated.enrollmate };

  for (const field of getFields(flow).filter(
    (candidate) => candidate.type === "select" || candidate.type === "combobox",
  )) {
    if (!Object.hasOwn(generated.enrollmate, field.name)) continue;
    const options = getEnrollmateFieldOptions(field, values);
    expect(options.map((option) => option.value)).toContain(values[field.name]);
  }
});
```

- [ ] **Step 4: Add fill-only preservation coverage.**

Seed a non-empty core name, email, and dependent parent value, then assert the
generator leaves those values unchanged while generating a child from the
parent’s actual option list.

- [ ] **Step 5: Run the focused definition tests and verify they fail.**

Run from `$HOME/Documents/Programming/mihc/nextjs/`:

```sh
pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts
```

Expected: FAIL because `e2e-profile-form-mock.util.ts` and
`getE2eProfileStepMockValues` do not exist yet.

## Task 2: Implement the contract-driven generator

**Files:**

- Create: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts`

- [ ] **Step 1: Define the return type and empty-value helper.**

Use a result that separates core values from EnrollMate values:

```ts
export type E2eProfileStepMockValues = {
  core: Partial<E2eProfileCoreInput>;
  enrollmate: Record<string, unknown>;
};

function isEmptyMockValue(value: unknown) {
  return value === undefined || value === null || value === "";
}
```

Do not treat `false` as empty.

- [ ] **Step 2: Add scalar and fixture value providers.**

Return valid local values by field type: ISO date `2000-01-01`, telephone
`09171234567`, valid email `mock.student@example.com`, and non-empty text such
as `Mock ${field.label}`. Use `getEnrollmateFieldOptions` for all choice
fields. For file fields, choose the first fixture whose filename extension is
accepted and whose size is within `field.maxSizeBytes`; return no value when no
compatible optional fixture exists.

- [ ] **Step 3: Implement dependency-aware field passes.**

Start with a clone of the current EnrollMate values. Iterate the active step’s
fields up to `fields.length` times. For each field:

1. Skip it if the current/generated value is non-empty.
2. Skip hidden fields using `isEnrollmateFieldRendered(field, values)`.
3. Skip disabled parent fields using `isEnrollmateParentFieldDisabled(field, values)`.
4. For choices, resolve options from the current generated values and skip if
   no valid option is available.
5. Add the generated value to both the working values and the result record.

Stop when a pass adds no values. This supports parent fields appearing before
or after dependent fields without inventing an option.

- [ ] **Step 4: Add step-one core field generation.**

When `stepNumber === 1`, fill only empty `core.name`, `core.middleName`, and
`core.email`; preserve `core.flowType` and all non-empty core values. For later
steps, return an empty `core` result.

- [ ] **Step 5: Run the focused definition tests and verify they pass.**

```sh
pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts
```

Expected: PASS, including real Zod step validation and dependent option checks.

## Task 3: Wire the generator into the controller and action bar

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx`

- [ ] **Step 1: Add a controller handler that applies values individually.**

Import the generator and approved fixture type. Add `mockCurrentStep` beside
the existing navigation/submission handlers:

```ts
function mockCurrentStep() {
  if (pendingRef.current) return;

  const generated = getE2eProfileStepMockValues(
    getEnrollmateFlowDefinition(flowType),
    activeStep.step,
    form.state.values,
    fixtures,
  );

  for (const [fieldName, value] of Object.entries(generated.core)) {
    form.setFieldValue(
      `core.${fieldName}` as DeepKeys<E2eProfileFormValues>,
      value as never,
    );
  }
  for (const [fieldName, value] of Object.entries(generated.enrollmate)) {
    form.setFieldValue(
      `enrollmate.${fieldName}` as DeepKeys<E2eProfileFormValues>,
      value as never,
    );
  }

  clearErrors();
}
```

Do not pass `dontRunListeners`, `dontUpdateMeta`, or `dontValidate`. Return the
handler from the controller and leave fields dirty/pristine state untouched.

- [ ] **Step 2: Pass fixtures, mock handler, and visibility to the page action bar.**

Extend the controller input with the existing `fixtures` prop. Pass
`onMockCurrentStep={() => void controller.mockCurrentStep()}` and
`canMockCurrentStep={controller.activeStep.sections.length > 0}` to
`E2eProfileFormActions`.

- [ ] **Step 3: Render the separate button.**

Add props `canMockCurrentStep` and `onMockCurrentStep` to the action component.
Render an outline button labelled exactly `Mock current step` when the active
step has fields. Disable it while `isPending`; keep it outside the Continue and
Validate-and-finish handlers. Hide it on confirmation because that step has no
details to mock.

- [ ] **Step 4: Run TypeScript on the changed surface.**

```sh
pnpm exec tsc --noEmit
```

Expected: PASS with no dynamic form-field typing errors.

## Task 4: Add UI behavior tests

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Update action component harness calls.**

Pass `canMockCurrentStep` and `onMockCurrentStep` to existing direct
`E2eProfileFormActions` renders. Assert the new button is enabled for a
data-bearing step, disabled while pending, and absent for a confirmation step.

- [ ] **Step 2: Test the action without persistence.**

Render the first step with empty values and spy save/finalize functions. Click
`Mock current step`, assert the core name becomes non-empty, and assert neither
`saveDraft` nor `finalize` was called. Also assert a pre-existing value remains
unchanged when supplied in `initialValues`.

- [ ] **Step 3: Run the focused page tests.**

```sh
pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

Expected: PASS, including existing navigation, dependency, save, and finalize
coverage.

## Task 5: Verify the complete scoped change

**Files:**

- No additional files.

- [ ] **Step 1: Run all Next.js unit tests.**

```sh
pnpm test
```

- [ ] **Step 2: Run lint and typecheck.**

```sh
pnpm lint
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Run the production build.**

```sh
pnpm build
```

- [ ] **Step 4: Inspect the final diff and boundaries.**

From `$HOME/Documents/Programming/mihc/`:

```sh
git diff --check
git status --short
git diff --stat
```

Confirm only the generator, form integration, focused tests, and the required
plan document changed. Confirm no checkbox layout, shared contract, backend,
or Playwright browser files were modified.

## Amendment: confirmed random mock modes

The original plan’s fill-empty-only behavior is superseded by these execution
tasks. The existing implementation remains the base and must be extended, not
removed.

### Task 6: Add Faker and define explicit mock modes

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/package.json`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/pnpm-lock.yaml`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/types/e2e-profile-form.types.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts`

- [ ] **Step 1: Add the dependency.**

Run from `$HOME/Documents/Programming/mihc/nextjs/`:

```sh
pnpm add @faker-js/faker
```

Expected: `package.json` and `pnpm-lock.yaml` gain the runtime dependency.

- [ ] **Step 2: Add the mode type.**

Define the public mode beside the existing form types:

```ts
export type E2eProfileMockMode = "full" | "partial";
```

- [ ] **Step 3: Make the generator options injectable.**

Keep the default browser behavior backed by Faker but allow deterministic tests
to pass a Faker instance and fixture list:

```ts
export type E2eProfileStepMockOptions = {
  fixtures: readonly E2eProfileFixture[];
  faker?: Faker;
};

export function getE2eProfileStepMockValues(
  flow: EnrollmateFlowDefinition,
  stepNumber: number,
  currentValues: E2eProfileFormValues,
  mode: E2eProfileMockMode,
  options: E2eProfileStepMockOptions,
): E2eProfileStepMockValues;
```

Use the imported default Faker instance when `options.faker` is omitted. Do not
seed the production instance globally.

### Task 7: Implement coherent full and partial generation

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

- [ ] **Step 1: Add a shared identity context.**

Generate one first name, last name, birthdate, phone number, and UUID-suffixed
`example.com` email per mock invocation. Reuse those values for core identity,
EnrollMate identity, and related parent/guardian fields so the result is
coherent. The email local part must include `faker.string.uuid()` and must be
used for both core and EnrollMate email fields.

- [ ] **Step 2: Implement full-mode selection.**

In `full` mode, every field in the active step is eligible for replacement,
including non-empty values, optional values, and checkboxes. Select options via
`getEnrollmateFieldOptions`; choose a parent before its dependent child. For a
required checkbox group, randomize each checkbox and force one checkbox true if
the random result would leave the required group empty.

- [ ] **Step 3: Implement partial-mode selection.**

In `partial` mode, preserve non-empty values by default. Always select empty or
invalid required fields. On step 1, always regenerate the core and EnrollMate
email with the invocation identity so every mock run represents a fresh user.
For optional fields, use a Faker boolean decision. A checkbox is eligible for a
random boolean decision even when its current value is `false`, so partial mode
can exercise checkbox branches. Do not change an existing non-checkbox value
unless it is required to make the selected branch valid.

- [ ] **Step 4: Resolve conditional closure.**

After each generated parent, continue scanning the active step. Any newly
visible field is eligible for generation, even if optional, so a randomly
checked condition never leaves a visible blank. If a selected branch reveals a
required file, choose a compatible approved fixture or choose another parent
option when no fixture exists. Clear values made unavailable by a randomized
false condition through the existing normal cleanup path.

- [ ] **Step 5: Verify generated results with real validators.**

Add seeded tests that assert:

```ts
faker.seed(42);
const full = getE2eProfileStepMockValues(flow, 1, current, "full", {
  fixtures,
  faker,
});
const partial = getE2eProfileStepMockValues(flow, 1, current, "partial", {
  fixtures,
  faker,
});

expect(full.core.email).not.toBe(partial.core.email);
expect(full.core.email).toMatch(/@example\.com$/);
expect(getEnrollmateValidator("bachelors").safeParse(fullData).success).toBe(true);
expect(getEnrollmateStepValidator("bachelors", 1).safeParse(partialData).success).toBe(true);
```

Also assert every generated choice belongs to its actual resolved options and
that every visible conditional field has a non-empty value after a selected
checkbox branch.

### Task 8: Add the confirmation dialog and mode plumbing

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
- Modify: `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`

- [ ] **Step 1: Convert the immediate action into a dialog trigger.**

Use the existing dialog primitives and local open state. The trigger remains
`Mock current step`; the dialog must expose:

```text
Mock current step
Choose how to populate this step.
Cancel
Fill all fields
Random partial fill
```

Close the dialog on Cancel or after selecting a mode. Do not run the generator
when the dialog is dismissed.

- [ ] **Step 2: Pass the selected mode to the controller.**

Change the handler type to:

```ts
onMockCurrentStep: (mode: E2eProfileMockMode) => void;
```

The controller calls the generator with the selected mode and existing approved
fixtures, then applies values one at a time through `form.setFieldValue`.
Neither mode may call `saveDraft` or `finalize`.

- [ ] **Step 3: Preserve normal cleanup and dirty state.**

Do not use `dontRunListeners` or mark fields pristine. When a selected false
branch hides existing values, clear those fields through the existing form
cleanup behavior so the next validation sees only available values.

### Task 9: Add dialog and mode behavior tests

**Files:**

- Modify: `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Test cancellation and mode selection.**

Assert clicking `Mock current step` opens the dialog, Cancel leaves values and
submission spies unchanged, `Fill all fields` invokes the controller with
`"full"`, and `Random partial fill` invokes it with `"partial"`.

- [ ] **Step 2: Test no persistence side effects.**

For both choices, assert `saveDraft` and `finalize` are not called. Assert the
dialog closes after a mode is selected and remains unavailable on confirmation.

- [ ] **Step 3: Run focused tests.**

```sh
pnpm exec vitest run \
  __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts \
  __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

Expected: PASS with the original and amended behavior covered.

### Task 10: Verify the amended feature

**Files:**

- No additional files.

- [ ] **Step 1: Run lint and focused/full tests.**

```sh
pnpm lint
pnpm test
```

- [ ] **Step 2: Run TypeScript and build.**

```sh
pnpm exec tsc --noEmit
pnpm build
```

- [ ] **Step 3: Check the final boundary.**

```sh
git diff --check
git status --short
git diff --stat
```

Confirm the only changes are the Faker dependency, mock generator, dialog,
controller plumbing, focused tests, and plan/design documentation. Confirm no
checkbox layout, contract definition, backend persistence, or Playwright files
changed.
