# EnrollMate Profile Schema Design

**Status:** Approved

**Date:** 2026-07-09

**Authoritative source:** `playwright/enrollmate-form-fields.json`

## Context

The Next.js database must represent every applicant field and every captured predefined answer in the checked-in EnrollMate UAT scrape for:

- Bachelor applications.
- Microcredential applications.

The current branch work models controlled values with one lookup table per option category. PostgreSQL can support that table count, but those tables are infrastructure buckets rather than distinct domain entities. The repeated Drizzle tables, exports, relations, seed paths, and migrations make the design harder to maintain than necessary.

The agreed replacement is a hybrid:

> Relational domain tables, a generic relational option catalog, declarative database constraints, and JSONB only for immutable raw snapshots or option metadata.

## Guardrails

- Treat `playwright/enrollmate-form-fields.json` as authoritative input.
- Do not re-scrape or access EnrollMate UAT.
- Do not modify the scraped JSON.
- Do not use JSONB as the source of truth for profile fields.
- Do not use a general-purpose EAV `profile_field_values` table.
- Do not create one table per dropdown category.
- Do not handwrite or patch generated migration SQL.
- Use Drizzle schema definitions and `drizzle-kit generate`.
- Seed option values through TypeScript and Drizzle from the JSON.
- Preserve unrelated user work, including `repomix-output.xml`.

## Options considered

### Approved: typed relational fields with a generic option catalog

Known profile fields remain typed columns. Every controlled value points into a generic catalog. Composite foreign keys enforce option-set membership, catalog-version consistency, and dependent selections.

Benefits:

- Fewer repetitive lookup tables.
- Strong PostgreSQL integrity.
- Straightforward TypeScript reads and filters.
- Stable labels and submitted values.
- No dynamic EAV query layer.

Tradeoff:

- Controlled typed columns require companion infrastructure fields for declarative composite foreign keys.

### Rejected: dynamic field-value/EAV storage

A generic `profile_field_values` table would absorb form changes without migrations, but it would weaken TypeScript contracts, complicate requiredness rules, and make common queries harder to understand.

### Rejected: dedicated lookup table per option set

This has strong field-level foreign keys but creates repetitive Drizzle schema, relation, migration, and seed code for values that share one catalog behavior.

### Rejected: JSONB-first application storage

JSONB-first storage would weaken foreign keys, dependency validation, filtering, reporting, and protection against value drift. JSONB is limited to immutable snapshots and noncanonical metadata.

## Domain architecture

```text
profiles
  ├── profile_enrollment_data
  └── profile_flows
      ├── profile_bachelor_data
      │   ├── profile_related_people
      │   │   └── profile_related_person_addresses
      │   ├── profile_documents
      │   └── profile_study_reasons
      └── profile_microcredential_data
          └── profile_learner_readiness

profile_flows
  ├── profile_discovery_channels
  └── application_snapshots

enrollmate_catalog_versions
  └── enrollmate_option_sets
      └── enrollmate_options
          └── enrollmate_option_dependencies
```

Real domain entities remain separate relational tables. Dropdown categories do not become separate tables.

## Catalog model

### `enrollmate_catalog_versions`

Represents the source snapshot described by the JSON metadata.

```text
id
source_version
reference_date
source
created_at

UNIQUE (source_version, reference_date)
```

The initial row comes from the checked-in JSON. The schema supports later versions, but this work adds no synchronization or live checking.

### `enrollmate_option_sets`

Represents one captured select or checkbox group.

```text
catalog_version_id
key
label
is_shared
sort_order
created_at

PRIMARY KEY (catalog_version_id, key)
```

Keys are stable and explicit:

```text
shared.suffix
shared.country
shared.nationality
shared.discoveryChannels
bachelors.termApplied
bachelors.gender
bachelors.civilStatus
bachelors.monthlyIncome
bachelors.studentStatus
bachelors.programFocus
bachelors.programApplied
bachelors.withMedicalCondition
bachelors.studyReasons
microcredentials.certificationField
microcredentials.gender
microcredentials.civilStatus
microcredentials.monthlyIncome
microcredentials.studentStatus
microcredentials.deviceAccess
microcredentials.internetConnectivity
```

Identical-looking dropdowns remain field-specific unless the JSON explicitly shares their source options. Scholarship interest, medical condition, device access, and internet connectivity therefore have separate Yes/No sets. Discovery channels are shared because the microcredential section explicitly identifies them as the same options as the bachelor section.

### `enrollmate_options`

Stores exact labels and submitted values.

```text
id
catalog_version_id
option_set_key
label
submitted_value
sort_order
is_active
metadata jsonb
created_at
updated_at

FOREIGN KEY (catalog_version_id, option_set_key)
  REFERENCES enrollmate_option_sets

UNIQUE (catalog_version_id, option_set_key, submitted_value)
UNIQUE (catalog_version_id, option_set_key, id)
```

