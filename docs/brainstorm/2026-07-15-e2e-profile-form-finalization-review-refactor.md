# E2E Profile Form Finalization Review Refactor

**Date:** 2026-07-15
**Status:** Approved design; implementation complete

## Context

The review of `nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts`
raised four maintainability comments about an unnecessary transaction wrapper,
helper placement, and single-use helpers. The goal is to make the service read
more directly without changing its persistence behavior or public contract.

The initial review observed unrelated user-owned working-tree changes in the
profile-form controller and service, plus an existing implementation plan. The
working tree must be checked again before implementation so any such changes
remain preserved. Any generated or unrelated files, including the currently
untracked `nextjs/repomix-output.xml`, are outside this refactor's scope.

## Approved design

Only the finalization service is in scope for implementation.

### Transaction handling

Keep the existing `DbExecutor` parameter and the shared
`DrizzleTransaction` definition unchanged. Remove only the local
`withTransaction` helper and call the Drizzle API directly:

```ts
return db.transaction(async (tx) => {
  // finalization work
});
```

If a transaction executor is supplied, direct use of `db.transaction` follows
Drizzle's nested-transaction behavior. This is intentional; narrowing the
service to the root database client would be an unnecessary scope expansion.

### Helper ordering

Order the module functions coherently so pure validation and error helpers come
before the exported function that performs database work:

1. `getIssueErrors`
2. `validateCore`
3. `validateEnrollmate`
4. `isUniqueViolation`
5. `finalizeE2eProfileForm`

The ordering change has no runtime behavior impact.

### Email availability check

Remove the single-use `assertEmailAvailable` helper. Keep its existing query,
limit, and `EMAIL_CONFLICT` error, but place them directly inside the
transaction callback immediately before inserting the profile.

Keep the unique-violation catch because the preflight query cannot eliminate a
race with another concurrent insert.

### Validation errors

Remove the single-use `throwValidationError` helper. In both validation
functions, throw `E2eProfileFormError` directly with the existing message,
error code, and `getIssueErrors` result. Keep `getIssueErrors` because it is
still shared by core and EnrollMate validation.

## Behavior invariants

- The service continues to accept a `DbExecutor`.
- The shared `DbExecutor` and `DrizzleTransaction` types are not changed.
- Core and EnrollMate validation still happen before persistence.
- Profile and profile-form inserts remain in one transaction.
- Duplicate emails still map to `EMAIL_CONFLICT`, including concurrent races.
- Invalid input still returns the same field-error structure and message.
- The exported service input and return shape remain unchanged.

## Alternatives considered

### Keep `withTransaction`

Rejected because it adds a local abstraction around the existing Drizzle
transaction API without a behavior requirement. The review specifically asks
for the real `db.transaction` call.

### Remove `DbExecutor` and `DrizzleTransaction`

Rejected because it expands the requested change and removes existing executor
compatibility. The approved change removes only the wrapper, not the shared
database type contract.

### Preserve the single-use helpers

Rejected because the review explicitly asks to inline the email check and
validation error construction, and the resulting service remains small enough
to keep those operations visible at their call sites.

## Verification direction

After implementation, inspect the focused diff and run the existing E2E profile
form persistence coverage, then the applicable Next.js typecheck and lint
checks. Confirm that the existing user-owned working-tree changes remain
untouched.

## Open questions

None. The design is approved for implementation planning.
