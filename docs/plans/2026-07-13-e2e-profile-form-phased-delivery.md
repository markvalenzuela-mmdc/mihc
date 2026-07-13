# E2E Profile Form Phased Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an EnrollMate-contract-driven E2E Profile creation wizard in a client-only first phase, then pair on focused backend services/actions and wire them through the same typed frontend boundary in Phase 2.

**Architecture:** Phase 1 reduces the shared Form block to its generic field and hook factory, adds contract-owned step validation, and builds the creation wizard under the final E2E feature folders with an in-memory async submission mock isolated in one disposable directory. Phase 2 keeps that UI intact, reviews user-authored backend contracts, deletes the mock boundary after replacing it with authenticated actions, and adds persisted draft resume/edit behavior through focused services.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, TanStack Form 1.33, Zod 4, nuqs, Base UI/shadcn, Vitest, Testing Library, pnpm 10/11 per project pin; Phase 2 adds Better Auth and Drizzle/PostgreSQL.

---

## Source documents and execution boundary

- Approved design: `docs/brainstorm/2026-07-13-e2e-profile-form-phased-delivery.md`
- Form usage: `nextjs/components/blocks/Form/README.md`
- Contract API: `packages/enrollmate-contract/README.md`
- Historical behavior source: `docs/plans/2026-07-13-e2e-profile-form.md`
- Final module conventions: `docs/plans/2026-07-13-e2e-profile-form-structure-rewrite.md`
- Final page convention: `docs/plans/2026-07-13-e2e-profile-form-page-rewrite.md`

Complete Tasks 1-8 for Phase 1. Stop at the Phase 2 pairing gate after Task 8.
Tasks 9-11 become executable only after the user presents or co-authors the
backend services/actions described there.

## Phase 1 file map

**Shared contract — modify:**

- `packages/enrollmate-contract/src/form-data.schema.ts` — active-step validator construction.
- `packages/enrollmate-contract/src/registry.ts` — cached step-validator lookup.
- `packages/enrollmate-contract/src/index.ts` — public step-validator export.
- `packages/enrollmate-contract/README.md` — document step-validation semantics.
- `playwright/server/__tests__/unit/enrollmate-contract.test.ts` — server-side package consumer tests.

**Form block — retain and modify:**

- `nextjs/components/blocks/Form/form-fields.block.tsx` — reusable registered fields; add semantic input support and keep string selects explicit.
- `nextjs/components/blocks/Form/use-form.hook.ts` — contexts plus `useAppForm`, `withForm`, and `useFieldContext` only.
- `nextjs/components/blocks/Form/README.md` — two-file boundary and E2E consumer link.

**Form block — delete:**

- `nextjs/components/blocks/Form/form-options.ts`
- `nextjs/components/blocks/Form/form-submit.action.ts`
- `nextjs/components/blocks/Form/form.schema.ts`

**E2E feature — create:**

