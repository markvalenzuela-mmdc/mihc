# E2E Profile Form

**Status:** Implemented — automated verification complete; database and manual QA remain blocked as recorded in `docs/plans/2026-07-13-e2e-profile-form-qa.md`

## July 13 code-structure rewrite

The first implementation placed unrelated responsibilities into four broad
modules. The rewrite preserves the existing form behavior and component-facing
contracts while replacing those modules with cohesive use-case boundaries.
Direct Drizzle access remains in services; this feature will not introduce a
repository layer.

### Scope

- Do not edit files under `nextjs/feature/e2e/components/`.
- Preserve the EnrollMate package as the source of truth.
- Preserve current create, edit, finalize, fixture, and editor behavior unless
  a test demonstrates that the behavior is accidental.
- Delete superseded modules after every consumer has migrated.
- Avoid one-function files and speculative shared abstractions.

### Module boundaries

- `actions/e2e-profile-form.action.ts` owns authentication, raw action-input
  parsing, one use-case service call, path revalidation, and action-result
  mapping. A shared local mapper replaces duplicated catch ladders.
- `services/e2e-profile-draft.service.ts` owns step validation and the create
  and edit draft transactions. Create and edit remain separate internal flows
  so their persistence rules are readable without mode-heavy branching.
- `services/e2e-profile-form-finalization.service.ts` locks, validates, and
  finalizes a complete stored form.
- `services/e2e-profile-form-editor.service.ts` loads the editor read model and
  approved fixture metadata.
- `services/e2e-profile-fixtures.service.ts` performs only approved fixture
  discovery and metadata construction.
- `errors/e2e-profile-form.error.ts` defines one typed form-domain error and
  explicit error codes for expected failures.
- `schema/e2e-profile-form.schema.ts` contains Zod input contracts only.
- `types/e2e-profile-form.types.ts` contains action results, service inputs,
  and editor DTOs without runtime logic.
- Pure visibility, option, default-value, and stale-value helpers move out of
  `config/e2e-profile-form.config.ts` into a focused utility.
- Mapping EnrollMate definitions into editor step DTOs moves into a serializer.
  The misleading config module is then deleted.

### Data and error flow

Actions authenticate and parse raw inputs before calling one service. Draft
services validate the core fields and active step before persistence. Editing
replaces values owned by the submitted step and preserves data belonging to
other steps. Finalization validates the stored document against the current
definition and hash. The editor service combines the stored aggregate, current
definition, serialized steps, and fixture catalog.

Expected service failures use explicit codes for not-found, email-conflict,
flow-conflict, and definition-conflict cases. Actions translate these and Zod
issues into the existing action-result contract. Unexpected failures are logged
once and return the existing retry-safe message.

### Verification

Update tests only where imports or intentionally improved module contracts move.
Run the focused action, fixture, definition-helper, and persistence tests first,
then the affected TypeScript and lint checks. Finish by reviewing the complete
diff to confirm component files and unrelated user-owned changes are untouched.

## Profile form page rewrite

`e2e-profile-form-page.tsx` remains a single file. The rewrite must not move
its behavior into new hooks, utilities, or component modules. Instead, the file
is organized from low-level pure helpers to small internal render components,
one internal form-controller hook, and finally the exported page composition.

The rewrite will:

- consume the current server-action result contract (`ok` plus `data` or
  `error`) instead of the removed `kind`, `fieldErrors`, and `message` fields;
- keep default-value creation, active-step resolution, payload construction,
  action-error narrowing, and invalid-field ordering in named pure helpers;
- keep active-step rendering and the server-error alert in small internal
  components;
- keep form initialization, flow switching, query-string step state,
  pending/error state, submission intent, navigation, and unsaved-change
  protection in one internal controller hook;
- reduce `ProfileFormPage` to composition without changing its props, visual
  output, server behavior, or existing child-component contracts;
- update component tests to the current action-result contract and preserve all
  existing user-visible behavior.

## Context

