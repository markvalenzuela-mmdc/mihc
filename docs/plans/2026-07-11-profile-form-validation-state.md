# Profile Form Validation State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive an explicit active, deprecated, or invalid state for every workspace profile form while keeping invalid workspaces readable and non-runnable.

**Architecture:** Decode current-hash JSONB at the E2E profile service boundary and return a discriminated serializable DTO. Keep hash mismatch as a non-validating deprecated path, render invalid issues through the existing sheet projection, and make run controls depend on the presence of an active form.

**Tech Stack:** TypeScript 5, Next.js 16, React 19, Drizzle ORM, Zod 4, Vitest 4, Testing Library.

---

## File structure

- Modify: `nextjs/feature/e2e/types/e2e-testing.types.ts` — define the discriminated workspace form DTO and normalized validation issue.
- Modify: `nextjs/feature/e2e/services/e2e-profile.service.ts` — derive form state and validate current-hash JSONB.
- Modify: `nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts` — cover active, deprecated, and invalid state derivation.
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts` — render deprecated, invalid, and active forms through explicit state dispatch.
- Modify: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts` — cover invalid form presentation and migrate existing fixtures from `isDeprecated`.
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx` — derive whether the profile has an active form.
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-info.tsx` — disable run controls and explain the blocked state.
- Create: `nextjs/__tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx` — verify non-runnable controls.

Do not modify `profiles.flowType`, database migrations, JSONB columns, or existing run APIs.

### Task 1: Lock down profile-form state derivation

**Files:**

- Modify: `nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts`
- Modify: `nextjs/feature/e2e/types/e2e-testing.types.ts`
- Modify: `nextjs/feature/e2e/services/e2e-profile.service.ts`

- [ ] **Step 1: Add deterministic contract mocks to the service test**

Place these mocks after the Vitest import and before importing the service:

```ts
const contractMocks = vi.hoisted(() => ({
  safeParse: vi.fn(),
}));

vi.mock("@mihc/enrollmate-contract", () => ({
  getEnrollmateValidator: () => ({ safeParse: contractMocks.safeParse }),
}));

vi.mock("@mihc/enrollmate-contract/server", () => ({
  getEnrollmateDefinitionHash: () => "current-hash",
}));
```

Add this reset inside the existing `beforeEach`:

```ts
contractMocks.safeParse.mockReset();
```

- [ ] **Step 2: Add failing state-derivation tests**

Add this local setup helper inside the existing `describe` block:

```ts
function mockWorkspaceProfile(profileForms: Array<Record<string, unknown>>) {
  profilesFindFirst.mockResolvedValue({
    id: "profile-1",
    name: "Alex Student",
    middleName: null,
    email: "alex@example.edu",
    flowType: "bachelors",
    status: "new",
    operationalData: {},
    profileForms,
  });
  e2eStepsFindMany.mockResolvedValue([]);
  e2eRunsFindFirst.mockResolvedValue(null);
}
```

Add these tests:

```ts
it("returns parsed current-hash forms as active", async () => {
  mockWorkspaceProfile([
    {
      id: "form-1",
      profileId: "profile-1",
      flowType: "bachelors",
      definitionHash: "current-hash",
      data: { email: "raw@example.edu" },
    },
  ]);
  contractMocks.safeParse.mockReturnValue({
    success: true,
    data: { email: "parsed@example.edu" },
  });

  const result = await getE2eProfileById("profile-1", db as never);

  expect(result?.profile.profileForms[0]).toMatchObject({
    state: "active",
    data: { email: "parsed@example.edu" },
  });
});

it("returns mismatched-hash forms as deprecated without parsing them", async () => {
  mockWorkspaceProfile([
    {
      id: "form-1",
      profileId: "profile-1",
      flowType: "bachelors",
      definitionHash: "old-hash",
      data: { legacy: true },
    },
  ]);

  const result = await getE2eProfileById("profile-1", db as never);

  expect(result?.profile.profileForms[0]).toMatchObject({
    state: "deprecated",
    data: { legacy: true },
  });
  expect(contractMocks.safeParse).not.toHaveBeenCalled();
});

it("returns current-hash validation failures as invalid serializable forms", async () => {
  mockWorkspaceProfile([
    {
      id: "form-1",
      profileId: "profile-1",
      flowType: "bachelors",
      definitionHash: "current-hash",
      data: { email: "invalid" },
    },
  ]);
  contractMocks.safeParse.mockReturnValue({
    success: false,
    error: {
      issues: [
        { path: ["email"], message: "Invalid email address" },
        { path: [], message: "Form-level problem" },
      ],
    },
  });

  const result = await getE2eProfileById("profile-1", db as never);

  expect(result?.profile.profileForms[0]).toMatchObject({
    state: "invalid",
    data: { email: "invalid" },
    validationIssues: [
      { path: "email", message: "Invalid email address" },
      { path: "form", message: "Form-level problem" },
    ],
  });
});
```

- [ ] **Step 3: Run the focused service test and verify failure**

Run:

