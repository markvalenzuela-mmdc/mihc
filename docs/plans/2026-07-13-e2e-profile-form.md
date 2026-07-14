# E2E Profile Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-page create and edit workflows for definition-driven E2E profiles with step-level drafts and final EnrollMate validation.

**Architecture:** Preserve `nextjs/components/blocks/Form/` as the unchanged TanStack baseline. Add step validation to the shared EnrollMate contract, then build a profile-specific adapter under `nextjs/feature/e2e/` with focused renderer, wizard, server-action, and persistence modules.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Form, Zod 4, Drizzle ORM/PostgreSQL, Base UI/shadcn, Vitest, Testing Library.

---

## File map

- Modify `packages/enrollmate-contract/src/form-data.schema.ts`: build validators for an arbitrary field subset.
- Modify `packages/enrollmate-contract/src/registry.ts` and `src/index.ts`: expose `getEnrollmateStepValidator`.
- Modify `packages/enrollmate-contract/src/types.ts`: export the fixture metadata type used by UI and persistence.
- Create `nextjs/feature/e2e/schema/e2e-profile-form.schema.ts`: core profile and action input schemas.
- Create `nextjs/feature/e2e/config/e2e-profile-form.config.ts`: visibility, options, defaults, and step helpers.
- Create `nextjs/feature/e2e/types/e2e-profile-form.types.ts`: serializable editor and action-result contracts.
- Create `nextjs/feature/e2e/services/e2e-profile-form.service.ts`: transactional create, draft merge, final validation, and edit loading.
- Create `nextjs/feature/e2e/actions/e2e-profile-form.action.ts`: authenticated server-action boundary and error mapping.
- Create `nextjs/feature/e2e/services/e2e-profile-fixtures.service.ts`: approved fixture catalog.
- Create focused components under `nextjs/feature/e2e/components/profile-form/`: form shell, progress, sections, renderer, controls, and actions.
- Create `nextjs/app/e2e-testing/profiles/new/page.tsx` and `nextjs/app/e2e-testing/profiles/[profileId]/edit/page.tsx`.
- Modify the profiles table and workspace header to expose create/edit navigation.
- Add unit tests under `nextjs/__tests__/unit/feature/e2e/profile-form/` and database coverage under `nextjs/__tests__/integration/`.

### Task 1: Add contract-level step validation

**Files:**
- Modify: `packages/enrollmate-contract/src/form-data.schema.ts`
- Modify: `packages/enrollmate-contract/src/registry.ts`
- Modify: `packages/enrollmate-contract/src/index.ts`
- Test: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`

- [ ] **Step 1: Write failing contract tests**

Add tests proving one Bachelor step accepts a valid partial payload, rejects an invalid option, enforces conditions whose parent is in the step, and rejects an unknown step:

```ts
import { getEnrollmateStepValidator } from "@mihc/enrollmate-contract";

it("validates one EnrollMate step without requiring later steps", () => {
  const step = getEnrollmateStepValidator("bachelors", 1);
  const data = createValidBachelorData();
  const names = new Set(
    getEnrollmateFlowDefinition("bachelors").steps[0]!.sections.flatMap(
      (section) => section.fields.map((field) => field.name),
    ),
  );
  const stepData = Object.fromEntries(
    Object.entries(data).filter(([name]) => names.has(name)),
  );

  expect(step.safeParse(stepData).success).toBe(true);
  expect(step.safeParse({ ...stepData, gender: "invalid" }).success).toBe(false);
});

