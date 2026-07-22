# Smoke Result Label Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize names and repository-relative file paths for newly persisted Smoke results without changing any execution or UI behavior.

**Architecture:** Add one pure reporter-side formatter and call it immediately before the existing `startSmokeTestResult` operation. Existing rows and all downstream persistence/query/UI contracts remain untouched.

**Tech Stack:** TypeScript, Node path normalization, Playwright reporter API, Node test runner

**Execution constraint:** Preserve Mode 3: leave implementation and plan changes uncommitted for review.

---

## File Map

- Create `playwright/server/reporter/smoke-result-labels.ts`: pure name and path normalization.
- Create `playwright/server/reporter/smoke-result-labels.test.ts`: representative prose, route, acronym, Windows, and POSIX cases.
- Modify `playwright/server/reporter/incremental-smoke-reporter.ts`: normalize only the two display fields before persistence.
- Modify `playwright/server/reporter/incremental-smoke-reporter.test.ts`: assert reporter persistence receives normalized values.

### Task 1: Add the pure formatter

- [ ] **Step 1: Write failing formatter tests**

Require these mappings:

```ts
formatSmokeTestName("smoke: landing page") === "Landing page"
formatSmokeTestName("smoke: certification content-creator") === "Certification content creator"
formatSmokeTestName("smoke: /admissions/city-scholarships/") === "Admissions / City Scholarships"
formatSmokeTestName("smoke: BSIT lead form") === "BSIT lead form"
formatSmokeTestFile("C:\\repo\\playwright\\tests\\smoke\\landing.spec.ts") === "smoke/landing.spec.ts"
formatSmokeTestFile("/repo/playwright/tests/smoke/landing.spec.ts") === "smoke/landing.spec.ts"
```

- [ ] **Step 2: Run the focused test and confirm the missing module fails**

Run: `pnpm test:unit -- server/reporter/smoke-result-labels.test.ts`

- [ ] **Step 3: Implement the minimal pure formatter**

The name formatter removes the leading marker, humanizes hyphens, title-cases route segments, and otherwise capitalizes only the first character so existing acronyms remain intact. The path formatter uses forward slashes and returns only the portion following the final `/tests/` marker; already-relative `tests/` paths lose that prefix.

- [ ] **Step 4: Run the formatter tests**

Expected: all formatter cases pass.

### Task 2: Connect the reporter boundary

- [ ] **Step 1: Update the reporter lifecycle assertion**

Use a raw title and absolute Windows location, then assert the persistence adapter receives `Landing page` and `smoke/landing.spec.ts`.

- [ ] **Step 2: Apply both formatters only in `onTestBegin`**

Do not change persistence types, database operations, result status mapping, timing, error formatting, or finalization.

- [ ] **Step 3: Run all reporter tests and Playwright typecheck**

Run:

```text
pnpm test:unit -- server/reporter/smoke-result-labels.test.ts server/reporter/incremental-smoke-reporter.test.ts
pnpm typecheck
```

- [ ] **Step 4: Audit scope**

Run `git diff --check` and confirm no schema, API, query, UI, or historical-data compatibility code was added by this follow-up.