- `nextjs/feature/e2e/schema/e2e-profile-form.schema.ts`
- `nextjs/feature/e2e/types/e2e-profile-form.types.ts`
- `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`
- `nextjs/feature/e2e/serializers/e2e-profile-form-editor.serializer.ts`
- `nextjs/feature/e2e/components/profile-form/e2e-profile-form-controls.tsx`
- `nextjs/feature/e2e/components/profile-form/enrollmate-field-renderer.tsx`
- `nextjs/feature/e2e/components/profile-form/enrollmate-section.tsx`
- `nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx`
- `nextjs/feature/e2e/components/profile-form/e2e-profile-core-fields.tsx`
- `nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx`
- `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- `nextjs/feature/e2e/mocks/e2e-profile-form.mock.ts`
- `nextjs/feature/e2e/mocks/README.md`
- `nextjs/app/e2e-testing/profiles/new/page.tsx`

**E2E feature — modify:**

- `nextjs/feature/e2e/components/profiles/e2e-testing-profiles-table.tsx` — add the creation entry point.
- `nextjs/package.json` and `nextjs/pnpm-lock.yaml` — remove `@tanstack/react-form-nextjs` if no remaining import exists.

**Phase 1 tests — create:**

- `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`
- `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`
- `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`
- `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx`

## Phase 2 final file map

```text
nextjs/feature/e2e/
  actions/e2e-profile-form.action.ts
  components/profile-form/*
  errors/e2e-profile-form.error.ts
  schema/e2e-profile-form.schema.ts
  serializers/e2e-profile-form-editor.serializer.ts
  services/e2e-profile-draft.service.ts
  services/e2e-profile-form-editor.service.ts
  services/e2e-profile-form-finalization.service.ts
  services/e2e-profile-fixtures.service.ts
  types/e2e-profile-form.types.ts
  utils/e2e-profile-form.util.ts
```

The Phase 1 `mocks/` directory is intentionally absent from this final map.
Phase 2 deletes it as a unit; no mock file is promoted into another feature
folder.

Do not create `config/e2e-profile-form.config.ts`, the broad
`services/e2e-profile-form.service.ts`, separate error classes per failure, a
repository layer, barrel exports, or page-only hook/utility files.

---

## Phase 1 — client-only creation UX

### Task 1: Add contract-owned step validation

**Files:**

- Modify: `packages/enrollmate-contract/src/form-data.schema.ts`
- Modify: `packages/enrollmate-contract/src/registry.ts`
- Modify: `packages/enrollmate-contract/src/index.ts`
- Modify: `packages/enrollmate-contract/README.md`
- Test: `playwright/server/__tests__/unit/enrollmate-contract.test.ts`

- [ ] **Step 1: Add failing package-consumer tests**

Extend the Node unit test to prove that an active step accepts a valid partial
flow, rejects an invalid captured option, can inspect earlier dependency values,
does not require later steps, and rejects an unknown step.

```ts
import {
  getEnrollmateFlowDefinition,
  getEnrollmateStepValidator,
} from "@mihc/enrollmate-contract";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";

test("validates only the selected EnrollMate step", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const step = flow.steps[0]!;
  const fixture = createEnrollmateFixture("bachelors", {
    resolveField: (field) => {
      if (field.type === "email") return "applicant@example.edu";
      if (field.type === "date") return "2000-01-01";
      if (field.type === "tel") return "09170000000";
      if (["text", "textarea", "combobox"].includes(field.type)) {
        return "Example value";
      }
      if (field.type === "select" && field.options.length === 0) {
        return "Example value";
      }
      return undefined;
    },
  });
  const activeNames = new Set(
    step.sections.flatMap((section) =>
      section.fields.map((field) => field.name),
    ),
  );
  const partial = Object.fromEntries(
    Object.entries(fixture).filter(([name]) => activeNames.has(name)),
  );

  assert.equal(
    getEnrollmateStepValidator("bachelors", step.step).safeParse(partial)
      .success,
    true,
  );
});

test("rejects an unknown EnrollMate step", () => {
  assert.throws(
    () => getEnrollmateStepValidator("bachelors", 99),
    /Unknown bachelors step: 99/,
  );
});
```

For dependent/conditional coverage, locate the captured field from the normalized
definition rather than copying its options into the test. Mutate its value to a
string absent from `field.options` or the selected dependency bucket and assert
the issue path equals the field name.

- [ ] **Step 2: Run the server unit test and confirm failure**

Run:

```powershell
pnpm --dir playwright test:unit
```

Expected: FAIL because `getEnrollmateStepValidator` is not exported.

- [ ] **Step 3: Generalize validator construction without changing full-flow behavior**

Refactor the current field loop into a helper that receives all flow fields and
the fields being validated. For a step validator, active fields
use `fieldSchema(field)` and all other known flow fields use
`z.unknown().optional()` so earlier values remain available to conditional and
dependent checks without later fields becoming required.

Extract the current dependent-option refinement into
`validateDependentOption(field, data, context)` so full and step validators use
the same implementation.

```ts
function buildFieldSetValidator(
  allFields: EnrollmateField[],
  validatedFields: EnrollmateField[],
) {
  const validatedNames = new Set(validatedFields.map((field) => field.name));
  const schema = z.object(
    Object.fromEntries(
      allFields.map((field) => [
        field.name,
        validatedNames.has(field.name)
          ? fieldSchema(field)
          : z.unknown().optional(),
      ]),
    ),
  ).strict();

  return schema.superRefine((data, context) => {
    for (const field of validatedFields) {
      validateConditionalField(field, data, context);
      validateDependentOption(field, data, context);
    }
  });
}
```

Keep `buildEnrollmateValidator(flow)` strict and behaviorally identical by
passing all flow fields as both arguments. Add:

```ts
export function buildEnrollmateStepValidator(
  flow: EnrollmateFlowDefinition,
  step: EnrollmateStep,
) {
  const allFields = flow.steps.flatMap((candidate) =>
    candidate.sections.flatMap((section) => section.fields),
  );
  const stepFields = step.sections.flatMap((section) => section.fields);
  return buildFieldSetValidator(allFields, stepFields);
}
```

- [ ] **Step 4: Cache and export step validators**

In `registry.ts`, build validators once per flow/step and expose:

```ts
export function getEnrollmateStepValidator(
  flowType: EnrollmateFlowType,
  stepNumber: number,
) {
  const validator = stepValidators[flowType].get(stepNumber);
  if (!validator) throw new Error(`Unknown ${flowType} step: ${stepNumber}`);
  return validator;
}
```

Export it from `src/index.ts`. Document that callers pass the current EnrollMate
value record, then separately extract active-step keys for persistence.

- [ ] **Step 5: Verify both package consumers**

Run:

```powershell
pnpm --dir playwright test:unit
pnpm --dir playwright typecheck
pnpm --dir nextjs exec tsc --noEmit
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit the contract API**

```powershell
git add packages/enrollmate-contract playwright/server/__tests__/unit/enrollmate-contract.test.ts
git commit -m "feat(enrollmate): add step validators"
```

### Task 2: Reduce the Form block to reusable infrastructure

**Files:**

- Modify: `nextjs/components/blocks/Form/form-fields.block.tsx`
- Modify: `nextjs/components/blocks/Form/use-form.hook.ts`
- Modify: `nextjs/components/blocks/Form/README.md`
- Delete: `nextjs/components/blocks/Form/form-options.ts`
- Delete: `nextjs/components/blocks/Form/form-submit.action.ts`
- Delete: `nextjs/components/blocks/Form/form.schema.ts`
- Modify: `nextjs/package.json`
- Modify: `nextjs/pnpm-lock.yaml`

- [ ] **Step 1: Strip the example-specific hook path**

Keep `createFormHookContexts()` and `createFormHook()` registration. Remove
`mergeForm`, `initialFormState`, `useTransform`, `useActionState`,
`generateFormOptions`, `formSubmit`, `FormInput`, and `useGenerateForm`.

The resulting public surface is:

```ts
export const { fieldContext, formContext, useFieldContext } =
  createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FormField,
    FormTextInput,
    FormTextarea,
    FormSelect,
  },
  formComponents: {},
});
```

- [ ] **Step 2: Make the registered controls sufficient for semantic fields**

Allow `FormTextInput` to forward the narrow input props required by the
contract renderer (`type`, `inputMode`, `autoComplete`, `placeholder`, and
`className`). Constrain `FormSelect` values to strings because the implementation
uses `useFieldContext<string>()`. Do not add E2E-specific controls to the block.

- [ ] **Step 3: Remove demo files and unused dependency with pnpm**

Delete the three example files. Confirm there are no remaining
`@tanstack/react-form-nextjs` imports, then run:

```powershell
pnpm --dir nextjs remove @tanstack/react-form-nextjs
```

Do not use npm and do not manually edit the lockfile.

- [ ] **Step 4: Rewrite the block README boundary**

Document only the two reusable source files, show a feature-local
`formOptions`/schema example, remove the preserved-five-file language, and link
to `@/feature/e2e/components/profile-form/e2e-profile-form-page` only after that
consumer exists.

- [ ] **Step 5: Verify and commit the block correction**

Run:

```powershell
rg -n "useGenerateForm|form-submit.action|form-options|form.schema|@tanstack/react-form-nextjs" nextjs
pnpm --dir nextjs exec tsc --noEmit
pnpm --dir nextjs lint
```

Expected: the search returns no production matches; TypeScript exits 0; lint
has no new warnings beyond the recorded baseline.

```powershell
git add nextjs/components/blocks/Form nextjs/package.json nextjs/pnpm-lock.yaml
git commit -m "refactor(forms): keep reusable form primitives"
```

### Task 3: Define the E2E form model and contract adapters

**Files:**

- Create: `nextjs/feature/e2e/schema/e2e-profile-form.schema.ts`
- Create: `nextjs/feature/e2e/types/e2e-profile-form.types.ts`
- Create: `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`
- Create: `nextjs/feature/e2e/serializers/e2e-profile-form-editor.serializer.ts`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

- [ ] **Step 1: Write failing pure-behavior tests**

Cover:

```ts
expect(getDefaultE2eProfileFormValues(bachelors).programFocus).toBe("");
expect(isEnrollmateFieldVisible(lastschOther, {
  schoolNotFound: true,
})).toBe(true);
expect(clearUnavailableE2eProfileFormValues(bachelors, {
  schoolNotFound: false,
  lastschOther: "Old school",
})).not.toHaveProperty("lastschOther");
expect(getEnrollmateFieldOptions(programApplied, {
  programFocus: "BS Information Technology",
})).toContainEqual(expect.objectContaining({ value: expect.any(String) }));
expect(extractE2eProfileStepValues(bachelors.steps[0]!, values))
  .not.toHaveProperty("parentFirstName");
```

Also assert serialized steps preserve order, produce stable section IDs, and
retain field objects/options from the contract rather than copied fixtures.

- [ ] **Step 2: Run the focused test and confirm failure**

```powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Add core schemas and typed frontend/backend seam**

Define only feature-owned inputs in the schema file:

```ts
export const e2eProfileCoreSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  middleName: z.string().trim().optional(),
  email: z.email("Enter a valid email address."),
  flowType: z.enum(["bachelors", "microcredentials"]),
});
```

Define runtime-free contracts in the types file:

```ts
export type E2eProfileFormIntent =
  | "save-and-continue"
  | "save-and-exit"
  | "finalize";

export type E2eProfileFormValues = {
  core: E2eProfileCoreInput;
  enrollmate: Record<string, unknown>;
};

type SaveE2eProfileDraftBase = {
  core: E2eProfileCoreInput;
  stepNumber: number;
  stepData: Record<string, unknown>;
};

export type SaveE2eProfileDraftInput =
  | (SaveE2eProfileDraftBase & { mode: "create"; profileId?: never })
  | (SaveE2eProfileDraftBase & { mode: "edit"; profileId: string });

export type E2eProfileFormFieldErrors = Record<string, string[]>;
export type E2eProfileFormActionError =
  | E2eProfileFormFieldErrors
  | "notFound"
  | "emailConflict"
  | "flowConflict"
  | "definitionConflict"
  | "forbidden"
  | "unexpected";

export type SaveE2eProfileDraftResult =
  | { ok: true; data: { profileId: string; nextStep: number | null } }
  | { ok: false; error: E2eProfileFormActionError };

export type FinalizeE2eProfileFormInput = {
  profileId: string;
  core: E2eProfileCoreInput;
  enrollmateData: Record<string, unknown>;
};

export type FinalizeE2eProfileFormResult =
  | { ok: true; data: { profileId: string } }
  | { ok: false; error: E2eProfileFormActionError };

export type E2eProfileFixture = {
  fixtureUri: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type SaveE2eProfileDraft = (
  input: SaveE2eProfileDraftInput,
) => Promise<SaveE2eProfileDraftResult>;

export type FinalizeE2eProfileForm = (
  input: FinalizeE2eProfileFormInput,
) => Promise<FinalizeE2eProfileFormResult>;
```

Add the editor section/step DTOs beside these boundary types. Do not add
persistence logic or Drizzle types.

- [ ] **Step 4: Implement pure contract helpers**

Implement:

```ts
getDefaultE2eProfileFormValues(flow)
isEnrollmateFieldVisible(field, values)
getEnrollmateFieldOptions(field, values)
clearUnavailableE2eProfileFormValues(flow, values)
extractE2eProfileStepValues(step, values)
```

Defaults follow contract `defaultValue`/`placeholderValue`; otherwise use
`false` for checkboxes, `undefined` for file fields, and `""` for string fields.
Clearing returns a new record, removes hidden values, and clears a dependent
selection absent from the recomputed options.

- [ ] **Step 5: Implement the editor serializer**

`serializeE2eProfileFormEditorSteps(flow)` maps ordered contract steps and adds
stable section IDs using `section.prefix` when present, otherwise
`step-${step.step}-section-${sectionIndex + 1}`. It does not transform or clone
field definitions into a second schema.

- [ ] **Step 6: Verify and commit the form model**

Run the focused test and TypeScript; expect both to pass.

```powershell
git add nextjs/feature/e2e/schema nextjs/feature/e2e/types nextjs/feature/e2e/utils nextjs/feature/e2e/serializers nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts
git commit -m "feat(e2e): define profile form model"
```

### Task 4: Build contract-driven controls and renderer

**Files:**

- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-controls.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/enrollmate-field-renderer.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/enrollmate-section.tsx`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

Render representative fields obtained from `getEnrollmateFlowDefinition`; do
not recreate field definitions in tests. Assert:

- email, telephone, and date use semantic input types;
- captured options render from `field.options`;
- dependent options change with the parent value;
- external/cascade comboboxes accept free-entry strings;
- checkbox state is boolean;
- fixture selection produces `fixtureUri`, `filename`, `mimeType`, and
  `sizeBytes`;
- hidden fields are absent;
- labels/descriptions/errors are associated; and
- every `EnrollmateFieldType` is covered.

- [ ] **Step 2: Run the focused test and confirm failure**

```powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
```

- [ ] **Step 3: Implement feature-local controls**

Use `useFieldContext<boolean>()` for checkbox,
`useFieldContext<string>()` for free-entry combobox, and
`useFieldContext<E2eProfileFixture | undefined>()` for fixtures. Reuse existing
`Checkbox`, `Combobox`, and `FieldDescription` primitives. Keep fixture data in
props; do not access the filesystem.

- [ ] **Step 4: Implement the exhaustive renderer**

Map fields as follows:

```text
text/email/tel/date -> field.FormTextInput
textarea            -> field.FormTextarea
select               -> field.FormSelect
combobox inline/reusable/dependent -> field.FormSelect or searchable combobox
combobox cascade/external          -> feature free-entry combobox
checkbox             -> feature checkbox
file                 -> feature fixture picker
```

Finish the switch with a compile-time assertion:

```ts
default: {
  const unsupported: never = field.type;
  throw new Error(`Unsupported EnrollMate field type: ${unsupported}`);
}
```

- [ ] **Step 5: Render sections without form-state ownership**

`EnrollmateSection` renders heading, description, notes, and ordered fields. It
receives values/options/fixtures needed by the renderer and does not own wizard
or submission state.

- [ ] **Step 6: Verify and commit the renderer**

Run the renderer test, targeted ESLint on the three source files/test, and
TypeScript. Expect no failures or new warnings.

```powershell
git add nextjs/feature/e2e/components/profile-form nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
git commit -m "feat(e2e): render contract profile fields"
```

### Task 5: Build wizard presentation components

**Files:**

- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-core-fields.tsx`
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx`
- Create: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Add failing presentation assertions to the page test**

Assert the creation view exposes core fields, flow choices, step labels,
`aria-current="step"`, Previous, Save and continue, Save draft and exit, and
Validate and finish on the zero-field confirmation step. Assert pending props
disable all action buttons.

- [ ] **Step 2: Implement progress**

Render an ordered list. Mark the active step with `aria-current="step"`, mark
validated steps visually from a `ReadonlySet<number>`, and do not allow jumping
ahead by clicking future steps.

- [ ] **Step 3: Implement core fields with `withForm`**

Export `e2eProfileFormOptions` from `e2e-profile-core-fields.tsx` beside the
`withForm` component. Its defaults have the nested
`E2eProfileFormValues` shape (`core` plus `enrollmate`) and start with the
Bachelor contract defaults. The page imports the same options and resets the
`enrollmate` record when the user changes flow before the first save. Use the
block's registered fields with names such as `core.name` and `core.email`.
Flow type is editable until the first mock draft succeeds, then displayed
disabled to mirror the Phase 2 locked-flow rule.

- [ ] **Step 4: Implement action presentation**

The actions component is render-only. It receives the current step, total
steps, pending state, and callbacks. The final zero-field confirmation step
shows **Validate and finish** instead of **Save and continue**.

- [ ] **Step 5: Run the focused test and commit**

Expected: presentation assertions pass; controller assertions may remain
failing until Task 6.

```powershell
git add nextjs/feature/e2e/components/profile-form nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
git commit -m "feat(e2e): add profile wizard presentation"
```

### Task 6: Implement the single-page controller and memory-only mock

**Files:**

- Create: `nextjs/feature/e2e/mocks/e2e-profile-form.mock.ts`
- Create: `nextjs/feature/e2e/mocks/README.md`
- Create: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Complete failing wizard behavior tests**

Cover both flows and these sequences:

1. invalid active step stays put and focuses the first error;
2. Save and continue extracts only step-owned keys, passes them to an injected
   `saveDraft`, and advances after its success result;
3. the first injected success stores the returned profile ID and locks flow;
4. Previous moves without invoking submit;
5. Save draft and exit validates then invokes the exit callback only on success;
6. confirmation validates the complete form before invoking finalize;
7. injected validation/server errors preserve values;
8. pending state prevents duplicate submission;
9. changing flow before first save clears incompatible values and returns to
   the first step; and
10. dirty state installs/removes the unload warning.

Pass `fixtures`, `saveDraft`, and `finalize` test doubles through the page props.
The tests must not import anything from `feature/e2e/mocks`; that directory must
remain deletable without rewriting the behavior suite.

- [ ] **Step 2: Create the disposable mock boundary**

Export one factory and the mock fixture metadata from
`e2e-profile-form.mock.ts`:

```ts
export const MOCK_E2E_PROFILE_FIXTURES: E2eProfileFixture[] = [
  {
    fixtureUri: "mock://enrollmate/sample.pdf",
    filename: "sample.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
  },
];

export function createInMemoryE2eProfileFormMock() {
  const steps = new Map<number, Record<string, unknown>>();
  const mockProfileId = "mock-e2e-profile";

  const saveDraft: SaveE2eProfileDraft = async (input) => {
    steps.set(input.stepNumber, structuredClone(input.stepData));

    return {
      ok: true,
      data: {
        profileId:
          input.mode === "edit" ? input.profileId : mockProfileId,
        nextStep: input.stepNumber + 1,
      },
    };
  };

  const finalize: FinalizeE2eProfileForm = async (input) => ({
    ok: true,
    data: { profileId: input.profileId },
  });

  return {
    fixtures: MOCK_E2E_PROFILE_FIXTURES,
    saveDraft,
    finalize,
    dispose: () => steps.clear(),
  };
}
```

This module is deliberately memory-only: refresh discards drafts, it performs
no I/O, and the closure-owned `Map` cannot escape the factory. Do not add a
mock/live flag, context provider, browser storage, API route, or server action.

- [ ] **Step 3: Document exactly how to remove the mock**

Create `mocks/README.md` with these sections:

1. **Purpose and lifetime** — Phase 1 UI scaffolding only; data lives until the
   creation page unmounts or reloads.
2. **Limitations** — no persistence, auth, conflict handling, or backend
   simulation guarantees.
3. **Allowed imports** — only
   `components/profile-form/e2e-profile-form-page.tsx` may import the mock;
   schemas, serializers, utilities, reusable controls, routes, and tests may
   not import it.
4. **Phase 2 removal** — pass real fixtures/actions as required page props,
   remove the fallback and cleanup effect, delete the complete `mocks/`
   directory, then run:

```powershell
rg "feature/e2e/mocks|createInMemoryE2eProfileFormMock|MOCK_E2E" nextjs
```

The removal is complete only when the command returns no matches and the
Phase 1 behavior tests still pass unchanged.

- [ ] **Step 4: Define injectable action-shaped props and defaults**

```ts
interface E2eProfileFormPageBaseProps {
  flows: Record<EnrollmateFlowType, E2eProfileFormEditorStep[]>;
  onExit?: (profileId: string) => void;
  onFinish?: (profileId: string) => void;
}

type E2eProfileFormPageProps = E2eProfileFormPageBaseProps &
  (
    | {
        fixtures: E2eProfileFixture[];
        saveDraft: SaveE2eProfileDraft;
        finalize: FinalizeE2eProfileForm;
      }
    | {
        fixtures?: never;
        saveDraft?: never;
        finalize?: never;
      }
  );
```

The union prevents partially mocked composition and preserves IntelliSense for
the complete live boundary. Lazily create one factory instance in a `useRef`
when all three boundary props are absent. Use its fixtures and handlers for the
mounted page lifetime. A cleanup-only `useEffect` calls `dispose()` on unmount;
this is the permitted external-resource cleanup case under the Effect Usage
Policy. Injected tests supply all three props and never depend on mock exports.

- [ ] **Step 5: Organize the page file according to the rewrite**

In one file, define page/controller types, pure helpers for combined defaults,
active-step lookup, Zod issue mapping, and first-error ordering; then small
internal error/step renderers; then one
`useE2eProfileFormController`; then `E2eProfileFormPage` composition.

Do not create `use-e2e-profile-form.ts`, a page utility, or a page config.

- [ ] **Step 6: Integrate TanStack and contract validation**

Create one `useAppForm` for the nested core plus dynamic EnrollMate values.
Before every forward/exit action, parse `form.state.values.core` with
`e2eProfileCoreSchema` and parse the active EnrollMate step:

```ts
const validation = getEnrollmateStepValidator(flowType, step.step)
  .safeParse(enrollmateValues);
```

Map issues into field metadata/error summary. On success, pass only
`extractE2eProfileStepValues(step, enrollmateValues)` to `saveDraft`. On the
confirmation step, run `getEnrollmateValidator(flowType)` against the complete
EnrollMate record before `finalize`.

- [ ] **Step 7: Add URL and dirty-navigation state**

Use `useQueryState("step", parseAsInteger.withDefault(1))` inside the controller
for stable back/refresh behavior. Clamp unknown step numbers to the selected
flow. Use a browser `beforeunload` subscription only while dirty; in-app exits
use the explicit action callbacks.

- [ ] **Step 8: Run tests and commit**

Run the page test, targeted lint, and TypeScript. Expect all to pass.

```powershell
git add nextjs/feature/e2e/mocks nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
git commit -m "feat(e2e): scaffold profile creation workflow"
```

### Task 7: Add the creation route and entry point

**Files:**

- Create: `nextjs/app/e2e-testing/profiles/new/page.tsx`
- Modify: `nextjs/feature/e2e/components/profiles/e2e-testing-profiles-table.tsx`
- Create: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx`

- [ ] **Step 1: Write failing navigation tests**

Assert the profiles section contains a **New profile** link to
`/e2e-testing/profiles/new`. Render the new page and assert both serialized
flows reach the client form. The client form obtains temporary fixtures from
its disposable fallback; the route and navigation test do not import mocks.

- [ ] **Step 2: Add the server route page**

Keep `page.tsx` a Server Component. Obtain both flow definitions from the
package root, serialize them, and pass serializable props to the client page.
Use `AppShell` and `MainShell`; do not mark the route file `"use client"`.

- [ ] **Step 3: Add the profiles-table entry point**

Use the existing Base UI render pattern:

```tsx
<Button render={<Link href="/e2e-testing/profiles/new" />}>
  New profile
</Button>
```

Place it in the profiles section header without changing table selection,
pagination, or workspace behavior.

- [ ] **Step 4: Run navigation and regression tests**

```powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx __tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx
pnpm --dir nextjs exec tsc --noEmit
```

- [ ] **Step 5: Commit the route**

```powershell
git add nextjs/app/e2e-testing/profiles/new/page.tsx nextjs/feature/e2e/components/profiles/e2e-testing-profiles-table.tsx nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx
git commit -m "feat(e2e): expose profile creation preview"
```

### Task 8: Complete Phase 1 verification and UX review

**Files:**

- Modify: `nextjs/components/blocks/Form/README.md`
- Modify: `docs/brainstorm/2026-07-13-e2e-profile-form-phased-delivery.md`
- Create: `docs/plans/2026-07-13-e2e-profile-form-phase-1-qa.md`

- [ ] **Step 1: Run focused automated checks**

```powershell
pnpm --dir playwright test:unit
pnpm --dir playwright typecheck
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form
pnpm --dir nextjs exec tsc --noEmit
pnpm --dir nextjs lint
```

Expected: tests and TypeScript pass; lint has no new warnings. Do not run
database tests for Phase 1.

- [ ] **Step 2: Run manual responsive UX review**

From `nextjs/`, run `pnpm dev` and verify:

- Bachelor and Microcredential flow switching;
- all steps including zero-field confirmation;
- captured, dependent, external, cascade, checkbox, and file controls;
- active-step errors and first-error focus;
- Previous, Save and continue, Save draft and exit, and finish mocks;
- flow lock after first mock save;
- dirty navigation warning;
- page unmount disposal of the memory-only mock;
- keyboard navigation; and
- narrow/mobile plus wide layouts.

Record observations and screenshots/paths in the QA document. UX changes found
during review require explicit user approval before modifying behavior.

- [ ] **Step 3: Update durable documentation**

Link the E2E consumer from the Form README. Mark only Phase 1 implemented in the
phased brainstorm after all automated checks and the user's UX review pass.
Keep Phase 2 pending.

- [ ] **Step 4: Audit the complete Phase 1 diff**

Run `git diff --check`, inspect `git diff main...HEAD`, confirm no contract
definitions/options were copied into Next.js, and confirm no actions, database
services, edit route, or browser persistence entered Phase 1.

Confirm the temporary import boundary and disposal guide:

```powershell
rg -n 'from "@/feature/e2e/mocks/e2e-profile-form.mock"' nextjs
Test-Path nextjs/feature/e2e/mocks/README.md
```

Expected: the import search returns only
`e2e-profile-form-page.tsx`; `Test-Path` returns `True`. Read the README once and
verify its Phase 2 removal command matches Task 10.

- [ ] **Step 5: Commit Phase 1 evidence**

```powershell
git add nextjs/components/blocks/Form/README.md docs/brainstorm/2026-07-13-e2e-profile-form-phased-delivery.md docs/plans/2026-07-13-e2e-profile-form-phase-1-qa.md
git commit -m "docs(e2e): record profile form phase one verification"
```

---

## Phase 2 pairing gate — backend services and action wiring

Do not start Task 9 automatically. The user will implement or pair on the
backend. At the start of the pairing session, inspect actual code and compare it
to the contracts below. Report mismatches before editing the backend.

### Required service signatures

```ts
export async function saveE2eProfileDraft(
  input: SaveE2eProfileDraftInput,
  db: DbExecutor = getDb(),
): Promise<{ profileId: string; nextStep: number | null }>;

export async function finalizeE2eProfileForm(
  input: FinalizeE2eProfileFormInput,
  db: DbExecutor = getDb(),
): Promise<{ profileId: string }>;

export async function getE2eProfileFormEditorData(
  profileId: string,
  db: DbExecutor = getDb(),
): Promise<E2eProfileFormEditorData>;

export function getApprovedE2eProfileFixtures(): E2eProfileFixture[];
```

### Required action signatures

```ts
export async function saveE2eProfileDraftAction(
  input: SaveE2eProfileDraftInput,
): Promise<SaveE2eProfileDraftResult>;

export async function finalizeE2eProfileFormAction(
  input: FinalizeE2eProfileFormInput,
): Promise<FinalizeE2eProfileFormResult>;
```

### Required domain failures

```ts
export enum E2eProfileFormErrorCode {
  NOT_FOUND = "notFound",
  EMAIL_CONFLICT = "emailConflict",
  FLOW_CONFLICT = "flowConflict",
  DEFINITION_CONFLICT = "definitionConflict",
}
```

Use one `E2eProfileFormError` carrying one code. Authentication failures remain
at the action boundary and map to `forbidden`.

### Task 9: Review the paired backend before wiring

**Files to inspect:**

- `nextjs/feature/e2e/actions/e2e-profile-form.action.ts`
- `nextjs/feature/e2e/errors/e2e-profile-form.error.ts`
- `nextjs/feature/e2e/services/e2e-profile-draft.service.ts`
- `nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts`
- `nextjs/feature/e2e/services/e2e-profile-form-editor.service.ts`
- `nextjs/feature/e2e/services/e2e-profile-fixtures.service.ts`

- [ ] **Step 1: Review service ownership**

Confirm draft service owns step validation and create/edit transactions;
finalization owns complete validation; editor service owns the read model;
fixture service owns approved metadata only. Reject a broad service containing
all four responsibilities.

- [ ] **Step 2: Review persistence invariants**

Confirm atomic profile/form creation, row locking for edit/finalize, locked flow,
definition hash checks, replacement of active-step-owned keys, preservation of
other steps, unique-email translation, normalized final data, and audit user
updates. Confirm no client-supplied operator ID is trusted.

- [ ] **Step 3: Review action orchestration**

Each action must authenticate, parse one typed input, call one public service,
revalidate affected paths, return `ok(data)`/`err(error)`, and map unexpected
errors once. If any contract differs, document the mismatch and agree on the
change with the user before wiring.

### Task 10: Replace mocks and add edit/resume

**Files:**

- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- Delete: `nextjs/feature/e2e/mocks/e2e-profile-form.mock.ts`
- Delete: `nextjs/feature/e2e/mocks/README.md`
- Create: `nextjs/app/e2e-testing/profiles/[profileId]/edit/page.tsx`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-info.tsx`
- Modify: Phase 1 page/navigation tests
- Add: focused action/service tests supplied by the paired backend work

- [ ] **Step 1: Inject real actions at the route boundary**

Pass `saveE2eProfileDraftAction` and `finalizeE2eProfileFormAction` through the
existing typed props together with real fixtures. Make `fixtures`, `saveDraft`,
and `finalize` required page props, remove mock-factory initialization and its
cleanup effect, and preserve the controller, validation, result handling, and
presentation.

- [ ] **Step 2: Delete and verify the temporary boundary**

Delete the complete `nextjs/feature/e2e/mocks/` directory after both creation
and edit composition provide the required live props. Then run:

```powershell
rg "feature/e2e/mocks|createInMemoryE2eProfileFormMock|MOCK_E2E" nextjs
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form
pnpm --dir nextjs exec tsc --noEmit
```

Expected: `rg` returns no matches, the unchanged Phase 1 behavior suite passes,
and TypeScript reports no missing boundary props.

- [ ] **Step 3: Use real fixtures and initial data**

New route loads approved fixtures. Edit route awaits `params`, calls
`getE2eProfileFormEditorData`, uses `notFound()` for missing profiles, and shows
a blocked state for deprecated/hash-conflicted data.

- [ ] **Step 4: Complete navigation**

Save and continue advances only after persisted success. Save draft and exit
redirects to `/e2e-testing`. Final submit saves the active step, then finalizes,
then redirects to the profile workspace. Add the workspace **Edit profile**
entry point and lock flow in edit mode.

- [ ] **Step 5: Run frontend and paired backend tests**

Run Phase 1 tests unchanged against real actions plus the focused action,
fixture, persistence, and editor tests created during pairing.

### Task 11: Verify persistence and finish Phase 2

- [ ] **Step 1: Run database integration coverage**

Verify atomic creation/rollback, draft merge/replacement, cross-step
preservation, email conflict, flow/hash conflict, final validation, deprecated
edit rejection, and derived active/invalid run gating.

- [ ] **Step 2: Run all project checks with pnpm**

Run Next.js unit/integration tests, TypeScript, and lint; run Playwright server
unit tests/typecheck without launching browser tests.

- [ ] **Step 3: Perform create/edit/resume manual QA**

Verify refresh/resume, all result states, dirty navigation, keyboard focus,
responsive layout, final workspace redirect, and that incomplete drafts cannot
start runs.

- [ ] **Step 4: Update the phased design and QA record**

Mark Phase 2 implemented only after automated checks, database tests, and user
pairing review pass. Preserve the historical plans as superseded records.
