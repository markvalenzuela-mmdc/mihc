# Last School Attended Exclusive Input Design

## Context

The EnrollMate profile form supports two mutually exclusive ways to record a
student's last school:

- `lastSchoolAttended` selects a known school.
- `lastschOther` records a school that is not in the list when
  `schoolNotFound` is checked.

The shared contract already makes each value conditionally applicable, but the
form currently hides the known-school select when `schoolNotFound` is checked.
Mocking can also expose stale values if both branches are populated during
sequential form updates.

## Approved Behavior

The form must enforce one active branch at a time:

1. With `schoolNotFound` unchecked, the known-school select is enabled and the
   other-school input is unavailable.
2. Checking `schoolNotFound` immediately clears `lastSchoolAttended`, keeps its
   select rendered but disables it, and makes `lastschOther` available.
3. Unchecking `schoolNotFound` re-enables an empty known-school select. The
   previous selection is not restored, and the other-school value becomes
   unavailable through the existing conditional cleanup.
4. The mock-current-step action must leave exactly the applicable school field
   populated. It must never retain meaningful values in both fields.

## Design

Keep the shared contract's existing conditional visibility and validation rules
as the source of truth for which value is applicable. Add form-level interaction
semantics for the known-school select:

- Treat `lastSchoolAttended` as rendered even when its contract condition is not
  met, matching the existing pattern used for rendered-but-disabled parent
  fields.
- Centralize disabled-state calculation in the profile-form utility layer. A
  field is disabled when an existing parent-field rule disables it or when it is
  `lastSchoolAttended` and `schoolNotFound` is `true`.
- Extend the form change cleanup trigger to include `schoolNotFound`, so checking
  it immediately runs the existing unavailable-value cleanup and clears the
  known-school selection.
- Continue cleaning generated mock values after applying them. Because cleanup
  follows the same contract conditions, only the selected branch survives.

This avoids adding a generic `disabledWhen` contract feature for one local
interaction while keeping rendering, disabled state, cleanup, and mocking based
on shared helpers instead of component-specific special cases.

## Verification

- Utility tests prove the known-school select remains rendered, becomes
  disabled, and is removed from available values while `schoolNotFound` is
  checked.
- Form interaction tests prove checking the box clears and disables an existing
  selection, and unchecking it re-enables the select without restoring the old
  value.
- Mock tests prove generated state never contains meaningful values for both
  `lastSchoolAttended` and `lastschOther`.
- Existing EnrollMate contract and focused profile-form tests continue to pass.

## Out of Scope

- Changing the approved UAT school option list.
- Adding a generalized conditional-disabled schema to the shared contract.
- Restoring a cleared known-school selection after the checkbox is unchecked.
