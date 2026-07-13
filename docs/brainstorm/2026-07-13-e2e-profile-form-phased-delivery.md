# E2E Profile Form Phased Delivery

**Status:** Approved for implementation planning

## Context

The current branch contains the TanStack Form integration and older E2E
profile-form documents, but it does not contain the discarded profile-form
implementation described as complete in the older brainstorm. The original
implementation plan is backend-first and uses broad modules that were later
superseded by the structure and page rewrite plans.

This design keeps the useful product behavior from the original plan while
changing the delivery order:

1. build and iterate on the creation UI with client validation and typed mocks;
2. pair on backend services/actions, then replace the mocks without redesigning
   the frontend.

The old brainstorm and plans remain historical context. A new phased plan will
be the authoritative execution document.

## Correct Form block boundary

The reusable Form block consists of:

```text
nextjs/components/blocks/Form/
  form-fields.block.tsx
  use-form.hook.ts
  README.md
```

`form-fields.block.tsx` owns registered field presentation. The generic portion
of `use-form.hook.ts` owns TanStack contexts plus `useAppForm`, `withForm`, and
`useFieldContext`.

The following imported files are examples, not reusable block infrastructure:

```text
form.schema.ts
form-options.ts
form-submit.action.ts
```

Phase 1 removes those example files from the block. It also removes
`useGenerateForm` and its example-specific imports from `use-form.hook.ts`,
leaving the generic hook factory intact. The example responsibilities are
recreated for E2E Profiles under the feature's schema, types, and page
composition; the demo code is not moved byte-for-byte.

If `@tanstack/react-form-nextjs` becomes unused after removing the example
action bridge, Phase 1 removes that dependency with pnpm. Phase 2 may add it
back only if the agreed action design actually uses it.

## Authoritative sources

- `@mihc/enrollmate-contract` remains the only source of flow steps, sections,
  fields, inline/reusable/dependent options, conditional rules, field types,
  file constraints, and final validation.
- The E2E feature may derive UI state and editor DTOs from the contract but must
  not copy its definitions or option arrays.
- The Form block supplies TanStack contexts and registered shared controls. The
  E2E feature owns its schema, dynamic renderer, extra controls, page state,
  and submission contracts.

## Phase 1: creation UI and client-only behavior

### Scope

Phase 1 creates only:

```text
/e2e-testing/profiles/new
```

It adds the **New profile** entry point and a production-shaped creation wizard.
It does not add edit/resume routes, database access, authentication work,
server actions, Drizzle services, filesystem fixture discovery, or real draft
persistence.

The component contract must accept initial values and submission results in a
shape that Phase 2 can satisfy without restructuring the UI.

### UI structure

Use the final feature conventions from the rewrite plans:

```text
nextjs/feature/e2e/
  components/profile-form/
    e2e-profile-form-page.tsx
    e2e-profile-form-progress.tsx
    e2e-profile-core-fields.tsx
    e2e-profile-form-actions.tsx
    enrollmate-section.tsx
    enrollmate-field-renderer.tsx
    e2e-profile-form-controls.tsx
  mocks/
    e2e-profile-form.mock.ts
    README.md
  schema/
    e2e-profile-form.schema.ts
  serializers/
    e2e-profile-form-editor.serializer.ts
  types/
    e2e-profile-form.types.ts
  utils/
    e2e-profile-form.util.ts
```

Do not create a `config/` module. Runtime-free contracts live in `types/`, Zod
input contracts live in `schema/`, pure form-definition behavior lives in
`utils/`, and contract-to-editor mapping lives in `serializers/`.

`mocks/` is an explicitly temporary Phase 1 boundary, not part of the final
feature structure. No reusable component, schema, serializer, utility, or test
may import it. Only the creation composition may use its fallback handlers and
fixture metadata.

`e2e-profile-form-page.tsx` follows the page rewrite convention. It remains one
readable module ordered as:

1. explicit local page/controller types;
2. pure page helpers;
3. small internal render-only components;
4. one internal `useE2eProfileFormController` hook;
5. the exported page composition.

Do not extract page-only state into separate hooks or utility files. Sibling
components own reusable visual sections and controls only.

### Form composition

Use the block's `useAppForm`, `withForm`, registered controls, and field
contexts. Do not use `useGenerateForm`.

Core profile fields are:

- name;
- optional middle name;
- email;
- flow type (`bachelors` or `microcredentials`).

Selecting a flow loads its ordered contract definition. The wizard renders one
active contract step, preserving section labels, descriptions, notes, field
labels, descriptions, placeholders, and option order.

The renderer exhaustively handles every `EnrollmateFieldType`. Text, email,
telephone, date, textarea, and captured select controls reuse the Form block
where their value contracts fit. Checkbox, free-entry combobox, and fixture
picker controls remain feature-local and use `useFieldContext`.

