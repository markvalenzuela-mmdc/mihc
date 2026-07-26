# E2E Incremental Check Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended; dispatch a fresh subagent per task) or superpowers:executing-plans (inline batch execution). Steps use checkbox syntax for tracking.

**Goal:** Persist every E2E check independently through the same direct Playwright reporter lifecycle used by Smoke Testing, so existing SSE invalidation refreshes the UI during the run.

**Architecture:** Convert each visible E2E check into a serial Playwright test that shares one browser page per flow. A dedicated E2E reporter reads the check annotation at onTestEnd, queues direct PostgreSQL persistence, and emits e2e_run_changed after each transaction. Terminal completion only closes the run and preserves incremental rows.

**Tech Stack:** TypeScript, Playwright 1.61 reporter API, Hono/Inngest, Drizzle ORM, PostgreSQL LISTEN/NOTIFY, Next.js 16, TanStack Query 5, Node test runner.

**Design:** docs/brainstorm/2026-07-25-e2e-incremental-check-persistence.md

---

## File Map

- Modify playwright/server/db/persist-e2e-run.ts and its test: add one-check persistence and preserve rows during finalization.
- Modify playwright/server/runner/map-e2e-results.ts and its test: export and verify the selected-step resolver.
- Create playwright/server/reporter/incremental-e2e-reporter.ts and its test: mirror Smoke's ordered direct persistence queue.
- Modify playwright/server/runner/run-e2e.ts; create run-e2e.test.ts: pass run context and enable the reporter plus JSON reporter.
- Modify playwright/server/inngest/e2e-consumer.ts: pass context and call terminal completion without bulk result input.
- Modify playwright/tests/e2e/enrollmate/apply-now.spec.ts: make every visible check a serial test sharing one page.

No Next.js SSE files, database migrations, API contracts, or Smoke files should change.

---

### Task 1: Add one-check persistence and shared step routing

**Files:** playwright/server/db/persist-e2e-run.ts, playwright/server/db/persist-e2e-run.test.ts, playwright/server/runner/map-e2e-results.ts, playwright/server/runner/map-e2e-results.test.ts

- [x] **Step 1: Write failing resolver tests**

Add:

~~~ts
test("routes known checks and falls back to the last selected step", () => {
  assert.equal(resolveE2eStepId("page-loads", ["new", "validated"]), "new");
  assert.equal(
    resolveE2eStepId("step-1 (Student Info): filled", ["new", "validated"]),
    "validated",
  );
  assert.equal(
    resolveE2eStepId("page-loads", ["validated", "verification"]),
    "verification",
  );
});
~~~

Export resolveE2eStepId(checkName, selectedStepIds) from map-e2e-results.ts.
It must reuse STEP_BUCKET_MAP and the current last-selected-step fallback.

- [x] **Step 2: Write failing recordE2eCheck tests**

Extend the existing fake transaction with captured step/test inserts,
aggregate rows, updates, and SQL executions. Add cases that:

1. record a successful check under a new step and publish one payload containing profile-1/run-1;
2. add a failed check to an existing step, set aggregate status to failure, and round 3700ms + 2100ms to six seconds;
3. update an existing same-name test rather than inserting a duplicate;
4. complete a run without inserting any step/test rows.

Use this input:

~~~ts
export interface RecordE2eCheckInput {
  runId: string;
  profileId: string;
  stepId: string;
  testName: string;
  status: "success" | "failure" | "skipped";
  durationMs: number | null;
  errorMessage: string | null;
  logger: Logger;
}
~~~

Keep the current create/busy and missing-run notification tests.

- [x] **Step 3: Run focused tests and confirm the APIs are missing**

From playwright/ run:

~~~powershell
node --import tsx --test server/db/persist-e2e-run.test.ts server/runner/map-e2e-results.test.ts
~~~

Expected: new tests fail because resolveE2eStepId and recordE2eCheck do not exist.

- [x] **Step 4: Implement recordE2eCheck**

Inside one database transaction:

1. Find or insert e2e_run_steps for runId plus stepId.
2. Find the same run-step/test-name row; update it on replay or insert it.
3. Re-read that step's test rows.
4. Set step status to failure when any test failed, otherwise success.
5. Set durationSeconds to rounded summed durationMs, or null with no duration.
6. Call the existing notification helper after all writes.

