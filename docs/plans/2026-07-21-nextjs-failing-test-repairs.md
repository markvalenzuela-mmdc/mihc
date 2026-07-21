# Next.js Failing Test Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a clean Next.js test run by aligning unit isolation and assertions with current application and EnrollMate behavior.

**Architecture:** Keep every repair local to the failing test file. Mock live auth/database boundaries in unit tests, synthesize a renderer-only external field, and assert the stable contract of generated seed data rather than one random value.

**Tech Stack:** TypeScript, Vitest, Testing Library, Next.js 16, Drizzle test database, pnpm.

**Execution note:** Leave the plan and test repairs uncommitted for review, then ask whether to commit.

---

## File Map

- Modify `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx` — isolate the authenticated server page.
- Modify `nextjs/__tests__/unit/feature/e2e/request-e2e-test.action.test.ts` — isolate and cover the active-run database preflight.
- Modify `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx` — align renderer fixtures and accessibility assertions with the current contract.
- Modify `nextjs/__tests__/integration/api-routes-and-db.test.ts` — assert the stable generated-name pattern.

### Task 1: Isolate auth and database unit boundaries

**Files:**
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx`
- Modify: `nextjs/__tests__/unit/feature/e2e/request-e2e-test.action.test.ts`

- [ ] **Step 1: Mock the profile page authentication guard**

Add a hoisted authenticated user and mock before the page import:

```ts
const authenticatedUser = {
  id: "user-1",
  name: "Test Operator",
  email: "operator@example.com",
};

vi.mock("@/feature/auth/auth-guards", () => ({
  requireAuthenticated: vi.fn().mockResolvedValue(authenticatedUser),
}));
```

This prevents the unit test from importing the real auth action and database client.

- [ ] **Step 2: Mock the request action database preflight**

Extend the existing hoisted mocks:

```ts
const mocks = vi.hoisted(() => ({
  findActiveRun: vi.fn(),
  getCurrentUser: vi.fn(),
  inngestSend: vi.fn(),
}));

vi.mock("@/lib/drizzle/db", () => ({
  getDb: () => ({
    query: {
      e2eRuns: { findFirst: mocks.findActiveRun },
    },
  }),
}));
```

Reset `findActiveRun` in `beforeEach()` and default it to `null` with
`mockResolvedValue(null)`.

- [ ] **Step 3: Cover the existing-running-run response**

Add this behavior test:

```ts
it("rejects a profile that already has a running run", async () => {
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  mocks.findActiveRun.mockResolvedValue({ runNumber: 12 });

  await expect(
    requestE2eTest({ profileId: "profile-1", stepIds: ["new"] }),
  ).resolves.toEqual({
    ok: false,
    error: "Run #12 is still in progress for this profile.",
  });
  expect(mocks.inngestSend).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Run the two focused unit files**

From `nextjs/`, run:

```powershell
pnpm test -- __tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx __tests__/unit/feature/e2e/request-e2e-test.action.test.ts
```

Expected: both files PASS without `DATABASE_URL`.

### Task 2: Align renderer tests with the normalized contract

**Files:**
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`

- [ ] **Step 1: Create a focused external-field fixture**

Add this helper beside the existing field lookup helpers:

```ts
function getExternalField(): EnrollmateField {
  const field = getField("programFocus");

  return {
    ...field,
    id: "externalProgramFocus",
    name: "externalProgramFocus",
    options: [],
    optionSource: { kind: "external" },
  };
}
```

Use `getExternalField()` in the free-entry and label/error tests instead of calling
`getFieldByOptionSource("external")`.

- [ ] **Step 2: Make description assertions reflect optional metadata**

Keep the required assertions for each registered control, then branch only the
description assertion:

```ts
if (definition.description) {
  expect(control).toHaveAccessibleDescription(definition.description);
} else {
  expect(control).not.toHaveAccessibleDescription();
}
expect(control).toHaveAttribute("aria-required", "true");
expect(screen.getByText("(required)")).toBeVisible();
```

Rename the table-driven test to state that it forwards contract metadata rather
than claiming every field has a description.

- [ ] **Step 3: Run the renderer test file**

Run:

```powershell
pnpm test -- __tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
```

Expected: all renderer tests PASS.

### Task 3: Align the integration seed assertion

**Files:**
- Modify: `nextjs/__tests__/integration/api-routes-and-db.test.ts`

- [ ] **Step 1: Replace the obsolete fixed-name assertion**

Replace `expect(body.data.profile.name).toBe("Ari Santos")` with:

```ts
expect(body.data.profile.name).toMatch(
  /^(SampleInternsTest|Interns|Intern) \S+$/,
);
```

Keep the exact profile ID, response status, success flag, and step count assertions.

- [ ] **Step 2: Run the integration file**

From `nextjs/`, run:

```powershell
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: all integration tests PASS using `TEST_DATABASE_URL` from the existing test
environment.

### Task 4: Full verification and handoff

**Files:** All files in the File Map plus this plan.

- [ ] **Step 1: Run the complete Next.js suite**

From `nextjs/`, run:

```powershell
pnpm test
pnpm exec tsc --noEmit
pnpm lint
```

Expected: all tests and typechecking PASS; lint reports zero errors. Existing warnings
remain informational.

- [ ] **Step 2: Audit the final diff**

Run from the repository root:

```powershell
git status --short
git diff --check
git diff --stat
git diff --
```

Confirm only the four test files and this implementation plan changed. Confirm the
previous EnrollMate implementation commits remain intact.

- [ ] **Step 3: Hand off for commit approval**

Report focused and full verification results, list any remaining warnings, and ask
whether to commit the uncommitted test repairs.