External and cascade options use free-entry comboboxes. File fields use typed
in-memory fixture metadata in Phase 1 so their UX and contract value shape can
be reviewed without filesystem/backend work.

### Contract-derived step validation

The existing full validator correctly rejects incomplete flows, so Phase 1 adds
a step validator to the shared package rather than duplicating validation in
Next.js:

```ts
getEnrollmateStepValidator(flowType, stepNumber)
```

The validator is built from the selected step's contract fields. It accepts the
current full client value record so conditional and dependent fields can inspect
values captured by earlier steps, but it requires and validates only fields
owned by the active step. Non-step values are dependency context, not part of
the validated draft payload.

The UI obtains active-step field names from
`getEnrollmateFlowDefinition(flowType)`, extracts only those values for the
mock draft submission, and uses the step validator before moving forward or
exiting. Final submission uses the existing
`getEnrollmateValidator(flowType)` against the complete form.

### Client-only draft behavior

Phase 1 defines the future action inputs/results in
`e2e-profile-form.types.ts`. A temporary
`mocks/e2e-profile-form.mock.ts` module satisfies that seam with
`createInMemoryE2eProfileFormMock()`. The factory owns its draft `Map` in a
closure and returns typed `saveDraft`, `finalize`, and `dispose` functions plus
mock fixture metadata. `dispose()` clears all retained draft data.

The page creates one factory instance for its mounted lifetime and disposes it
on unmount. Tests inject typed handlers directly and do not import the mock.
Do not add `localStorage`, IndexedDB, API routes, or a fake server action.

Actions behave as follows:

- **Previous:** move backward without validation or saving; current TanStack
  values remain in memory.
- **Save and continue:** validate the active step, record its extracted payload
  in the in-memory mock draft, and advance only on mock success.
- **Save draft and exit:** validate the active step, record the mock draft, and
  execute the exit navigation only on mock success.
- **Validate and finish:** validate the active step, then validate the complete
  form, and execute the mock completion path only after both pass.

Drafts contain only validated steps. An incomplete or invalid active step stays
on screen and displays field/error-summary feedback.

The mock returns the same `ok` plus `data` or `error` result shape used by the
repository's server-action helpers. It provides a mock profile ID after the
first successful save so later steps exercise create-to-edit state transitions.

`mocks/README.md` documents the mock's purpose, memory lifetime, limitations,
allowed import boundary, and exact Phase 2 deletion steps. The permanent phased
plan repeats the deletion checklist so removing the temporary directory does
not remove the only disposal documentation.

### UX requirements

- One active step at a time with keyboard-accessible progress and
  `aria-current="step"`.
- One column on narrow screens; limited multi-column grouping for short related
  fields on wider screens.
- Explicit labels, descriptions, notes, field errors, and an error summary that
  focuses or links to the first invalid control.
- Pending state disables duplicate navigation/submission.
- Dirty-navigation protection covers browser exit and in-app navigation.
- Phase 1 includes loading/error/empty-safe rendering for malformed or missing
  contract data even though the checked-in contract is expected to be valid.

### Phase 1 verification

Automated coverage includes:

- shared step validation, captured/dependent options, conditions, and unknown
  step handling;
- contract-to-editor serialization;
- defaults, visibility, dependent options, and stale-value clearing;
- exhaustive field-type rendering and semantic controls;
- flow switching and value cleanup;
- Previous, Save and continue, Save draft and exit, and Validate and finish;
- step/full validation errors, focus behavior, pending state, dirty navigation,
  and create-route entry navigation;
- both Bachelor and Microcredential flows.

No database or action tests belong to Phase 1.

## Phase 2: pair-programmed backend and wiring

Phase 2 starts with a contract review between the frontend and the user-owned
backend implementation. The frontend must not silently reshape backend
services/actions. If an input, return type, transaction rule, or error case does
not satisfy the agreed contract, report it before wiring.

### Required services

The backend needs these focused use cases:

```text
services/e2e-profile-draft.service.ts
  saveE2eProfileDraft

services/e2e-profile-form-finalization.service.ts
  finalizeE2eProfileForm

services/e2e-profile-form-editor.service.ts
  getE2eProfileFormEditorData

services/e2e-profile-fixtures.service.ts
  getApprovedE2eProfileFixtures
```

`saveE2eProfileDraft` must support create and edit inputs while keeping their
transaction flows readable. It validates core data and the active contract
step, creates one profile plus one profile form atomically on first save,
returns the profile ID, locks and merges later step-owned values without losing
other steps, enforces locked flow and current definition hash, and translates
unique-email conflicts.

