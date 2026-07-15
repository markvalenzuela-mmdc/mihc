# E2E Profile Form Controller Refactor

**Status:** Approved design

## Context

`nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
has become difficult to read because one client hook owns several unrelated
responsibilities:

- TanStack Form setup and flow-change listeners;
- query-string step state and lifecycle effects;
- validation and cleanup of contract-derived values;
- field metadata and error-summary projection;
- step navigation and finalization;
- mock-value generation; and
- pending-action protection.

The working tree contains a user-owned uncommitted loading-state change in the
E2E profile-form page. This refactor must preserve that change and touch only
the controller plus any narrowly required verification or documentation.

The user wants the controller to be easier to maintain while preserving its
public return value and all existing user-visible behavior. The application may
run on a cheap VPS, so the refactor must not add unnecessary client runtime
work, network calls, persistence, React state, effects, or abstraction layers.

## Options considered

### 1. In-file decomposition with indexed flow context — selected

Keep the controller as the feature's single orchestration module, but organize
it into clearly named internal layers. Extract repeated pure computations into
small module-local helpers and build one indexed field context for the active
flow. Centralize pending-action bookkeeping in one helper.

This keeps the existing feature boundary, avoids new module and runtime
boundaries, and is consistent with the approved E2E form design's preference
for a readable page-level composition.

### 2. Separate controller utility modules

Move validation, error mapping, field indexing, and mock field operations into
separate feature files. This would make some helpers easier to unit test in
isolation, but it would create more page-specific file boundaries without
improving client or VPS performance. It also risks turning a local controller
contract into a collection of tightly coupled modules.

### 3. Reducer or state-machine rewrite

Represent form transitions as explicit reducer events or a state machine. This
could make navigation transitions more formal, but it would add substantial
ceremony and increase behavior-change risk for a refactor whose goal is only
maintainability.

## Approved design

### Field context

Add a module-local helper that derives the active flow's field context once per
controller render. The context will provide:

- all form field paths in display/validation order;
- an efficient lookup for a field's owning step; and
- the ordered error-field list used to select the first invalid field.

This replaces repeated nested `flatMap` traversal in error projection, error
navigation, and mock cleanup. It also replaces the repeated core-field string
condition with a single named core-field set or equivalent constant.

### Controller organization

Keep `useE2eProfileFormController` as the public API and arrange its internal
logic in these sections:

1. form setup and flow-change listeners;
2. query-step state and lifecycle effects;
3. field cleanup and error projection;
4. active-step and complete-flow validation;
5. guarded pending actions and navigation; and
6. mock value generation and pending-field event blocking.

The main hook body should read as orchestration: derive the active flow,
construct the form, define the small operations it composes, and return the
controller contract. No new custom hooks are introduced.

### Pending actions

Add one local `runPendingAction` helper that owns the synchronous guard,
`pendingRef`, `pendingAction` state, and `try/finally` cleanup. Continue,
finalize, and previous-step actions will use it while keeping their existing
validation and navigation order.

### Error handling

Keep field metadata updates and the error summary behavior unchanged. The
existing deferred application after navigating to the owning step remains in
place so field metadata is applied after the relevant step is rendered.

`clearErrors` may call the direct field-error application path instead of
re-entering error-field navigation, provided the resulting field metadata and
summary state are identical.

### VPS efficiency

Do not add `useMemo`, `useCallback`, reducers, effects, storage, API calls, or
server round trips solely for this refactor. The indexed field context reduces
repeated work during error handling without adding persistent state. The form
remains client-side, and module organization does not materially affect VPS
execution or the production bundle.

## Behavior invariants

The implementation must preserve all of the following:

- the controller's returned property names and callback contracts;
- flow changes reset EnrollMate values, validated steps, errors, and the URL
  step exactly as they do now;
- inactive/dependent values are cleaned and removed fields are marked pristine;
- active-step validation happens before continuing or finalizing;
- complete-flow validation happens before finalization;
- previous-step navigation does not validate or save;
- pending actions prevent duplicate navigation, submission, and field changes;
- field errors are normalized, ordered, projected to field metadata, and shown
  in the summary with the same behavior;
- action errors map to the same field or error-code messages;
- successful finalization calls `onFinish` with the same profile ID; and
- browser unload protection follows the existing dirty-form behavior.

## Verification

After implementation:

1. run the focused profile-form navigation/page tests;
2. run the Next.js typecheck and lint checks;
3. run `git diff --check`; and
4. inspect the final diff to confirm that the pre-existing user changes in the
   E2E profile-form files remain intact and no unrelated files changed.

No product behavior or API contract changes are in scope.

## Rejected paths

- Moving page-only state into additional custom hooks was rejected because it
  increases indirection and conflicts with the current feature composition
  guidance.
- A reducer/state-machine rewrite was rejected as disproportionate to the
  request and more likely to alter behavior.
- Performance-driven memoization was rejected because there is no evidence of
  a measured bottleneck and it would make dependencies and lifecycle behavior
  harder to follow.
