# E2E Profile Form Controller Review Amendment

**Date:** 2026-07-15  
**Status:** Approved design; implementation pending

## Relationship to the existing design

The existing controller refactor design selects an in-file decomposition with
an indexed flow context. The attached review identified a deeper responsibility
boundary problem and recommends extracting independent infrastructure concerns.
The user approved this amendment to address that review. The original design
remains intact as the prior decision record.

## Scope

Refactor only the profile-form controller area:

- nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx
- nextjs/feature/e2e/components/profile-form/e2e-profile-form-validation.ts
- nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-step.ts
- nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-errors.ts
- nextjs/feature/e2e/components/profile-form/use-unsaved-profile-warning.ts
- focused tests for the extracted pure behavior where useful

Preserve the existing staged or committed finalization-service work, related
docs, and untracked nextjs/repomix-output.xml.

## Selected approach

Keep one controller as the readable workflow orchestrator, but extract four
focused boundaries:

1. Pure validation and error-map helpers move to
   e2e-profile-form-validation.ts.
2. nuqs step state, clamping, canonicalization, and navigation move to
   use-e2e-profile-form-step.ts.
3. TanStack Form field metadata, error summaries, first-error ordering, and
   cross-step navigation move to use-e2e-profile-form-errors.ts.
4. beforeunload registration moves to use-unsaved-profile-warning.ts.

The controller retains form setup, flow-change listeners, hidden-value cleanup,
mock generation, finalization orchestration, and the public return shape.

## Validation boundary

The pure validation module preserves the current first-path-segment field
mapping and exposes a validateProfileFormStep function that accepts core
values, cleaned EnrollMate values, flow type, and step number. It returns either
normalized field errors or parsed core and step values. Cleanup remains in the
controller because it mutates form values and field metadata.

Complete-form validation remains explicit in the controller through the real
EnrollMate full validator before finalization.

## Step boundary

useE2eProfileFormStep owns useQueryState with stepSearchParams, returns the
clamped active step and number, and exposes goTo, goNext, and goPrevious. It
continues asynchronously canonicalizing out-of-range query values and clamps
navigation to the first and last step.

## Error boundary

useE2eProfileFormErrors receives the form, current steps, active step number,
and goToStep callback. It exposes messages, show, and clear. show orders errors
by core fields followed by the active flow's EnrollMate fields, navigates to the
first invalid field's owning step when needed, and defers metadata writes until
that step is rendered. clear removes onSubmit field metadata and the summary.

The internal metadata operation is named
writeErrorsToVisibleFields; the public cross-step operation is show.

## Pending-action boundary

The controller replaces pendingRef, isPending, and isFinalizing bookkeeping
with a PendingAction value of navigating, finalizing, or null. A shared
runExclusive helper sets the ref and state before an operation and clears both
in a finally block. isPending and isFinalizing are derived values, while the
public return names remain unchanged.

## Compatibility and verification

The refactor must preserve invalid-step behavior, hidden-value cleanup,
query-step canonicalization, flow changes, full-form finalization, pending UI,
mock filling, dirty-form unload behavior, action-error mapping, and all
controller callback/property names.

Run focused profile-form navigation and page tests, pure validation tests,
Next.js typecheck, Next.js lint, and git diff --check. Confirm the prior design
record and all unrelated user-owned changes remain intact.

## Alternatives rejected

- A partial extraction that leaves TanStack metadata and browser lifecycle code
  in the controller does not address the main readability problem.
- XState, a generic wizard framework, or a new form library would add
  unnecessary abstraction and behavior-change risk.
