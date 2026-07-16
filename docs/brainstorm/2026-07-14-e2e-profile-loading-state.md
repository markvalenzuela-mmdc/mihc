# Create E2E Profile Loading State

## Context

The Create E2e profile form currently disables its controls while a draft is
being saved or the profile is being finalized, but it displays a generic
`Saving profile…` status below the action buttons. The user can lose confidence
that the clicked action is still progressing, especially when finalization
starts navigation back to the profile workspace.

The current profile-mocking work in the same feature is user-owned and is out
of scope for this change. This design only changes loading feedback and the
pending-state wiring around the existing form actions.

## Decision

Use action-specific button loading states. The clicked action button will show
the shared spinner and expose `aria-busy="true"`; its label remains visible.
The form fieldset and all other actions remain disabled while the operation is
pending. Remove the generic `Saving profile…` status paragraph entirely.

The pending action is explicit rather than inferred from a single boolean:

- `previous` while the previous-step URL update is pending;
- `continue` while the active step is being saved;
- `finalize` while the final save/validation flow is running.

The route wrapper will also track the transition caused by the final
`router.push`. The form page combines that route transition with its local
pending state so the final-action spinner and disabled state remain visible
until navigation begins to replace the form.

## Alternatives considered

### Form overlay

An overlay with a centered spinner would make blocking behavior highly visible,
but it would hide the current step and validation context during a normal save.
It is unnecessary because the existing fieldset already prevents edits.

### Same spinner on every action

Showing a spinner in every button would require less state plumbing, but would
not identify which operation is running and would make the action bar harder to
read while pending.

## Implementation shape

1. Add a narrow pending-action type and replace the controller’s generic
   `isPending` state with that action state while preserving the existing
   duplicate-submission ref guard.
2. Mark `continue`, `finalize`, and `previous` before their async URL/server
   work and clear the state in `finally` blocks.
3. Pass the pending action to `E2eProfileFormActions`; render the shared
   `Spinner` only inside the active button, set that button’s `aria-busy`, and
   remove the status paragraph.
4. Track route transition state in `E2eProfileFormRoute` and combine it with
   controller pending state in `E2eProfileFormPage` for the fieldset and action
   bar.
5. Update focused tests for action rendering, pending button behavior,
   duplicate submissions, and final navigation state. Keep save/finalize
   validation behavior unchanged.

## Accessibility and failure behavior

The form remains keyboard-safe: pending controls are disabled, the active
button keeps its text label, and the spinner is decorative inside the button.
The action group continues to expose `aria-busy` for the overall pending
region. If saving or finalization fails, the existing error handling clears the
pending state in `finally`, restores the controls, and displays the existing
field or summary errors.

## Verification criteria

- No `Saving profile…` text is rendered by the form actions.
- During an active save, only `Continue` shows the spinner and is marked busy.
- During finalization, only `Validate and finish` shows the spinner and is
  marked busy.
- During previous-step URL navigation, only `Previous` shows the spinner.
- The fieldset and all actions stay disabled while pending.
- A second click cannot start a duplicate save.
- Existing successful, validation-error, and action-error behavior remains
  unchanged.
- Focused tests, lint, typecheck, and `git diff --check` pass.

## Scope

Expected implementation files:

- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx`
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-route.tsx`
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
- `$HOME/Documents/Programming/mihc/nextjs/feature/e2e/types/e2e-profile-form.types.ts`
- `$HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

No shared contract, server action, persistence, Playwright, or unrelated form
behavior changes are planned.
