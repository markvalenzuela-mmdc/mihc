# Profile Seed and Empty Values

## Context

The EnrollMate profile seed currently generates valid form payloads by filling
required free-text fields with the literal values `Seeded value` or
`Seeded conditional value`. Those implementation placeholders are visible in
the E2E profile workspace and do not resemble useful application data.

The profile sheet also filters out fields that are absent from a stored active
form. Present fields with `null`, `undefined`, or an empty string can render as
blank space. This makes it difficult to distinguish a missing answer from a
display problem.

## Requirements agreed with the user

- Seeded profiles must not display `Seeded value` or
  `Seeded conditional value`.
- Seed data should use the recommended balance of realism and maintainability.
- Every field in an active EnrollMate form section should appear in the profile
  sheet, even when its value is absent from the stored payload.
- Missing or blank values must display as `Not provided`.
- Existing meaningful values, including `false`, `0`, selected options, file
  metadata, and non-empty arrays, must remain distinguishable from missing
  values.
- Deprecated-form behavior remains unchanged.

## Approaches considered

### Fully explicit fixtures

Hand-author every field for every seeded profile. This offers maximum control
but repeats a large form contract across fixtures and becomes expensive to
maintain when the scraped definition changes.

### Field-name generation

Infer every free-text value from field names. This is compact but fragile:
unfamiliar names can produce awkward or misleading data, and related fields
can become internally inconsistent.

### Hybrid fixtures and field-aware defaults

Use realistic per-profile identity and scenario overrides, supported by shared
field-aware defaults for repetitive required values. This keeps the checked-in
fixtures readable while retaining automatic compatibility with the active form
definition. This is the selected approach.

## Design

### Seed data

Keep the active definition and generated Zod validator as the source of truth
for which values are required. Extend each profile fixture with a coherent
scenario containing realistic identity and application values. Use a small,
local fallback resolver for required free-text controls that selects an
appropriate value by field purpose or control type.

The resolver must never return an implementation-oriented placeholder. Common
categories such as names, addresses, phone numbers, postal codes, schools,
employers, and descriptive answers should receive human-readable sample data.
Existing select, checkbox, date, email, dependent-option, and file handling can
remain definition-driven, with per-profile overrides used when a scenario
needs a specific answer.

The final generated object must continue to pass the flow-specific EnrollMate
validator before persistence. This preserves the current failure mode when the
definition changes incompatibly.

### Profile sheet projection

For active forms, traverse every field in every section of the active
definition instead of filtering to keys already present in `profileForm.data`.
Look up each field's stored value and pass it through the existing display
conversion boundary.

The display conversion should return `Not provided` for `null`, `undefined`,
and empty or whitespace-only strings. It should continue to format arrays as a
comma-separated value, file metadata by filename, and other objects as JSON.
Boolean `false` and numeric `0` must not be treated as empty.

All definition sections contain fields, so each active section remains visible
and communicates missing answers explicitly. The group order remains profile
summary, active or deprecated form groups, then operational groups.

### Scope boundaries

Do not change the shared EnrollMate definition, validation rules, database
schema, API contract, deprecated-form notice, or E2E run behavior. Do not add a
generic fixture-generation abstraction outside the existing seed module.

## Validation

- Add focused seed tests that prove generated Bachelor and Microcredential
  forms validate and contain no implementation placeholder values.
- Extend profile-sheet projection tests to cover absent keys, `null`, empty and
  whitespace-only strings, `false`, and `0`.
- Verify that all active definition fields are projected and that deprecated
  forms retain their existing notice.
- Run the focused Vitest files, Next.js lint for touched files, TypeScript
  checking, and `git diff --check`.

## Success criteria

After reseeding, no profile field displays `Seeded value` or
`Seeded conditional value`. Opening an active profile shows the complete set of
definition-driven fields, with missing answers represented consistently as
`Not provided` and populated answers rendered as before.
