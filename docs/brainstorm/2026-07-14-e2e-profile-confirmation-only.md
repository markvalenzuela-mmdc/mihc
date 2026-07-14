# E2E profile confirmation-only workflow

## Context

The E2E profile form currently persists a profile draft whenever the user
continues from a step. That creates a database profile before the user has
confirmed the complete profile. The persisted draft is then loaded by an
existing-profile editor route. This workflow also makes mocked values appear
in local form state while the saved/editor state follows a different lifecycle.

The requested product behavior is narrower: profile creation should remain
available at `/e2e-testing/profiles/new`, but profiles should be persisted only
after the user confirms the complete profile. Existing profiles should not have
an edit workflow or edit access.

## Decision

Use a confirmation-only persistence boundary:

1. The `/new` form owns the entire draft in client-side form state.
2. Step validation, mock actions, and Previous/Continue navigation operate on
   that local state only. Continue may update the URL step, but it must not
   call a server action or write to the database.
3. Validate and finish submits the complete core and EnrollMate values once.
4. The server validates the complete payload and atomically inserts the
   profile and profile-form records with `status: "validated"`.
5. After successful confirmation, the existing profile workspace/list remains
   the destination for review and run history; no profile editor is exposed.

The form may lose an unconfirmed draft on refresh or navigation away. This is
an intentional consequence of not persisting profiles before confirmation and
is not replaced with another draft-storage mechanism in this change.

## Alternatives considered

### Hide only the edit route

Keep draft saving on Continue but remove or block the edit page. This would
still create incomplete database profiles and would leave the unwanted
per-step persistence behavior in place, so it is rejected.

### Replace the editor with a read-only profile page

Keep the existing-profile route but render saved data without controls. This
would preserve a feature that is not currently needed and would not address
the draft creation boundary, so it is rejected.

### Confirmation-only creation (selected)

Remove the editor and draft-save workflow. Reuse the current local form and
mocking behavior in `/new`, and change the final server operation to create
the validated profile in one transaction. This directly matches the desired
workflow and removes the source of the edit/mock state split.

## Scope

### Keep and change

- `$HOME/Documents/Programming/mihc/nextjs/app/e2e-testing/profiles/new/page.tsx`
  remains the creation entry point.
- The profile form controller and action bar retain local step validation,
  mock-current-step behavior, and navigation, but Continue no longer saves.
- The final server action/service accepts the complete new-profile payload and
  performs the single atomic insert.
- Existing profile list/workspace and run-history behavior remains available.

### Remove

- The `$HOME/Documents/Programming/mihc/nextjs/app/e2e-testing/profiles/[profileId]/edit/page.tsx`
  route.
- The editor service and editor-only data types.
- Draft-save action/service contracts, including create/edit draft modes that
  exist only to support step persistence and resuming.
- Tests and documentation whose only purpose is the removed editor or
  per-step draft persistence.

### Out of scope

- Database migrations or cleanup of existing partial `status: "new"` rows.
- Changes to the shared EnrollMate contract.
- Changes to the profile workspace, profile list, or Playwright behavior.
- Changes to the `/new` visual layout beyond the persistence/action behavior
  required by this decision.

## Data flow

```text
/profiles/new
  -> local TanStack Form state
  -> local step validation + mock values
  -> Continue updates local step/query state only
  -> Validate and finish
  -> server validates core + complete EnrollMate data
  -> one transaction: insert profile + profile form as validated
  -> existing profile workspace/list
```

## Error handling

- Client-side step and complete-form validation continues to highlight field
  errors without making a request.
- Server-side validation remains authoritative for the complete payload.
- Duplicate email, authentication, definition, and unexpected failures keep
  the existing action error contract and are shown through the current form
  error summary.
- A failed final confirmation must not leave a partially inserted profile.

## Verification criteria

- Continue and Previous do not call a persistence action.
- Mocking a step updates the visible controls in `/new` and remains local.
- Invalid complete data prevents the final request.
- A valid confirmation creates exactly one validated profile and form record.
- The edit route and editor-only imports/files are gone.
- Existing profile workspace/list tests continue to pass.
- Focused unit/integration tests, lint/typecheck, and `git diff --check`
  pass for the intentional implementation changes.

## Open questions

None. The user approved the confirmation-only flow and removal of the editor.
