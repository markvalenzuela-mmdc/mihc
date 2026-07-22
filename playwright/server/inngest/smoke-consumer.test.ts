import assert from "node:assert/strict";
import { test } from "node:test";
import type { FinalizeSmokeRunInput } from "../db/persist-run";
import type { Logger } from "../logger";
import type { PlaywrightJsonReport } from "../runner/map-results";
import { SMOKE_TARGETS } from "../runner/smoke-targets";
import { executeSmokeRun, type SmokeRunDependencies } from "./smoke-consumer";

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
};

const data = {
  appId: "website" as const,
  suite: "smoke",
  trigger: "manual" as const,
  correlationId: "correlation-1",
  requestedBy: "11111111-1111-1111-1111-111111111111",
  requestedAt: "2026-07-22T08:00:00.000Z",
};

const target = SMOKE_TARGETS.website;

const passingReport: PlaywrightJsonReport = {
  suites: [
    {
      specs: [
        {
          title: "loads",
          tests: [{ results: [{ status: "passed", duration: 10 }] }],
        },
      ],
    },
  ],
  stats: { duration: 1_000 },
};

test("executes create, run, and finalize in separate ordered steps", async () => {
  const steps: string[] = [];
  let runnerRunId: string | undefined;
  let finalized: FinalizeSmokeRunInput | undefined;
  const dependencies: SmokeRunDependencies = {
    async create() {
      return { runId: "run-1", runNumber: 4 };
    },
    async run(options) {
      runnerRunId = options.runId;
      return { report: passingReport, exitCode: 0 };
    },
    async finalize(input) {
      finalized = input;
    },
  };

  const result = await executeSmokeRun(
    { data, target, logger },
    async (name, callback) => {
      steps.push(name);
      return callback();
    },
    dependencies,
  );

  assert.deepEqual(steps, ["create-smoke-run", "run-suite", "finalize-smoke-run"]);
  assert.equal(runnerRunId, "run-1");
  assert.equal(finalized?.runId, "run-1");
  assert.equal(finalized?.status, "success");
  assert.deepEqual(result, { runId: "run-1", runNumber: 4, status: "success" });
});

test("does not launch Playwright when run creation fails", async () => {
  let runnerCalled = false;
  const dependencies: SmokeRunDependencies = {
    async create() {
      throw new Error("database unavailable");
    },
    async run() {
      runnerCalled = true;
      return { report: passingReport, exitCode: 0 };
    },
    async finalize() {},
  };

  await assert.rejects(
    executeSmokeRun(
      { data, target, logger },
      async (_name, callback) => callback(),
      dependencies,
    ),
    /database unavailable/,
  );
  assert.equal(runnerCalled, false);
});

test("finalizes a missing report as failure", async () => {
  let finalStatus: string | undefined;
  const dependencies: SmokeRunDependencies = {
    async create() {
      return { runId: "run-1", runNumber: 4 };
    },
    async run() {
      return { report: null, exitCode: null };
    },
    async finalize(input) {
      finalStatus = input.status;
    },
  };

  await executeSmokeRun(
    { data, target, logger },
    async (_name, callback) => callback(),
    dependencies,
  );

  assert.equal(finalStatus, "failure");
});
