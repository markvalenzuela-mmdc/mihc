/**
 * EnrollMate "Apply Now" end-to-end suite.
 *
 * Drives the live UAT enrollment wizard for each flow, filling every step with
 * valid accepted values generated from the shared contract, then submitting.
 * Per-check results are recorded via `initSmoke`/`assertCheck` annotations and
 * surfaced in the HTML report; `type='e2e'` and `target='enrollmate'` come from
 * the project metadata in `playwright.config.ts`.
 *
 * NOTE: a full run submits a real application to the UAT backend.
 */
import { test } from '@playwright/test';
import {
  enrollmateFlowTypes,
  getEnrollmateFlowDefinition,
} from '@mihc/enrollmate-contract';
import { createEnrollmateFixture } from '@mihc/enrollmate-contract/testing';
import { assertCheck, initSmoke } from '../../../lib/checks';
import { createEnrollmateValueResolver } from '../../../lib/enrollmate/value-resolver';
import {
  advanceStep,
  confirmSubmission,
  fillStep,
  hasFields,
  submitForm,
} from '../../../lib/enrollmate/apply-now-driver';

for (const flowType of enrollmateFlowTypes) {
  test.describe(`EnrollMate Apply Now — ${flowType}`, () => {
    test(`completes the ${flowType} enrollment flow`, async ({ page }, testInfo) => {
      const flow = getEnrollmateFlowDefinition(flowType);
      initSmoke(testInfo, {
        testId: `enrollmate-apply-now-${flowType}`,
        url: flow.endpoint,
        type: 'e2e',
      });

      // Unique email per run keeps repeat UAT submissions from colliding.
      const email = `e2e.${flowType}.${Date.now()}@example.edu`;
      // The bachelors "Last School Attended" field is an async-search combobox;
      // ticking "school not found" reveals a free-text field we can fill
      // deterministically, so opt into that path.
      const overrides: Record<string, unknown> =
        flowType === 'bachelors' ? { email, schoolNotFound: true } : { email };
      const data = createEnrollmateFixture(flowType, {
        overrides,
        resolveField: createEnrollmateValueResolver(email),
      });

      const response = await page.goto(flow.endpoint);
      assertCheck(
        testInfo,
        'page-loads',
        Boolean(response && response.ok()),
        `expected ok 2xx, got status=${response?.status()}`,
      );

      const inputSteps = flow.steps.filter(hasFields);
      let completedAllSteps = true;

      for (const step of inputSteps) {
        const label = `step-${step.step} (${step.title})`;

        const filled = await fillStep(page, step, data);
        assertCheck(testInfo, `${label}: filled`, filled.ok, filled.message);
        if (!filled.ok) {
          completedAllSteps = false;
          break;
        }

        const advanced = await advanceStep(page);
        assertCheck(testInfo, `${label}: advanced`, advanced.ok, advanced.message);
        if (!advanced.ok) {
          completedAllSteps = false;
          break;
        }
      }

      if (!completedAllSteps) return;

      const submitted = await submitForm(page);
      assertCheck(testInfo, 'submit', submitted.ok, submitted.message);
      if (!submitted.ok) return;

      const confirmed = await confirmSubmission(page);
      assertCheck(
        testInfo,
        'submission-confirmed',
        confirmed.ok,
        confirmed.message,
      );
    });
  });
}