The E2E Testing page lists profiles and opens a read-only workspace containing
run controls, run history, and enrollment data. Profiles and their EnrollMate
form payloads are currently created through seeds rather than through the
application UI.

The repository now contains a direct copy of a TanStack Form architecture under
`nextjs/components/blocks/Form/`. Its five source files remain an unchanged
baseline. The block provides TanStack form contexts, registered text, textarea,
and select controls, shared Zod options, and React server-action validation. Its
included schema and action are demonstration-specific and cannot directly model
the definition-driven EnrollMate form.

The shared `@mihc/enrollmate-contract` package remains the source of truth for
flow steps, sections, fields, conditions, options, upload constraints, and
full-flow validation. A profile owns one canonical flow and one JSONB form.

## Goals

- Let users create and edit E2E profiles through one shared form experience.
- Expose core profile identity and the selected EnrollMate application.
- Render the EnrollMate form from the shared contract instead of duplicating
  field definitions in Next.js.
- Save completed wizard steps as drafts so long forms do not need to be entered
  in one session.
- Require complete contract validation before a profile can be used for E2E
  runs.
- Preserve the imported TanStack Form block as an unchanged reference baseline.

## Non-goals

- Do not edit operational profile data in this first version.
- Do not let users directly change workflow `status`.
- Do not change a profile's flow after creation.
- Do not migrate deprecated forms to a current definition.
- Do not add application-managed file storage.
- Do not integrate external school or address option APIs.
- Do not modify the five imported Form block source files.

## User experience

The profile editor uses dedicated full-page routes:

```text
/e2e-testing/profiles/new
/e2e-testing/profiles/[profileId]/edit
```

The profiles table exposes a **New profile** action. The existing profile
workspace exposes an **Edit profile** action. Both routes use the same form
composition.

Creation starts with these user-managed core fields:

- name;
- optional middle name;
- unique email;
- flow type (`bachelors` or `microcredentials`).

The profile status and audit columns remain system-managed. On edit, the flow
type is displayed but locked.

The selected flow is rendered as a wizard that follows the contract's ordered
steps and sections. The page contains a profile header, step progress, one
active contract step, and navigation actions. Sections show their contract
label, description, and notes when present.

The actions behave as follows:

- **Previous** changes the visible step without saving.
- **Save and continue** validates and saves the active step, then advances.
- **Save draft and exit** validates and saves the active step, then returns to
  E2E Testing.
- **Validate and finish** saves the final step, validates the full form, and
  returns to the profile workspace.

The editor warns before abandoning unsaved changes. Validation messages appear
beside fields and in a step summary that focuses the first invalid control.
Loading, saving, success, conflict, and server-error states must be explicit.

## Architecture

Keep the imported block and the Profiles feature separated:

```text
nextjs/components/blocks/Form/
  unchanged TanStack Form baseline

nextjs/feature/e2e/
  core profile schema
  EnrollMate definition adapter
  profile-specific controls
  wizard and section components
  create/edit composition
  server actions and persistence service
```

The feature reuses the block's `useAppForm`, `withForm`, form contexts, and
registered controls where they fit. It does not use the demonstration-specific
`useGenerateForm`, schema, or submit action for Profiles. EnrollMate-specific
controls and behavior remain inside the E2E feature rather than expanding the
unchanged baseline.

The main UI boundary is:

```text
profile-form-page
├── profile-form-header
├── profile-form-progress
├── profile-core-fields
├── enrollmate-step-form
│   ├── enrollmate-section
│   └── enrollmate-field-renderer
│       ├── text/date/tel/textarea
│       ├── select/checkbox/combobox
│       └── fixture-picker
└── profile-form-actions
```

The field renderer must exhaustively handle every `EnrollmateFieldType` so a
new unsupported type fails during development instead of silently rendering an
incorrect control.

## Field behavior

Text, email, telephone, date, and textarea fields use their corresponding
semantic controls. Captured inline, reusable, and dependent options use select
or searchable combobox controls as appropriate.

