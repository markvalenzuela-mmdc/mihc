# EnrollMate Profile Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one versioned, relational profile aggregate that can populate every controlled and free-entry field in both EnrollMate application flows.

**Architecture:** Keep `profiles` as the shared persona, add one flow configuration per supported application type, and attach the profile to an immutable EnrollMate catalog version. Store externally controlled answers in versioned lookup tables, multi-select answers in junction tables, and bachelor relatives and addresses in normalized child tables. Compose and validate a flow-specific payload before any E2E run is created.

**Tech Stack:** TypeScript 5, Next.js 16, Drizzle ORM 0.45, PostgreSQL, Zod 4, Vitest 4, Playwright 1.61

---

## Delivery boundaries

This plan is implemented in five dependent phases:

1. Complete and verify the source catalog.
2. Add and seed versioned lookup tables.
3. Add the profile aggregate and migrate legacy profile data.
4. Compose and validate bachelor and microcredential payloads.
5. Associate E2E history with a flow and catalog snapshot.

Do not activate the catalog or claim complete coverage until the geography extraction test proves that the municipality and barangay data is complete. The current JSON contains examples only.

## File map

### Playwright source catalog

- Create `playwright/scripts/extract-enrollmate-geography.ts` — extract every province, municipality, and barangay dependency from UAT.
- Create `playwright/server/catalog/normalize-geography.ts` — pure normalization and duplicate detection.
- Create `playwright/server/catalog/normalize-geography.test.ts` — unit tests for deterministic normalization.
- Modify `playwright/package.json` — add catalog extraction and catalog verification commands.
- Modify `playwright/enrollmate-form-fields.json` — replace example geography values with complete dependency maps and extraction metadata.

### Next.js catalog and persistence

- Create `nextjs/lib/drizzle/schema/enrollmate-catalogs.ts` — catalog version and controlled-value lookup tables.
- Create `nextjs/lib/drizzle/schema/profile-relatives.ts` — related people and their addresses.
- Modify `nextjs/lib/drizzle/schema/profiles.ts` — profile version, flow configuration, controlled foreign keys, missing fields, junctions, and run flow snapshot.
- Modify `nextjs/lib/drizzle/schema/relations.ts` — relations for all new tables.
- Modify `nextjs/lib/drizzle/schema/index.ts` — export new schema modules.
- Create `nextjs/lib/drizzle/enrollmate-catalog-source.ts` — parse and normalize the JSON source.
- Create `nextjs/lib/drizzle/seed-enrollmate-catalog.ts` — idempotently seed one immutable catalog version.
- Modify `nextjs/lib/drizzle/seed.ts` — seed catalogs before profiles and map fixtures to lookup rows.
- Create `nextjs/drizzle/0003_enrollmate_profile_catalogs.sql` — generated schema migration plus explicit legacy backfill.

### Validation and read models

- Create `nextjs/feature/e2e/types/enrollmate-profile.types.ts` — aggregate and flow payload contracts.
- Create `nextjs/feature/e2e/schema/enrollmate-profile.schema.ts` — bachelor and microcredential readiness schemas.
- Create `nextjs/feature/e2e/services/enrollmate-profile-payload.service.ts` — load and compose exact submitted values.
- Create `nextjs/__tests__/unit/lib/enrollmate-catalog-source.test.ts` — source counts and dependency integrity.
- Create `nextjs/__tests__/unit/schema/enrollmate-profile.schema.test.ts` — requiredness and conditional validation.
- Create `nextjs/__tests__/unit/services/e2e/enrollmate-profile-payload.service.test.ts` — flow composition tests.

### Existing E2E integration

- Modify `nextjs/feature/e2e/types/e2e-testing.types.ts` — flow-aware profile and run DTOs.
- Modify `nextjs/feature/e2e/services/e2e-profile.service.ts` — load flow/catalog/aggregate relations.
- Modify `nextjs/feature/e2e/serializers/e2e-run.serializer.ts` — include flow and catalog version.
- Modify `nextjs/feature/e2e/query/e2e-profile-workspace.query.ts` — include flow in workspace and run-history requests.
- Modify `nextjs/app/api/e2e-profiles/[profileId]/route.ts` — require and validate a flow query parameter.
- Modify `nextjs/app/api/e2e-profiles/[profileId]/runs/route.ts` — scope history to a flow.
- Modify `nextjs/app/api/e2e-profiles/[profileId]/runs/[runId]/route.ts` — verify the run belongs to the selected flow.
- Modify `nextjs/feature/e2e/components/profiles/e2e-testing-profiles-table.tsx` — display supported flows and nullable transitional summary fields.
- Modify `nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx` — maintain the selected flow.
- Modify `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-sheet.tsx` — expose a flow switcher.
- Modify `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-info.tsx` — display the selected flow and resolved labels.
- Modify `nextjs/lib/mock-testing-data.ts` — make fixtures catalog-aware.
- Modify `nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts` — flow-aware service expectations.
- Modify `nextjs/__tests__/integration/api-routes-and-db.test.ts` — FK, dependency, flow, and run snapshot assertions.

## Task 1: Complete the geography source

**Files:**