`metadata` is noncanonical overflow only, such as captured upload-format information. It does not store primary values or dependencies.

### `enrollmate_option_dependencies`

Stores captured cascading relationships:

```text
catalog_version_id
dependency_type
parent_option_id
child_option_id

PRIMARY KEY (
  catalog_version_id,
  dependency_type,
  parent_option_id,
  child_option_id
)
```

Dependency types:

- `major_to_specialization`
- `province_to_municipality`
- `municipality_to_barangay`

Composite foreign keys ensure both options belong to the dependency’s catalog version.

Only relationships explicitly present in the JSON are seeded. No national geography dataset is inferred or fetched.

## Declarative database integrity

The database must reject:

- A religion option used as gender.
- An option from a different catalog version.
- A specialization under the wrong major.
- A municipality under the wrong province.
- A barangay under the wrong municipality.
- A study-reason option used as a discovery channel.

This must be expressed through Drizzle-supported columns, checks, unique constraints, and composite foreign keys. Do not add custom triggers or handwritten migration SQL.

### Typed option columns

Known domain tables keep readable columns:

```text
gender_option_id
nationality_option_id
major_option_id
specialization_option_id
current_province_option_id
current_municipality_option_id
```

Each controlled field also has an infrastructure option-set key constrained to its expected stable key. Combined with the profile’s catalog version and option ID, it forms a composite foreign key to `enrollmate_options`.

Conceptually:

```text
(catalog_version_id, gender_option_set_key, gender_option_id)
  → enrollmate_options(catalog_version_id, option_set_key, id)
```

The companion set-key columns are persistence details and are not exposed in application DTOs.

### Dependency constraints

Tables containing dependent selections carry a constrained dependency type and use a composite foreign key to `enrollmate_option_dependencies`.

Conceptually:

```text
(catalog_version_id, "major_to_specialization", major_option_id, specialization_option_id)
  → enrollmate_option_dependencies
```

The same pattern applies to province/municipality and municipality/barangay.

If Drizzle cannot safely generate a required constraint, implementation must stop and revisit the model rather than patch generated SQL.

## Profile and flow model

### `profiles`

Shared reusable persona identity:

```text
id
name
email
catalog_version_id
status
created_by
updated_by
created_at
updated_at
```

The whole profile uses one catalog version. This prevents shared personal data from mixing versions across flows.

The existing `program` and `cohort` summary columns are no longer canonical. Their removal or transitional nullability must be handled without breaking existing reads.

### `profile_enrollment_data`

One-to-one shared applicant data:

- Given, middle, and family name.
- Suffix.
- Nickname.
- Birthplace and birthdate.
- Nationality.
- Mobile and landline.
- Current address.

Free-entry values and explicitly shared controlled catalogs remain here. Flow-specific controlled selections use their respective flow tables even when their current labels happen to match.

### `profile_flows`

```text
id
profile_id
catalog_version_id
flow_type
created_at
updated_at

UNIQUE (profile_id, flow_type)
FOREIGN KEY (profile_id, catalog_version_id)
  REFERENCES profiles(id, catalog_version_id)
```

One profile may support bachelor only, microcredentials only, or both.

## Bachelor flow

### `profile_bachelor_data`

One-to-one with a bachelor `profile_flow`:

- Term.
- Gender.
- Civil status.
- Household income.
- Student status.
- Major.
- Specialization.
- Preferred learning hub.
- Student type.
- Sub-student type.
- Religion.
- Strand.
- Last school attended.
- School-not-found interaction.
- Manual school value.
- Permanent address.
- Scholarship interest and selected scholarship.
- Medical-condition answer.
- Guardian assignment.
- Referrer given name, family name, and email.

Controlled values use generic option IDs. Major/specialization and permanent-address dependencies use composite dependency foreign keys.

### `profile_related_people`

Real repeated entities connected to bachelor data:

```text
id
bachelor_data_id
role
living_status_option_id
given_name
middle_name
family_name
suffix_option_id
birthdate
landline
mobile
email
occupation
relationship_option_id
relationship_other
created_at
updated_at

UNIQUE (bachelor_data_id, role)
```

Roles are father, mother, and guardian. Mother suffix remains null because the scraped form has no mother-suffix field.

Father and mother living-status fields retain distinct option-set keys. A role-aware check constraint ensures father rows use the father set, mother rows use the mother set, and guardian rows leave living status null.

### `profile_related_person_addresses`

```text
id
related_person_id
address_type
same_as_applicant
country_option_id
address_line_1
address_line_2
province_option_id
municipality_option_id
barangay_option_id
zip_code
created_at
updated_at

UNIQUE (related_person_id, address_type)
```

Each related person supports current and permanent addresses. `same_as_applicant` preserves the exact checkbox interaction.

### `profile_documents`

Bachelor-scoped PID and PHSC fixture data:

