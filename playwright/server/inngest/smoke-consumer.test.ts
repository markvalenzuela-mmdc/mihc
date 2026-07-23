import assert from "node:assert/strict";
import { test } from "node:test";
import type { FinalizeSmokeRunInput } from "../db/persist-run";
import type { Logger } from "../logger";
import type { PlaywrightJsonReport } from "../runner/map-results";
import { SMOKE_TARGETS } from "../runner/smoke-targets";
import {
  executeSmokeRun,
  SMOKE_CONSUMER_CONFIG,
  type SmokeRunDependencies,
} from "./smoke-consumer";

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
};

const data = {
  runId: "11111111-1111-1111-1111-111111111111",
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

test("claims, runs, and finalizes in separate ordered steps", async () => {
  const steps: string[] = [];
  let runnerRunId: string | undefined;
  let finalized: FinalizeSmokeRunInput | undefined;
  const dependencies: SmokeRunDependencies = {
    async claim() {
      return true;
    },
    async run(options) {
      runnerRunId = options.runId;
      return { report: passingReport, exitCode: 0 };
    },
    async finalize(input) {
      finalized = input;
      return true;
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

  assert.deepEqual(steps, ["claim-smoke-run", "run-suite", "finalize-smoke-run"]);
  assert.equal(runnerRunId, data.runId);
  assert.equal(finalized?.runId, data.runId);
  assert.equal(finalized?.status, "success");
  assert.deepEqual(result, { runId: data.runId, status: "success" });
});

test("does not launch Playwright when claiming fails", async () => {
  let runnerCalled = false;
  const dependencies: SmokeRunDependencies = {
    async claim() {
      throw new Error("database unavailable");
    },
    async run() {
      runnerCalled = true;
      return { report: passingReport, exitCode: 0 };
    },
    async finalize() {
      return true;
    },
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
    async claim() {
      return true;
    },
    async run() {
      return { report: null, exitCode: null };
    },
    async finalize(input) {
      finalStatus = input.status;
      return true;
    },
  };

  await executeSmokeRun(
    { data, target, logger },
    async (_name, callback) => callback(),
    dependencies,
  );

  assert.equal(finalStatus, "failure");
});

test("skips a duplicate event after the run was already claimed", async () => {
  let runnerCalled = false;
  let finalizeCalled = false;
  const dependencies: SmokeRunDependencies = {
    async claim() {
      return false;
    },
    async run() {
      runnerCalled = true;
      return { report: passingReport, exitCode: 0 };
    },
    async finalize() {
      finalizeCalled = true;
      return true;
    },
  };

  const result = await executeSmokeRun(
    { data, target, logger },
    async (name, callback) => {
      assert.equal(name, "claim-smoke-run");
      return callback();
    },
    dependencies,
  );

  assert.deepEqual(result, { skipped: "already_claimed", runId: data.runId });
  assert.equal(runnerCalled, false);
  assert.equal(finalizeCalled, false);
});

test("configures one globally concurrent smoke consumer", () => {
  assert.equal(SMOKE_CONSUMER_CONFIG.concurrency, 1);
});