it("rejects an unknown EnrollMate step", () => {
  expect(() => getEnrollmateStepValidator("bachelors", 99)).toThrow(
    "Unknown bachelors step: 99",
  );
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd nextjs && pnpm exec vitest run __tests__/unit/lib/enrollmate-contract.test.ts`

Expected: FAIL because `getEnrollmateStepValidator` is not exported.

- [ ] **Step 3: Extract subset validator construction**

Refactor `buildEnrollmateValidator` without changing full-flow behavior:

```ts
function buildFieldSetValidator(fields: EnrollmateField[]) {
  const schema = z.object(
    Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
  ).strict();

  return schema.superRefine((data, context) => {
    for (const field of fields) {
      validateConditionalField(field, data, context);
      const value = data[field.name];
      if (value === undefined || typeof value !== "string") continue;
      const dependentOptions = getDependentOptions(field, data);
      if (dependentOptions && !dependentOptions.some((option) => option.value === value)) {
        context.addIssue({
          code: "custom",
          path: [field.name],
          message: `${field.label} is not valid for the selected major.`,
        });
      }
    }
  });
}

export function buildEnrollmateStepValidator(step: EnrollmateStep) {
  return buildFieldSetValidator(step.sections.flatMap((section) => section.fields));
}
```

Make `buildEnrollmateValidator` call the same helper with every flow field.

- [ ] **Step 4: Register and export step validators**

In `registry.ts`, build validators by step number and expose:

```ts
export function getEnrollmateStepValidator(
  flowType: EnrollmateFlowType,
  stepNumber: number,
) {
  const step = enrollmateDefinition[flowType].steps.find(
    (candidate) => candidate.step === stepNumber,
  );
  if (!step) throw new Error(`Unknown ${flowType} step: ${stepNumber}`);
  return buildEnrollmateStepValidator(step);
}
```

Export it from `src/index.ts`.

- [ ] **Step 5: Run contract tests and commit**

Run: `cd nextjs && pnpm exec vitest run __tests__/unit/lib/enrollmate-contract.test.ts`

Expected: PASS.

Commit:

```powershell
git add packages/enrollmate-contract/src nextjs/__tests__/unit/lib/enrollmate-contract.test.ts
git commit -m "feat(enrollmate): add step validators"
```

### Task 2: Define profile editor contracts and pure field behavior

**Files:**
- Create: `nextjs/feature/e2e/schema/e2e-profile-form.schema.ts`
- Create: `nextjs/feature/e2e/types/e2e-profile-form.types.ts`
- Create: `nextjs/feature/e2e/config/e2e-profile-form.config.ts`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

- [ ] **Step 1: Write failing pure-behavior tests**

Cover defaults, conditions, dependent options, hidden-value removal, and incompatible-child clearing:

```ts
expect(isEnrollmateFieldVisible(conditionalField, { schoolNotFound: true })).toBe(true);
expect(clearUnavailableFieldValues(flow, {
  schoolNotFound: false,
  lastschOther: "Old school",
})).not.toHaveProperty("lastschOther");
expect(getEnrollmateFieldOptions(programApplied, {
  programFocus: "BS Information Technology",
})).toContainEqual({
  label: "BS IT Data Analytics Specialization",
  value: "BS IT Data Analytics Specialization",
});
```

- [ ] **Step 2: Verify the focused test fails**

Run: `cd nextjs && pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Add stable editor types and schemas**

Define core inputs and structured results:

```ts
export const profileCoreInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  middleName: z.string().trim().optional(),
  email: z.email("Enter a valid email address."),
  flowType: z.enum(["bachelors", "microcredentials"]),
});

export type ProfileFormActionResult =
  | { ok: true; profileId: string; nextStep: number | null }
  | { ok: false; kind: "validation"; fieldErrors: Record<string, string[]> }
  | { ok: false; kind: "conflict" | "not-found" | "forbidden"; message: string }
  | { ok: false; kind: "unexpected"; message: string };
```

- [ ] **Step 4: Implement pure definition helpers**

Keep functions independent of React and exhaustively based on contract types. `clearUnavailableFieldValues` returns a new record, removes hidden fields, and clears dependent values absent from recomputed options.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run:

```powershell
cd nextjs
pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts
pnpm exec tsc --noEmit
```

Expected: PASS and zero type errors.

Commit: `git commit -am "feat(e2e): define profile form behavior"` after staging the new files explicitly.

### Task 3: Add the approved fixture catalog

**Files:**
- Create: `nextjs/feature/e2e/services/e2e-profile-fixtures.service.ts`
- Create: `playwright/fixtures/enrollmate/.gitkeep` if no approved fixtures exist
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-fixtures.test.ts`

- [ ] **Step 1: Write a failing catalog test**

```ts
expect(await getApprovedProfileFixtures()).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      fixtureUri: expect.stringMatching(/^playwright\/fixtures\/enrollmate\//),
      filename: expect.any(String),
      mimeType: expect.any(String),
      sizeBytes: expect.any(Number),
    }),
  ]),
);
```

- [ ] **Step 2: Decide the initial fixture assets explicitly**

If the directory is empty, add small non-sensitive fixtures matching every accepted extension in the contract. Do not use personal documents or generated credentials. Record each file's MIME type in a constant map.

- [ ] **Step 3: Implement a server-only catalog**

Resolve paths beneath the repository's `playwright/fixtures/enrollmate/` directory, reject traversal, stat files for `sizeBytes`, and return only serializable metadata. Add `import "server-only";` so client bundles cannot access the filesystem.

- [ ] **Step 4: Run tests and commit**

Run the focused fixture test and `pnpm exec tsc --noEmit`; expect PASS.

Commit: `feat(e2e): add profile fixture catalog`.

### Task 4: Implement transactional profile draft persistence

**Files:**
- Create: `nextjs/feature/e2e/services/e2e-profile-form.service.ts`
- Test: `nextjs/__tests__/integration/e2e-profile-form-persistence.test.ts`

- [ ] **Step 1: Write database integration tests**

Test that `saveProfileDraft` creates one profile and one form transactionally, merges a later step without losing the first, rejects flow changes, rejects stale definition hashes, and maps duplicate email to a domain error.

```ts
const created = await saveProfileDraft({
  mode: "create",
  core: { name: "Draft", middleName: "", email: "draft@example.edu", flowType: "microcredentials" },
  stepNumber: 1,
  stepData: validStepOne,
  operatorId: currentE2eOperator.id,
}, db);

