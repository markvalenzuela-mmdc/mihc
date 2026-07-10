# EnrollMate JSONB Profile Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the relational EnrollMate profile/catalog model with three JSONB-backed profile tables, a shared definition-driven Zod contract, and a fresh Drizzle migration baseline.

**Architecture:** Keep profile identity, list summaries, workflow state, and E2E run history relational. Store profile-adjacent internal data in `profiles.operational_data` and one exact submitted-value document per application flow in `profile_forms.data`; use the current checked-in scrape's SHA-256 hash to derive whether a form is deprecated. A browser-safe local `@mihc/enrollmate-contract` package validates scraped definitions, generates Zod validators, and supplies the metadata used by the Next.js workspace display.

**Tech Stack:** TypeScript 5, Next.js 16, Drizzle ORM/Kit, PostgreSQL JSONB, Zod 4, Vitest 4, pnpm.

**Scope boundary:** Do not add or change Playwright runner code, dependencies, or tests. Move the checked-in EnrollMate definition from `playwright/` into the shared contract package; this asset move is the only change below `playwright/`.

## Follow-up amendment: shared option-set consumers

The implementation plan above records the original JSONB migration scope. A
follow-up contract change on 2026-07-10 added
`getEnrollmateReusableOptionSets()` to the shared package and declared that
package as a dependency of Playwright. Its validation lives in the
server-only Node test at
`playwright/server/__tests__/unit/enrollmate-contract.test.ts`; it is not a
browser Playwright spec and does not run through `playwright test`.

The original “only the asset move below `playwright/`” boundary is therefore
superseded by this focused consumer addendum. The browser suite under
`playwright/tests/`, its reporter, and its run-mode contract remain unchanged.
See `packages/enrollmate-contract/README.md`, `playwright/README.md`, and
`docs/README.md` for the current usage map.

---

## Final file structure

### Create

- `packages/enrollmate-contract/package.json` — local, browser-safe TypeScript package manifest.
- `packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json` — the sole checked-in EnrollMate scrape.
- `packages/enrollmate-contract/src/types.ts` — normalized definition, field, and payload types.
- `packages/enrollmate-contract/src/form-definition.schema.ts` — validates and normalizes the scrape before it is used.
- `packages/enrollmate-contract/src/form-data.schema.ts` — generates the Zod form-data and operational-data validators.
- `packages/enrollmate-contract/src/registry.ts` — loads the definition, exposes its hash, flow definitions, and validators.
- `packages/enrollmate-contract/src/index.ts` — package public API.
- `nextjs/lib/drizzle/schema/profile-forms.ts` — `profile_forms` and `profile_e2e_snapshots` Drizzle tables.
- `nextjs/feature/e2e/lib/profile-form-display.ts` — converts definition + JSONB form data into workspace display groups.
- `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts` — contract/validator tests, run by the Next.js Vitest suite.
- `nextjs/__tests__/unit/feature/e2e/profile-form-display.test.ts` — definition-driven display tests.
- `nextjs/__tests__/integration/profile-jsonb-schema.test.ts` — JSONB schema, seed, and deprecation integration tests.

### Modify

- `nextjs/package.json` and `nextjs/pnpm-lock.yaml` — add the local contract package dependency.
- `nextjs/next.config.ts` — transpile `@mihc/enrollmate-contract` for the browser bundle.
- `nextjs/lib/drizzle/schema/profiles.ts` — retain profile/E2E tables, add `operationalData`, and remove five one-to-one operational tables plus catalog version linkage.
- `nextjs/lib/drizzle/schema/relations.ts` — replace catalog/application relations with profile form and snapshot relations.
- `nextjs/lib/drizzle/schema/index.ts` — export the new schema module and remove superseded exports.
- `nextjs/lib/drizzle/seed.ts` and `nextjs/lib/drizzle/seed/seed-profiles.ts` — seed direct JSONB documents through shared Zod validation.
- `nextjs/feature/e2e/types/e2e-testing.types.ts` — replace relational application graph types with JSONB form and derived deprecation types.
- `nextjs/feature/e2e/services/e2e-profile.service.ts` — query forms directly, derive deprecation, and remove catalog queries.
- `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts` — use generic display groups rather than field-specific table/option access.
- `nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts` — assert the new workspace query and deprecated-form projection.
- `nextjs/drizzle/` and `nextjs/drizzle/meta/` — remove all existing generated migration history; regenerate one baseline through Drizzle Kit only.
- `docs/brainstorm/enrollmate-profile-schema.md` and `docs/plans/2026-07-09-enrollmate-profile-schema.md` — mark the relational/categorical design and plan as superseded, preserving them as historical records.

