# Shared EnrollMate Fixture Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give definition-driven fixture generation one shared owner and reduce `seed-profiles.ts` to readable fixture assembly and persistence.

**Architecture:** Add a testing-only package subpath that owns required-field traversal, conditional evaluation, mechanical values, and final validation while accepting consumer overrides and a value resolver. Keep realistic scenarios and fallback policy in focused Next.js seed modules, and reuse the shared builder from contract tests.

**Tech Stack:** TypeScript 5/6 consumers, Zod 4, local package exports, Vitest 4, Node test runner, Drizzle ORM.

---

## File structure

- Modify: `packages/enrollmate-contract/package.json` — export the testing-only entry point.
- Create: `packages/enrollmate-contract/src/testing.ts` — own deterministic validator-ready payload construction.
- Create: `nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts` — cover the shared builder with real flow definitions.
- Modify: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts` — replace its duplicate valid-data traversal.
- Create: `nextjs/lib/drizzle/seed/profile-fixtures.ts` — own realistic persisted profile scenarios.
- Create: `nextjs/lib/drizzle/seed/profile-form-value-policy.ts` — resolve realistic values the contract cannot infer.
- Modify: `nextjs/lib/drizzle/seed/seed-profiles.ts` — retain form assembly and database upserts only.
- Modify: `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts` — import fixtures from their canonical module if needed.
- Modify: `playwright/server/__tests__/unit/enrollmate-contract.test.ts` — prove the server consumer can load the testing subpath.

### Task 1: Add the testing-only package fixture builder

**Files:**

- Modify: `packages/enrollmate-contract/package.json`
- Create: `packages/enrollmate-contract/src/testing.ts`
- Create: `nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts`

- [ ] **Step 1: Write failing shared-builder tests**

Create `nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts`:

```ts
import {
  getEnrollmateValidator,
  type EnrollmateField,
} from "@mihc/enrollmate-contract";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";
import { describe, expect, it } from "vitest";

function resolveFixtureField(field: EnrollmateField) {
  if (field.type === "email") return "applicant@example.edu";
  if (field.type === "date") return "2000-01-01";
  if (field.type === "tel") return "09170000000";
  if (field.type === "text" || field.type === "textarea") return "Example value";
  if (field.name.toLowerCase().includes("citymun")) return "Tanay";
  if (field.name.toLowerCase().includes("barangay")) return "Sampaloc";
  if (field.optionSource?.kind === "external") return "Example value";
  return undefined;
}

describe("createEnrollmateFixture", () => {
  it.each(["bachelors", "microcredentials"] as const)(
    "creates valid %s data",
    (flowType) => {
      const data = createEnrollmateFixture(flowType, {
        resolveField: resolveFixtureField,
      });

      expect(getEnrollmateValidator(flowType).safeParse(data).success).toBe(true);
    },
  );

  it("applies overrides before evaluating conditional fields", () => {
    const data = createEnrollmateFixture("bachelors", {
      overrides: {
        schoolNotFound: true,
        lastschOther: "Example Academy",
      },
      resolveField: resolveFixtureField,
    });

    expect(data).toMatchObject({
      schoolNotFound: true,
      lastschOther: "Example Academy",
    });
  });

  it("fails with the unsupported field name when no value can be resolved", () => {
    expect(() =>
      createEnrollmateFixture("bachelors", {
        resolveField: () => undefined,
      }),
    ).toThrow(/termApplied|givenName|email/);
  });
});
```

- [ ] **Step 2: Run the fixture test and verify module-resolution failure**

```powershell
Set-Location nextjs
pnpm test __tests__/unit/lib/enrollmate-fixture.test.ts
```

Expected: FAIL because `@mihc/enrollmate-contract/testing` is not exported.

- [ ] **Step 3: Export the testing subpath**

In `packages/enrollmate-contract/package.json`, extend `exports`:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./testing": "./src/testing.ts"
  }
}
```