Do not notify when the transaction throws. Log e2e_check_persisted with run,
step, test, and status.

- [x] **Step 5: Make terminal completion preserve incremental rows**

Change CompleteE2eRunInput to contain runId, runStatus, and logger only.
Remove the bulk e2e_run_steps/e2e_run_tests insertion loop from completeE2eRun.
Keep its run status/completedAt update, final logger entry, and one final
notification. Update the function comment to say results are written by
recordE2eCheck.

- [x] **Step 6: Run persistence and mapper tests**

~~~powershell
node --import tsx --test server/db/persist-e2e-run.test.ts server/runner/map-e2e-results.test.ts
~~~

Expected: all focused tests pass and terminal completion has no step/test inserts.

---

### Task 2: Add the direct incremental E2E reporter

**Files:** create playwright/server/reporter/incremental-e2e-reporter.ts and playwright/server/reporter/incremental-e2e-reporter.test.ts

- [x] **Step 1: Write reporter tests with an injected adapter**

Use:

~~~ts
interface E2eReporterPersistence {
  record(input: RecordE2eCheckInput): Promise<void>;
}
~~~

Provide E2E_RUN_ID, E2E_PROFILE_ID, E2E_SELECTED_STEP_IDS as JSON, and
E2E_CORRELATION_ID in the test environment. Cover passed page-loads routing,
failed step advanced formatting, annotation duration precedence, ordered
onTestEnd calls, annotation-free tests, and onEnd failure reporting.

- [x] **Step 2: Run the new test and verify the module is absent**

~~~powershell
node --import tsx --test server/reporter/incremental-e2e-reporter.test.ts
~~~

Expected: module import failure.

- [x] **Step 3: Implement the reporter**

Mirror IncrementalSmokeReporter with an adapter whose record method accepts
RecordE2eCheckInput. The constructor requires E2E_RUN_ID, E2E_PROFILE_ID, and
selected step IDs. onTestEnd parses the first valid check annotation from
test.annotations or result.annotations, resolves its step, maps status,
formats failures, and queues one record call. Tests without a check annotation
are ignored. onEnd awaits the queue and returns { status: "failed" } after the
first persistence error. printsToStdio returns false.

- [x] **Step 4: Run reporter and formatter tests**

~~~powershell
node --import tsx --test server/reporter/incremental-e2e-reporter.test.ts server/runner/format-failure.test.ts
~~~

Expected: all tests pass.

---

### Task 3: Wire runner context and terminal consumer behavior

**Files:** modify playwright/server/runner/run-e2e.ts, create playwright/server/runner/run-e2e.test.ts, modify playwright/server/inngest/e2e-consumer.ts

- [x] **Step 1: Add a failing argument-builder test**

Export buildE2eArgs and assert:

~~~ts
assert.deepEqual(buildE2eArgs(), [
  "test",
  "tests/e2e/enrollmate/apply-now.spec.ts",
  "--project=enrollmate",
  "--workers=1",
  "--reporter=./server/reporter/incremental-e2e-reporter.ts,json",
]);
~~~

- [x] **Step 2: Run it before implementation**

~~~powershell
node --import tsx --test server/runner/run-e2e.test.ts
~~~

Expected: buildE2eArgs is missing and the current runner still uses only JSON.

- [x] **Step 3: Pass context and enable the reporter**

Extend RunE2eOptions with runId, profileId, and stepIds. Set E2E_RUN_ID,
E2E_PROFILE_ID, E2E_SELECTED_STEP_IDS as JSON, and E2E_CORRELATION_ID in the
child environment. Use buildE2eArgs in spawn and keep report cleanup, stderr
logging, and null-report handling unchanged.

- [x] **Step 4: Update e2e-consumer.ts**

Pass runId, profileId, and stepIds into runE2e. Keep mapE2eResults for terminal
status/logging, then call completeE2eRun with runId, mapped.status, and logger.
Do not pass mapped.steps because incremental rows already exist.

- [x] **Step 5: Run runner tests and typecheck**

~~~powershell
node --import tsx --test server/runner/run-e2e.test.ts server/runner/map-e2e-results.test.ts
pnpm exec tsc --noEmit
~~~

Expected: focused runner tests pass and no changed E2E call path has a type error.