### Remove

- `playwright/enrollmate-form-fields.json` after its exact move to `packages/enrollmate-contract/src/definitions/`.
- `nextjs/lib/drizzle/schema/enrollmate-catalog.ts`
- `nextjs/lib/drizzle/schema/profile-applications.ts`
- `nextjs/lib/drizzle/schema/profile-relatives.ts`
- `nextjs/lib/drizzle/schema/application-snapshots.ts`
- `nextjs/lib/drizzle/seed/seed-enrollmate-catalog.ts`
- `nextjs/__tests__/unit/lib/enrollmate-option-source.test.ts`
- `nextjs/__tests__/unit/lib/enrollmate-field-coverage.test.ts`
- `nextjs/__tests__/integration/enrollmate-catalog-schema.test.ts`

## Data contracts

The persisted values use form field names and submitted strings exactly as the live form expects. The profile summary remains queryable; `program` and `cohort` are deliberately not moved into JSONB.

```ts
type FlowType = "bachelors" | "microcredentials";

type ProfileOperationalData = {
  payment?: Record<string, unknown>;
  studyBuddy?: Record<string, unknown>;
  additionalInfo?: Record<string, unknown>;
  disclosures?: Record<string, unknown>;
  systemInfo?: Record<string, unknown>;
};

type ProfileFormData = Record<string, unknown>;
```

`profile_forms.definition_hash` must equal `getEnrollmateDefinitionHash()` for
its `flow_type` to be runnable. It is not a mutable status column: the service
derives `isDeprecated` from the hash comparison.

---

### Task 1: Establish the local shared EnrollMate contract package

**Files:**