- Create: `playwright/server/catalog/normalize-geography.ts`
- Create: `playwright/server/catalog/normalize-geography.test.ts`
- Create: `playwright/scripts/extract-enrollmate-geography.ts`
- Modify: `playwright/package.json`
- Modify: `playwright/enrollmate-form-fields.json`

- [ ] **Step 1: Write the normalization tests**

Test deterministic ordering, submitted-value preservation, parent links, and duplicate rejection:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeGeography } from "./normalize-geography.js";

describe("normalizeGeography", () => {
  it("sorts parents and retains dependent values", () => {
    assert.deepEqual(
      normalizeGeography([
        {
          province: { label: "Rizal", value: "Rizal" },
          municipalities: [
            {
              municipality: { label: "Antipolo City", value: "Antipolo City" },
              barangays: [
                { label: "Mayamot", value: "Mayamot" },
                { label: "Cupang", value: "Cupang" },
              ],
            },
          ],
        },
      ]),
      [
        {
          province: { label: "Rizal", value: "Rizal" },
          municipalities: [
            {
              municipality: { label: "Antipolo City", value: "Antipolo City" },
              barangays: [
                { label: "Cupang", value: "Cupang" },
                { label: "Mayamot", value: "Mayamot" },
              ],
            },
          ],
        },
      ],
    );
  });

  it("rejects duplicate submitted values under one parent", () => {
    assert.throws(
      () =>
        normalizeGeography([
          {
            province: { label: "Rizal", value: "Rizal" },
            municipalities: [
              {
                municipality: {
                  label: "Antipolo City",
                  value: "Antipolo City",
                },
                barangays: [
                  { label: "Cupang", value: "Cupang" },
                  { label: "Cupang duplicate", value: "Cupang" },
                ],
              },
            ],
          },
        ]),
      /Duplicate barangay value "Cupang"/,
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run:

```powershell
cd playwright
node --import tsx --test server/catalog/normalize-geography.test.ts
```

Expected: FAIL because `normalize-geography.ts` does not exist.

- [ ] **Step 3: Implement the pure normalizer**

Define and export:

```ts
export interface ExtractedOption {
  label: string;
  value: string;
}

export interface ExtractedMunicipality {
  municipality: ExtractedOption;
  barangays: ExtractedOption[];
}

export interface ExtractedProvince {
  province: ExtractedOption;
  municipalities: ExtractedMunicipality[];
}

export function normalizeGeography(
  provinces: ExtractedProvince[],
): ExtractedProvince[];
```

The implementation must reject empty labels/values, duplicate province values, duplicate municipality values within a province, and duplicate barangay values within a municipality. Sort each level by `submitted_value` using `localeCompare`.

- [ ] **Step 4: Implement the UAT extractor**

The script must:

1. Open `/apply-now/bachelors-degree`.
2. Read all non-placeholder `curraddrProvince` options.
3. Select each province and wait until `curraddrCitymun` is enabled and populated.
4. Select each municipality and wait until `curraddrBarangay` is enabled and populated.
5. Pass the extracted hierarchy through `normalizeGeography`.
6. Update `reusable_option_sets.philippine_geography` in `enrollmate-form-fields.json`.
7. Write `extracted_at`, source URL, and source application version.
8. Fail if any province has no municipality or any municipality has no barangay.

Use Playwright locators by form control ID and `selectOption({ label })`; do not use fixed sleeps.

- [ ] **Step 5: Add commands**

Add:

```json
"extract:enrollmate-geography": "tsx scripts/extract-enrollmate-geography.ts",
"verify:enrollmate-catalog": "node --import tsx --test server/catalog/normalize-geography.test.ts"
```

- [ ] **Step 6: Run extraction and verification**

Run:

```powershell
cd playwright
pnpm run extract:enrollmate-geography
pnpm run verify:enrollmate-catalog
pnpm run typecheck
```

Expected: every command exits 0; the JSON contains all 84 captured provinces and no empty municipality or barangay collection.

- [ ] **Step 7: Commit**

```powershell
git add playwright/package.json playwright/enrollmate-form-fields.json playwright/scripts/extract-enrollmate-geography.ts playwright/server/catalog
git commit -m "feat(playwright): extract complete EnrollMate geography"
```

## Task 2: Parse and verify the full controlled-value catalog

**Files:**

- Create: `nextjs/lib/drizzle/enrollmate-catalog-source.ts`
- Create: `nextjs/__tests__/unit/lib/enrollmate-catalog-source.test.ts`

- [ ] **Step 1: Write source-contract tests**

The tests must load `../playwright/enrollmate-form-fields.json` and assert:

```ts
expect(source.metadata.version).toBe("1.8.3");
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
expect(source.provinces.every((province) => province.municipalities.length > 0))
  .toBe(true);
expect(
  source.provinces.every((province) =>
    province.municipalities.every(
      (municipality) => municipality.barangays.length > 0,
    ),
  ),
).toBe(true);
```

Also assert that every select option has a non-empty label/value pair and that every option is unique within its field and parent.

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/lib/enrollmate-catalog-source.test.ts
```

Expected: FAIL because the source parser does not exist.

- [ ] **Step 3: Implement the parser**

Export:

```ts
export interface CatalogOption {
  label: string;
  submittedValue: string;
  sortOrder: number;
}

export interface EnrollmateCatalogSource {
  metadata: {
    version: string;
    referenceDate: string;
    source: string;
  };
  terms: CatalogOption[];
  majors: CatalogOption[];
  specializations: Array<CatalogOption & { majorValue: string }>;
  suffixes: CatalogOption[];
  genders: CatalogOption[];
  nationalities: CatalogOption[];
  civilStatuses: CatalogOption[];
  incomeBrackets: CatalogOption[];
  learningHubs: CatalogOption[];
  studentTypes: CatalogOption[];
  subStudentTypes: CatalogOption[];
  studentStatuses: CatalogOption[];
  religions: CatalogOption[];
  strands: CatalogOption[];
  scholarships: CatalogOption[];
  yesNoAnswers: CatalogOption[];
  livingStatuses: CatalogOption[];
  guardianAssignments: CatalogOption[];
  guardianRelationships: CatalogOption[];
  certificationFields: CatalogOption[];
  timeCommitments: CatalogOption[];
  selfDisciplineLevels: CatalogOption[];
  timeManagementLevels: CatalogOption[];
  learningGoals: CatalogOption[];
  discoveryChannels: CatalogOption[];
  studyReasons: CatalogOption[];
  countries: CatalogOption[];
  provinces: Array<
    CatalogOption & {
      municipalities: Array<
        CatalogOption & { barangays: CatalogOption[] }
      >;
    }
  >;
}

export function loadEnrollmateCatalogSource(): EnrollmateCatalogSource;
```

Resolve the JSON path from `process.cwd()` so tests and `pnpm db:seed` work from `nextjs/`. Convert source ordering to one-based `sortOrder`. Throw a descriptive error naming the field and duplicate value when normalization fails.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/lib/enrollmate-catalog-source.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add nextjs/lib/drizzle/enrollmate-catalog-source.ts nextjs/__tests__/unit/lib/enrollmate-catalog-source.test.ts
git commit -m "feat(nextjs): normalize EnrollMate catalog source"
```

## Task 3: Add versioned catalog tables

**Files:**

- Create: `nextjs/lib/drizzle/schema/enrollmate-catalogs.ts`
- Modify: `nextjs/lib/drizzle/schema/index.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`

- [ ] **Step 1: Add failing integration assertions**

Add a test that inserts a second catalog version and duplicate submitted values:

```ts
it("scopes controlled values by catalog version", async () => {
  const db = getDb();
  const versionId = randomUUID();

  try {
    await db.insert(enrollmateCatalogVersions).values({
      id: versionId,
      sourceApplicationVersion: "test-version",
      sourceEnvironment: "test",
      referenceDate: "2026-07-09",
      isCurrent: false,
    });

    await db.insert(enrollmateGenders).values([
      {
        catalogVersionId: versionId,
        label: "Female",
        submittedValue: "Female",
        sortOrder: 1,
      },
      {
        catalogVersionId: versionId,
        label: "Male",
        submittedValue: "Male",
        sortOrder: 2,
      },
    ]);

    await expect(
      db.insert(enrollmateGenders).values({
        catalogVersionId: versionId,
        label: "Duplicate",
        submittedValue: "Female",
        sortOrder: 3,
      }),
    ).rejects.toThrow();
  } finally {
    await db
      .delete(enrollmateGenders)
      .where(eq(enrollmateGenders.catalogVersionId, versionId));
    await db
      .delete(enrollmateCatalogVersions)
      .where(eq(enrollmateCatalogVersions.id, versionId));
  }
});
```

- [ ] **Step 2: Run the integration test and verify missing exports**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: FAIL because the catalog tables are not exported.

- [ ] **Step 3: Define the catalog schema**

Create `enrollmateCatalogVersions` with:

- UUID primary key
- unique `(source_application_version, source_environment, reference_date)`
- partial unique index allowing one `is_current = true` row
- timestamp audit columns

Use a small schema helper for the repeated lookup shape:

```ts
function createCatalogLookupTable(name: string) {
  return pgTable(
    name,
    {
      id: uuid("id").defaultRandom().primaryKey(),
      catalogVersionId: uuid("catalog_version_id")
        .notNull()
        .references(() => enrollmateCatalogVersions.id),
      label: text("label").notNull(),
      submittedValue: text("submitted_value").notNull(),
      sortOrder: integer("sort_order").notNull(),
      isActive: boolean("is_active").notNull().default(true),
    },
    (table) => [
      unique().on(table.catalogVersionId, table.submittedValue),
      index(`${name}_version_sort_idx`).on(
        table.catalogVersionId,
        table.sortOrder,
      ),
    ],
  );
}
```

Instantiate every non-dependent lookup listed in the approved design. Define specializations explicitly with `majorId`, municipalities with `provinceId`, and barangays with `municipalityId`. Add unique constraints scoped to the parent ID and submitted value.

- [ ] **Step 4: Export tables and relations**

Export `enrollmate-catalogs.ts` from `schema/index.ts`. Add version-to-options and parent-to-dependent-option relations in `relations.ts`.

- [ ] **Step 5: Generate the migration**

Run:

```powershell
cd nextjs
pnpm exec drizzle-kit generate --name enrollmate_profile_catalogs
```

Expected: `drizzle/0003_enrollmate_profile_catalogs.sql` and an updated snapshot/journal are created.

- [ ] **Step 6: Reset the test database and run the integration test**

Run:

```powershell
cd nextjs
pnpm run db:test:setup
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add nextjs/lib/drizzle/schema nextjs/drizzle nextjs/__tests__/integration/api-routes-and-db.test.ts
git commit -m "feat(nextjs): add versioned EnrollMate catalogs"
```

## Task 4: Seed the catalog idempotently

**Files:**

- Create: `nextjs/lib/drizzle/seed-enrollmate-catalog.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`

- [ ] **Step 1: Add failing seed integrity tests**

After test database setup, assert:

```ts
const [currentVersion] = await db
  .select()
  .from(enrollmateCatalogVersions)
  .where(eq(enrollmateCatalogVersions.isCurrent, true));

expect(currentVersion.sourceApplicationVersion).toBe("1.8.3");
expect(await db.select().from(enrollmateNationalities)).toHaveLength(136);
expect(await db.select().from(enrollmateReligions)).toHaveLength(92);
expect(await db.select().from(enrollmateCountries)).toHaveLength(195);
expect(await db.select().from(enrollmateProvinces)).toHaveLength(84);
expect(await db.select().from(enrollmateMajors)).toHaveLength(2);
expect(await db.select().from(enrollmateSpecializations)).toHaveLength(8);
```

Run `seedDatabase()` a second time and assert the counts remain unchanged.

- [ ] **Step 2: Run integration tests and verify empty catalog failure**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: FAIL because catalog seeding is absent.

- [ ] **Step 3: Implement catalog seeding**

Export:

```ts
export interface SeedEnrollmateCatalogResult {
  catalogVersionId: string;
}

export async function seedEnrollmateCatalog(
  tx: DbTransaction,
): Promise<SeedEnrollmateCatalogResult>;
```

Use deterministic UUIDs derived from:

```text
catalog:<version>:<environment>:<reference-date>
catalog-option:<table>:<catalog-version-id>:<parent-value>:<submitted-value>
```

Insert the version first, then independent options, followed by specializations, municipalities, and barangays after resolving parent IDs. Use `onConflictDoUpdate` for labels, ordering, and active status. In the same transaction, set all other versions to `is_current = false` before setting this complete version current.

- [ ] **Step 4: Call catalog seeding before profile seeding**

At the start of the existing seed transaction:

```ts
const { catalogVersionId } = await seedEnrollmateCatalog(tx);
```

Pass `catalogVersionId` into each profile fixture mapping in later tasks.

- [ ] **Step 5: Run tests twice**

Run:

```powershell
cd nextjs
pnpm run db:test:setup
pnpm run db:seed
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: catalog counts remain stable and tests pass.

- [ ] **Step 6: Commit**

```powershell
git add nextjs/lib/drizzle/seed-enrollmate-catalog.ts nextjs/lib/drizzle/seed.ts nextjs/__tests__/integration/api-routes-and-db.test.ts
git commit -m "feat(nextjs): seed EnrollMate option catalogs"
```

## Task 5: Add profile flows, controlled references, and missing fields

**Files:**

- Modify: `nextjs/lib/drizzle/schema/profiles.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`
- Modify: `nextjs/lib/mock-testing-data.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`

- [ ] **Step 1: Add failing profile-flow integration tests**

Cover:

- One profile accepts both `bachelors` and `microcredentials`.
- Duplicate `(profile_id, flow_type)` fails.
- Seeded and newly written profiles reference a catalog version; legacy rows may remain null until Task 11 enforces the final constraint.
- Discovery channels allow multiple selections but reject duplicates.
- Study reasons are stored only against a bachelor flow.

Use:

```ts
await db.insert(profileFlows).values([
  { profileId, flowType: "bachelors" },
  { profileId, flowType: "microcredentials" },
]);

await expect(
  db.insert(profileFlows).values({
    profileId,
    flowType: "bachelors",
  }),
).rejects.toThrow();
```

- [ ] **Step 2: Run the integration test and verify failure**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: FAIL because flow and junction tables do not exist.

- [ ] **Step 3: Extend `profiles`**

Add:

```ts
catalogVersionId: uuid("catalog_version_id")
  .references(() => enrollmateCatalogVersions.id),
program: text("program"),
cohort: text("cohort"),
```

Keep `program` and `cohort` nullable as transitional display fields. Do not use them to compose submitted form values.

- [ ] **Step 4: Add flow and multi-select tables**

Define:

```ts
export const profileFlows = pgTable(
  "profile_flows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id),
    flowType: text("flow_type")
      .notNull()
      .$type<"bachelors" | "microcredentials">(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.profileId, table.flowType)],
);
```

Add `profileDiscoveryChannels` and `profileStudyReasons`, each with a composite primary key over flow and option IDs. Add a check constraint or service guard that study-reason rows belong to bachelor flows.

- [ ] **Step 5: Replace controlled text with foreign keys additively**

Add lookup-ID columns without removing legacy text columns in this migration:

- Applicant: suffix, gender, nationality, civil status, income bracket, student status.
- Bachelor: term, major, specialization, learning hub, student type, sub-student type, religion, strand, scholarship interest, scholarship, medical condition.
- Microcredential: certification field.
- Addresses: country, province, municipality, barangay for current and permanent addresses.
- Learner readiness: four yes/no answers, time commitment, self-discipline, time management, and learning goal.

Add missing fields:

```ts
nickname: text("nickname"),
schoolNotFound: boolean("school_not_found").notNull().default(false),
lastSchoolOther: text("last_school_other"),
```

Add referrer given name, family name, and email to `profileAdditionalInfo`.

- [ ] **Step 6: Update relations and fixture contracts**

Add profile-to-catalog, profile-to-flows, flow-to-multi-select, and all lookup relations. Extend each fixture with:

```ts
catalogVersionId: string;
flows: Array<"bachelors" | "microcredentials">;
discoveryChannels: string[];
studyReasons: string[];
```

Fixture controlled values remain submitted-value strings in `mock-testing-data.ts`; the seed maps them to catalog IDs and throws if no exact match exists.

- [ ] **Step 7: Generate and inspect the additive migration**

Run:

```powershell
cd nextjs
pnpm exec drizzle-kit generate --name enrollmate_profile_flows
```

Expected: a new migration adds nullable lookup columns first. If Drizzle emits destructive drops or direct type rewrites, edit the migration to preserve the legacy text columns.

- [ ] **Step 8: Run integration and type checks**

```powershell
cd nextjs
pnpm run db:test:setup
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add nextjs/lib/drizzle/schema nextjs/lib/drizzle/seed.ts nextjs/lib/mock-testing-data.ts nextjs/drizzle nextjs/__tests__/integration/api-routes-and-db.test.ts
git commit -m "feat(nextjs): add EnrollMate profile flows"
```

## Task 6: Normalize bachelor relatives and addresses

**Files:**

- Create: `nextjs/lib/drizzle/schema/profile-relatives.ts`
- Modify: `nextjs/lib/drizzle/schema/index.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`
- Modify: `nextjs/lib/mock-testing-data.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`

- [ ] **Step 1: Add failing relative and address tests**

Test:

- Father, mother, and guardian are unique per profile.
- Each relative has at most one current and one permanent address.
- Living status, suffix, relationship, and geography values use catalog FKs.
- A missing catalog option FK fails.
- `sameAsApplicant = true` can omit address values.

- [ ] **Step 2: Run the integration test and verify missing-table failure**

```powershell
cd nextjs
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: FAIL because relative tables are absent.

- [ ] **Step 3: Define related people**

Implement the exact fields from the approved design:

```ts
role: text("role").notNull().$type<"father" | "mother" | "guardian">(),
livingStatusId: uuid("living_status_id").references(
  () => enrollmateLivingStatuses.id,
),
givenName: text("given_name"),
middleName: text("middle_name"),
familyName: text("family_name"),
suffixId: uuid("suffix_id").references(() => enrollmateSuffixes.id),
birthdate: date("birthdate"),
landline: text("landline"),
mobile: text("mobile"),
email: text("email"),
occupation: text("occupation"),
relationshipId: uuid("relationship_id").references(
  () => enrollmateGuardianRelationships.id,
),
relationshipOther: text("relationship_other"),
```

Enforce unique `(profile_id, role)`.

- [ ] **Step 4: Define relative addresses**

Implement current/permanent address type, copy interaction flag, both address lines, zip code, and geography FKs. Enforce unique `(related_person_id, address_type)`.

Choose and enforce this invariant in the service layer:

```text
same_as_applicant = true  -> all stored address-value columns are null
same_as_applicant = false -> required address-value columns are populated
```

The payload composer resolves copied addresses from the matching applicant current or permanent address.

- [ ] **Step 5: Seed complete relatives**

Replace the partial `fatherStatus`, `motherStatus`, and guardian fixture fields with:

```ts
relatedPeople: [
  { role: "father", addresses: [currentAddress, permanentAddress], ... },
  { role: "mother", addresses: [currentAddress, permanentAddress], ... },
  { role: "guardian", addresses: [currentAddress, permanentAddress], ... },
]
```

Keep the legacy columns temporarily for backfill verification; do not delete them in this task.

- [ ] **Step 6: Generate migration and run checks**

```powershell
cd nextjs
pnpm exec drizzle-kit generate --name enrollmate_profile_relatives
pnpm run db:test:setup
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add nextjs/lib/drizzle/schema nextjs/lib/drizzle/seed.ts nextjs/lib/mock-testing-data.ts nextjs/drizzle nextjs/__tests__/integration/api-routes-and-db.test.ts
git commit -m "feat(nextjs): model EnrollMate relatives and addresses"
```

## Task 7: Add exact document fixture storage

**Files:**

- Modify: `nextjs/lib/drizzle/schema/profiles.ts`
- Modify: `nextjs/lib/mock-testing-data.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`

- [ ] **Step 1: Add failing document fixture tests**

Assert that PID and PHSC records retain:

```ts
{
  fixtureUri: "fixtures/applicant-id.pdf",
  originalFilename: "applicant-id.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
}
```

Reject `sizeBytes < 0` with a database check constraint.

- [ ] **Step 2: Add fixture columns**

Add separate PID and PHSC fixture URI, original filename, MIME type, and size columns to `profileDocuments`. Keep archive GDrive links and submitted dates because they represent different lifecycle data.

- [ ] **Step 3: Generate migration and verify**

```powershell
cd nextjs
pnpm exec drizzle-kit generate --name enrollmate_document_fixtures
pnpm run db:test:setup
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add nextjs/lib/drizzle/schema/profiles.ts nextjs/lib/mock-testing-data.ts nextjs/lib/drizzle/seed.ts nextjs/drizzle nextjs/__tests__/integration/api-routes-and-db.test.ts
git commit -m "feat(nextjs): store EnrollMate upload fixtures"
```

## Task 8: Compose and validate flow payloads

**Files:**

- Create: `nextjs/feature/e2e/types/enrollmate-profile.types.ts`
- Create: `nextjs/feature/e2e/schema/enrollmate-profile.schema.ts`
- Create: `nextjs/feature/e2e/services/enrollmate-profile-payload.service.ts`
- Create: `nextjs/__tests__/unit/schema/enrollmate-profile.schema.test.ts`
- Create: `nextjs/__tests__/unit/services/e2e/enrollmate-profile-payload.service.test.ts`

- [ ] **Step 1: Define exact payload types**

Create a discriminated union:

```ts
export type EnrollmateFlowType = "bachelors" | "microcredentials";

export interface EnrollmateSubmittedOption {
  label: string;
  value: string;
}

export type EnrollmateProfilePayload =
  | {
      flowType: "bachelors";
      catalogVersion: string;
      applicant: BachelorApplicantPayload;
      father: RelatedPersonPayload;
      mother: RelatedPersonPayload;
      guardianAssignment: EnrollmateSubmittedOption;
      guardian: RelatedPersonPayload | null;
      discoveryChannels: EnrollmateSubmittedOption[];
      studyReasons: EnrollmateSubmittedOption[];
      documents: BachelorDocumentPayload;
    }
  | {
      flowType: "microcredentials";
      catalogVersion: string;
      applicant: MicrocredentialApplicantPayload;
      learnerReadiness: LearnerReadinessPayload;
      discoveryChannels: EnrollmateSubmittedOption[];
    };
```

Spell out every field from `enrollmate-form-fields.json` in the referenced interfaces. Controlled values use `EnrollmateSubmittedOption`; free entries use their actual scalar types.

- [ ] **Step 2: Write validator tests**

Bachelor tests:

- Accept a complete bachelor payload.
- Reject specialization under the wrong major.
- Require scholarship when scholarship interest is Yes.
- Require `lastSchoolOther` when `schoolNotFound` is true.
- Require father and mother data and both addresses.
- Require guardian details only for assignment Others.
- Require at least one discovery channel and study reason.
- Reject documents over 3 MB or with an unsupported extension.

Microcredential tests:

- Accept a complete payload without nationality.
- Require all nine readiness answers except optional challenges.
- Require at least one discovery channel.
- Reject a controlled value not present in the loaded catalog.

- [ ] **Step 3: Run tests and verify missing schemas**

```powershell
cd nextjs
pnpm test -- __tests__/unit/schema/enrollmate-profile.schema.test.ts
```

Expected: FAIL because validation schemas are absent.

- [ ] **Step 4: Implement Zod schemas**

Export:

```ts
export function createBachelorProfileSchema(catalog: CatalogValidationContext);
export function createMicrocredentialProfileSchema(
  catalog: CatalogValidationContext,
);
export function parseEnrollmateProfilePayload(
  payload: EnrollmateProfilePayload,
  catalog: CatalogValidationContext,
): EnrollmateProfilePayload;
```

`CatalogValidationContext` contains sets of permitted submitted values and maps for major-specialization and geography dependencies. Use `superRefine` for conditional and dependency checks. Return field-specific issue paths matching payload property names.

- [ ] **Step 5: Write composer tests**

Mock one loaded profile aggregate and assert:

- Lookup rows become exact `{ label, value: submittedValue }` objects.
- Copied relative addresses resolve from applicant addresses.
- Bachelor output excludes microcredential-only fields.
- Microcredential output excludes bachelor-only fields.
- Missing flow configuration produces `Profile does not support microcredentials`.
- A catalog-version mismatch produces `Profile catalog is inconsistent`.

- [ ] **Step 6: Implement the composer**

Export:

```ts
export async function getEnrollmateProfilePayload(
  {
    profileId,
    flowType,
  }: {
    profileId: string;
    flowType: EnrollmateFlowType;
  },
  db: DbExecutor = getDb(),
): Promise<EnrollmateProfilePayload | null>;
```

Load all required relations in one Drizzle relational query, compose the discriminated payload, then parse it through the appropriate flow schema before returning it.

- [ ] **Step 7: Run focused and full unit tests**

```powershell
cd nextjs
pnpm test -- __tests__/unit/schema/enrollmate-profile.schema.test.ts __tests__/unit/services/e2e/enrollmate-profile-payload.service.test.ts
pnpm test -- __tests__/unit
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add nextjs/feature/e2e/types/enrollmate-profile.types.ts nextjs/feature/e2e/schema/enrollmate-profile.schema.ts nextjs/feature/e2e/services/enrollmate-profile-payload.service.ts nextjs/__tests__/unit
git commit -m "feat(nextjs): validate EnrollMate profile payloads"
```

## Task 9: Make run history flow-aware

**Files:**

- Modify: `nextjs/lib/drizzle/schema/profiles.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`
- Modify: `nextjs/feature/e2e/types/e2e-testing.types.ts`
- Modify: `nextjs/feature/e2e/services/e2e-profile.service.ts`
- Modify: `nextjs/feature/e2e/serializers/e2e-run.serializer.ts`
- Modify: `nextjs/feature/e2e/query/e2e-profile-workspace.query.ts`
- Modify: `nextjs/app/api/e2e-profiles/[profileId]/route.ts`
- Modify: `nextjs/app/api/e2e-profiles/[profileId]/runs/route.ts`
- Modify: `nextjs/app/api/e2e-profiles/[profileId]/runs/[runId]/route.ts`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-sheet.tsx`
- Modify: `nextjs/lib/mock-testing-data.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts`
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`

- [ ] **Step 1: Add failing service and integration tests**

Assert:

- Profile summaries include supported flows.
- Workspace reads select one flow explicitly.
- Run history contains `flowType` and `catalogVersionId`.
- A run’s catalog snapshot does not change when the profile later migrates.
- Run-number uniqueness is scoped to `profile_flow_id`, not the shared profile.

- [ ] **Step 2: Add run foreign keys**

Add to `e2e_runs`:

```ts
profileFlowId: uuid("profile_flow_id")
  .notNull()
  .references(() => profileFlows.id),
catalogVersionId: uuid("catalog_version_id")
  .notNull()
  .references(() => enrollmateCatalogVersions.id),
```

During transition, retain `profile_id` for read compatibility. Change the unique constraint to `(profile_flow_id, run_number)`. Backfill each existing run to the seeded profile’s bachelor flow and current catalog version before setting the new columns `NOT NULL`.

- [ ] **Step 3: Update DTOs and serializers**

Add:

```ts
flowType: EnrollmateFlowType;
catalogVersionId: string;
```

to run history and selected-run DTOs. Profile summaries expose:

```ts
supportedFlows: EnrollmateFlowType[];
```

- [ ] **Step 4: Update service queries**

Load `profileFlows` with profile summaries and the workspace profile. Filter active, latest, paginated, and selected runs by `profileFlowId`. Require `flowType` in workspace and history service inputs.

- [ ] **Step 5: Thread flow through routes and client queries**

Require `?flow=bachelors` or `?flow=microcredentials` on workspace and run-history requests. Return HTTP 400 for a missing or invalid flow and HTTP 404 when the profile does not support it. Include the flow in every TanStack Query key so caches cannot mix data between flows.

When a profile supports both flows, initialize the workspace to `bachelors` and expose a bachelor/microcredential switcher. When it supports one flow, select it directly and omit the switcher.

- [ ] **Step 6: Update fixtures and seed**

Seed deterministic flow IDs and associate every existing fixture run with its bachelor flow. Add at least one microcredential fixture and run so both paths are covered in the UI and integration tests.

- [ ] **Step 7: Generate migration and run tests**

```powershell
cd nextjs
pnpm exec drizzle-kit generate --name enrollmate_flow_runs
pnpm run db:test:setup
pnpm test -- __tests__/unit/services/e2e/e2e-profile.service.test.ts
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add nextjs/lib/drizzle/schema nextjs/feature/e2e nextjs/lib/mock-testing-data.ts nextjs/lib/drizzle/seed.ts nextjs/drizzle nextjs/__tests__
git commit -m "feat(nextjs): associate E2E runs with profile flows"
```

## Task 10: Update profile displays without weakening the model

**Files:**

- Modify: `nextjs/feature/e2e/components/profiles/e2e-testing-profiles-table.tsx`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-sheet.tsx`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-info.tsx`
- Modify: `nextjs/feature/e2e/types/e2e-testing.types.ts`
- Create: `nextjs/__tests__/unit/components/e2e/e2e-profile-workspace-info.test.tsx`

- [ ] **Step 1: Write flow-display tests**

Render the workspace header with:

- A bachelor-only profile.
- A microcredential-only profile with null transitional `program` and `cohort`.
- A dual-flow profile with the microcredential flow selected.

Assert the visible flow label, resolved program/certification label, catalog version, and em dash fallback.

- [ ] **Step 2: Update the profile table**

Replace the singular-program assumption with supported-flow badges. Display the resolved bachelor specialization or microcredential certification field as the flow summary. Render an em dash when the transitional `program` or `cohort` value is null.

- [ ] **Step 3: Update workspace labels**

Show:

- Selected flow
- Catalog application version
- Resolved option labels rather than UUIDs
- Bachelor-only groups only for bachelor flow
- Learner-readiness group only for microcredential flow

Keep status text paired with existing status badges and preserve keyboard behavior.

- [ ] **Step 4: Run component and frontend checks**

```powershell
cd nextjs
pnpm test -- __tests__/unit/components/e2e/e2e-profile-workspace-info.test.tsx
cd ..
just lint
just typecheck
just build
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add nextjs/feature/e2e/components nextjs/feature/e2e/types nextjs/__tests__/unit/components/e2e/e2e-profile-workspace-info.test.tsx
git commit -m "feat(nextjs): display EnrollMate profile flows"
```

## Task 11: Backfill, enforce, and remove superseded writes

**Files:**

- Modify: the generated profile migration files under `nextjs/drizzle/`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`
- Modify: schema files containing superseded legacy columns

- [ ] **Step 1: Add migration assertions**

Insert representative legacy text values before applying the enforcement migration. After migration, assert exact option IDs were populated. Include one intentionally unmatched value and assert the migration aborts with a report rather than coercing or discarding it.

- [ ] **Step 2: Add deterministic backfill SQL**

For each legacy controlled field:

1. Join on the profile’s `catalog_version_id`.
2. Match exact `submitted_value`.
3. Populate the corresponding lookup ID.
4. Abort if any non-null legacy value has no exact match.

Backfill related people from existing father/mother status and guardian columns. Do not invent missing parent details; leave them null so readiness correctly reports them.

- [ ] **Step 3: Stop writing legacy controlled text**

Update seed and application writes to use lookup IDs exclusively. Keep legacy columns readable for one release if rollback compatibility is required, but do not dual-write after this task.

- [ ] **Step 4: Enforce required structural constraints**

After successful backfill:

- Set `profiles.catalog_version_id` to `NOT NULL`.
- Set `e2e_runs.profile_flow_id` and `catalog_version_id` to `NOT NULL`.
- Add all final unique and check constraints.
- Retain nullable applicant answer fields for negative-test profiles.

- [ ] **Step 5: Run reset, seed, and all tests**

```powershell
cd nextjs
pnpm run db:test:setup
pnpm run db:seed
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Expected: all commands exit 0 and a second seed changes no catalog counts.

- [ ] **Step 6: Commit**

```powershell
git add nextjs/drizzle nextjs/lib/drizzle nextjs/lib/mock-testing-data.ts nextjs/__tests__
git commit -m "refactor(nextjs): enforce EnrollMate controlled values"
```

## Task 12: Final coverage audit

**Files:**

- Create: `nextjs/__tests__/integration/enrollmate-profile-coverage.test.ts`
- Modify: `docs/brainstorm/enrollmate-profile-schema.md` only if implementation evidence changes an approved assumption

- [ ] **Step 1: Add the source-to-schema coverage test**

The test must load the catalog source, query the seeded database, and compare exact ordered pairs for every controlled set:

```ts
expect(
  databaseOptions.map(({ label, submittedValue }) => ({
    label,
    submittedValue,
  })),
).toEqual(sourceOptions);
```

It must also compose one complete bachelor payload and one complete microcredential payload, then assert every non-button field name from the JSON has a corresponding payload path.

- [ ] **Step 2: Run the full repository verification**

```powershell
just lint-all
just typecheck
just dev-test
just test-playwright-unit
```

Expected: all commands exit 0.

Do not run the live smoke suite as schema verification; it targets the public MMDC website and does not exercise these profile tables.

- [ ] **Step 3: Inspect the final diff**

```powershell
git status --short
git diff --stat HEAD~12
git diff --check HEAD~12
```

Confirm:

- No arbitrary-text write remains for predefined EnrollMate answers.
- Every current source option is present and versioned.
- Both flows compose from one profile.
- Old catalog versions remain referenced and readable.
- No unrelated files changed.

- [ ] **Step 4: Commit**

```powershell
git add nextjs/__tests__/integration/enrollmate-profile-coverage.test.ts docs/brainstorm/enrollmate-profile-schema.md
git commit -m "test(nextjs): verify EnrollMate profile coverage"
```

## Rollback strategy

The migration is intentionally additive until Task 11:

1. New catalog, flow, relative, and junction tables can be ignored by the old application.
2. Legacy controlled text columns remain available during backfill verification.
3. Rollback before Task 11 consists of reverting application reads and leaving additive tables dormant.
4. After Task 11, rollback requires restoring legacy writes before removing lookup-ID usage.
5. Catalog rows referenced by profiles or runs must never be deleted during rollback.

## Completion criteria

- The complete UAT geography hierarchy has been captured and verified.
- Every predefined answer is a versioned database row or stable internal type.
- Controlled profile answers use foreign keys or junction tables.
- One profile supports bachelor, microcredential, or both flows.
- Both payload composers reproduce exact submitted values.
- Conditional requiredness and parent-child dependencies are tested.
- E2E runs record flow and catalog version.
- Existing legacy profile data is preserved or explicitly reported as unmatched.
- Lint, typecheck, build, unit tests, integration tests, and catalog coverage tests pass.
