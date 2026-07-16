# E2E Profile Current-Step Mocking

Date: 2026-07-14

## Context

The E2E profile form in `$HOME/Documents/Programming/mihc/nextjs/` renders
the shared EnrollMate contract through the client-side form controller. The
contract in
`$HOME/Documents/Programming/mihc/packages/enrollmate-contract/` owns the
field definitions, inline options, reusable options, and dependent location
and program options. The form already has utilities for conditional visibility,
dependent option resolution, and stale-value cleanup.

The requested feature is an obvious UI action that auto-mocks valid details for
the current Create E2E profile step. It must fill only the current step, remain
separate from saving/final submission, use real contract options, and avoid the
separate checkbox-layout task.

## Clarification

The initial design question was whether the action should overwrite existing
values or only fill empty fields. The decision is to fill only empty values and
preserve all existing values, including `false` checkbox values.

The user also confirmed that Faker may be used if it materially simplifies the
implementation. Repository inspection found no existing Faker or mock-data
dependency. The design therefore keeps scalar mock data local; adding Faker
would not solve option/dependency correctness and would add an unnecessary
dependency and lockfile change.

## Options considered

### 1. Contract-driven feature utility — selected

Add a pure utility in the E2E feature that receives the active flow/step,
current values, and approved fixtures. It fills empty visible fields in
dependency-aware passes. Choice fields use the current field options or the
resolved dependent options from the shared contract. The controller applies
the returned values one field at a time with normal TanStack Form updates.

This keeps contract interpretation close to the UI feature, is straightforward
to unit test, and preserves existing field listeners and dependent state
updates.

### 2. Extend the shared contract fixture builder

Reuse `createEnrollmateFixture` from the shared package and add step-scoped
behavior. This was rejected because it would mix browser/UI mock behavior into
the shared contract testing package and would not itself perform normal form
state updates.

### 3. Set a generated step object in one form update

Generate a complete object and assign it to the form at once. This was rejected
because it can bypass per-field listeners and make dependency cleanup/order
behavior less explicit.

## Approved design

### Generator behavior

Create a focused E2E utility that:

- treats only `""`, `undefined`, and `null` as empty;
- preserves every non-empty current-step value;
- includes empty core profile fields when the active step is step 1;
- fills visible fields and skips hidden or parent-disabled fields;
- processes fields in repeated passes so a parent selected earlier or later in
  the definition can unlock its dependent child;
- chooses inline/reusable options from `field.options`;
- chooses dependent options only from
  `field.optionsByDependency[currentParentValue]`;
- supplies valid local scalar values for text, email, telephone, date, and
  free-entry fields;
- uses the first approved fixture compatible with a file field when one is
  available, otherwise leaves an optional file empty; and
- does not invent select values or mutate the shared definition.

The generator returns values to apply, not a replacement form object.

### Form integration

Add a `Mock current step` action to the existing form action area. It is shown
for data-bearing steps and hidden on the confirmation step. The controller
invokes the generator and calls `form.setFieldValue` separately for each
generated field without disabling listeners or validation state updates.

The action does not call `saveDraft`, `finalize`, or mark fields pristine. It
clears stale form error presentation after filling and leaves the form dirty so
the existing save controls remain the only persistence path.

### Testing

Focused tests will cover:

1. generated values passing the real EnrollMate step validators for both flows;
2. generated inline and dependent select values belonging to their actual
   contract-resolved option lists;
3. non-empty values remaining unchanged; and
4. the UI action changing fields without invoking draft save or finalization.

No checkbox renderer, checkbox styling, or checkbox layout changes are part of
this feature.

## Scope and tradeoffs

The feature uses deterministic local scalar examples instead of adding Faker.
This minimizes dependencies and keeps tests stable while the shared contract
continues to own all choice validity. The action fills optional visible scalar
fields when they are empty, which may reveal additional conditional fields; the
multi-pass generator handles those fields without overwriting user input.

No backend, persistence, contract-definition, or Playwright browser-suite
changes are required.

## Open questions

None. The design is approved for implementation.

## Amendment: random mock modes and explicit confirmation

Date: 2026-07-14

The first implementation added one immediate fill-empty action. The follow-up
requirement adds variability, unique generated identity data, and two explicit
mock strategies. Clicking `Mock current step` will now open a confirmation
dialog with `Cancel`, `Fill all fields`, and `Random partial fill` actions.

### Fill all fields

This mode overwrites every current-step field with a newly generated coherent
value. It also includes step-one core fields. Checkbox values are randomized,
with required checkbox groups guaranteed to have at least one selected value.

### Random partial fill

This mode selects a random subset of fields while preserving the rest. Required
fields are always included, and checkbox values may be randomly selected. If a
selected value makes a conditional field visible, the generator fills the
newly visible field and continues through its dependency chain until the active
step validates.

### Unique identity and variability

Use `@faker-js/faker` for coherent names, dates, phone numbers, text, and
random decisions. Generated core and EnrollMate email values share the same
identity and include a UUID-like random suffix under `example.com`, avoiding
the fixed-email conflict without coupling the mock action to persistence or
final submission.

All select and combobox values continue to come from the shared contract’s
resolved options. Parent values are selected before dependent values, including
province → municipality → barangay and major → specialization chains.

### UI and tests

The action bar owns the confirmation dialog and passes the selected mode to the
controller. The controller applies generated fields individually through normal
form updates. Focused tests will cover dialog cancellation/mode selection,
unique email variability, full-mode coverage, partial-mode validity, random
checkbox conditional expansion, and dependent option compliance.
