# Profile Sheet Group Readability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make profile-sheet group construction easy to read and maintain without changing its output.

**Architecture:** Keep all logic in the existing workspace helper. Replace dense nested collection chains with narrowly named builders and explicit ordered traversal; the public API remains `getProfileSheetGroups(profile)`.

**Tech Stack:** TypeScript 5, Vitest 4, Next.js 16.

---

## File structure

- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts` — retain the public types and export while separating each display concern into a local helper.
- Create: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts` — cover the observable group order, active-form traversal, deprecated-form notice, and operational sections.

### Task 1: Lock down the current group projection

**Files:**

- Create: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

- [ ] **Step 1: Write the failing projection test**

```ts
vi.mock("@mihc/enrollmate-contract", () => ({
  getEnrollmateFlowDefinition: () => ({
    steps: [{ sections: [{ label: "Applicant", fields: [{ name: "firstName", label: "First name" }] }] }],
  }),
}));

it("preserves profile, form, deprecated, and operational group order", () => {
  const groups = getProfileSheetGroups({
    name: "Ari Santos",
    middleName: null,
    email: "ari@example.edu",
    flowType: "BSIT",
    status: "new",
    profileForms: [
      { flowType: "bachelors", data: { firstName: "Ari" }, isDeprecated: false },
      { flowType: "microcredentials", definitionHash: "old-hash", data: {}, isDeprecated: true },
    ],
    operationalData: { payment: { method: "Card" }, disclosures: null },
  } as E2eProfileWorkspaceProfile);

  expect(groups).toEqual([
    expect.objectContaining({ label: "Profile" }),
    { label: "Applicant", fields: [{ label: "First name", value: "Ari" }] },
    expect.objectContaining({ label: "Deprecated microcredentials application" }),
    { label: "payment", fields: [{ label: "method", value: "Card" }] },
  ]);
});
```

- [ ] **Step 2: Run the focused test to establish the expected projection**

Run: `cd nextjs && pnpm test __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

Expected: PASS before the refactor, establishing the intended behavior.

### Task 2: Split the sheet projection into local builders

**Files:**

- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`

- [ ] **Step 1: Introduce builders with single responsibilities**

```ts
type ProfileForm = E2eProfileWorkspaceProfile["profileForms"][number];

function getActiveFormGroups(profileForm: ProfileForm): ProfileSheetGroup[] {
  const groups: ProfileSheetGroup[] = [];

  for (const step of getEnrollmateFlowDefinition(profileForm.flowType).steps) {
    for (const section of step.sections) {
      const fields = section.fields
        .filter((field) => field.name in profileForm.data)
        .map((field) => ({
          label: field.label,
          value: getDisplayValue(profileForm.data[field.name]),
        }));

      if (fields.length > 0) groups.push({ label: section.label, fields });
    }
  }

  return groups;
}
```

Create corresponding `getProfileGroup`, `getDeprecatedFormGroup`,
`getFormGroups`, and `getOperationalGroups` helpers. `getFormGroups` selects
the deprecated group when `isDeprecated` is true and otherwise delegates to
`getActiveFormGroups`. Keep `getDisplayValue`'s existing scalar, array, file
metadata, and JSON fallback behavior.

- [ ] **Step 2: Make the export an ordered assembly**

```ts
export function getProfileSheetGroups(
  profile: E2eProfileWorkspaceProfile,
): ProfileSheetGroup[] {
  return [
    getProfileGroup(profile),
    ...profile.profileForms.flatMap(getFormGroups),
    ...getOperationalGroups(profile),
  ];
}
```

- [ ] **Step 3: Run the focused projection test**

Run: `cd nextjs && pnpm test __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

Expected: PASS with the same labels, fields, values, and ordering.

### Task 3: Verify type safety and scope

**Files:**

- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`
- Create: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

- [ ] **Step 1: Run static checks**

Run:

```powershell
cd nextjs
pnpm lint feature/e2e/components/workspace/e2e-profile-sheet-groups.ts __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands exit successfully.

- [ ] **Step 2: Review the final diff**

Run: `git diff --check; git diff -- nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

Expected: only the focused helper refactor and its regression test change; existing user-owned changes elsewhere remain untouched.
