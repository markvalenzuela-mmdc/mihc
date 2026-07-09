# EnrollMate Profile Schema Design

**Status:** Approved

**Date:** 2026-07-09

**Source:** `playwright/enrollmate-form-fields.json`, extracted from EnrollMate UAT 1.8.3 on 2026-07-08

## Context

The Next.js database must store reusable Playwright personas that can complete either EnrollMate application flow:

- Bachelor’s degree: four steps
- Microcredentials: three steps

The current schema has a useful shared-profile foundation, but it does not cover every live form field and stores most predefined answers as unconstrained text. The scraped select, checkbox-group, and dependent-select values are intended to become hard values. Profiles must not contain arbitrary strings for controls whose answers are predefined by EnrollMate.

## Goals

1. Use one reusable profile identity for bachelor’s, microcredential, or both flows.
2. Store every applicant-entered field needed to reproduce either live form.
3. Constrain predefined answers to values observed or otherwise authoritatively sourced from EnrollMate.
4. Preserve old controlled values so existing profiles and historical runs remain replayable after EnrollMate changes.
5. Represent dependent options, including major to specialization and province to municipality to barangay.
6. Keep the schema typed and queryable rather than storing form payloads as unstructured JSON.
7. Validate a profile against the selected flow before starting Playwright.

## Non-goals

- Recreating EnrollMate’s production database.
- Storing confirmation-page buttons as profile data.
- Treating the current example municipality and barangay values as complete Philippine catalogs.
- Replacing controlled catalogs with free-text fallbacks.
- Redesigning unrelated smoke-test or authentication tables.

## Decisions

### One profile, multiple flow configurations

`profiles` remains the reusable person/test-persona identity. A new `profile_flows` table records which application flows the profile can execute.

```text
profiles
  id
  name
  email
  catalog_version_id
  created_by
  updated_by
  created_at
  updated_at

profile_flows
  id
  profile_id
  flow_type                 bachelors | microcredentials
  created_at
  updated_at

UNIQUE (profile_id, flow_type)
```

A profile may have one bachelor flow, one microcredential flow, or both. Shared identity and personal data are stored once. Flow-specific data remains optional until the corresponding flow is enabled.

The catalog version belongs to the profile as a whole because the two flow configurations reuse the same controlled personal and address values. Updating a profile to a newer catalog is therefore an explicit whole-profile migration. A profile cannot mix controlled values from different catalog versions.

`profiles.program` and `profiles.cohort` cannot remain mandatory sources of truth:

- Microcredentials has a certification field but no cohort.
- A profile enabled for both flows has no single unambiguous program.
- Bachelor term, major, and specialization already have more precise meanings.

They should be removed, made nullable transitional display fields, or replaced by derived flow summaries. The implementation plan must choose a migration path based on current frontend dependencies.

### Runs identify the executed flow

`e2e_runs` must reference `profile_flow_id`, not only `profile_id`. It must also snapshot the profile's catalog version used by the run. This makes bachelor and microcredential history distinguishable and preserves the interpretation of every controlled answer if the profile is migrated later.

### Versioned hard-value catalogs

Every predefined form answer is controlled. “Dynamic” in the source JSON means dependency-driven, not arbitrary.

Use a catalog version entity:

```text
enrollmate_catalog_versions
  id
  source_application_version
  source_environment
  reference_date
  is_current
  created_at
```

Catalog rows belong to a version and are never physically deleted while profiles or runs reference them. When EnrollMate changes:

1. Create a new catalog version.
2. Seed the exact current values and dependency edges.
3. Keep old catalog rows readable.
4. Leave existing profiles on their original version until the whole profile is explicitly migrated.
5. Record the selected version on each E2E run.

Labels and submitted values must both be stored even though they are currently identical. This protects the integration if EnrollMate later separates display labels from submitted values.

### Catalog modeling strategy

Use dedicated lookup tables for large, reusable, mutable, or relational sets. Use database enums or check constraints only for genuinely stable internal concepts.

Stable internal concepts:

- Flow type
- Related-person role
- Address type
- E2E run status

EnrollMate-controlled values belong in versioned lookup tables, including yes/no answers. They must not be PostgreSQL enums because EnrollMate can rename or retire them independently of this application.

Each lookup row should contain:

```text
id
catalog_version_id
label
submitted_value
sort_order
is_active
```

The relevant tables are:

- `enrollmate_terms`
- `enrollmate_majors`
- `enrollmate_specializations`
- `enrollmate_suffixes`
- `enrollmate_genders`
- `enrollmate_nationalities`
- `enrollmate_civil_statuses`
- `enrollmate_income_brackets`
- `enrollmate_learning_hubs`
- `enrollmate_student_types`
- `enrollmate_sub_student_types`
- `enrollmate_student_statuses`
- `enrollmate_religions`
- `enrollmate_strands`
- `enrollmate_scholarships`
- `enrollmate_yes_no_answers`
- `enrollmate_living_statuses`
- `enrollmate_guardian_assignments`
- `enrollmate_guardian_relationships`
- `enrollmate_certification_fields`
- `enrollmate_time_commitments`
- `enrollmate_self_discipline_levels`
- `enrollmate_time_management_levels`
- `enrollmate_learning_goals`
- `enrollmate_discovery_channels`
- `enrollmate_study_reasons`
- `enrollmate_countries`
- `enrollmate_provinces`
- `enrollmate_municipalities`
- `enrollmate_barangays`