expect(created.profile.flowType).toBe("microcredentials");
expect(created.profileForm.data).toMatchObject(validStepOne);
```

- [ ] **Step 2: Run the integration test and verify failure**

Run: `cd nextjs && pnpm exec vitest run __tests__/integration/e2e-profile-form-persistence.test.ts`

Expected: FAIL because the service does not exist. The configured test database must be running.

- [ ] **Step 3: Implement explicit domain errors and service inputs**

Define `ProfileFormNotFoundError`, `ProfileFormFlowConflictError`, `ProfileFormDefinitionConflictError`, and `ProfileEmailConflictError`. Accept `DbExecutor` for testability.

- [ ] **Step 4: Implement create and merge transactions**

Validate the active step before opening a transaction. For create, insert `profiles` and `profileForms` together with the current definition hash. For edit, lock the profile row, compare flow/hash, merge only validated step keys, and update core fields plus `updatedBy`. Never write `status`.

- [ ] **Step 5: Implement finalization**

`finalizeProfileForm(profileId, operatorId, db)` loads the aggregate, checks its hash, runs `getEnrollmateValidator(profile.flowType).parse(profileForm.data)`, and persists the parsed normalized object without an active flag.

- [ ] **Step 6: Run integration tests and commit**

Expected: all new persistence tests pass, including rollback on form-insert failure.

Commit: `feat(e2e): persist profile form drafts`.

### Task 5: Add server actions and editor loading

**Files:**
- Create: `nextjs/feature/e2e/actions/e2e-profile-form.action.ts`
- Modify: `nextjs/feature/e2e/services/e2e-profile-form.service.ts`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form.action.test.ts`

- [ ] **Step 1: Write action-result tests**

Mock the service and verify validation issues become `fieldErrors`, duplicate email becomes `kind: "conflict"`, missing records become `not-found`, stale hashes become `conflict`, and unexpected errors return the safe generic message.

- [ ] **Step 2: Add the authenticated operator boundary**

Use the existing Better Auth server session. If the application still lacks a reusable session helper, add one under `nextjs/lib/better-auth/` and return `forbidden` when no user exists. Do not trust `operatorId` from `FormData`.

- [ ] **Step 3: Implement typed actions**

Expose `saveProfileDraftAction` and `finalizeProfileFormAction`. Parse mode, profile ID, step number, core JSON, and step JSON with Zod before calling the service. Revalidate `/e2e-testing` and the edit route after success.

- [ ] **Step 4: Implement `getProfileFormEditorData`**

Return core fields, JSONB data, current step definitions, definition hash, and fixture catalog. Reject deprecated hashes before rendering edit mode.

- [ ] **Step 5: Run focused tests and commit**

Run unit tests and typecheck; expect PASS.

Commit: `feat(e2e): add profile form actions`.

### Task 6: Build field controls and exhaustive renderer

**Files:**
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-controls.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/enrollmate-field-renderer.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/enrollmate-section.tsx`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`

- [ ] **Step 1: Write renderer tests by field type**

Assert semantic input types, checkbox state, captured select options, free-entry combobox behavior, fixture selection, labels, descriptions, and errors. Add a compile-time exhaustiveness assertion for `EnrollmateFieldType`.

- [ ] **Step 2: Implement focused controls**

Reuse `FormField`, `FormTextInput`, `FormTextarea`, and `FormSelect` from the unchanged block. Add feature-local checkbox, free-entry combobox, and fixture-picker controls using the exported field context and existing UI primitives.

