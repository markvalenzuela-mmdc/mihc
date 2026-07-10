# Profile Sheet Group Readability Refactor

## Context

`e2e-profile-sheet-groups.ts` converts an E2E workspace profile into the
groups rendered in the profile sheet. The existing implementation produces the
correct result but combines display-value formatting, deprecated-form handling,
definition traversal, filtering, and top-level assembly in a few dense
expressions.

## Decision

Refactor only `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`.
Keep the public `getProfileSheetGroups` signature and every rendered label,
value, group order, and filtering rule unchanged.

Use small local helpers with one responsibility each:

- format a value for display;
- build the relational profile summary;
- build the deprecated-form notice;
- build active form groups from the active definition;
- build non-empty operational-data groups.

The exported function will read as an ordered assembly of those three kinds of
groups: profile summary, form groups, then operational groups.

## Alternatives considered

1. Keep the current chained collection transformations and add comments. This
   leaves the control flow difficult to scan.
2. Move form display into a new shared module. This is unnecessary for one
   current consumer and would broaden the change.
3. Use narrowly named local helpers and explicit loops where they clarify the
   traversal. Chosen because it improves readability without changing module
   boundaries or behavior.

## Validation

Run the focused Next.js lint check and TypeScript check. Review the diff to
confirm only this helper and its associated planning record changed, while all
pre-existing user-owned work remains intact.