- Create: `packages/enrollmate-contract/package.json`
- Create: `packages/enrollmate-contract/src/types.ts`
- Create: `packages/enrollmate-contract/src/form-definition.schema.ts`
- Create: `packages/enrollmate-contract/src/registry.ts`
- Create: `packages/enrollmate-contract/src/index.ts`
- Move: `playwright/enrollmate-form-fields.json` → `packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json`
- Modify: `nextjs/package.json`
- Modify: `nextjs/next.config.ts`
- Modify: `nextjs/pnpm-lock.yaml`
- Test: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`

- [ ] **Step 1: Write a failing contract import and definition test**

```ts
import {
  getEnrollmateDefinitionHash,
  getEnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";

describe("EnrollMate contract", () => {
  it("loads both scraped flows and exposes a stable hash", () => {
    expect(getEnrollmateFlowDefinition("bachelors").steps).not.toHaveLength(0);
    expect(getEnrollmateFlowDefinition("microcredentials").steps).not.toHaveLength(0);
    expect(getEnrollmateDefinitionHash()).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 2: Run the test to verify the package is absent**

Run:

```powershell
cd nextjs
pnpm test __tests__/unit/lib/enrollmate-contract.test.ts
```

Expected: FAIL because `@mihc/enrollmate-contract` cannot be resolved.

- [ ] **Step 3: Add the local package manifest and Next.js package wiring**

Create this package manifest so both consumers use their existing Zod 4
dependency rather than installing a second copy:

```json
{
  "name": "@mihc/enrollmate-contract",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "zod": "^4.4.3"
  }
}
```

Add this dependency to `nextjs/package.json`:

```json
"@mihc/enrollmate-contract": "file:../packages/enrollmate-contract"
```

Add the package to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@mihc/enrollmate-contract"],
};
```

Move the JSON byte-for-byte into the package definition directory. Do not
maintain a second copy in `playwright/`.

- [ ] **Step 4: Implement definition validation and registry**

Define a normalized flow API that filters out navigation buttons while
preserving steps, sections, fields, exact option values, dependent options,
checkboxes, and file metadata:

```ts
export type EnrollmateFlowType = "bachelors" | "microcredentials";

export function getEnrollmateFlowDefinition(
  flowType: EnrollmateFlowType,
): EnrollmateFlowDefinition;

export function getEnrollmateDefinitionHash(): string;
```

`form-definition.schema.ts` must accept only these actionable field types:
`text`, `textarea`, `email`, `tel`, `date`, `select`, `combobox`, `checkbox`,
and `file`. It must discard `button` records. It must reject malformed options,
an unknown field type, a dependent select without its named parent, and a
missing flow/step/section field array with `z.ZodError`.

Compute the hash with `crypto.createHash("sha256")` over the original JSON
text, not the normalized object, so the persisted hash identifies the exact
scrape artifact. Export the validated definition and hash from `index.ts`.

- [ ] **Step 5: Install the local dependency and run the contract test**

Run:

```powershell
cd nextjs
pnpm install --lockfile-only
pnpm test __tests__/unit/lib/enrollmate-contract.test.ts
```

Expected: PASS. `nextjs/pnpm-lock.yaml` records the local file dependency and
the test observes the two flow definitions and a 64-character hash.

- [ ] **Step 6: Commit the contract package boundary**

```powershell
git add packages/enrollmate-contract nextjs/package.json nextjs/pnpm-lock.yaml nextjs/next.config.ts playwright/enrollmate-form-fields.json nextjs/__tests__/unit/lib/enrollmate-contract.test.ts
git commit -m "feat: add shared EnrollMate form contract"
```

### Task 2: Generate Zod validators from the checked-in definition

**Files:**

- Create: `packages/enrollmate-contract/src/form-data.schema.ts`
- Modify: `packages/enrollmate-contract/src/index.ts`
- Modify: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`

- [ ] **Step 1: Extend the contract test with invalid values and dependencies**

```ts
import { getEnrollmateValidator } from "@mihc/enrollmate-contract";

it("rejects a specialization outside the selected major's captured options", () => {
  const result = getEnrollmateValidator("bachelors").safeParse({
    email: "ari.santos@example.edu",
    termApplied: "August 2026 | First Term",
    programFocus: "BS Information Technology",
    programApplied: "BS BA Marketing Management Specialization",
  });

  expect(result.success).toBe(false);
});

it("rejects a value not present in a captured select", () => {
  expect(
    getEnrollmateValidator("microcredentials").safeParse({
      gender: "Not a captured option",
    }).success,
  ).toBe(false);
});
```

- [ ] **Step 2: Run the extended test to confirm validators do not exist**

Run:

```powershell
cd nextjs
pnpm test __tests__/unit/lib/enrollmate-contract.test.ts
```

Expected: FAIL because `getEnrollmateValidator` is not exported.

- [ ] **Step 3: Implement the form-data schema factory**

Export these functions and use them as the only validation API:

```ts
export function getEnrollmateValidator(
  flowType: EnrollmateFlowType,
): z.ZodType<Record<string, unknown>>;

export const profileOperationalDataSchema = z.object({
  payment: z.record(z.string(), z.unknown()).optional(),
  studyBuddy: z.record(z.string(), z.unknown()).optional(),
  additionalInfo: z.record(z.string(), z.unknown()).optional(),
  disclosures: z.record(z.string(), z.unknown()).optional(),
  systemInfo: z.record(z.string(), z.unknown()).optional(),
}).strict();
```

The factory must produce one strict object schema per flow. For every field in
the normalized definition, map `email` to `z.string().email()`, `date` to an
ISO date string, `file` to a fixture metadata object, and textual controls to
strings. Required fields are required; optional values accept `undefined` but
not an unrecognized value. Select fields accept only their captured submitted
values. Checkbox records compile to boolean fields keyed by their exact field
names. `options_by_dependency` and `conditional_on` compile to `superRefine`
issues on the dependent field. The registry constructs these two validators
once at module load; validation performs no fetch or database query.

- [ ] **Step 4: Add positive validation coverage for each supported control**

Add test fixtures that include a valid email, date, text, telephone number,
select, checkbox, and file metadata. Verify that valid Bachelor and
Microcredential payloads parse and that `profileOperationalDataSchema` rejects
an unknown top-level operational section.

- [ ] **Step 5: Run the contract test and typecheck**

Run:

```powershell
cd nextjs
pnpm test __tests__/unit/lib/enrollmate-contract.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands pass.

- [ ] **Step 6: Commit generated validation behavior**

```powershell
git add packages/enrollmate-contract nextjs/__tests__/unit/lib/enrollmate-contract.test.ts
git commit -m "feat: generate EnrollMate Zod validators"
```

### Task 3: Replace the relational profile/application schema with JSONB tables

**Files:**

- Create: `nextjs/lib/drizzle/schema/profile-forms.ts`
- Modify: `nextjs/lib/drizzle/schema/profiles.ts`
- Modify: `nextjs/lib/drizzle/schema/relations.ts`
- Modify: `nextjs/lib/drizzle/schema/index.ts`
- Remove: `nextjs/lib/drizzle/schema/enrollmate-catalog.ts`
- Remove: `nextjs/lib/drizzle/schema/profile-applications.ts`
- Remove: `nextjs/lib/drizzle/schema/profile-relatives.ts`
- Remove: `nextjs/lib/drizzle/schema/application-snapshots.ts`
- Test: `nextjs/__tests__/integration/profile-jsonb-schema.test.ts`

- [ ] **Step 1: Write the failing JSONB schema integration test**

```ts
it("stores two independently versioned flow documents for one profile", async () => {
  const db = getDb();
  const profile = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.email, "ari.santos@example.edu"),
    with: { profileForms: true },
  });

  expect(profile?.operationalData.payment).toBeDefined();
  expect(profile?.profileForms.map((form) => form.flowType).sort()).toEqual([
    "bachelors",
    "microcredentials",
  ]);
});
```

Also attempt a second `bachelors` insert for the same profile and assert that
PostgreSQL rejects the `UNIQUE(profile_id, flow_type)` violation.

- [ ] **Step 2: Run the integration test to verify the new tables are absent**

Run:

```powershell
cd nextjs
pnpm test __tests__/integration/profile-jsonb-schema.test.ts
```

Expected: FAIL because `profileForms` and `operationalData` do not exist.

- [ ] **Step 3: Define the new Drizzle tables and simplify `profiles`**

In `profiles.ts`, retain `id`, `name`, `middleName`, `email`, `program`,
`cohort`, `status`, audit ownership, timestamps, and all E2E workflow tables.
Remove `catalogVersionId` and the five one-to-one operational tables. Add:

```ts
operationalData: jsonb("operational_data")
  .$type<ProfileOperationalData>()
  .notNull()
  .default({}),
```

Create the profile form tables:

```ts
export const profileForms = pgTable(
  "profile_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id),
    flowType: text("flow_type")
      .notNull()
      .$type<"bachelors" | "microcredentials">(),
    definitionHash: text("definition_hash").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.profileId, table.flowType)],
);

