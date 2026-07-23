import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSmokeArgs } from "./run-smoke";
import { SMOKE_TARGETS } from "./smoke-targets";

test("runs the Smoke suite with one Playwright worker", () => {
  assert.deepEqual(buildSmokeArgs(SMOKE_TARGETS.website), [
    "test",
    SMOKE_TARGETS.website.testPath,
    `--project=${SMOKE_TARGETS.website.project}`,
    "--workers=1",
    "--reporter=./server/reporter/incremental-smoke-reporter.ts,json",
  ]);
});
