# Profile Form State and Shared Fixture Generation

## Context

`profile_forms.data` stores EnrollMate application payloads as JSONB. Each row
also stores the exact `definition_hash` used to create it. The workspace
currently derives an `isDeprecated` boolean by comparing that stored hash with
the active checked-in definition, but it returns current-hash JSONB without
validating it at the read boundary.

The profile seed module also owns several unrelated responsibilities: realistic
profile scenarios, definition traversal, conditional-field evaluation,
mechanical value generation, final validation, and database persistence. A
second definition-driven payload generator exists in the Next.js contract
tests, where it still uses the literal `Seeded value`.

The separate conflict between singular `profiles.flow_type` and multiple
`profile_forms` flows is intentionally excluded. It is being handled in a
separate Codex task and must not be changed by this work.

## Decisions

### Explicit form state

Replace the derived `isDeprecated` boolean with one mutually exclusive state:

```text
active
deprecated
invalid
```

The service determines state in this order:

1. If the stored definition hash differs from the active definition hash, the
   form is `deprecated`. Historical data is not validated against a newer
   definition.
2. If the hashes match, validate `data` with the current flow-specific
   EnrollMate validator.
3. A successful parse produces an `active` form and uses the parsed data.
4. A failed parse produces an `invalid` form with normalized validation issues.

The existing `schemaVersion` in the definition source describes the JSON
definition document format. It does not identify a particular collection of
fields, options, or conditions, so it cannot replace `definition_hash` for
deprecation. The hash remains the canonical content fingerprint. No stored
`is_deprecated` column or bulk update is needed when the definition changes.

### Recoverable invalid data

An invalid current-hash form must not make the entire profile workspace fail.
The profile, other forms, workflow steps, active run, and run history remain
available. The form carries normalized validation issues containing a readable
field path and message.

The profile sheet renders a dedicated `Invalid <flow> application` group with
the definition hash, a status explanation, and the validation issues. It does
not attempt to render invalid values as if they were a valid active form.

Only `active` forms are runnable. The current automated and manual run handlers
are no-ops, so this change establishes the form-state and disabled-control
contract without creating a run mutation API. The controls should communicate
why no form is runnable. Selection between multiple active flow forms remains
outside this scope because it depends on the separate profile-flow model
decision.

### Shared fixture builder

Add a dedicated `@mihc/enrollmate-contract/testing` package export. It owns the
mechanics required to construct a validator-ready payload from a normalized
flow definition:

- ordered definition traversal;
- required and conditionally required field selection;
- checkbox and file metadata generation;
- static and dependent option selection;
- conditional evaluation;
- applying caller overrides;
- calling a consumer-supplied resolver for values the contract cannot infer;
- final flow-specific validation.

The builder must remain deterministic and fail loudly when neither the contract
nor the caller can supply a required value. It must not contain profile names,
realistic addresses, or Next.js database knowledge.

Next.js retains responsibility for realistic seed scenarios and its field-value
policy. Split those fixtures from persistence so that:

- a fixture module owns profile identities and form overrides;
- a value-policy module supplies realistic free-text, cascade, and external
  values to the shared builder;
- `seed-profiles.ts` validates operational data and performs only profile/form
  upserts and seed reporting.

The Next.js contract tests reuse the shared builder instead of maintaining a
second traversal algorithm. Playwright may import the testing subpath in
server-only tests, but browser runtime code must continue using the package root.

## Alternatives considered

### Additional booleans in the workspace service

Adding `isInvalid` beside `isDeprecated` is the smallest change, but permits
contradictory combinations and forces every consumer to understand their
precedence. Rejected in favor of a single explicit state.

### Repository-wide JSONB decoding layer

A repository decoder for every JSONB read would centralize persistence
boundaries, but the current application has one profile-workspace consumer and
must preserve deprecated data without parsing it as current. This would broaden
the change without simplifying today's flow.

### Next.js-only fixture extraction

Splitting the current seed module inside Next.js would improve local
readability, but leave contract traversal duplicated in tests and available for
future drift. The package testing subpath gives the mechanical algorithm one
canonical owner without exposing test helpers through the browser-safe root.

## Types and boundaries

The workspace form DTO uses a discriminated state rather than boolean flags.
Each form contains its persisted metadata and one of:

```text
state: active      parsed data, no issues
state: deprecated  stored historical data, no current validation
state: invalid     stored data plus normalized issues
```

Normalized issues contain only serializable values suitable for the API:

```text
path: string
message: string
```

Zod objects and error instances must not cross the route boundary.

The shared fixture builder is exported only from `./testing`; production
contract consumers continue to import definitions and validators from the
package root, while hashing remains under `./server`.

## Error handling

- Definition-hash mismatch is an expected deprecated state, not an exception.
- Current-hash validation failure is an expected invalid state, not a workspace
  exception.
- Unsupported required fixture fields throw with the field name so a definition
  change cannot silently create generic data.
- Database and unexpected service failures retain existing route behavior.

## Testing and validation

- Unit-test state derivation for active, deprecated, and invalid forms.
- Assert deprecated data is not parsed with the current validator.
- Assert invalid issues are serializable and identify their field paths.
- Extend sheet-group tests for the invalid application group.
- Test run-control readiness when no active form exists.
- Test the shared fixture builder across Bachelor and Microcredential flows,
  including conditional and dependent fields.
- Keep the profile seed regression proving that all five scenarios validate and
  contain no implementation-placeholder values.
- Run the shared package through the Next.js ESLint configuration. It currently
  has no lint errors; existing Next.js warnings and the unrelated Next.js test
  typecheck failure are explicitly out of scope.
- Run focused Next.js tests, the complete Next.js test suite, Playwright
  server-unit tests and typecheck, and database reseeding.

## Success criteria

- Workspace forms expose exactly one of `active`, `deprecated`, or `invalid`.
- A definition change automatically deprecates existing rows through their
  stored hash without rewriting those rows.
- Corrupt current-hash JSONB is visible and actionable without breaking the
  workspace.
- Only active forms are considered runnable.
- Definition traversal and valid-payload assembly exist in one shared testing
  module.
- `seed-profiles.ts` no longer mixes fixture definitions and field-generation
  policy with persistence.
- No unrelated profile-flow schema, lint-warning, or typecheck cleanup is
  included.