Foreign keys replace the corresponding free-text profile columns. A selected option must belong to the same catalog version as its profile. Use composite foreign keys or equivalent transaction-level enforcement where an ordinary option-id foreign key cannot enforce that invariant alone.

### Initial catalog baseline

The approved source currently contains:

- 136 nationalities
- 92 religions
- 195 countries
- 84 provinces
- 10 suffixes
- 2 majors and 8 dependent specializations
- 8 scholarships
- 4 certification fields
- 11 discovery channels
- 8 bachelor study reasons
- 10 microcredential learning goals

The remaining smaller select sets must also be imported exactly, including their order, labels, submitted values, requiredness, and conditional visibility.

### Dependent selections

Dependencies are represented by foreign keys:

```text
enrollmate_specializations.major_id
enrollmate_municipalities.province_id
enrollmate_barangays.municipality_id
```

This prevents invalid combinations such as a Business Administration specialization under Information Technology or a barangay under the wrong municipality.

The scraped JSON contains complete captured major-to-specialization values, but only example municipality and barangay values. Before implementation can claim full hard-value coverage, the complete EnrollMate municipality and barangay option sets must be extracted for every supported province. The current examples must not be seeded as exhaustive catalogs.

### Checkbox groups

Checkbox groups are many-to-many selections, not delimited text.

```text
profile_discovery_channels
  profile_flow_id
  discovery_channel_id

profile_study_reasons
  profile_flow_id
  study_reason_id
```

`profile_discovery_channels` applies to both flows. `profile_study_reasons` applies to bachelor profiles only.

The current `profile_additional_info.how_did_you_find_out` text column is insufficient and should be migrated to the junction-table representation.

## Profile Aggregate

### Shared applicant data

Continue using `profile_enrollment_data` as the shared applicant data record. Both flows can reuse:

- Given, middle, and family name
- Suffix
- Email from `profiles`
- Birthdate and birthplace
- Gender
- Nationality
- Civil status
- Household income
- Mobile and landline
- Student status
- Current address

Controlled columns become lookup foreign keys. Free-entry values remain text, date, or boolean as appropriate.

Add the missing free-entry or interaction fields:

- `nickname`
- `school_not_found`
- `last_school_other`

`school_not_found` must be retained even though it can sometimes be inferred from `last_school_other`, because it determines the exact Playwright interaction path.

### Bachelor-specific data

The existing enrollment table can continue to hold bachelor-specific values:

- Term
- Major
- Specialization
- Preferred learning hub
- Student type
- Sub-student type
- Religion
- Strand
- Last school attended
- Current and permanent address
- Scholarship interest
- Scholarship selection
- Medical-condition answer

Add:

- Scholarship lookup foreign key
- Referrer given name
- Referrer family name
- Referrer email

The referrer fields may live in `profile_additional_info` because they describe acquisition/referral context. They must not reuse `profile_study_buddy`; a study-buddy nominee and a person who referred the applicant are different business concepts.

### Microcredential-specific data

Reuse:

- `profile_enrollment_data.certification_field`, converted to a lookup foreign key
- `profile_payment_details.tin_number`
- `profile_learner_readiness`

The learner-readiness mappings are:

| EnrollMate field | Existing schema concept | Required type |
|---|---|---|
| `deviceAccess` | `computerDeviceAccess` | yes/no lookup FK |
| `internetConnectivity` | `internetConnectivity` | yes/no lookup FK |
| `softwareSkills` | `softwareSkills` | yes/no lookup FK |
| `onlineLearningPlatforms` | `onlineLearningPlatforms` | yes/no lookup FK |
| `timeCommitment` | `timeCommitment` | time-commitment lookup FK |
| `selfDiscipline` | `selfDisciplineConfidence` | confidence lookup FK |
| `timeManagement` | `timeManagementEffectiveness` | effectiveness lookup FK |
| `learningGoals` | `learningGoal` | learning-goal lookup FK |
| `challenges` | `potentialChallenges` | free text |

`tin_number` can initially be composed from `profile_payment_details`, although a later rename or relocation may improve semantics.

## Related People and Addresses

The bachelor form requires complete father, mother, and optional guardian records. Adding dozens of role-prefixed columns to `profile_enrollment_data` would create a wide, repetitive table.

Add:

```text
profile_related_people
  id
  profile_id
  role                       father | mother | guardian
  living_status_id
  given_name
  middle_name
  family_name
  suffix_id
  birthdate
  landline
  mobile
  email
  occupation
  relationship_id
  relationship_other
  created_at
  updated_at

UNIQUE (profile_id, role)
```

Mother has no suffix field in the current live form. `suffix_id` remains nullable.

Add:

```text
profile_related_person_addresses
  id
  related_person_id
  address_type               current | permanent
  same_as_applicant
  country_id
  address_line_1
  address_line_2
  province_id
  municipality_id
  barangay_id
  zip_code
  created_at
  updated_at

UNIQUE (related_person_id, address_type)
```

`same_as_applicant` is stored because it controls the Playwright checkbox path. When true, the stored address must either match the relevant applicant address or be omitted and resolved from the applicant at payload-composition time. The implementation should choose one invariant and enforce it consistently; storing a contradictory copied address is not allowed.

The guardian assignment remains a controlled answer on the bachelor flow. Guardian-specific fields are required only when the selected assignment is `Others`.

## Documents

The bachelor flow accepts:

- Applicant personal ID (`PID`)
- Proof of high-school completion (`PHSC`)

The existing Google Drive link fields describe archived documents but do not fully define an automation fixture. Add an explicit fixture source contract, for example:

```text
fixture_uri
original_filename
mime_type
size_bytes
```

Playwright must be able to resolve `fixture_uri` to a local file before calling `setInputFiles`.

Accepted extensions and the 3 MB maximum are versioned form-validation metadata, not applicant answers. The application validator must enforce the exact constraints captured for the selected catalog version.

## Validation

Database foreign keys enforce that selected controlled values exist. Flow validators enforce conditional requiredness and cross-field rules that are unsuitable for simple `NOT NULL` constraints.

### Bachelor readiness

The validator must require:

- All live required applicant fields
- A valid major and specialization pair
- Complete applicant current and permanent addresses
- Scholarship selection when scholarship interest is Yes
- Full father and mother records and addresses
- Guardian-specific details and addresses when guardian assignment is Others
- At least one discovery channel
- At least one study reason
- Valid optional document fixtures when supplied

### Microcredential readiness

The validator must require:

- All live required basic-information fields
- A valid certification field
- Complete current address
- Every required learner-readiness answer
- At least one discovery channel

Nationality remains optional for microcredentials and required for bachelor’s, matching the live forms.

### Negative-test profiles

Database columns may remain nullable so deliberately invalid profiles can exist for negative testing. A run request must specify whether it expects a valid submission or a particular validation failure. Normal successful runs cannot start unless the selected flow passes its validator.

## Catalog Synchronization

The JSON reference is the initial catalog input, not a permanently trusted mirror.

An update workflow should:

1. Scrape the live UAT form.
2. Normalize labels, submitted values, ordering, and dependency edges.
3. Compare the result with the current catalog version.
4. Fail visibly on additions, removals, renames, or dependency changes.
5. Require review before creating and activating a new catalog version.
6. Seed the approved version idempotently.

Automated drift detection must not silently rewrite existing profile selections.

## Options Considered

### Approved: shared profile plus versioned relational catalogs

Advantages:

- One persona can execute both flows.
- Database-enforced controlled values.
- Historical profiles remain replayable.
- Dependencies are queryable and enforceable.
- Missing fields can be added without duplicating shared identity.

Trade-off:

- More tables and migration work.

### Rejected: PostgreSQL enums for every dropdown

Enums work for internal states but are cumbersome for large or changing external catalogs. They do not naturally model versions, labels versus submitted values, ordering, retirement, or parent-child dependencies.

### Rejected: TypeScript constants with text database columns

This constrains only application code. Imports, scripts, manual SQL, and stale code paths could still write invalid values.

### Rejected: JSONB payload per flow

JSONB would make catalog membership, foreign keys, dependency validation, migrations, and field-level querying weaker. It also obscures schema coverage.

## Migration Sequence

1. Obtain complete municipality and barangay catalogs from EnrollMate.
2. Add catalog-version and controlled-value tables.
3. Seed the approved UAT 1.8.3 catalog.
4. Add `profile_flows`.
5. Add missing applicant, related-person, address, checkbox-group, and document-fixture structures.
6. Backfill existing text values by exact submitted-value match.
7. Report and manually resolve every unmatched legacy value.
8. Switch reads and writes to lookup foreign keys.
9. Add `profile_flow_id` and catalog version to E2E runs.
10. Add bachelor and microcredential readiness validators.
11. Remove or deprecate superseded text columns only after verification.

## Verification

- Every select and checkbox option in the approved source exists exactly once in its catalog version.
- Every submitted label/value pair matches the source JSON.
- Major-specialization and geographic dependency edges are complete.
- Arbitrary controlled text cannot be inserted through normal profile writes.
- A single profile can pass readiness for both flows.
- Bachelor profiles cover all parent, guardian, address, referral, scholarship, document, discovery-channel, and study-reason fields.
- Microcredential profiles cover all basic-information, certification, learner-readiness, and discovery-channel fields.
- Old profiles still resolve their original values after a newer catalog version is activated.
- E2E run history identifies both the flow and catalog version.
- Existing user-owned changes remain intact and unrelated code paths are untouched.

## Open Implementation Prerequisite

The design has no unresolved product decision. It has one external-data prerequisite: acquire the complete EnrollMate municipality and barangay option sets. Implementation may build the schema and import pipeline before that data is available, but full catalog activation and “all hard values covered” verification cannot pass without it.