`finalizeE2eProfileForm` locks the aggregate, rejects missing/deprecated/hash-
conflicted forms, validates the complete stored document with the full contract
validator, persists normalized data, and updates audit ownership without
storing a duplicate active flag.

`getE2eProfileFormEditorData` loads the profile/form aggregate, verifies its
definition state, and returns core values, serialized contract steps, current
form data, and approved fixtures for edit/resume.

`getApprovedE2eProfileFixtures` performs server-only approved fixture discovery
and returns serializable `fixtureUri`, `filename`, `mimeType`, and `sizeBytes`
metadata. It does not expose arbitrary filesystem paths.

### Required actions

```text
actions/e2e-profile-form.action.ts
  saveE2eProfileDraftAction
  finalizeE2eProfileFormAction
```

Actions own authentication, raw input parsing, one service call, path
revalidation, and structured result mapping. They never trust an operator ID
from the client.

Action results use the repository convention:

```ts
{ ok: true, data: ... }
{ ok: false, error: ... }
```

Validation errors use a field-to-messages record. Expected domain failures cover
not found, email conflict, flow conflict, definition conflict, and forbidden.
Unexpected failures are logged once and return a retry-safe string.

The final-step UI sequence saves the validated active draft first, then calls
finalization. If finalization fails, the successfully saved draft remains
resumable.

### Final backend folders

Use the structure-rewrite boundaries from the beginning:

```text
nextjs/feature/e2e/
  actions/e2e-profile-form.action.ts
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

Use one typed `E2eProfileFormError` with explicit error codes. Do not create the
superseded broad `e2e-profile-form.service.ts`, four error classes, or
`config/e2e-profile-form.config.ts`.

### Phase 2 frontend wiring

- Supply the two real actions and real fixtures through the existing typed page
  props, then make those props required so no fallback remains.
- Delete the complete `nextjs/feature/e2e/mocks/` directory after the real
  boundary is wired.
- Require
  `rg "feature/e2e/mocks|createInMemoryE2eProfileFormMock|MOCK_E2E" nextjs`
  to return no matches before Phase 2 can finish.
- Preserve the Phase 1 form composition and result handling.
- Add `/e2e-testing/profiles/[profileId]/edit` for edit/resume.
- Load real fixture metadata through the editor service.
- Lock flow type after the first persisted save.
- Redirect Save draft and exit to E2E Testing after success.
- Redirect successful finalization to the profile workspace.
- Preserve user-entered values for expected action failures.

### Phase 2 verification

Add service/action/integration coverage for atomic creation, step replacement,
cross-step preservation, locked flow, definition conflicts, duplicate email,
final validation, derived active/invalid state, deprecated edit rejection,
authorization, fixture path safety, and structured error mapping. Re-run all
Phase 1 component tests against the real action boundary.

## Documentation strategy

Create a new phased implementation plan instead of rewriting the original plan
in place. Mark the original backend-first plan and both rewrite plans as
historical/superseded in the documentation map. Preserve them because they
explain rejected structure and behavior decisions.

The phased plan contains a fully executable Phase 1. Phase 2 contains the
agreed service/action contracts and a pairing checklist; its wiring tasks are
made executable only after the user supplies or co-authors the backend code.

## Rejected approaches

- Rewriting the original plan in place: loses history and obscures why its
  broad modules are no longer acceptable.
- Implementing backend before UI: prevents rapid UX iteration and repeats the
  delivery problem the user wants to avoid.
- Browser-persisted Phase 1 drafts: creates throwaway persistence and migration
  behavior.
- Inline page mocks: make temporary code harder to identify, test, and remove.
- A permanent mock/live strategy switch: adds runtime configuration after the
  mock's Phase 1 purpose ends.
- Duplicating field schemas/options in Next.js: violates the shared-contract
  boundary.
- Treating all five imported TypeScript files as the reusable Form block: keeps
  demo schema/action responsibilities in shared UI infrastructure.

## Approved decisions

- Phase 1 is creation-only, UI-first, and frontend-validated.
- Draft mocks are memory-only and use the future action result shape.
- All mock implementation and fixtures live in one disposable `mocks/`
  directory with a co-located removal guide and permanent Phase 2 checklist.
- Every forward/exit transition validates the active step.
- Persisted drafts in Phase 2 contain validated steps only.
- Finalization validates the active step and then the complete merged form.
- `@mihc/enrollmate-contract` remains the source of definitions, options, and
  validators.
- The reusable Form block is the field component file plus generic form-hook
  factory, not the imported example schema/options/action.
- Phase 2 is pair-programmed: the user owns backend implementation and the
  frontend wiring reviews its contracts rather than silently fixing them.
- Final folders follow the structure and page rewrite conventions from the
  beginning.