```powershell
Set-Location nextjs
pnpm test __tests__/unit/services/e2e/e2e-profile.service.test.ts
```

Expected: the new assertions fail because workspace forms still expose only `isDeprecated` and raw data.

- [ ] **Step 4: Define the discriminated workspace form DTO**

In `nextjs/feature/e2e/types/e2e-testing.types.ts`, replace the existing
`E2eProfileForm` declaration with:

```ts
type ProfileFormSelect = typeof profileForms.$inferSelect;
type E2eProfileFormBase = Omit<ProfileFormSelect, "data"> & {
  data: Record<string, unknown>;
};

export type ProfileFormValidationIssue = {
  path: string;
  message: string;
};

export type E2eProfileForm =
  | (E2eProfileFormBase & { state: "active" })
  | (E2eProfileFormBase & { state: "deprecated" })
  | (E2eProfileFormBase & {
      state: "invalid";
      validationIssues: ProfileFormValidationIssue[];
    });
```

Keep `E2eProfileWorkspaceProfile` pointing to `E2eProfileForm[]`.

- [ ] **Step 5: Add a focused service serializer**

In `nextjs/feature/e2e/services/e2e-profile.service.ts`:

```ts
import { getEnrollmateValidator } from "@mihc/enrollmate-contract";
```

Add `profileForms` to the existing Drizzle imports, add `E2eProfileForm` to the
type imports, and place this helper before `getE2eProfileById`:

```ts
type ProfileFormRecord = typeof profileForms.$inferSelect;

function serializeProfileForm(
  form: ProfileFormRecord,
  currentDefinitionHash: string,
): E2eProfileForm {
  if (form.definitionHash !== currentDefinitionHash) {
    return { ...form, state: "deprecated" };
  }

  const result = getEnrollmateValidator(form.flowType).safeParse(form.data);
  if (result.success) {
    return { ...form, data: result.data, state: "active" };
  }

  return {
    ...form,
    state: "invalid",
    validationIssues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join(".") || "form",
      message: issue.message,
    })),
  };
}
```

Replace the current profile-form mapping in `getE2eProfileById` with:

```ts
const currentDefinitionHash = getEnrollmateDefinitionHash();
```

Use the captured hash in the returned profile object:

```ts
profileForms: (profile.profileForms ?? []).map((form) =>
  serializeProfileForm(form, currentDefinitionHash),
),
```

- [ ] **Step 6: Run the service test**

```powershell
pnpm test __tests__/unit/services/e2e/e2e-profile.service.test.ts
```

Expected: all service tests pass and the validator mock is never called for a deprecated form.

- [ ] **Step 7: Commit the service-boundary state model**

```powershell
git add -- nextjs/feature/e2e/types/e2e-testing.types.ts nextjs/feature/e2e/services/e2e-profile.service.ts nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts
git commit -m "feat(e2e): validate workspace profile forms"
```

### Task 2: Render invalid profile forms

**Files:**

- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts`
- Modify: `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`

- [ ] **Step 1: Migrate existing test fixtures to explicit states**

In `nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts`, replace:

```ts
isDeprecated: false,
```

with:

```ts
state: "active",
```

and replace:

```ts
isDeprecated: true,
```

with:

```ts
state: "deprecated",
```

- [ ] **Step 2: Add a failing invalid-form projection test**

```ts
it("renders invalid forms as validation summaries", () => {
  const profile = {
    name: "Ari Santos",
    middleName: null,
    email: "ari@example.edu",
    flowType: "bachelors",
    status: "new",
    profileForms: [
      {
        flowType: "bachelors",
        definitionHash: "current-hash",
        data: { email: "invalid" },
        state: "invalid",
        validationIssues: [
          { path: "email", message: "Invalid email address" },
          { path: "birthdate", message: "Expected an ISO date" },
        ],
      },
    ],
    operationalData: {},
  } as unknown as E2eProfileWorkspaceProfile;

  expect(getProfileSheetGroups(profile)[1]).toEqual({
    label: "Invalid bachelors application",
    fields: [
      { label: "Definition hash", value: "current-hash" },
      {
        label: "Status",
        value: "This profile form does not satisfy the active EnrollMate definition.",
      },
      { label: "email", value: "Invalid email address" },
      { label: "birthdate", value: "Expected an ISO date" },
    ],
  });
});
```

- [ ] **Step 3: Run the sheet-group test and verify failure**

```powershell
pnpm test __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
```

Expected: FAIL because `getFormGroups` still branches on `isDeprecated` and has no invalid group.

- [ ] **Step 4: Dispatch form projection by state**

Add this helper beside `getDeprecatedFormGroup`:

```ts
function getInvalidFormGroup(profileForm: Extract<ProfileForm, { state: "invalid" }>): ProfileSheetGroup {
  return {
    label: `Invalid ${profileForm.flowType} application`,
    fields: [
      { label: "Definition hash", value: profileForm.definitionHash },
      {
        label: "Status",
        value: "This profile form does not satisfy the active EnrollMate definition.",
      },
      ...profileForm.validationIssues.map((issue) => ({
        label: issue.path,
        value: issue.message,
      })),
    ],
  };
}
```

Replace `getFormGroups` with:

```ts
function getFormGroups(profileForm: ProfileForm): ProfileSheetGroup[] {
  switch (profileForm.state) {
    case "deprecated":
      return [getDeprecatedFormGroup(profileForm)];
    case "invalid":
      return [getInvalidFormGroup(profileForm)];
    case "active":
      return getActiveFormGroups(profileForm);
  }
}
```

- [ ] **Step 5: Run the sheet-group test**

```powershell
pnpm test __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
```

Expected: all projection tests pass.

- [ ] **Step 6: Commit invalid form presentation**

```powershell
git add -- nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
git commit -m "feat(e2e): show invalid profile forms"
```

### Task 3: Disable run controls without an active form

**Files:**

- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx`
- Modify: `nextjs/feature/e2e/components/workspace/e2e-profile-workspace-info.tsx`
- Create: `nextjs/__tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx`