- [ ] **Step 3: Implement the exhaustive renderer**

Use a `switch (field.type)` and finish with:

```ts
default: {
  const unsupported: never = field.type;
  throw new Error(`Unsupported EnrollMate field type: ${unsupported}`);
}
```

- [ ] **Step 4: Wire conditional/dependent behavior**

Subscribe only to referenced parent fields. When visibility/options change, call the pure helpers from Task 2 and update only affected field values.

- [ ] **Step 5: Run component tests and commit**

Run the focused jsdom test, lint touched files, and typecheck. Expect PASS/zero new warnings.

Commit: `feat(e2e): render EnrollMate profile fields`.

### Task 7: Build the shared create/edit wizard

**Files:**
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-core-fields.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Write wizard behavior tests**

Cover locked edit flow, previous without save, save-and-continue, save-and-exit, final validation, pending disabled state, error-summary focus, and dirty-navigation warning.

- [ ] **Step 2: Implement a single TanStack form composition**

Use the baseline's `useAppForm` with feature-specific `formOptions`; do not call `useGenerateForm`. Keep current step in URL search params so refresh/back navigation is stable.

- [ ] **Step 3: Implement actions and result handling**

Use `useActionState` for server results, preserve values after expected errors, focus the first invalid field, and redirect only after an `ok: true` result.

- [ ] **Step 4: Add accessible progress and responsive layout**

Expose the current step with `aria-current="step"`, render one column by default, and use two columns only for paired short fields.

- [ ] **Step 5: Run tests and commit**

Run focused component tests, lint, and typecheck.

Commit: `feat(e2e): add profile form wizard`.

### Task 8: Add routes and E2E Testing entry points

**Files:**
- Create: `nextjs/app/e2e-testing/profiles/new/page.tsx`
- Create: `nextjs/app/e2e-testing/profiles/[profileId]/edit/page.tsx`
- Modify: `nextjs/feature/e2e/components/profiles/e2e-testing-profiles-table.tsx`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-info.tsx`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx`

- [ ] **Step 1: Write navigation tests**

Assert “New profile” links to `/e2e-testing/profiles/new` and “Edit profile” links to the selected profile edit route. Deprecated/invalid state must not incorrectly hide edit unless the hash is deprecated.

- [ ] **Step 2: Implement server route pages**

The new route loads definitions and fixtures. The edit route awaits `params`, calls `getProfileFormEditorData`, invokes `notFound()` for missing profiles, and renders a clear blocked state for deprecated hashes.

- [ ] **Step 3: Add entry-point links**

Use Next.js `Link` through the existing Button API. Preserve current E2E table pagination when returning from the editor where practical.

- [ ] **Step 4: Run navigation tests and commit**

Run focused tests and typecheck; expect PASS.

Commit: `feat(e2e): expose profile editor routes`.

### Task 9: Complete verification and documentation

**Files:**
- Modify: `nextjs/components/blocks/Form/README.md`
- Modify: `docs/brainstorm/2026-07-13-e2e-profile-form.md`
- Create: `docs/plans/2026-07-13-e2e-profile-form-qa.md`

- [ ] **Step 1: Run fast validation**

```powershell
cd nextjs
pnpm exec vitest run __tests__/unit
pnpm exec tsc --noEmit
pnpm lint
```

Expected: unit tests and typecheck pass; lint has no new warnings in touched files.

- [ ] **Step 2: Run database validation**

Start the configured PostgreSQL test database, then run:

```powershell
pnpm exec vitest run __tests__/integration/e2e-profile-form-persistence.test.ts __tests__/integration/profile-flow-cardinality.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run package-consumer checks**

Run the Playwright server contract tests and typecheck from `playwright/` using pnpm. Expected: PASS without launching browsers.

- [ ] **Step 4: Perform manual responsive QA**

Verify Bachelor and Microcredential creation, draft resume, edit, locked flow, conditions, dependent selects, free-entry cascade values, fixture fields, duplicate email, final validation, dirty navigation, keyboard focus, narrow layout, and return to workspace. Record exact evidence in the QA document.

- [ ] **Step 5: Update durable documentation**

Mark the brainstorm implemented only after all required checks pass. Extend the Form README with a short link to the Profiles adapter; do not rewrite the 1:1 baseline files.

- [ ] **Step 6: Audit and commit**

Run `git diff --check`, inspect `git diff`, confirm the five imported Form source files still match their baseline, and commit only intentional documentation/verification changes:

```powershell
git commit -m "docs(e2e): record profile form verification"
```
