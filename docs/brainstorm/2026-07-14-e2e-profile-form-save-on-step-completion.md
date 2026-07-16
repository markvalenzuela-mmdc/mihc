# E2E profile form: save on step completion

## Context

The E2E profile form currently exposes two draft-saving actions: “Save and
continue” and “Save draft and exit”. Both validate and persist the active step,
but the separate exit action adds a second save mode to the workflow. The
server-side draft action already has the correct persistence boundary: it saves
one validated active step and returns the next step.

## Decision

Use one forward action labeled **Continue**. Clicking it validates and saves the
active step, then advances only after persistence succeeds. Keep **Previous** as
navigation-only. Keep **Validate and finish** on the confirmation step; its
existing behavior of saving the active confirmation step before finalization
remains unchanged.

Remove the explicit “Save draft and exit” action and the associated exit
callback/intent branch from the client form flow. The existing draft service,
server action, persistence model, validation rules, dirty-navigation warning,
and finalization contract remain unchanged.

## Alternatives considered

1. **Save on Continue (selected):** one clear save boundary per completed step,
   with predictable backward navigation and no extra save mode.
2. **Save on both Continue and Previous:** saves more often, but makes backward
   navigation mutate persisted data and obscures which step was completed.
3. **Continuous field/blur saves:** reduces explicit actions, but increases
   request volume and complicates validation and error handling.

## Scope

- Update the form action component to render Continue and remove the exit
  action.
- Simplify the controller to expose one active-step save-and-advance handler.
- Remove the unused form-page and route exit wiring.
- Update focused unit tests for labels, callbacks, successful step saves,
  pending behavior, and finalization.
- Leave the server action and database behavior unchanged.

## Acceptance criteria

- No rendered button has the accessible name “Save and continue” or “Save draft
  and exit”.
- Non-confirmation steps render a single **Continue** action.
- Continue validates and persists the active step before changing the step URL.
- Failed validation or persistence keeps the user on the current step.
- Previous changes steps without invoking the draft save action.
- Confirmation still saves its active step before a successful finalization.
- Existing unrelated working-tree changes remain untouched.