- Fixture URI.
- Original filename.
- MIME type.
- Size.
- Existing archive links and submitted dates.

The captured accepted extensions and 3 MB limit are represented through Drizzle schema checks or typed validation derived from the JSON. No live verification is needed.

## Microcredential flow

### `profile_microcredential_data`

One-to-one with a microcredential `profile_flow`:

- Certification field option.
- Gender.
- Civil status.
- Household income.
- Student status.
- Applicant TIN.

Applicant TIN is application data. Existing payment/business TIN fields retain their separate downstream meaning.

### `profile_learner_readiness`

One-to-one with microcredential data:

- Device access.
- Internet connectivity.
- Software skills.
- Online-learning-platform experience.
- Time commitment.
- Self-discipline confidence.
- Time-management effectiveness.
- Learning goal.
- Optional challenges free text.

All predefined answers use field-specific generic option sets.

## Multi-selects

### `profile_discovery_channels`

Flow-scoped because bachelor and microcredential flows may choose different answers:

```text
profile_flow_id
catalog_version_id
option_set_key
option_id

PRIMARY KEY (profile_flow_id, option_id)
```

Composite foreign keys enforce the flow catalog version and expected discovery-channel set.

### `profile_study_reasons`

Bachelor-scoped:

```text
bachelor_data_id
catalog_version_id
option_set_key
option_id

PRIMARY KEY (bachelor_data_id, option_id)
```

The existing delimited `how_did_you_find_out` text is legacy and not canonical.

## Immutable snapshots

### `application_snapshots`

```text
id
profile_flow_id
e2e_run_id nullable
catalog_version_id
payload_hash
raw_payload jsonb
captured_at
```

Rules:

- Relational profile tables remain the editable source of truth.
- Snapshots are append-only through the repository/service contract.
- A snapshot stores the exact prepared or submitted payload.
- The catalog version remains fixed even if the profile later changes.
- `payload_hash` supports deduplication and audit comparison.
- Snapshot introduction does not require runner behavior changes in the schema migration itself.

## Data loading and seeding

The seed path:

1. Read `playwright/enrollmate-form-fields.json`.
2. Validate the expected JSON structure.
3. Insert one catalog-version row.
4. Insert option sets for each captured field/shared catalog.
5. Insert exact options in source order.
6. Insert explicit dependency edges.
7. Insert profile fixtures through Drizzle using resolved option IDs.
8. Fail on missing parents, duplicate values, unknown option-set keys, or unmatched fixture values.

No option values are hardcoded into migrations. Stable option-set keys live in TypeScript schema/seed configuration because they define persistence contracts, not scraped answers.

## Migration strategy

The dedicated-option implementation and migrations `0003–0005` are currently uncommitted and untracked. They are not repository history.

Implementation will:

1. Preserve committed migrations `0000–0002`.
2. Preserve unrelated working-tree files.
3. Replace the uncommitted dedicated-option schema and generated artifacts.
4. Define the approved generic schema in Drizzle.
5. Generate one coherent migration with `drizzle-kit generate`.
6. Never edit the generated SQL manually.
7. Seed option data and backfill fixtures through TypeScript/Drizzle transactions.
8. Fail on unmatched legacy fixture values instead of coercing or inventing answers.

## Error handling

- JSON shape mismatch: fail before database writes.
- Duplicate option-set key/value: fail the seed transaction.
- Missing dependency parent: fail the seed transaction.
- Unknown profile fixture value: fail with field key and submitted value.
- Wrong option-set membership: database foreign-key failure.
- Cross-version selection: database foreign-key failure.
- Invalid dependent selection: database foreign-key failure.
- Snapshot payload serialization failure: do not insert a partial snapshot.

## Verification

Tests must prove:

- Exact JSON option counts and ordering.
- No seeded option exists outside the JSON.
- Field-specific Yes/No sets remain distinct.
- Explicit shared sets are reused.
- Wrong option-set membership fails.
- Cross-version assignment fails.
- Invalid major/specialization fails.
- Invalid province/municipality fails.
- Invalid municipality/barangay fails.
- One profile supports both flows.
- Shared, bachelor, and microcredential data remain isolated correctly.
- Father, mother, guardian, and six related-person address slots are representable.
- Discovery channels are flow-scoped.
- Study reasons are bachelor-scoped.
- Snapshots preserve raw JSON and catalog version.
- Repeated seeding is idempotent.
- Drizzle migration generation requires no manual SQL edits.
- Full tests, typecheck, lint, and production build pass.
- The scraped JSON remains unchanged.
- No UAT or browser access occurs.

## Final decision

Use a relational core with:

- Typed shared and flow-specific domain tables.
- A generic versioned option catalog.
- Declarative composite foreign-key integrity.
- Relational dependency edges.
- Relational multi-selects.
- JSONB only for immutable snapshots and noncanonical metadata.

This is the agreed replacement for the dedicated lookup-table design.