- [ ] **Step 4: Implement the shared builder**

Create `packages/enrollmate-contract/src/testing.ts`:

```ts
import { getEnrollmateFlowDefinition, getEnrollmateValidator } from "./registry";
import type { EnrollmateField, EnrollmateFlowType } from "./types";

export type EnrollmateFixtureOptions = {
  overrides?: Record<string, unknown>;
  resolveField?: (field: EnrollmateField) => unknown;
};

function conditionMatches(
  field: EnrollmateField,
  data: Record<string, unknown>,
) {
  if (!field.conditionalOn) return true;
  const value = data[field.conditionalOn.field];
  return (
    (typeof value === "string" || typeof value === "boolean") &&
    field.conditionalOn.equalsAny.includes(value)
  );
}

function getMechanicalValue(
  field: EnrollmateField,
  data: Record<string, unknown>,
) {
  if (field.type === "checkbox") return false;
  if (field.type === "file") {
    return {
      fixtureUri: `fixtures/${field.name}.pdf`,
      filename: `${field.name}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1,
    };
  }
  if (field.options.length > 0) return field.options[0]!.value;
  if (field.optionSource?.kind === "dependent") {
    const parentValue = data[field.optionSource.field];
    if (typeof parentValue !== "string") return undefined;
    return field.optionsByDependency[parentValue]?.[0]?.value;
  }
  return undefined;
}

export function createEnrollmateFixture(
  flowType: EnrollmateFlowType,
  { overrides = {}, resolveField }: EnrollmateFixtureOptions = {},
) {
  const data: Record<string, unknown> = { ...overrides };
  const fields = getEnrollmateFlowDefinition(flowType).steps.flatMap((step) =>
    step.sections.flatMap((section) => section.fields),
  );

  function setField(field: EnrollmateField) {
    if (data[field.name] !== undefined) return false;
    const resolved = resolveField?.(field);
    const value = resolved ?? getMechanicalValue(field, data);
    if (value === undefined) {
      throw new Error(`Missing fixture value for required field: ${field.name}`);
    }
    data[field.name] = value;
    return true;
  }

  for (const field of fields) {
    if (field.required && !field.conditionalOn) setField(field);
  }

  for (let pass = 0; pass < fields.length; pass += 1) {
    let changed = false;
    for (const field of fields) {
      if (
        field.conditionalOn &&
        (field.required || field.requiredWhenConditionMet) &&
        conditionMatches(field, data)
      ) {
        changed = setField(field) || changed;
      }
    }
    if (!changed) break;
  }

  return getEnrollmateValidator(flowType).parse(data);
}
```

- [ ] **Step 5: Run the fixture test**

```powershell
pnpm test __tests__/unit/lib/enrollmate-fixture.test.ts
```

Expected: all shared-builder tests pass for both flows and the conditional override.

- [ ] **Step 6: Commit the shared testing API**

```powershell
git add -- packages/enrollmate-contract/package.json packages/enrollmate-contract/src/testing.ts nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts
git commit -m "feat(enrollmate-contract): add shared fixture builder"
```

### Task 2: Reuse the shared builder in contract tests

**Files:**

- Modify: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`
- Modify: `playwright/server/__tests__/unit/enrollmate-contract.test.ts`

- [ ] **Step 1: Replace the duplicate Next.js traversal**

Import the builder and field type:

```ts
import type { EnrollmateField } from "@mihc/enrollmate-contract";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";
import { describe, expect, it } from "vitest";
```

Replace the existing `createValidBachelorData` function with:

```ts
function resolveContractFixtureField(field: EnrollmateField) {
  if (field.type === "email") return "applicant@example.edu";
  if (field.type === "date") return "2000-01-01";
  if (field.type === "tel") return "09170000000";
  if (field.type === "text" || field.type === "textarea") return "Example value";
  if (field.name.toLowerCase().includes("citymun")) return "Tanay";
  if (field.name.toLowerCase().includes("barangay")) return "Sampaloc";
  if (field.optionSource?.kind === "external") return "Example value";
  return undefined;
}

function createValidBachelorData() {
  return createEnrollmateFixture("bachelors", {
    resolveField: resolveContractFixtureField,
  });
}
```

