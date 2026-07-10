# EnrollMate JSONB Profile Model

**Status:** Implemented — Next.js and server-only Playwright validation are
documented in the current project/package READMEs.

> **Implementation amendment (2026-07-10):** The shared contract package is
> also consumed by Playwright server-only Node unit tests. The browser suite
> under `playwright/tests/` remains unchanged and does not run contract tests.

## Context

The EnrollMate application is scraped from an externally controlled site. Its
fields, options, dependencies, and step structure can change independently of
this console. The current relational design represents the scraped contract
with many profile tables, a versioned option catalog, junction tables, and
composite foreign keys. This makes a scrape change a database-migration task
even though the data exists to drive an end-to-end test.

The model must continue to support a single reusable person having independent
Bachelor and Microcredential application data. The E2E workspace still needs
relational identity and list fields, including `program` and `cohort`.

## Decision

Use JSONB for all EnrollMate form data and profile-adjacent internal records.
Keep only a small relational spine:

```text
profiles
  id, name, middle_name, email, program, cohort, status,
  operational_data jsonb, audit columns

profile_forms
  id, profile_id, flow_type, definition_hash, data jsonb, audit columns
  UNIQUE(profile_id, flow_type)

profile_e2e_snapshots
  id, profile_form_id, e2e_run_id nullable, definition_hash,
  payload_hash, raw_payload jsonb, captured_at
```

`profile_forms` has at most one row per profile and flow. `flow_type` remains
`bachelors` or `microcredentials`, allowing a profile to have both.

`profiles.operational_data` contains the current profile-adjacent records as
named sections:

```text
payment
studyBuddy
additionalInfo
disclosures
systemInfo
```

`profile_forms.data` contains only the relevant EnrollMate flow payload,
including related people, addresses, document metadata, multi-select values,
and readiness data. Values use the exact submitted strings expected by
EnrollMate, not database option UUIDs.

`profile_e2e_snapshots` replaces `application_snapshots` and remains
append-only through the service/repository contract. It records the exact
prepared or submitted payload and the definition hash used for that run.

## Validation and versioning

Zod validates JSONB at the frontend and API boundaries; PostgreSQL does not
attempt to execute Zod or enforce field-level form rules.

A new shared local package will own:

```text
packages/enrollmate-contract/
  src/form-definition.schema.ts
  src/form-data.schema.ts
  src/registry.ts
  src/types.ts
  src/definitions/enrollmate-form-fields.json
  src/index.ts
```

The package first validates a new scrape against a stable form-definition
schema. It then builds a flow-specific Zod validator from the checked-in
definition. Required fields, field types, select values, checkbox groups,
uploads, and captured dependencies are derived from the scrape.

The frontend and Next.js API import the same contract package. The API parses
again before persistence and is the trust boundary. Playwright's browser suite
receives no implementation or test changes; server-only Node unit tests import
the package from `playwright/server/__tests__/unit/`.

The current definition hash is computed from the checked-in definition. A
stored `profile_forms.definition_hash` that differs from the current hash is
derived as deprecated. Deprecated forms are visible but cannot be edited or
run. There is no stored deprecation state and no retained old validator solely
to keep outdated profiles executable.

An unsupported scraped control type must fail loudly during definition
validation or validator construction. It must never silently accept a new,
unknown form behavior.

## Frontend behavior

The E2E profile workspace currently hardcodes relational field access and
option-ID display lookups. It will become definition-driven for EnrollMate
application data: sections and labels come from the active scraped definition;
values come from `profile_forms.data`. This prevents a form-field change from
requiring a parallel frontend display rewrite.

The profile summary continues to use relational `name`, `email`, `program`,
`cohort`, and workflow `status` fields. Operational data remains displayed as
named internal sections from `profiles.operational_data`.

## Tables removed

The following current profile/EnrollMate tables are replaced by the JSONB
model:

```text
enrollmate_catalog_versions
enrollmate_option_sets
enrollmate_options
enrollmate_option_dependencies
profile_enrollment_data
profile_flows
profile_bachelor_data
profile_microcredential_data
profile_learner_readiness
profile_documents
profile_discovery_channels
profile_study_reasons
profile_related_people
profile_related_person_addresses
profile_payment_details
profile_study_buddy
profile_additional_info
profile_disclosures
profile_system_info
```

`profiles`, E2E workflow tables, and a renamed/reworked snapshot table remain.
The profile/EnrollMate area therefore moves from 21 tables to 3; the E2E run
tables remain unchanged.

## Migration baseline

The local database will be reset as part of this change. All existing Drizzle
migration SQL files and Drizzle metadata snapshots under `nextjs/drizzle/` are
therefore intentionally superseded and will be removed. This includes the
current `0000` through `0005` migration history, not only the EnrollMate
migrations.

After the schema is simplified, Drizzle Kit will generate one new baseline
migration and matching metadata from the complete current schema. Generated
SQL and metadata must not be edited manually. The implementation then resets,
migrates, and seeds the local database through the existing Drizzle commands.

## Explicit non-goals

- Do not change the Playwright browser suite or its browser result/reporting
  contract. Server-only Node tests may depend on and validate the shared
  contract package.
- Do not retain old form definitions or validators to execute deprecated
  profiles.
- Do not add a database-backed form-version or option catalog table.
- Do not add PostgreSQL triggers, JSON-schema extensions, or direct-SQL
  validation mechanisms.
- Do not alter unrelated authentication, smoke-test, or application tables.

## Validation requirements

- Unit-test the contract package's scrape parsing, hash generation, generated
  Zod validation, dependency rules, reusable option-set getter, and
  unsupported-field failure.
- Unit-test the Next.js E2E service's workspace shape and derived deprecation
  state.
- Generate the replacement baseline with Drizzle Kit, reset the local
  database, then integration-test JSONB persistence and the
  `UNIQUE(profile_id, flow_type)` constraint.
- Run Next.js lint, typecheck, unit tests, relevant database integration tests,
  the Playwright server-only unit tests/typecheck, and the Drizzle
  migration/seed commands. No browser Playwright tests are added or required
  for the contract package.
