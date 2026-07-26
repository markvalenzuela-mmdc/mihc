import assert from "node:assert/strict";
import { test } from "node:test";
import { buildE2eArgs } from "./run-e2e";

test("buildE2eArgs runs the serial E2E suite with incremental and JSON reporters", () => {
  assert.deepEqual(buildE2eArgs(), [
    "test",
    "tests/e2e/enrollmate/apply-now.spec.ts",
    "--project=enrollmate",
    "--workers=1",
    "--reporter=./server/reporter/incremental-e2e-reporter.ts,json",
  ]);
});
