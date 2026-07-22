import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatSmokeTestFile,
  formatSmokeTestName,
} from "./smoke-result-labels";

test("formats Smoke test names for display", () => {
  assert.equal(formatSmokeTestName("smoke: landing page"), "Landing page");
  assert.equal(
    formatSmokeTestName("smoke: certification content-creator"),
    "Certification content creator",
  );
  assert.equal(
    formatSmokeTestName("smoke: /admissions/city-scholarships/"),
    "Admissions / City Scholarships",
  );
  assert.equal(formatSmokeTestName("smoke: BSIT lead form"), "BSIT lead form");
});

test("formats Smoke test files as repository-relative paths", () => {
  assert.equal(
    formatSmokeTestFile(
      "C:\\repo\\playwright\\tests\\smoke\\landing.spec.ts",
    ),
    "smoke/landing.spec.ts",
  );
  assert.equal(
    formatSmokeTestFile("/repo/playwright/tests/smoke/landing.spec.ts"),
    "smoke/landing.spec.ts",
  );
  assert.equal(
    formatSmokeTestFile("tests/smoke/landing.spec.ts"),
    "smoke/landing.spec.ts",
  );
  assert.equal(formatSmokeTestFile(""), null);
});
