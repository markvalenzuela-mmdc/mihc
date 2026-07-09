# EnrollMate Profile Schema Design

**Status:** Approved and corrected

**Date:** 2026-07-09

**Authoritative source:** `playwright/enrollmate-form-fields.json`

## Scope correction

The checked-in JSON is the completed UAT scrape and is the sole source of truth for this work.

This work will not:

- Re-scrape EnrollMate.
- Open or verify the UAT site.
- Expand the captured municipality or barangay examples.
- Modify the Playwright JSON.
- Add catalog synchronization or drift detection.
- Redesign the E2E UI, API routes, runner, or workflow.

The implementation only changes the Next.js database schema, its relations, seed data, migrations, fixtures required by the seed, and schema-focused tests.

## Goal

Store every field represented by the JSON for both bachelor and microcredential flows. Every predefined answer captured in the JSON must be a hard database value rather than arbitrary text.

One profile may support:

- Bachelor only.
- Microcredentials only.
- Both flows.

## Existing-schema verdict

The current schema is not sufficient.

It already covers most shared applicant data, both applicant addresses, bachelor program selections, microcredential learner-readiness answers, and document archive links. It does not fully cover:

- Nickname.
- School-not-found interaction and manual school value.
- Selected scholarship.
- Referrer name and email.
- Full father details.
- Full mother details.
- Guardian middle name, landline, and other relationship.
- Father, mother, and guardian current/permanent addresses.
- Multi-select discovery channels.
- Multi-select bachelor study reasons.
- Explicit bachelor/microcredential support on a profile.
- Hard constraints for dropdown, select, and checkbox-group answers.

## Profile composition

Keep `profiles` as the shared persona identity. Add `profile_flows`:

```text
profile_flows
  id
  profile_id
  flow_type       bachelors | microcredentials
  created_at
  updated_at

UNIQUE (profile_id, flow_type)
```

Shared personal values remain in `profile_enrollment_data`. Bachelor-only and microcredential-only columns may coexist there because a profile has at most one configuration for each flow.

`profiles.program` and `profiles.cohort` remain transitional display fields. They become nullable because the microcredential form has no cohort and uses `certificationField` instead of a bachelor program.

## Hard-value catalogs

Use lookup tables seeded exactly from the checked-in JSON. Each row stores:

```text
id
label
submitted_value
sort_order
source_version
```

Keep labels and submitted values separately even though the current scrape uses identical values.

Create lookup tables for:

- Terms.
- Majors.
- Specializations.
- Suffixes.
- Genders.
- Nationalities.
- Civil statuses.
- Monthly-income ranges.
- Learning hubs.
- Student types.
- Sub-student types.
- Student statuses.
- Religions.
- Strands.
- Scholarships.
- Yes/no answers.
- Parent living statuses.
- Guardian assignments.
- Guardian relationships.
- Certification fields.
- Time commitments.
- Self-discipline answers.
- Time-management answers.
- Learning goals.
- Discovery channels.
- Study reasons.
- Countries.
- Provinces.
- Captured municipalities.
- Captured barangays.

The initial seed uses only values present in `enrollmate-form-fields.json`. It does not fetch or infer additional values.

### Dependencies

Represent captured dependencies with foreign keys:

```text
specializations.major_id
municipalities.province_id
barangays.municipality_id
```

This enforces the major-specialization and captured geographic relationships already present in the JSON.

## Applicant data

Retain free-entry values as `text`, `date`, or `boolean`. Replace controlled-value text columns with lookup foreign keys.

Add to `profile_enrollment_data`:

- `nickname`.
- `school_not_found`.
- `last_school_other`.
- Scholarship lookup reference.
- Lookup references for every existing controlled field.

Retain `school_not_found` because it controls which UI path the test uses.

Add to `profile_additional_info`:

- `referrer_given_name`.
- `referrer_family_name`.
- `referrer_email`.

Do not reuse `profile_study_buddy`; it represents a different concept.

## Checkbox groups

Do not store checkbox groups in delimited text.

```text
profile_discovery_channels
  profile_flow_id
  discovery_channel_id

PRIMARY KEY (profile_flow_id, discovery_channel_id)
```

```text
profile_study_reasons
  profile_flow_id
  study_reason_id

PRIMARY KEY (profile_flow_id, study_reason_id)
```

Discovery channels serve both flows. Study reasons serve bachelor profiles.

The existing `profile_additional_info.how_did_you_find_out` becomes legacy and is no longer the canonical field.

## Father, mother, and guardian

Add one normalized related-person table:

```text
profile_related_people
  id
  profile_id
  role                  father | mother | guardian
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

Mother suffix remains null because the scraped form does not expose that field.

Add addresses:

```text
profile_related_person_addresses
  id
  related_person_id
  address_type           current | permanent
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

`same_as_applicant` stores the exact checkbox interaction represented in the JSON.

The existing partial father, mother, and guardian columns remain during migration and may be removed only after their values are preserved.

## Microcredential data

Reuse:

- `profile_enrollment_data.certification_field`, converted to a lookup reference.
- `profile_payment_details.tin_number`.
- `profile_learner_readiness`.

Convert learner-readiness controlled text fields to lookup references:

| JSON field | Schema concept |
|---|---|
| `deviceAccess` | computer device access |
| `internetConnectivity` | internet connectivity |
| `softwareSkills` | software skills |
| `onlineLearningPlatforms` | online-learning-platform experience |
| `timeCommitment` | time commitment |
| `selfDiscipline` | self-discipline confidence |
| `timeManagement` | time-management effectiveness |
| `learningGoals` | learning goal |

`challenges` remains free text.

## Documents

Keep the existing PID and PHSC archive-link columns. Add fixture metadata needed to represent the scraped file inputs:

- Fixture URI.
- Original filename.
- MIME type.
- Size in bytes.

The accepted extensions and 3 MB limit are schema-validation constants derived from the JSON; no external verification is required.

## Migration strategy

1. Add lookup tables and seed exact JSON values.
2. Add profile-flow, related-person, address, checkbox-group, and missing-field tables/columns.
3. Add lookup-ID columns alongside legacy controlled text columns.
4. Backfill by exact submitted-value match.
5. Report unmatched legacy fixture values rather than coercing them.
6. Switch seed fixtures to lookup IDs.
7. Retain or remove legacy columns only after preservation is verified.

Negative-test profile fields may remain nullable. Hard values mean that any populated controlled answer must reference a captured option; it does not mean every profile row must be complete.

## Verification

- Every option explicitly present in the JSON is seeded once with its label and submitted value.
- No option outside the JSON is added.
- Every populated controlled profile field references a lookup row.
- Major-specialization and captured geographic dependencies are enforced.
- Checkbox groups support multiple selections without delimited text.
- Bachelor relatives and their addresses cover every scraped field.
- One profile can have both flow rows.
- Existing profile and run data survives the migration.
- Tests inspect the schema and database only; they do not contact UAT.

## Decision

Implement the schema against the checked-in UAT scrape exactly as it exists. The JSON is input, not work to repeat.
