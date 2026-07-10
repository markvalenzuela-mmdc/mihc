# Profile Seed and Empty Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace implementation-placeholder profile seed values with realistic sample data and render every missing active-form answer as `Not provided`.

**Architecture:** Keep definition-driven seed generation in the existing seed module, but add realistic per-profile identity overrides and a narrow resolver for repetitive required text fields. Keep display normalization in the existing profile-sheet projection helper, where active definition fields are converted into sheet fields regardless of whether a stored key exists.

**Tech Stack:** TypeScript 5, Next.js 16, React 19, Drizzle ORM, Zod, Vitest 4.

---

## File structure

- Modify: `nextjs/lib/drizzle/seed/seed-profiles.ts` — own realistic profile fixtures and definition-driven seed value generation.
- Create: `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts` — verify both seeded flows validate and never contain implementation placeholders.
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts` — project all active fields and normalize missing display values.
- Modify: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts` — lock down complete-field projection and empty-value behavior.

The shared EnrollMate contract, database schema, API routes, service layer, and React workspace components remain unchanged.

### Task 1: Add regression coverage for profile seed payloads

**Files:**

- Create: `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts`
- Modify: `nextjs/lib/drizzle/seed/seed-profiles.ts`

- [ ] **Step 1: Export the existing form-data builder as a test seam**

In `nextjs/lib/drizzle/seed/seed-profiles.ts`, rename the function and export it
without changing its body:

```diff
-function createFormData(flowType: EnrollmateFlowType, email: string, overrides?: Record<string, unknown>) {
+export function createProfileFormData(flowType: EnrollmateFlowType, email: string, overrides?: Record<string, unknown>) {
```

Update the persistence call in `seedProfiles`:

```ts
const data = createProfileFormData(
  flowType,
  profile.email,
  formOverrides,
);
```

- [ ] **Step 2: Write the failing seed regression test**

Create `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts`:

```ts
import { getEnrollmateValidator } from "@mihc/enrollmate-contract";

import {
  createProfileFormData,
  profiles,
} from "@/lib/drizzle/seed/seed-profiles";

describe("profile seed form data", () => {
  it.each(profiles)(
    "creates realistic, valid form data for $name",
    (profile) => {
      const data = createProfileFormData(
        profile.flowType,
        profile.email,
        profile.formOverrides,
      );

      expect(getEnrollmateValidator(profile.flowType).safeParse(data).success)
        .toBe(true);
      expect(JSON.stringify(data)).not.toMatch(/seeded (conditional )?value/i);
      expect(data).toMatchObject(profile.formOverrides);
    },
  );
});
```

- [ ] **Step 3: Run the test to verify the placeholder assertion fails**

Run:

```powershell
Set-Location nextjs
pnpm test __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts
```

Expected: FAIL because the generated JSON still contains `Seeded value` or `Seeded conditional value`.

### Task 2: Generate realistic profile seed values

**Files:**

- Modify: `nextjs/lib/drizzle/seed/seed-profiles.ts`
- Test: `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts`

- [ ] **Step 1: Add realistic per-profile scenario overrides**

Replace `profileFixtures` with the same IDs, names, flow types, and statuses,
but give every fixture an explicit `formOverrides` object. Preserve the two
existing medical-condition and scholarship scenarios while adding identity
data:

```ts
const profileFixtures = [
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
];
```

- [ ] **Step 2: Add a field-aware required-value resolver**

Add `EnrollmateField` to the existing type import and place this helper above
`createProfileFormData`:

```ts
import type {
  EnrollmateField,
  EnrollmateFlowType,
} from "@mihc/enrollmate-contract";

function getRequiredTextSeedValue(field: EnrollmateField, email: string) {
  if (field.type === "email") return email;
  if (field.type === "date") return "1980-01-01";
  if (field.type === "tel") return "09170000000";

  const fieldName = field.name.toLowerCase();

  if (fieldName.endsWith("givenname")) return "Maria";
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
  const value = values[field.name];

  if (value) return value;
  throw new Error(`Missing realistic seed value for field: ${field.name}`);
}
```