External and cascade option sources do not currently contain a complete local
catalog. They use searchable comboboxes that accept a custom string. This keeps
the stored value compatible with Playwright while allowing API-backed
suggestions to be added later without changing the JSONB shape.

Conditional fields derive visibility from `conditionalOn`. When a parent value
hides a child field, the child value is removed because the contract rejects
values submitted for hidden fields. Dependent options are recomputed when their
parent changes, and an incompatible selected child value is cleared.

File controls use a server-provided catalog of approved repository-managed E2E
fixtures. Selecting a fixture stores the contract's existing metadata shape:

```text
fixtureUri, filename, mimeType, sizeBytes
```

The browser does not upload or persist file contents.

## Validation contract

Final submission continues to use `getEnrollmateValidator(flowType)` against
the complete merged document.

Draft saving needs validation scoped to one contract step because the full
validator correctly rejects an incomplete flow. Extend the shared package with
a public step-validator API such as:

```ts
getEnrollmateStepValidator(flowType, stepNumber)
```

The step validator must derive from the same normalized definition and apply
field types, captured option values, conditional rules, dependent options, and
file constraints for the active step. It must not introduce a second field or
option definition under Next.js.

Client validation improves feedback, but the server action is authoritative.
Every draft and final submission is validated again on the server.

## Persistence

The first successful creation step creates the `profiles` and `profile_forms`
rows in one transaction. The profile form records the current definition hash
and the validated step data. Subsequent step saves merge validated values into
the existing JSONB document without discarding values from other steps.

Edit loads the profile and its singular form as one aggregate. Server writes
must verify that:

- the profile exists;
- the submitted flow matches the profile's locked flow;
- the stored definition hash matches the current definition;
- the submitted step belongs to that flow;
- the user is authorized to modify the profile;
- the email uniqueness constraint is reported as a field-level conflict.

Saving a draft does not update workflow status. Incomplete forms remain
`invalid` through the existing derived form state and cannot start runs. A
successful full validation makes the form `active` without storing a duplicate
active flag.

Deprecated forms remain readable in the workspace but cannot be edited. The
application must not silently replace their definition hash or reinterpret old
data using the current contract.

## Error handling

Server actions return structured results that distinguish:

- field and step validation errors;
- duplicate email conflicts;
- missing profiles;
- locked-flow or definition-hash conflicts;
- authorization failures;
- unexpected persistence failures.

Expected errors stay in the form and preserve user input. Unexpected errors
use the application's standard error reporting and show a retry-safe message.
Submit and navigation actions are disabled while a save is pending.

## Accessibility and responsive behavior

Every control has an explicit label and associated description/error text.
Wizard navigation is keyboard accessible and exposes the current step. Error
summaries focus or link to invalid controls. The editor uses a single column on
narrow screens and may use multiple columns only for closely related short
fields at wider breakpoints.

## Verification

Unit coverage must verify:

- exhaustive definition-to-control mapping;
- flow-specific step construction;
- conditional visibility and stale-value clearing;
- dependent option recomputation and clearing;
- external/cascade free-entry values;
- fixture metadata selection;
- step and full-flow validation;
- structured server-action error mapping.

Service and database integration coverage must verify:

- transactional creation of one profile and one form;
- draft merging without losing other steps;
- shared create/edit behavior;
- locked flow enforcement;
- definition-hash conflict rejection;
- email uniqueness reporting;
- final activation through derived validation state;
- deprecated-form edit rejection.

Route/component coverage must verify create and edit loading, saving, invalid,
conflict, success, unsaved-change, and responsive states. Existing read-only
workspace and run gating tests must continue to pass.

## Approved decisions

- Create and edit share one form composition.
- The editor uses dedicated full-page routes.
- Users manage core profile fields and EnrollMate data, not operational data.
- Flow type is locked after creation.
- The UI is a contract-aligned step wizard.
- Completed steps persist as drafts.
- File fields select repository-managed E2E fixtures.
- External and cascade values use searchable free-entry comboboxes.
- The imported TanStack Form baseline remains unchanged.