This also fixes the existing missing Vitest-global imports only because this
touched contract test now requires explicit imports; do not modify unrelated
test or lint warnings.

- [ ] **Step 2: Prove Playwright can load the testing subpath**

In `playwright/server/__tests__/unit/enrollmate-contract.test.ts`, add:

```ts
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";
```

Add this test:

```ts
test("Playwright can consume the shared EnrollMate fixture builder", () => {
  const data = createEnrollmateFixture("microcredentials", {
    resolveField: (field) => {
      if (field.type === "email") return "applicant@example.edu";
      if (field.type === "date") return "2000-01-01";
      if (field.type === "tel") return "09170000000";
      if (field.type === "text" || field.type === "textarea") return "Example value";
      if (field.name.toLowerCase().includes("citymun")) return "Tanay";
      if (field.name.toLowerCase().includes("barangay")) return "Sampaloc";
      return undefined;
    },
  });

  assert.equal(data.email, "applicant@example.edu");
});
```

- [ ] **Step 3: Run both consumer test surfaces**

```powershell
Set-Location nextjs
pnpm test __tests__/unit/lib/enrollmate-contract.test.ts __tests__/unit/lib/enrollmate-fixture.test.ts
Set-Location ..\playwright
pnpm test:unit
pnpm typecheck
```

Expected: Next.js contract tests pass; Playwright server tests and typecheck pass.

- [ ] **Step 4: Commit shared test adoption**

```powershell
git add -- nextjs/__tests__/unit/lib/enrollmate-contract.test.ts playwright/server/__tests__/unit/enrollmate-contract.test.ts
git commit -m "test(enrollmate): reuse shared fixture generation"
```

### Task 3: Separate realistic seed fixtures and value policy

**Files:**

- Create: `nextjs/lib/drizzle/seed/profile-fixtures.ts`
- Create: `nextjs/lib/drizzle/seed/profile-form-value-policy.ts`
- Modify: `nextjs/lib/drizzle/seed/seed-profiles.ts`
- Modify: `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts`

- [ ] **Step 1: Move profile scenarios into a fixture module**

Create `nextjs/lib/drizzle/seed/profile-fixtures.ts` with the existing five
scenarios:

```ts
export const profileFixtures = [
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40101",
    name: "Ari Santos",
    middleName: null,
    email: "ari.santos@example.edu",
    flowType: "bachelors" as const,
    status: "validated" as const,
    formOverrides: {
      givenName: "Ari",
      familyName: "Santos",
      birthplace: "Quezon City",
      birthdate: "2003-04-18",
      mobile: "09171234567",
      withMedicalCondition: "No",
      interestedForAScholarship: "Yes",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40102",
    name: "Mika Reyes",
    middleName: null,
    email: "mika.reyes@example.edu",
    flowType: "bachelors" as const,
    status: "new" as const,
    formOverrides: {
      givenName: "Mika",
      familyName: "Reyes",
      birthplace: "Pasig City",
      birthdate: "2002-09-07",
      mobile: "09181234567",
      withMedicalCondition: "Yes",
      medicalDiagnosisDescription: "Managed asthma",
      interestedForAScholarship: "No",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40103",
    name: "Noel Cruz",
    middleName: null,
    email: "noel.cruz@example.edu",
    flowType: "bachelors" as const,
    status: "guidance_needed" as const,
    formOverrides: {
      givenName: "Noel",
      familyName: "Cruz",
      birthplace: "Antipolo City",
      birthdate: "2004-01-22",
      mobile: "09191234567",
      withMedicalCondition: "No",
      interestedForAScholarship: "No",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40104",
    name: "Sam Lim",
    middleName: null,
    email: "sam.lim@example.edu",
    flowType: "bachelors" as const,
    status: "completed" as const,
    formOverrides: {
      givenName: "Sam",
      familyName: "Lim",
      birthplace: "Manila",
      birthdate: "2001-12-03",
      mobile: "09201234567",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40105",
    name: "Rosa Cruz",
    middleName: null,
    email: "rosa.cruz@example.edu",
    flowType: "microcredentials" as const,
    status: "new" as const,
    formOverrides: {
      givenName: "Rosa",
      familyName: "Cruz",
      birthplace: "Makati City",
      birthdate: "1998-06-14",
      mobile: "09211234567",
    },
  },
] as const;
```