The final error is intentional: a newly required free-text field must be given
an appropriate fixture value instead of silently reintroducing a generic
placeholder.

- [ ] **Step 3: Route required free-text controls through the resolver**

In `setField`, keep checkbox, file, option, and dependent-option handling, then
replace the current email/date/placeholder branches with the resolver:

```ts
function setField(field: (typeof fields)[number]) {
  if (data[field.name] !== undefined) return;

  if (field.type === "checkbox") {
    data[field.name] = false;
  } else if (field.type === "file") {
    data[field.name] = {
      fixtureUri: `fixtures/${field.name}.pdf`,
      filename: `${field.name}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1,
    };
  } else if (field.options.length) {
    const fieldName = field.name.toLowerCase();
    const preferredValue = fieldName.includes("country")
      ? "Philippines"
      : fieldName.includes("province")
        ? "Rizal"
        : undefined;
    const preferredOption = preferredValue
      ? field.options.find((option) => option.value === preferredValue)
      : undefined;
    data[field.name] = (preferredOption ?? field.options[0]!).value;
  } else if (Object.keys(field.optionsByDependency).length) {
    data[field.name] = Object.values(field.optionsByDependency)[0]![0]!.value;
  } else {
    data[field.name] = getRequiredTextSeedValue(field, email);
  }
}
```

- [ ] **Step 4: Run the seed regression test**

Run:

```powershell
Set-Location nextjs
pnpm test __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts
```

Expected: PASS for all five profile scenarios; every payload validates and its
serialized form contains no seeded-placeholder phrase.

- [ ] **Step 5: Commit the realistic seed implementation**

```powershell
git add -- nextjs/lib/drizzle/seed/seed-profiles.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts
git commit -m "fix(enrollmate): seed realistic profile data"
```

### Task 3: Add regression coverage for missing profile answers

**Files:**

- Modify: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`

- [ ] **Step 1: Expand the mocked active definition**

Replace the mocked `fields` array with fields that cover present, absent,
blank, boolean, and numeric values:

```ts
fields: [
  { name: "firstName", label: "First name" },
  { name: "middleName", label: "Middle name" },
  { name: "suffix", label: "Suffix" },
  { name: "nickname", label: "Nickname" },
  { name: "notes", label: "Notes" },
  { name: "isWorking", label: "Working student" },
  { name: "attempts", label: "Attempts" },
],
```

- [ ] **Step 2: Add a failing active-field projection test**

Add this test below the existing group-order test:

```ts
it("shows every active field and labels empty answers as not provided", () => {
  const profile = {
    name: "Ari Santos",
    middleName: null,
    email: "ari@example.edu",
    flowType: "bachelors",
    status: "new",
    profileForms: [
      {
        flowType: "bachelors",
        data: {
          firstName: "Ari",
          suffix: null,
          nickname: "",
          notes: "   ",
          isWorking: false,
          attempts: 0,
        },
        isDeprecated: false,
      },
    ],
    operationalData: {},
  } as unknown as E2eProfileWorkspaceProfile;

  expect(getProfileSheetGroups(profile)[1]).toEqual({
    label: "Applicant",
    fields: [
      { label: "First name", value: "Ari" },
      { label: "Middle name", value: "Not provided" },
      { label: "Suffix", value: "Not provided" },
      { label: "Nickname", value: "Not provided" },
      { label: "Notes", value: "Not provided" },
      { label: "Working student", value: false },
      { label: "Attempts", value: 0 },
    ],
  });
});
```

Update the existing group-order test's expected `Applicant` group to the exact
complete-field projection below. This keeps the existing test focused on exact
group order while acknowledging the new behavior:

