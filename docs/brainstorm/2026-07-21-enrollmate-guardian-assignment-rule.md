# EnrollMate Guardian Assignment Rule

## Context

EnrollMate captures each parent's status as `Living`, `Unknown`, or `Deceased`.
The Guardian Assignment field currently exposes `Father`, `Mother`, and `Others`
without accounting for those statuses. This can produce records that assign an
unavailable parent as guardian and lets the profile mocker generate the same
incompatible combination.

The separate Relationship to Applicant field uses the official captured options:
`Grandparent`, `Sibling`, `Aunt`, `Uncle`, `Cousin`, `Neighbor`, and `Others`.
Choosing `Others` exposes the Specify Guardian Relationship text field.

## Agreed Behavior

The Guardian Assignment options depend on the two parent statuses:

| Father status | Mother status | Allowed assignments |
| --- | --- | --- |
| `Living` | `Living` | `Father`, `Mother`, `Others` |
| `Living` | `Unknown` or `Deceased` | `Father`, `Others` |
| `Unknown` or `Deceased` | `Living` | `Mother`, `Others` |
| `Unknown` or `Deceased` | `Unknown` or `Deceased` | `Others` |

A parent assignment is available only when that parent's status is explicitly
`Living`. `Others` is always available. If a status change makes the selected
assignment invalid, the selection is cleared instead of being changed silently.

The Relationship to Applicant options remain unchanged. When Guardian Assignment
is `Others`, Relationship to Applicant is available. Specify Guardian Relationship:

- stays rendered but disabled when the relationship is not `Others`;
- is cleared and is not required while disabled; and
- becomes enabled and required when the relationship is `Others`.

When Guardian Assignment is `Father` or `Mother`, the guardian-specific relationship
fields remain unavailable as they are today. Disabled or unavailable values are
cleared before validation. The contract rejects a stale non-empty value for an
unavailable conditional field instead of silently persisting it.

## Design

The shared `@mihc/enrollmate-contract` package owns a helper that derives allowed
Guardian Assignment values from the current parent statuses. It preserves the
ordering and official values captured by the contract definition.

Both full-form and step validation use the helper to reject an assignment outside
the derived list, with the validation issue attached to `guardian`. The Next.js
field-option adapter calls the same helper when resolving Guardian Assignment
options. The existing mocker consumes those resolved options, so generated profiles
inherit the contract rule rather than duplicating it.

Next.js extends its existing rendered, disabled, and cleanup predicates for Specify
Guardian Relationship. The form controller runs the same cleanup path when parent
status, Guardian Assignment, or Relationship to Applicant changes.

## Alternatives Considered

1. **Shared contract helper (selected).** One business rule governs contract
   validation, UI choices, and mock generation.
2. **Separate contract and Next.js predicates.** This would reduce package API work
   but creates two copies that can drift.
3. **Multi-field dependent options in the JSON definition schema.** This is more
   declarative but adds disproportionate schema and runtime complexity for one rule.

## Automated Coverage

Contract tests cover `Unknown/Unknown`, `Unknown/Deceased`, `Deceased/Unknown`, and
`Deceased/Deceased`. In every combination, `Others` succeeds and `Father` and
`Mother` fail. Living-parent cases verify each exact option set and valid assignment.

Next.js tests verify option filtering, clearing an invalid current assignment,
rendering and disabling Specify Guardian Relationship, conditional requiredness,
and clearing its value. Full and partial mock tests verify generated Guardian
Assignment values are allowed for the current parent statuses and that generated
relationship details pass contract validation.

## Scope Boundaries

- Preserve the official `Others` spelling and all captured relationship options.
- Do not change unrelated EnrollMate fields or introduce a general multi-controller
  dependency system.
- Do not alter guardian-specific detail behavior beyond the agreed relationship
  field interaction.
