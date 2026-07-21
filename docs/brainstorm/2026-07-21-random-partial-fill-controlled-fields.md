# Random Partial Fill Controlled Dynamic Fields

## Status

Approved final corrective design. This document supersedes the proposed
`flushSync` solution in
`2026-07-21-random-partial-fill-react-commit-sync.md` before that solution was
implemented.

## Corrected Reproduction

On Parent/Guardian Information:

1. set Father Living Status to `Living`;
2. set Mother Living Status to `Living`;
3. assign Guardian as `Others`; and
4. run Random partial fill.

Father and mother values appear immediately. Guardian values remain blank until
the user leaves and returns to the step.

## Evidence and Root Cause

Chrome DevTools established that generated guardian values exist in TanStack
Form state and in each mounted guardian field instance while the DOM remains
blank.

The corrected Testing Library workflow also reproduces the failure and reports
Base UI warnings for `FieldControl`, `Select`, and `Checkbox`: dynamically
revealed controls change from uncontrolled to controlled.

Conditional guardian fields are removed from the EnrollMate values while they
are hidden. When Guardian changes to `Others`, those fields mount with
`undefined`. Text and select controls therefore begin uncontrolled. Random
partial fill assigns strings or booleans afterward, but Base UI does not accept
that lifecycle transition, so the rendered control stays blank even though the
field store contains the generated value. Remounting works because the control
then starts with the generated value.

This evidence invalidates the prior `flushSync` proposal. Commit timing cannot
repair an invalid uncontrolled-to-controlled lifecycle.

## Desired Behavior

- Every dynamically revealed EnrollMate control starts controlled.
- Random partial values appear immediately without navigation.
- Hidden stale values continue to be removed from submission and validation
  state.
- Guardian availability, partial/full generation, cleanup, and dirty metadata
  remain unchanged.

## Approaches Considered

### 1. Supply an empty field default at dynamic registration

Pass the field definition's type-appropriate empty value as `defaultValue` to
each dynamic TanStack `AppField`:

- text, email, telephone, date, textarea, select, and combobox: `""`;
- checkbox: `false`; and
- file: `undefined`, with its existing control already normalizing the rendered
  value to `null`.

Advantages:

- makes the control lifecycle valid at the registration boundary;
- reuses `getEmptyEnrollmateFieldValue`;
- leaves hidden-value cleanup semantics unchanged;
- applies consistently to every conditional field; and
- requires no render effects, synchronization state, or remount.

This is the approved approach.

### 2. Preserve empty hidden fields in form values

Change cleanup so hidden fields remain present with empty values.

Rejected because it broadens the change into extraction and validation state
semantics that currently rely on unavailable fields being removed.

### 3. Keep conditional controls mounted

Render all fields and hide inactive ones visually.

Rejected because it increases the active DOM and accessibility complexity and
retains inactive field registrations unnecessarily.

## Design

The profile-form page already has each `EnrollmateField` definition at the
point where it registers `controller.form.AppField`. It will import
`getEmptyEnrollmateFieldValue` and pass the result as the field's
`defaultValue`.

The default initializes only a missing field value. Existing manual, generated,
or restored form values remain authoritative. No changes are made to input
components or to the shared EnrollMate contract.

The earlier `dontRunListeners` mock options are unrelated to the proven cause.
They will be removed as part of this correction so normal programmatic mock
updates follow the established form-listener path. No `flushSync` import or
transaction will be added.

## Coverage and Verification

The corrected page test remains the automated regression:

- Father `Living`;
- Mother `Living`;
- Guardian `Others`;
- Random partial fill; and
- immediate assertions for representative father, mother, and guardian
  controls without navigation.

Before the fix, the test fails on Guardian First name and emits Base UI
uncontrolled-to-controlled warnings. After the fix, it must pass without those
warnings.

Chrome DevTools verification must repeat the same sequence on a fresh form and
confirm that Guardian First name, relationship, birthdate, and address values
appear immediately. Console messages and Next.js runtime diagnostics must show
no new control-lifecycle or runtime errors.

Then run all profile-form tests, the full Next.js suite, TypeScript checking,
lint, and the final diff audit.

## Scope

In scope:

- dynamic EnrollMate field registration defaults;
- removal of the ineffective mock listener suppression;
- corrected workflow coverage; and
- Chrome DevTools verification.

Out of scope:

- changing hidden-value cleanup semantics;
- changing generation or guardian business rules;
- retaining inactive controls in the DOM;
- adding render synchronization effects or state; and
- adding `flushSync`.

## Success Criteria

- Corrected automated regression passes without Base UI lifecycle warnings.
- Chrome shows guardian values immediately for Living/Living/Others plus Random
  partial fill.
- No navigation or remount is required.
- Existing validation, cleanup, tests, type checking, and lint remain healthy.

## Open Questions

None. The user approved dynamic field defaults after the corrected automated
test exposed the control-lifecycle violation.