```ts
{
  label: "Applicant",
  fields: [
    { label: "First name", value: "Ari" },
    { label: "Middle name", value: "Not provided" },
    { label: "Suffix", value: "Not provided" },
    { label: "Nickname", value: "Not provided" },
    { label: "Notes", value: "Not provided" },
    { label: "Working student", value: "Not provided" },
    { label: "Attempts", value: "Not provided" },
  ],
},
```

- [ ] **Step 3: Run the projection tests to verify they fail**

Run:

```powershell
Set-Location nextjs
pnpm test __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
```

Expected: FAIL because absent fields are filtered out and null, empty, and
whitespace-only answers are not normalized to `Not provided`.

### Task 4: Render all active fields with explicit empty text

**Files:**

- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`
- Test: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

- [ ] **Step 1: Normalize nullish and blank strings**

Replace the scalar opening of `getDisplayValue` with explicit empty-value
handling:

```ts
function getDisplayValue(value: unknown): ProfileSheetFieldValue {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "string") {
    return value.trim().length === 0 ? "Not provided" : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    const displayValue = value.map(String).join(", ");
    return displayValue.length === 0 ? "Not provided" : displayValue;
  }

  if (
    typeof value === "object" &&
    "filename" in value &&
    typeof value.filename === "string"
  ) {
    return value.filename.trim().length === 0
      ? "Not provided"
      : value.filename;
  }

  return JSON.stringify(value);
}
```

This preserves `false` and `0`. Empty arrays and file metadata with a blank
filename also represent no displayable answer and therefore use the same text.

- [ ] **Step 2: Project every field declared by an active definition**

In `getActiveFormGroups`, replace the filter/map chain with a direct map:

```ts
const fields = section.fields.map((field) => ({
  label: field.label,
  value: getDisplayValue(profileForm.data[field.name]),
}));
```

Keep the existing `fields.length > 0` group guard so definition sections with
no declared fields do not create empty cards.

- [ ] **Step 3: Run the profile-sheet projection tests**

Run:

```powershell
Set-Location nextjs
pnpm test __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
```

Expected: PASS with every mocked field present, missing and blank answers shown
as `Not provided`, and `false` and `0` preserved.

- [ ] **Step 4: Commit the display implementation**

```powershell
git add -- nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
git commit -m "fix(e2e): label missing profile answers"
```

### Task 5: Verify the complete change

**Files:**

- Verify: `nextjs/lib/drizzle/seed/seed-profiles.ts`
- Verify: `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts`
- Verify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`
- Verify: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

- [ ] **Step 1: Run both focused test files together**

```powershell
Set-Location nextjs
pnpm test __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
```

Expected: both test files pass.

- [ ] **Step 2: Run lint for the touched TypeScript files**

```powershell
pnpm lint lib/drizzle/seed/seed-profiles.ts __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts feature/e2e/components/workspace/e2e-profile-sheet-groups.ts __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
```

Expected: ESLint exits successfully with no errors.

- [ ] **Step 3: Run the Next.js TypeScript check**

```powershell
pnpm exec tsc --noEmit
```

Expected: TypeScript exits successfully with no diagnostics.

- [ ] **Step 4: Reseed the configured local database**

```powershell
pnpm db:seed
```

Expected: the command exits successfully and reports all five profile names as
seeded. If no local database is configured, record the environment failure and
retain the passing unit-level payload validation as evidence.

- [ ] **Step 5: Review scope and whitespace**

From the repository root:

```powershell
git status --short --branch
git diff --check
git diff --stat origin/feat/86d3kexr3-update-enrollmate-schema...HEAD
```

Expected: no whitespace errors; implementation changes are limited to the four
files listed above, alongside the approved brainstorm and plan documents.

- [ ] **Step 6: Commit any final verification-only adjustments**

Only if a verification step required a scoped correction:

```powershell
git add -- nextjs/lib/drizzle/seed/seed-profiles.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
git commit -m "fix(enrollmate): finalize profile seed display"
```

If verification required no code changes, do not create an empty commit.