- [ ] **Step 1: Add a failing run-control test**

Create `nextjs/__tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileWorkspaceControls } from "@/feature/e2e/components/workspace/e2e-profile-workspace-info";

describe("ProfileWorkspaceControls", () => {
  it("disables run actions when the profile has no active form", () => {
    render(
      <ProfileWorkspaceControls
        steps={[{ id: "new", label: "New", description: null, sortOrder: 1, createdAt: new Date() }]}
        activeRun={null}
        selectedStepCount={1}
        selectionLocked={false}
        canRun={false}
        onSelectedStepCountChange={vi.fn()}
        onAutomated={vi.fn()}
        onManual={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Run selected steps locally" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start manual run" })).toBeDisabled();
    expect(screen.getByText("This profile has no active validated application to run.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the control test and verify failure**

```powershell
pnpm test __tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx
```

Expected: FAIL because `canRun` is not a declared prop and the controls remain enabled.

- [ ] **Step 3: Add the run-readiness prop and blocked explanation**

In `ProfileWorkspaceControls`, add the prop:

```ts
canRun: boolean;
```

Destructure `canRun`, then update the buttons:

```tsx
<Button
  type="button"
  onClick={onAutomated}
  disabled={selectionLocked || !canRun}
>
```

```tsx
<Button
  type="button"
  variant="outline"
  onClick={onManual}
  disabled={!canRun}
>
```

Replace the help paragraph expression with:

```tsx
{!canRun
  ? "This profile has no active validated application to run."
  : activeRun
    ? `Run #${activeRun.runNumber} is locked to ${selectedRange} until it completes.`
    : "Remove steps from the end of the sequence, or add the next excluded step."}
```

- [ ] **Step 4: Derive readiness in the workspace**

In `E2eProfileWorkspace`, add:

```ts
const canRun = profile.profileForms.some((form) => form.state === "active");
```

Pass it to the controls:

```tsx
<ProfileWorkspaceControls
  steps={stepDefinitions}
  activeRun={activeRun}
  selectedStepCount={effectiveStepCount}
  selectionLocked={selectionLocked}
  onSelectedStepCountChange={setSelectedStepCount}
  onAutomated={onAutomated}
  onManual={onManual}
  canRun={canRun}
/>
```

- [ ] **Step 5: Run the control and workspace-focused tests**

```powershell
pnpm test __tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts __tests__/unit/services/e2e/e2e-profile.service.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit run readiness**

```powershell
git add -- nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx nextjs/feature/e2e/components/workspace/e2e-profile-workspace-info.tsx nextjs/__tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx
git commit -m "feat(e2e): block runs without an active form"
```

### Task 4: Verify profile form state behavior

**Files:**

- Verify all files changed in Tasks 1-3.

- [ ] **Step 1: Run focused tests**

```powershell
Set-Location nextjs
pnpm test __tests__/unit/services/e2e/e2e-profile.service.test.ts __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts __tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx
```

Expected: all selected test files pass.

- [ ] **Step 2: Run lint only on touched files**

```powershell
pnpm lint feature/e2e/types/e2e-testing.types.ts feature/e2e/services/e2e-profile.service.ts feature/e2e/components/workspace/e2e-profile-sheet-groups.ts feature/e2e/components/workspace/e2e-profile-workspace.tsx feature/e2e/components/workspace/e2e-profile-workspace-info.tsx __tests__/unit/services/e2e/e2e-profile.service.test.ts __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts __tests__/unit/feature/e2e/e2e-profile-workspace-info.test.tsx
```

Expected: no lint errors in touched files. Existing repository warnings outside this list remain out of scope.

- [ ] **Step 3: Run the complete Next.js suite**

```powershell
pnpm test
```

Expected: all Next.js test files pass.

- [ ] **Step 4: Review diff scope**

From the repository root:

```powershell
git status --short --branch
git diff --check
git diff --stat origin/feat/86d3kexr3-update-enrollmate-schema...HEAD
```

Expected: no whitespace errors and no changes to schema migrations, `profiles.flowType`, unrelated lint warnings, or run mutation APIs.