export const profileE2eSnapshots = pgTable("profile_e2e_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileFormId: uuid("profile_form_id").notNull().references(() => profileForms.id),
  e2eRunId: uuid("e2e_run_id").references(() => e2eRuns.id),
  definitionHash: text("definition_hash").notNull(),
  payloadHash: text("payload_hash").notNull(),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 4: Replace the relation graph**

Define exactly these new relations:

```ts
export const profilesRelations = relations(profiles, ({ many }) => ({
  e2eRuns: many(e2eRuns),
  profileForms: many(profileForms),
}));

export const profileFormsRelations = relations(profileForms, ({ one, many }) => ({
  profile: one(profiles, { fields: [profileForms.profileId], references: [profiles.id] }),
  e2eSnapshots: many(profileE2eSnapshots),
}));

export const profileE2eSnapshotsRelations = relations(profileE2eSnapshots, ({ one }) => ({
  profileForm: one(profileForms, { fields: [profileE2eSnapshots.profileFormId], references: [profileForms.id] }),
  e2eRun: one(e2eRuns, { fields: [profileE2eSnapshots.e2eRunId], references: [e2eRuns.id] }),
}));
```

Replace the existing `e2eRunsRelations.applicationSnapshots` member with
`e2eSnapshots: many(profileE2eSnapshots)`. Remove every relation that refers
to the deleted catalog, application, relative, document, or operational table.

- [ ] **Step 5: Run the new integration test and schema typecheck**

Run:

```powershell
cd nextjs
pnpm test __tests__/integration/profile-jsonb-schema.test.ts
pnpm exec tsc --noEmit
```

Expected: the test may still fail until Task 4 seeds the new schema; TypeScript
must pass with no imports of deleted tables.

- [ ] **Step 6: Commit the schema-only conversion**

```powershell
git add nextjs/lib/drizzle/schema nextjs/__tests__/integration/profile-jsonb-schema.test.ts
git commit -m "refactor: store EnrollMate profiles as JSONB"
```

### Task 4: Seed validated JSONB fixtures and remove catalog seeding

**Files:**

- Modify: `nextjs/lib/drizzle/seed.ts`
- Rewrite: `nextjs/lib/drizzle/seed/seed-profiles.ts`
- Remove: `nextjs/lib/drizzle/seed/seed-enrollmate-catalog.ts`
- Modify: `nextjs/__tests__/integration/profile-jsonb-schema.test.ts`
- Remove: `nextjs/__tests__/unit/lib/enrollmate-option-source.test.ts`
- Remove: `nextjs/__tests__/unit/lib/enrollmate-field-coverage.test.ts`
- Remove: `nextjs/__tests__/integration/enrollmate-catalog-schema.test.ts`

- [ ] **Step 1: Add a failing seed assertion for parsed JSONB fixtures**

```ts
it("seeds only active-definition JSONB documents", async () => {
  const db = getDb();
  const forms = await db.select().from(profileForms);

  for (const form of forms) {
    expect(form.definitionHash).toBe(getEnrollmateDefinitionHash());
    expect(() => getEnrollmateValidator(form.flowType).parse(form.data)).not.toThrow();
  }
});
```

- [ ] **Step 2: Run the test to verify the old seed does not produce forms**

Run:

```powershell
cd nextjs
pnpm test __tests__/integration/profile-jsonb-schema.test.ts
```

Expected: FAIL because the old seed has no `profile_forms` inserts.

- [ ] **Step 3: Rewrite profile fixture persistence around the contract**

Keep the existing four identity summaries and E2E run fixture IDs. Replace all
option-ID resolution and relational upserts with these three writes per
profile:

```ts
const operationalData = profileOperationalDataSchema.parse(profile.operationalData);

await tx.insert(profiles).values({
  id: profile.id,
  name: profile.name,
  middleName: profile.middleName,
  email: profile.email,
  program: profile.program,
  cohort: profile.cohort,
  status: profile.status,
  operationalData,
  createdBy: currentOperator.id,
  updatedBy: currentOperator.id,
}).onConflictDoUpdate({
  target: profiles.id,
  set: {
    name: profile.name,
    middleName: profile.middleName,
    email: profile.email,
    program: profile.program,
    cohort: profile.cohort,
    status: profile.status,
    operationalData,
    updatedBy: currentOperator.id,
  },
});

for (const form of profile.forms) {
  const data = getEnrollmateValidator(form.flowType).parse(form.data);
  await tx.insert(profileForms).values({
    profileId: profile.id,
    flowType: form.flowType,
    definitionHash: getEnrollmateDefinitionHash(),
    data,
  }).onConflictDoUpdate({
    target: [profileForms.profileId, profileForms.flowType],
    set: { definitionHash: getEnrollmateDefinitionHash(), data },
  });
}
```

Populate the fixture documents with exact field names and submitted values from
the moved definition. Keep both Bachelor and Microcredential forms for Ari so
the existing dual-flow acceptance scenario survives. Store documents, parents,
addresses, readiness, discovery channels, and study reasons inside the form
document; store payment/study-buddy/additional/disclosure/system sections only
inside `operationalData`.

Remove `seedEnrollmateCatalog`, `requireOptionId`, `catalogVersionId`, and all
option lookup arguments from `seed.ts` and `seedProfiles`.

- [ ] **Step 4: Run seeding and JSONB integration tests**

Run:

```powershell
cd nextjs
pnpm db:seed
pnpm test __tests__/integration/profile-jsonb-schema.test.ts
```

Expected: seed completes with no catalog messages; integration tests confirm
both flows, valid documents, JSONB operational data, and unique flow rows.

- [ ] **Step 5: Commit the seed conversion and obsolete test removal**

```powershell
git add nextjs/lib/drizzle/seed.ts nextjs/lib/drizzle/seed/seed-profiles.ts nextjs/__tests__/integration/profile-jsonb-schema.test.ts
git rm nextjs/lib/drizzle/seed/seed-enrollmate-catalog.ts nextjs/__tests__/unit/lib/enrollmate-option-source.test.ts nextjs/__tests__/unit/lib/enrollmate-field-coverage.test.ts nextjs/__tests__/integration/enrollmate-catalog-schema.test.ts
git commit -m "refactor: seed validated EnrollMate JSONB profiles"
```

### Task 5: Project JSONB forms into the E2E workspace and definition-driven display

**Files:**

- Create: `nextjs/feature/e2e/lib/profile-form-display.ts`
- Create: `nextjs/__tests__/unit/feature/e2e/profile-form-display.test.ts`
- Modify: `nextjs/feature/e2e/types/e2e-testing.types.ts`
- Modify: `nextjs/feature/e2e/services/e2e-profile.service.ts`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`
- Modify: `nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts`

- [ ] **Step 1: Write failing display and service tests**

```ts
it("uses scraped section and field labels when rendering a Bachelor document", () => {
  const groups = getProfileFormDisplayGroups(
    "bachelors",
    getEnrollmateValidator("bachelors").parse(validBachelorForm),
  );

  expect(groups).toContainEqual(expect.objectContaining({ label: "Applicant Information" }));
  expect(groups.flatMap((group) => group.fields)).toContainEqual({
    label: "Term Applied",
    value: "August 2026 | First Term",
  });
});

it("marks a form deprecated when its stored hash differs", async () => {
  profilesFindFirst.mockResolvedValue({
    id: "profile-1",
    name: "Alex Student",
    email: "alex@example.com",
    program: "BSIT",
    cohort: "2026",
    status: "new",
    middleName: null,
    operationalData: {},
    profileForms: [{
      id: "form-1",
      profileId: "profile-1",
      flowType: "bachelors",
      definitionHash: "old-hash",
      data: {},
    }],
  });
  await expect(getE2eProfileById("profile-1", db as never)).resolves.toMatchObject({
    profile: { profileForms: [expect.objectContaining({ isDeprecated: true })] },
  });
});
```

- [ ] **Step 2: Run the tests to show the relational workspace shape is obsolete**

Run:

```powershell
cd nextjs
pnpm test __tests__/unit/feature/e2e/profile-form-display.test.ts __tests__/unit/services/e2e/e2e-profile.service.test.ts
```

Expected: FAIL because the display helper and `profileForms` API projection do
not exist.

- [ ] **Step 3: Replace workspace types and query graph**

Replace the old `E2eProfileWorkspaceProfile` members (`catalogOptions`,
`enrollmentData`, `flows`, `documents`, readiness, and the five operational
objects) with:

```ts
type E2eProfileForm = typeof profileForms.$inferSelect & {
  isDeprecated: boolean;
};

interface E2eProfileWorkspaceProfile extends E2eProfileSummary {
  middleName: string | null;
  operationalData: ProfileOperationalData;
  profileForms: E2eProfileForm[];
}
```

Change `getE2eProfileById` to request only `profileForms: true` and `e2eRuns`.
For each form, set `isDeprecated` when its `definitionHash !==
getEnrollmateDefinitionHash()`. Remove the catalog-options query entirely.
Return a profile without forms as a valid workspace profile; do not require the
old `enrollmentData` relation.

- [ ] **Step 4: Implement definition-driven display groups**

`getProfileFormDisplayGroups(flowType, data)` must traverse the active flow's
steps and sections in source order. For every non-button field whose key exists
in `data`, return `{ label: field.label, value: data[field.name] }`; format
arrays as comma-separated values, booleans as `Yes`/`No`, and file metadata as
the fixture filename. Do not map option IDs because JSONB stores submitted
strings directly.

Update `getProfileSheetGroups` to concatenate:

1. the relational Profile summary group;
2. groups from each non-deprecated `profileForm` through the helper;
3. a `Deprecated Bachelor application` or `Deprecated Microcredential
   application` group containing the stored definition hash and the message
   `This profile form does not match the active EnrollMate definition.`;
4. named groups for non-empty `operationalData` sections.

Keep the existing sheet cards, timestamp formatting, collapsed-section
behavior, run history, and controls intact.

- [ ] **Step 5: Run focused UI/service tests and lint**

Run:

```powershell
cd nextjs
pnpm test __tests__/unit/feature/e2e/profile-form-display.test.ts __tests__/unit/services/e2e/e2e-profile.service.test.ts
pnpm lint
```

Expected: all focused tests and lint pass, with no query for
`enrollmateOptions` remaining.

- [ ] **Step 6: Commit the workspace projection**

```powershell
git add nextjs/feature/e2e nextjs/__tests__/unit/feature/e2e nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts
git commit -m "refactor: render E2E profiles from form JSONB"
```

### Task 6: Generate a single Drizzle migration baseline and reset databases

**Files:**

- Remove: every existing `nextjs/drizzle/*.sql`
- Remove: every existing `nextjs/drizzle/meta/*`
- Generate: one new `nextjs/drizzle/0000_*.sql` and matching `meta` snapshot/journal through Drizzle Kit
- Modify: `nextjs/__tests__/integration/profile-jsonb-schema.test.ts`

- [ ] **Step 1: Verify the generated-history boundary before removal**

Run:

```powershell
git status --short
Get-ChildItem nextjs/drizzle -File
Get-ChildItem nextjs/drizzle/meta -File
```

Expected: only the committed `0000`–`0005` generated history and its metadata
are targeted; preserve any unrelated user-owned working-tree files.

- [ ] **Step 2: Remove only generated migration SQL and metadata**

Use `apply_patch` file deletions for every current SQL migration,
`nextjs/drizzle/meta/_journal.json`, and every current snapshot. Do not use
`git clean`, `git reset`, or manual edits to generated SQL.

- [ ] **Step 3: Generate the replacement migration through Drizzle Kit**

Run:

```powershell
cd nextjs
pnpm db:generate --name profile_jsonb_baseline
```

Expected: Drizzle creates a new `0000_*.sql`, a new `meta/0000_snapshot.json`,
and a new `meta/_journal.json` that define all current application, auth,
smoke, profile, form, snapshot, and E2E tables. Do not edit these generated
files.

- [ ] **Step 4: Reset, migrate, seed, and re-run the integration test**

Run:

```powershell
cd nextjs
pnpm db:reset
pnpm test __tests__/integration/profile-jsonb-schema.test.ts
```

Expected: the reset completes from the one generated baseline and the
integration test passes against the fresh database.

- [ ] **Step 5: Commit only Drizzle-generated history**

```powershell
git add nextjs/drizzle
git commit -m "chore: regenerate database migration baseline"
```

### Task 7: Complete documentation and full Next.js verification

**Files:**

- Modify: `docs/brainstorm/enrollmate-profile-schema.md`
- Modify: `docs/plans/2026-07-09-enrollmate-profile-schema.md`
- Modify: `docs/brainstorm/enrollmate-jsonb-profile-model.md`

- [ ] **Step 1: Mark prior relational records as superseded**

Add this notice immediately after the title of both prior documents:

```markdown
> **Superseded:** The JSONB profile model approved on 2026-07-10 replaces this relational option-catalog design. See `docs/brainstorm/enrollmate-jsonb-profile-model.md` and `docs/plans/2026-07-10-enrollmate-jsonb-profile-model.md`.
```

Do not delete the prior documents; they explain why the old migrations and
tests existed.

- [ ] **Step 2: Record implementation completion in the approved design**

Change its status line to:

```markdown
**Status:** Implemented — verified by the Next.js validation commands below
```

- [ ] **Step 3: Run the complete Next.js validation suite**

Run:

```powershell
just lint
just typecheck
just dev-test
cd nextjs
pnpm db:seed
```

Expected: lint, typecheck, all Next.js tests, and seeding pass. Do not run or
add browser Playwright tests for this migration. The later shared-contract
follow-up has separate server-only Node unit tests documented in the addendum
above.

- [ ] **Step 4: Review the final scope and commit documentation**

Run:

```powershell
git diff --check
git log --oneline -7
git show --stat HEAD
git status --short
```

Verify that only the contract asset move, shared contract, Next.js schema/seed/
workspace/test files, generated Drizzle baseline, and related documentation
changed. Then commit:

```powershell
git add docs
git commit -m "docs: supersede relational EnrollMate schema"
```

---

## Acceptance checklist

- The database has exactly `profiles`, `profile_forms`, and
  `profile_e2e_snapshots` for profile/form payload storage; E2E run tables are
  unchanged.
- `profiles` keeps relational `name`, `email`, `program`, `cohort`, and status
  and stores the five internal sections in `operational_data` JSONB.
- A profile can have one Bachelor and one Microcredential document but cannot
  have duplicate documents for the same flow.
- The active shared scrape generates validators without a network request.
- The frontend displays active form data from the shared definition and stored
  JSONB, with no option-ID lookup table.
- A stored definition hash mismatch makes the form visible but deprecated and
  blocks the future edit/run paths; no old validator is retained.
- All migration history is replaced with one Drizzle-generated baseline after a
  database reset.
- The browser Playwright test and runner contracts remain unchanged. The
  shared-contract follow-up adds only a server-only Node unit test and package
  dependency; it does not add a browser spec.

## Current implementation status

The JSONB migration and shared contract are implemented. The reusable
option-set consumer follow-up is implemented alongside this repository state:

- `getEnrollmateReusableOptionSets()` is exported from
  `@mihc/enrollmate-contract`.
- Next.js and Playwright server tooling use the same local package dependency.
- Playwright server unit tests run from `playwright/server/__tests__/unit/` with Node,
  while browser specs remain under `playwright/tests/`.
- Current package, project, and AI-agent usage guidance is indexed in
  `docs/README.md`.
