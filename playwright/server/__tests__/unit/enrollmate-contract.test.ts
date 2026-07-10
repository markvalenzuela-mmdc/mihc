import assert from "node:assert/strict";
import { test } from "node:test";

import { getEnrollmateReusableOptionSets } from "@mihc/enrollmate-contract";

test("Playwright can consume shared EnrollMate reusable options", () => {
  const optionSets = getEnrollmateReusableOptionSets();

  assert.ok(optionSets.countryOptions.length > 0);
  assert.deepEqual(optionSets.countryOptions[0], {
    label: "Afghanistan",
    value: "Afghanistan",
  });
});
