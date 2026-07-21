# Random Partial Fill Visual Synchronization

## Context

The EnrollMate profile form can mock the current step in two modes:

- **Random partial fill** preserves valid values already entered, fills a
  randomized subset of the remaining eligible fields, and may select valid
  conditional shortcuts that hide or disable other fields.
- **Fill all fields** generates values for every eligible field on the current
  step.

After manually setting both parent statuses to `Unknown` or `Deceased`, using
Random partial fill can update the stored form values without updating the
currently mounted controls. Navigating to the previous step and returning
remounts those controls and reveals the generated values. Fill all fields does
not exhibit the reported problem.

## Desired Behavior

- Manually entered valid values remain preserved by Random partial fill.
- Random partial fill may still choose shorter valid conditional paths.
- Every generated value is visible immediately on the current step.
- The user does not need to navigate away and back to synchronize the UI.
- Parent and guardian availability rules continue to be enforced.
- Fill all fields and validation behavior remain unchanged.

## Cause

The controller currently applies a generated mock result through a sequence of
individual field updates. Changes to parent status and guardian dependency
fields invoke the form's availability listener during that sequence. The
listener replaces the complete `enrollmate` value object to remove unavailable
values while the mock patch is still being applied.

That interleaving can leave mounted field controls subscribed to stale field
state even though the final form-level values are correct. The fact that a step
remount displays the values confirms that generated data is retained and the
defect is in the update sequence rather than generation or validation.

## Approaches Considered

### 1. Apply the patch without intermediate listeners, then clean once

Apply generated mock values without running dependency listeners for every
individual assignment. After the full generated patch is present, run the
existing unavailable-value cleanup once through direct field updates.

Advantages:

- Removes the intermediate whole-object replacement that causes stale controls.
- Reuses the existing generator and cleanup rules.
- Preserves form metadata and the current step.
- Keeps the change local to the controller.

Risk:

- The final cleanup must remain mandatory so hidden, disabled, or incompatible
  values cannot survive the mock operation.

This is the approved approach.

### 2. Remount the active step after mocking

Increment a render key after applying mock values so all controls read the final
form state again.

Rejected because it treats the symptom and may reset control-local state,
focus, or field metadata.

### 3. Defer dependency cleanup

Schedule cleanup after the current render or in a later effect.

Rejected because correctness would depend on render timing and would introduce
an unnecessary effect-driven synchronization path.

## Design

### Controller update sequence

The mock generator remains the source of generated values. The controller will:

1. Generate the current-step mock patch using the existing mode and current
   form values.
2. Apply generated core and EnrollMate field values while suppressing form
   listeners for those programmatic assignments.
3. Run the existing mock cleanup exactly once after all generated values have
   been applied.
4. Clear displayed validation errors as it does today.

The cleanup continues to update affected leaf fields so mounted controls receive
the final compatible values. Normal manual edits continue running listeners
immediately; listener suppression applies only to the controlled mock patch.

### Random partial semantics

No generator behavior changes are included. Random partial fill continues to:

- preserve existing valid non-empty values;
- probabilistically fill eligible empty fields;
- resolve newly visible dependent fields;
- choose valid conditional routes, including parent statuses that make parent
  detail fields unavailable; and
- produce guardian data compatible with the final parent statuses.

### Guardian rules

The existing shared guardian contract remains authoritative:

- `Father` is available only when the father is `Living`;
- `Mother` is available only when the mother is `Living`; and
- `Others` remains available in every parent-status combination and is the only
  assignment when neither parent is living.

This fix does not modify those rules. It ensures their resulting mock values and
dependent controls are synchronized visually.

## Automated Coverage

Add a page/controller regression that:

1. Opens the step containing parent and guardian fields.
2. Sets both parent statuses to unavailable values.
3. Supplies deterministic Random partial mock output containing compatible
   guardian/dependent values.
4. Invokes Random partial fill.
5. Asserts that generated values appear in the currently mounted controls
   without navigating away.
6. Confirms the manually selected parent statuses remain unchanged.

Existing mock-generator tests continue covering random/full generation and all
parent-status combinations. Existing page tests continue covering the dialog
and non-submitting behavior.

## Scope

In scope:

- mock-patch application order in the EnrollMate form controller;
- focused regression coverage for immediate visual synchronization.

Out of scope:

- changing the randomization algorithm;
- changing guardian validation or available relationships;
- remounting the form step;
- altering manual field-change behavior;
- changing persistence or finalization.

## Success Criteria

- Random partial values appear immediately after both parents are manually set
  to `Unknown` or `Deceased`.
- Existing valid manual parent statuses remain preserved.
- No previous/back navigation is required.
- Fill all fields remains functional.
- Guardian availability and cleanup rules remain enforced.
- Focused tests, the complete Next.js test suite, type checking, and lint pass
  with no new failures.

## Open Questions

None. The user confirmed the reported issue affects Random partial fill only and
approved preserving valid manual selections while fixing immediate rendering.
