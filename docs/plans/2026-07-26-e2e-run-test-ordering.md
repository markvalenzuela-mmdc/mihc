# E2E Run Test Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return persisted E2E checks in execution order in active and historical run details.

**Architecture:** Keep ordering at the Drizzle relation query boundary. Both run-detail queries will order their nested `e2e_run_tests` relation by the existing `createdAt` timestamp ascending; the UI and Playwright persistence flow remain unchanged.

**Tech Stack:** TypeScript, Drizzle ORM, Vitest

---

### Task 1: Assert nested test ordering

**Files:**
- Modify: `nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts`

- [x] **Step 1: Add expectations to the existing active-run and selected-run tests**

In the active-run test, assert that the first `e2eRuns.findFirst` call contains
an ordered nested `tests` relation:

```ts
expect(e2eRunsFindFirst).toHaveBeenNthCalledWith(1, {
  where: expect.any(Function),
  orderBy: expect.any(Function),
  with: {
    startedByUser: true,
    runSteps: {
      with: {
        e2eStep: true,
        tests: {
          orderBy: expect.any(Function),
        },
      },
      orderBy: expect.any(Function),
    },
  },
});
```

In the selected-run summary test, assert the same nested relation shape:

```ts
expect(e2eRunsFindFirst).toHaveBeenCalledWith({
  where: expect.any(Function),
  with: {
    startedByUser: true,
    runSteps: {
      with: {
        e2eStep: true,
        tests: {
          orderBy: expect.any(Function),
        },
      },
      orderBy: expect.any(Function),
    },
  },
});
```

- [x] **Step 2: Run the focused test and verify the regression fails**

Run:

```sh
pnpm test -- __tests__/unit/services/e2e/e2e-profile.service.test.ts
```

Expected: the two new expectations fail because each query currently uses
`tests: true`.

### Task 2: Order persisted checks by creation time

**Files:**
- Modify: `nextjs/feature/e2e/services/e2e-profile.service.ts`

- [x] **Step 1: Update both nested test relations**

Replace `tests: true` in the active-run and selected-run query configurations
with:

```ts
tests: {
  orderBy: (e2eRunTests, { asc }) => [
    asc(e2eRunTests.createdAt),
  ],
},
```

- [x] **Step 2: Run the focused test and verify it passes**

Run:

```sh
pnpm test -- __tests__/unit/services/e2e/e2e-profile.service.test.ts
```

Expected: the E2E profile service test file passes.

- [x] **Step 3: Run static validation**

Run:

```sh
pnpm exec tsc --noEmit
git diff --check
```

Expected: TypeScript reports no errors and Git reports no whitespace errors.

- [x] **Step 4: Review scope**

Run:

```sh
git diff -- nextjs/feature/e2e/services/e2e-profile.service.ts nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts
git status --short
```

Expected: only the two intended Next.js files contain new task changes, while
all pre-existing user-owned modifications remain present and untouched.