---

### Task 4: Split the EnrollMate flow into serial test cases

**File:** modify playwright/tests/e2e/enrollmate/apply-now.spec.ts

- [x] **Step 1: Move flow/data setup into a serial group**

For each flowType, use test.describe.serial. Resolve the flow, profile data,
fallback fields, and unique email once in beforeAll. Create one page with the
browser fixture in beforeAll and close it in afterAll. Preserve both existing
E2E_PROFILE_DATA_FILE and generated-fixture branches.

- [x] **Step 2: Add the page-loads test**

Call initSmoke and exactly one assertCheck named page-loads after
page.goto(flow.endpoint). The test title should be page-loads.

- [x] **Step 3: Add paired tests for each input step**

For each step in flow.steps.filter(hasFields), define a filled test followed by
an advanced test. Each calls initSmoke, runs one existing driver function, and
records exactly one assertCheck with its measured duration:

~~~ts
test("step label: filled", async ({}, testInfo) => {
  initSmoke(testInfo, {
    testId: "enrollmate-apply-now-" + flowType,
    url: flow.endpoint,
    type: "e2e",
  });
  const started = Date.now();
  const outcome = await fillStep(page, step, data);
  assertCheck(testInfo, label + ": filled", outcome.ok, outcome.message, Date.now() - started);
});
~~~

Use the same shape for advanceStep and label + ": advanced". Serial mode
stops later tests after a failure, matching current early-return behavior.

- [x] **Step 4: Add submit and confirmation tests**

Create separate submit and submission-confirmed tests with one annotation each,
using submitForm and confirmSubmission.

- [ ] **Step 5: List tests without launching a browser**

~~~powershell
pnpm exec playwright test tests/e2e/enrollmate/apply-now.spec.ts --project=enrollmate --list
~~~

Expected: one serial group per active flow and separate page-load, fill,
advance, submit, and confirmation tests.

Blocked in this workspace because the linked contract package cannot resolve
its `zod` dependency from the Playwright package.

---

### Task 5: Verify the complete incremental path

- [x] **Step 1: Run focused server tests**

~~~powershell
node --import tsx --test server/db/persist-e2e-run.test.ts server/reporter/incremental-e2e-reporter.test.ts server/runner/map-e2e-results.test.ts server/runner/run-e2e.test.ts
~~~

Expected: all focused persistence, reporter, mapper, and runner tests pass.

- [ ] **Step 2: Run existing E2E checks**

~~~powershell
cd ..\nextjs
pnpm exec vitest run __tests__/unit/feature/e2e
pnpm exec tsc --noEmit
cd ..\playwright
pnpm typecheck
pnpm exec playwright test tests/e2e/enrollmate/apply-now.spec.ts --project=enrollmate --list
~~~

Expected: existing E2E feature tests and Next.js typecheck pass. Report the
known unrelated run-smoke buildSmokeArgs failure separately if it remains.

Blocked by the current pnpm store/link state: Vitest has EPERM reads and cannot
resolve `@mihc/enrollmate-contract`; Next.js tsc has the same EPERM issue.

- [ ] **Step 3: Lint and inspect scope**

Run pnpm lint from nextjs/, then git diff --check and git status --short from
the repository root. Confirm only planned Playwright files changed and the
existing E2E SSE implementation remains intact.

Lint is blocked by the same dependency state (`eslint` cannot resolve `debug`).

- [ ] **Step 4: Manually verify live updates**

With PgDog, Hono/Inngest, and Next.js running, start a selected profile run.
Confirm the active run appears, then verify page-loads and each completed
fill/advance check appears one at a time without reload. Force a validation
failure and confirm prior successes remain. Confirm terminal status and
completion time update after the final notification.

Requires the local PgDog, Hono/Inngest, and Next.js services to be running.

---

## Self-Review Checklist

- The plan follows the approved Smoke precedent and does not add stdout/IPC.
- Every visible check has a reporter-observable Playwright test boundary.
- Every incremental write is authoritative PostgreSQL state plus the existing
  identifier-only notification.
- Terminal completion no longer bulk-replaces rows.
- Existing E2E API, SSE, React Query, and Smoke behavior remain unchanged.
- Every implementation task has exact files, commands, and expected outcomes.
