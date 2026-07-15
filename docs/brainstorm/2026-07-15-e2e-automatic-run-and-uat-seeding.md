# E2E Automatic Run and UAT Profile Seeding

Date: 2026-07-15
Status: Approved design

## Context

The E2E profile workspace currently exposes an unfinished automated-run
button, allows selecting a contiguous range of eight E2E status steps, and
uses a no-op handler when the automated button is clicked. Profile database
seeding uses a separate preconfigured form-data generator, while the E2E
profile stepper already has a working mocker behind its `Mock current step`
action.

The UAT environment accepts test identities only when the first or last name
contains one of `SampleInternsTest`, `Interns`, or `Intern`. The same identity
constraint therefore needs to apply to both interactive step mocking and
database-seeded profiles.

The existing smoke-test request action already publishes an Inngest event but
currently sends `requestedBy: null`. The E2E workspace needs an analogous
producer event containing the profile, selected steps, and logged-in user.

## Clarifications

- Steps 2 through 8 remain visible in E2E Testing but their controls are
  disabled rather than hidden.
- The seeded profile data should be overridden with generated mock values.
- Existing profile IDs remain as technical keys because seeded E2E run history
  references them. Existing status and flow metadata remain scenario metadata;
  generated names, emails, and form values are replaced on each seed run.
- The E2E request payload includes selected step IDs in addition to the profile
  and logged-in user IDs.
- The request adds the Inngest producer/event seam only. There is no E2E
  Playwright consumer in the current repository, so implementing the test
  runner is outside this change.

## Options considered

### 1. Reuse the existing step mocker for UI and seeding — selected

Update the existing mock identity generator with the UAT marker rule, then
drive that same generator through every flow step in full-fill mode during
seeding. This keeps option resolution, conditional fields, and UAT identity
rules in one implementation and avoids a second generator that could drift.

### 2. Extract a lower-level shared generator

Split the current mocker into a server-safe core and UI adapter before using it
from the seed script. This could improve boundaries later, but the current
mocker is already server-importable and the requested behavior does not
require a structural rewrite.

### 3. Keep a separate seed generator

Continue using a seed-specific fixture builder and copy the UAT naming rule
there. This would minimize short-term wiring, but it would violate the goal of
using the stepper mocker and would make the two generation paths diverge.

## Approved design

### Mocking and seed flow

The mock identity helper will select one accepted UAT marker and include it in
the generated first or last name. The existing generated core name, core
email, and EnrollMate email remain coherent with that identity.

Profile seeding will:

1. Start from definition-driven default form values for each fixture’s flow.
2. Run `getE2eProfileStepMockValues` for every flow step in `full` mode.
3. Merge generated core values from step 1 and generated EnrollMate values
   from each step.
4. Upsert the existing profile ID with the generated name/email and the
   generated complete form document.

The preconfigured per-profile form overrides will be removed. Approved file
fixtures remain optional; the current seed environment has no required file
fixture dependency, so optional files may remain empty as defined by the
mocker.

### E2E workspace behavior

The step selector will render all step rows, but only step 1 will be
interactive. Steps 2 through 8 will have disabled checkboxes and retain their
visible labels and descriptions. A new run will default to step 1.

The automated button will be labeled `Run selected steps automatically`. Its
handler will call a new authenticated E2E request action with the current
profile ID and the selected step IDs. The action will publish
`e2e-test/requested` with:

```ts
{
  profileId: string;
  stepIds: string[];
  requestedBy: string;
  correlationId: string;
  requestedAt: string;
}
```

The workspace will provide success and failure toast feedback and prevent
duplicate requests while the action is pending.

### Smoke request attribution

`requestSmokeTest` will resolve the current authenticated user before sending
the existing `smoke-test/requested` event and set `requestedBy` to that user’s
ID. Unauthenticated calls will return the existing server-action error shape.
The existing Playwright consumer already propagates `requestedBy` to the
runner and database persistence path, so no payload renaming is needed.

### Validation and errors

- Both request actions authenticate server-side rather than trusting client
  state.
- Inngest send failures return typed action errors and produce an error toast.
- Generated seed forms continue to be checked with the real EnrollMate
  validators.
- The new E2E event is a producer contract; no consumer behavior is added.

## Testing

Focused coverage will verify:

1. Mocked identities contain one accepted UAT marker in first or last name.
2. Full generated forms for both flows pass the real EnrollMate validators.
3. Seed metadata no longer depends on hardcoded form overrides and generated
   profile names/emails are used.
4. E2E steps 2–8 render disabled while step 1 remains selected.
5. The E2E action publishes profile ID, selected step IDs, current user ID,
   correlation ID, and timestamp.
6. `requestSmokeTest` publishes the current user ID through `requestedBy`.

## Scope and tradeoffs

This is intentionally a producer/UI/seed change. It does not invent an E2E
runner, persistence workflow, or Playwright consumer that the repository does
not currently provide. Stable profile IDs preserve existing seeded run
history while all user-facing profile data and form values are regenerated.

## Open questions

None.