This is a mechanical move: the five IDs, names, emails, flow types, statuses,
and all current overrides must remain byte-for-byte equivalent. Verify with the
existing parameterized seed test after Step 4.

- [ ] **Step 2: Extract the realistic field-value policy**

Create `nextjs/lib/drizzle/seed/profile-form-value-policy.ts`:

```ts
import type { EnrollmateField } from "@mihc/enrollmate-contract";

export function createProfileFormValueResolver(email: string) {
  return (field: EnrollmateField) => {
    const fieldName = field.name.toLowerCase();

    if (field.type === "email") return email;
    if (field.type === "date") return "1980-01-01";
    if (field.type === "tel") return "09170000000";
    if (fieldName.includes("country")) return "Philippines";
    if (fieldName.includes("province")) return "Rizal";
    if (fieldName.endsWith("givenname")) return "Maria";
    if (fieldName.endsWith("middlename")) return "Reyes";
    if (fieldName.endsWith("familyname")) return "Santos";
    if (fieldName.includes("addrline1")) return "123";
    if (fieldName.includes("addrline2")) return "Rizal Street, San Isidro";
    if (fieldName.includes("zipcode")) return "1920";
    if (fieldName.includes("citymun")) return "Tanay";
    if (fieldName.includes("barangay")) return "Sampaloc";
    if (fieldName.includes("occupation")) return "Operations Manager";

    const values: Record<string, string> = {
      birthplace: "Quezon City",
      studentCompany: "Mapúa Learning Solutions",
      otherStrand: "General Academic Strand",
      lastSchoolAttended: "Rizal National High School",
      lastschOther: "Rizal National High School",
      medicalDiagnosisDescription: "Managed asthma",
      grdnOtherApplRelationship: "Aunt",
    };

    return values[field.name];
  };
}
```

The resolver intentionally returns `undefined` when the shared builder can
supply a mechanical value or when a newly required field needs an explicit
policy decision.

- [ ] **Step 3: Reduce `seed-profiles.ts` to assembly and persistence**

Replace the contract imports with:

```ts
import { profileOperationalDataSchema } from "@mihc/enrollmate-contract";
import type { EnrollmateFlowType } from "@mihc/enrollmate-contract";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";
```

Import the new local modules:

```ts
import { profileFixtures } from "./profile-fixtures";
import { createProfileFormValueResolver } from "./profile-form-value-policy";
```

Delete the local fixture array, `getRequiredTextSeedValue`, field traversal, and
`setField`. Replace `createProfileFormData` with:

```ts
export function createProfileFormData(
  flowType: EnrollmateFlowType,
  email: string,
  overrides?: Record<string, unknown>,
) {
  return createEnrollmateFixture(flowType, {
    overrides: { email, ...overrides },
    resolveField: createProfileFormValueResolver(email),
  });
}
```

Keep the persistence function with the same conflict targets and update sets,
formatted as follows:

```ts
export async function seedProfiles(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

  for (const profile of profileFixtures) {
    const { flowType, formOverrides, ...profileValues } = profile;
    const operationalData = profileOperationalDataSchema.parse({
      systemInfo: { isSentToApi: true },
    });
    const status = profile.status as (typeof profiles.$inferInsert)["status"];

    await tx
      .insert(profiles)
      .values({
        ...profileValues,
        flowType,
        status,
        operationalData,
        createdBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
        updatedBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name: profile.name,
          email: profile.email,
          flowType,
          status,
          operationalData,
        },
      });

    const data = createProfileFormData(
      flowType,
      profile.email,
      formOverrides,
    );

    await tx
      .insert(profileForms)
      .values({
        profileId: profile.id,
        flowType,
        definitionHash: getEnrollmateDefinitionHash(),
        data,
      })
      .onConflictDoUpdate({
        target: [profileForms.profileId, profileForms.flowType],
        set: {
          definitionHash: getEnrollmateDefinitionHash(),
          data,
        },
      });

    messages.push(`Seeded profile: ${profile.name}`);
  }

  return messages;
}
```

Keep the compatibility export:

```ts
export { profileFixtures as profiles } from "./profile-fixtures";
```

- [ ] **Step 4: Update the seed test to use the canonical fixtures**

Change its imports to:

```ts
import { profileFixtures } from "@/lib/drizzle/seed/profile-fixtures";
import { createProfileFormData } from "@/lib/drizzle/seed/seed-profiles";
```

Change:

```ts
it.each(profiles)(
```

to:

```ts
it.each(profileFixtures)(
```

- [ ] **Step 5: Run the seed and shared fixture tests**

```powershell
Set-Location nextjs
pnpm test __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts __tests__/unit/lib/enrollmate-fixture.test.ts __tests__/unit/lib/enrollmate-contract.test.ts
```

Expected: all five realistic profile cases and both shared flows validate; no serialized seed data contains `Seeded value`.

- [ ] **Step 6: Commit the seed decomposition**

```powershell
git add -- nextjs/lib/drizzle/seed/profile-fixtures.ts nextjs/lib/drizzle/seed/profile-form-value-policy.ts nextjs/lib/drizzle/seed/seed-profiles.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts
git commit -m "refactor(enrollmate): separate profile seed concerns"
```

### Task 4: Verify shared fixture generation and reseed

**Files:**

- Verify all files changed in Tasks 1-3.

- [ ] **Step 1: Lint the shared package with the established Next.js rules**

From the repository root:

```powershell
.\nextjs\node_modules\.bin\eslint.cmd --config .\nextjs\eslint.config.mjs ".\packages\enrollmate-contract\src\**\*.ts"
```

Expected: exit code 0 with no package lint errors. React/pages environment notices may be printed because the config belongs to Next.js; do not change unrelated lint configuration.

- [ ] **Step 2: Lint only touched Next.js files**

```powershell
Set-Location nextjs
pnpm lint lib/drizzle/seed/profile-fixtures.ts lib/drizzle/seed/profile-form-value-policy.ts lib/drizzle/seed/seed-profiles.ts __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts __tests__/unit/lib/enrollmate-fixture.test.ts __tests__/unit/lib/enrollmate-contract.test.ts
```

Expected: no lint errors in touched files. Existing warnings elsewhere remain out of scope.

- [ ] **Step 3: Run the complete Next.js suite**

```powershell
pnpm test
```

Expected: all Next.js test files pass.

- [ ] **Step 4: Run Playwright package checks**

```powershell
Set-Location ..\playwright
pnpm test:unit
pnpm typecheck
```

Expected: all Playwright server tests and TypeScript checks pass.

- [ ] **Step 5: Reseed the configured database**

```powershell
Set-Location ..\nextjs
pnpm db:seed
```

Expected: the transaction completes and reports all five profile names as seeded.

- [ ] **Step 6: Review scope and whitespace**

From the repository root:

```powershell
git status --short --branch
git diff --check
git diff --stat origin/feat/86d3kexr3-update-enrollmate-schema...HEAD
```

Expected: no whitespace errors; package changes are limited to the testing
subpath; Next.js changes are limited to fixture consumers and seed separation;
no profile-flow schema or unrelated lint cleanup is present.
