import assert from "node:assert/strict";
import type { Page } from "@playwright/test";
import { test } from "node:test";

import { getEnrollmateFlowDefinition } from "@mihc/enrollmate-contract";
import { fillStep } from "../../../lib/enrollmate/apply-now-driver";

test("skips hidden Philippine address controls and fills a foreign textarea", async () => {
  const sourceStep = getEnrollmateFlowDefinition("microcredentials").steps[0]!;
  const sourceSection = sourceStep.sections.find(
    (section) => section.label === "Current Address",
  );
  if (!sourceSection) throw new Error("Missing current address section");

  const step = {
    ...sourceStep,
    sections: [{
      ...sourceSection,
      fields: sourceSection.fields.filter((field) =>
        ["curraddrCountry", "curraddrForeign", "curraddrAddrline1"].includes(field.name),
      ),
    }],
  } as typeof sourceStep;
  const filled: Record<string, string> = {};
  const locator = {
    count: async () => 1,
    first() {
      return this;
    },
    scrollIntoViewIfNeeded: async () => undefined,
    selectOption: async (value: string) => {
      filled.curraddrCountry = value;
    },
    fill: async (value: string) => {
      filled.curraddrForeign = value;
    },
  };
  const page = {
    locator(selector: string) {
      if (
        selector === '[name="curraddrCountry"]' ||
        selector === '[name="curraddrForeign"]'
      ) {
        return locator;
      }
      throw new Error(`Unexpected locator: ${selector}`);
    },
  } as unknown as Page;

  const outcome = await fillStep(page, step, {
    curraddrCountry: "Angola",
    curraddrForeign: "123 Avenida Principal, Luanda",
    curraddrAddrline1: "stale Philippine address",
  });

  assert.deepEqual(outcome, { ok: true });
  assert.deepEqual(filled, {
    curraddrCountry: "Angola",
    curraddrForeign: "123 Avenida Principal, Luanda",
  });
});
