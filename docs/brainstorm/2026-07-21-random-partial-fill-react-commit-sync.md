# Random Partial Fill React Commit Synchronization

## Status

Approved corrective design. This document supersedes the diagnosis and
controller strategy in
`2026-07-21-random-partial-fill-visual-sync.md`. The prior document remains as
history because its listener-interleaving fix did not resolve the browser
defect.

## Corrected Reproduction

On the Parent/Guardian Information step:

1. Set Father Living Status to `Living`.
2. Set Mother Living Status to `Living`.
3. Set the Guardian assignment to `Others`.
4. Choose Mock current step.
5. Choose Random partial fill.

The father and mother controls display generated values immediately. The
guardian controls remain visually blank. Navigating to the previous step and
returning makes the generated guardian values appear.

## Chrome DevTools Evidence

Chrome DevTools reproduced the issue against the local Next.js application.
While the guardian controls were blank:

- the top-level TanStack Form state contained generated guardian values;
- each mounted guardian field instance contained the same generated value;
- the live DOM input value remained empty; and
- the corresponding React alternate fiber contained the generated controlled
  `value` prop.

For example, Guardian First name had a generated value in both TanStack Form
and its mounted field instance, while its DOM input remained empty. After the
step remounted, the same generated value appeared without regenerating data.

This proves that mock generation, guardian availability, and form-state storage
are working. The pending React render containing the correct controlled props
is not committed during the mock dialog click lifecycle.

## Desired Behavior

- Random partial fill commits all generated values to currently mounted
  controls before its click event finishes.
- Guardian fields update immediately when `Others` was selected manually.
- Existing valid manual selections remain preserved by partial mode.
- Full fill, validation, cleanup, dirty metadata, and navigation behavior remain
  unchanged.
- No field or step remount is required.

## Approaches Considered

### 1. Flush the complete mock transaction synchronously

Wrap mock field assignments and final unavailable-value cleanup in one React
DOM `flushSync` boundary.

Advantages:

- directly addresses the uncommitted React render observed in Chrome;
- commits the complete external-store transaction before control returns to the
  dialog handler;
- does not introduce synchronization-only component state;
- does not remount fields or reset control-local state; and
- remains local to the controller's programmatic mock operation.

Trade-off:

- synchronous rendering must remain narrowly scoped because excessive use can
  reduce rendering throughput.

This is the approved approach.

### 2. Add a mock render revision

Increment controller state after mocking and consume it in the field subtree to
force a second render.

Rejected because it adds state whose only purpose is repairing another state
system's commit timing.

### 3. Remount the active step

Change a key after mocking so all fields remount from the final form state.

Rejected because it can reset focus and component-local state and because the
Chrome evidence shows that the correct pending render already exists.

## Design

### Mock transaction

`mockCurrentStep` continues generating its patch through
`getE2eProfileStepMockValues`. The controller will execute the following inside
one `flushSync` callback:

1. apply generated core field values;
2. apply generated EnrollMate field values; and
3. run `clearMockUnavailableValues` once against the completed patch.

Validation errors are cleared after the synchronous form transaction, as they
are today.

The existing `dontRunListeners` options from the earlier attempted fix will be
retained for the first Chrome verification. If Chrome proves they are not
needed, they may be removed in the same correction so the final implementation
contains only behavior justified by the reproduction.

### Error and pending behavior

No new error path is introduced. The existing pending-action guard remains the
entry check. `flushSync` is used only from the user-triggered mock action, not
from render, effects, validation, or asynchronous work.

## Coverage and Verification

Update the page-level workflow test to use the corrected sequence:

- Father `Living`;
- Mother `Living`;
- Guardian `Others`; and
- Random partial fill.

The test asserts immediate generated values for representative father, mother,
and guardian text/select/date controls while preserving the manual statuses and
guardian assignment.

Because jsdom committed this external-store update even before the browser fix,
the automated test protects the workflow but is not sufficient proof of the
rendering correction. Chrome DevTools verification is mandatory:

1. reproduce the corrected sequence on a fresh form;
2. confirm guardian values display immediately after Random partial fill;
3. confirm no previous/back navigation is required; and
4. inspect console and Next.js runtime errors.

Then run focused profile-form tests, the complete Next.js test suite,
TypeScript checking, lint, and `git diff --check`.

## Scope

In scope:

- synchronous commit of the programmatic mock transaction;
- corrected Living/Living/Others workflow coverage;
- removal of the prior ineffective listener option only if browser verification
  shows it is unnecessary.

Out of scope:

- changing partial or full generation algorithms;
- changing guardian relationship rules;
- adding step-remount behavior;
- changing manual field updates, persistence, or finalization; and
- creating a new browser-test project for the local maintainer console.

## Success Criteria

- Chrome displays generated guardian values immediately for the corrected
  Living/Living/Others reproduction.
- Form state and DOM controls agree without navigation.
- Parent values, guardian assignment, cleanup, and validation remain correct.
- Automated tests and static checks pass without new failures.

## Open Questions

None. The user supplied the corrected reproduction, requested Chrome DevTools
for browser diagnosis, and approved the `flushSync` approach.
