import assert from "node:assert/strict";
import { test } from "node:test";

import { getEnrollmateReusableOptionSets } from "@mihc/enrollmate-contract";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";

test("Playwright can consume shared EnrollMate reusable options", () => {
  const optionSets = getEnrollmateReusableOptionSets();

  assert.ok(optionSets.countryOptions.length > 0);
  assert.deepEqual(optionSets.countryOptions[0], {
    label: "Afghanistan",
    value: "Afghanistan",
  });
});

test("Playwright can consume the shared EnrollMate fixture builder", () => {
  const data = createEnrollmateFixture("microcredentials", {
    resolveField: (field) => {
      if (field.type === "email") return "applicant@example.edu";
      if (field.type === "date") return "2000-01-01";
      if (field.type === "tel") return "09170000000";
      if (field.type === "text" || field.type === "textarea") {
        return "Example value";
      }
      if (field.name.toLowerCase().includes("citymun")) return "Tanay";
      if (field.name.toLowerCase().includes("barangay")) return "Sampaloc";
      return undefined;
    },
  });

  assert.equal(data.email, "applicant@example.edu");
});
