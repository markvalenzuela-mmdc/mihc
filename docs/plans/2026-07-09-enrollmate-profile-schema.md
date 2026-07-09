# EnrollMate Profile Schema Implementation Plan

> **For agentic workers:** Implement inline and task-by-task. Do not re-scrape, browse, verify, or modify the UAT-derived JSON.

**Goal:** Revise the Next.js schema so it stores every field and every captured predefined answer in `playwright/enrollmate-form-fields.json` for both EnrollMate flows.

**Architecture:** Keep one shared profile, add bachelor/microcredential flow rows, seed relational lookup tables from the checked-in JSON, and normalize repeated relatives and addresses. Limit changes to Next.js schema, relations, seed fixtures, migrations, and schema-focused tests.

**Source of truth:** `playwright/enrollmate-form-fields.json`

---

## Guardrails

- Do not access EnrollMate UAT.
- Do not create browser or extraction scripts.
- Do not modify `playwright/enrollmate-form-fields.json`.
- Do not add external-data prerequisites.
- Do not add catalog synchronization.
- Do not redesign frontend components, API routes, E2E execution, or Playwright tests.
- Seed only values already present in the JSON.
- Preserve existing data with additive migrations and exact-value backfills.

## Files

### Create

- `nextjs/lib/drizzle/schema/enrollmate-options.ts`
- `nextjs/lib/drizzle/schema/profile-relatives.ts`
- `nextjs/lib/drizzle/enrollmate-option-source.ts`
- `nextjs/lib/drizzle/seed-enrollmate-options.ts`
- `nextjs/__tests__/unit/lib/enrollmate-option-source.test.ts`
- `nextjs/__tests__/integration/enrollmate-profile-schema.test.ts`
- Generated Drizzle migration and snapshot files under `nextjs/drizzle/`

### Modify

- `nextjs/lib/drizzle/schema/profiles.ts`
- `nextjs/lib/drizzle/schema/relations.ts`
- `nextjs/lib/drizzle/schema/index.ts`
- `nextjs/lib/drizzle/seed.ts`
- `nextjs/lib/mock-testing-data.ts`
- Existing schema-derived E2E types only where compilation requires nullable `program` or `cohort`

## Task 1: Parse the checked-in option values

**Files:**

- Create: `nextjs/lib/drizzle/enrollmate-option-source.ts`
- Create: `nextjs/__tests__/unit/lib/enrollmate-option-source.test.ts`

- [ ] Write a failing test that loads `playwright/enrollmate-form-fields.json` and asserts the captured baselines:

```ts
expect(source.version).toBe("1.8.3");
expect(source.nationalities).toHaveLength(136);
expect(source.religions).toHaveLength(92);
expect(source.countries).toHaveLength(195);
expect(source.provinces).toHaveLength(84);
expect(source.majors).toHaveLength(2);
expect(source.specializations).toHaveLength(8);
expect(source.scholarships).toHaveLength(8);
expect(source.certificationFields).toHaveLength(4);
expect(source.discoveryChannels).toHaveLength(11);
expect(source.studyReasons).toHaveLength(8);
expect(source.learningGoals).toHaveLength(10);
```

- [ ] Assert that every explicitly listed option has a non-empty label and submitted value and is unique within its captured field or parent.

- [ ] Implement `loadEnrollmateOptionSource()` by reading the checked-in JSON from `../playwright/`. Preserve source order as `sortOrder`.

- [ ] Extract only explicitly present values. For cities and barangays, import the captured examples and their declared parents; do not supplement them.

- [ ] Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/lib/enrollmate-option-source.test.ts
```

Expected: PASS without network access.

## Task 2: Add hard-value lookup tables

**Files:**

- Create: `nextjs/lib/drizzle/schema/enrollmate-options.ts`
- Modify: `nextjs/lib/drizzle/schema/index.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`

- [ ] Add a common lookup shape:

```text
id uuid primary key
label text not null
submitted_value text not null
sort_order integer not null
source_version text not null
unique (source_version, submitted_value)
```

- [ ] Create dedicated lookup tables for every controlled set listed in the approved design:

```text
terms
majors
specializations
suffixes
genders
nationalities
civil_statuses
income_brackets
learning_hubs
student_types
sub_student_types
student_statuses
religions
strands
scholarships
yes_no_answers
living_statuses
guardian_assignments
guardian_relationships
certification_fields
time_commitments
self_discipline_levels
time_management_levels
learning_goals
discovery_channels
study_reasons
countries
provinces
municipalities
barangays
```

- [ ] Add `major_id` to specializations, `province_id` to municipalities, and `municipality_id` to barangays.

- [ ] Export the tables and add their Drizzle relations.

- [ ] Generate the additive migration:

```powershell
cd nextjs
pnpm exec drizzle-kit generate --name enrollmate_options
```

## Task 3: Seed exactly the scraped options

**Files:**

- Create: `nextjs/lib/drizzle/seed-enrollmate-options.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Create: `nextjs/__tests__/integration/enrollmate-profile-schema.test.ts`

- [ ] Write an integration test that runs the seed twice and confirms stable row counts.

- [ ] Implement deterministic IDs from:

```text
enrollmate-option:<source-version>:<table>:<parent-value>:<submitted-value>
```

- [ ] Insert independent option sets first, then majors/specializations and province/municipality/barangay dependencies.

- [ ] Use `onConflictDoUpdate` for label and ordering changes while preserving deterministic IDs.

- [ ] Call option seeding before profile seeding.

- [ ] Assert that database labels and submitted values exactly equal the JSON-derived arrays and contain no additional values.

## Task 4: Add unified profile flows and missing applicant fields

**Files:**

- Modify: `nextjs/lib/drizzle/schema/profiles.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`
- Modify: `nextjs/lib/mock-testing-data.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/enrollmate-profile-schema.test.ts`

- [ ] Add `profile_flows` with unique `(profile_id, flow_type)` and flow type limited to `bachelors | microcredentials`.

- [ ] Make transitional `profiles.program` and `profiles.cohort` nullable.

- [ ] Add applicant fields:

```text
nickname
school_not_found
last_school_other
```

- [ ] Add referrer given name, family name, and email to `profile_additional_info`.

- [ ] Add lookup-ID columns for every controlled applicant, bachelor, address, and learner-readiness value currently stored as text.

- [ ] Keep legacy text columns during backfill; do not destructively rename or drop them in the generated migration.

- [ ] Add:

```text
profile_discovery_channels (profile_flow_id, discovery_channel_id)
profile_study_reasons (profile_flow_id, study_reason_id)
```

with composite primary keys.

- [ ] Update fixtures so at least one profile supports both flows and every populated controlled value exactly matches the JSON.

## Task 5: Add complete bachelor relatives and addresses

**Files:**

- Create: `nextjs/lib/drizzle/schema/profile-relatives.ts`
- Modify: `nextjs/lib/drizzle/schema/index.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`
- Modify: `nextjs/lib/mock-testing-data.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/enrollmate-profile-schema.test.ts`

- [ ] Add `profile_related_people` with:

```text
profile_id
role
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
unique (profile_id, role)
```

- [ ] Add `profile_related_person_addresses` with:

```text
related_person_id
address_type
same_as_applicant
country_id
address_line_1
address_line_2
province_id
municipality_id
barangay_id
zip_code
unique (related_person_id, address_type)
```

- [ ] Limit roles to father, mother, and guardian; limit address type to current and permanent.

- [ ] Seed father, mother, and optional guardian records using hard option references.

- [ ] Preserve existing partial parent/guardian columns until the backfill is verified.

## Task 6: Represent PID and PHSC fixture inputs

**Files:**

- Modify: `nextjs/lib/drizzle/schema/profiles.ts`
- Modify: `nextjs/lib/mock-testing-data.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/enrollmate-profile-schema.test.ts`

- [ ] Add PID and PHSC fixture URI, original filename, MIME type, and size columns to `profile_documents`.

- [ ] Preserve existing Google Drive archive links and submitted dates.

- [ ] Add non-negative size constraints.

- [ ] Test the captured 3 MB limit and accepted extensions in schema-focused validation helpers without contacting UAT.

## Task 7: Generate and harden the migration

**Files:**

- Modify: generated files under `nextjs/drizzle/`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/enrollmate-profile-schema.test.ts`

- [ ] Generate:

```powershell
cd nextjs
pnpm exec drizzle-kit generate --name enrollmate_profile_schema
```

- [ ] Inspect the SQL and reject any destructive drop of existing profile data.

- [ ] Backfill lookup IDs by exact `submitted_value` equality.

- [ ] If an existing fixture value is absent from the JSON, update the fixture to a captured value; do not add an invented option.

- [ ] Backfill existing father/mother status and partial guardian data into related-person rows.

- [ ] Keep incomplete relative fields null rather than fabricating data.

- [ ] Apply migrations to the test database and seed twice:

```powershell
cd nextjs
pnpm run db:test:setup
pnpm run db:seed
```

Expected: both commands succeed and the second seed adds no duplicate options.

## Task 8: Prove JSON-to-schema coverage

**Files:**

- Modify: `nextjs/__tests__/integration/enrollmate-profile-schema.test.ts`

- [ ] Compare every captured option array against ordered database rows.

- [ ] Assert there are no database option values absent from the JSON.

- [ ] Assert one profile has both flow rows.

- [ ] Assert all controlled populated profile fields have valid foreign keys.

- [ ] Assert multiple discovery channels and study reasons can be selected.

- [ ] Assert invalid major-specialization and captured geography relationships fail.

- [ ] Assert father, mother, guardian, and six related-person address slots are representable.

- [ ] Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/lib/enrollmate-option-source.test.ts
pnpm test -- __tests__/integration/enrollmate-profile-schema.test.ts
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Expected: all commands pass without network access.

## Completion criteria

- Only Next.js schema-related code, fixtures, migrations, and tests changed.
- The checked-in JSON was not modified.
- No UAT or browser request was made.
- Every explicitly scraped predefined answer is stored as a hard lookup value.
- Every scraped free-entry field has a schema column.
- One profile supports both flows.
- Existing data is preserved through additive migration and exact backfill.
