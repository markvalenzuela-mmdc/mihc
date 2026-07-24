/**
 * EnrollMate "Apply Now" end-to-end suite.
 *
 * Drives the live UAT enrollment wizard for each flow, filling every step with
 * valid accepted values generated from the shared contract, then submitting.
 * Per-check results are recorded via `initSmoke`/`assertCheck` annotations and
 * surfaced in the HTML report; `type='e2e'` and `target='enrollmate'` come from
 * the project metadata in `playwright.config.ts`.
 *
 * When `E2E_PROFILE_DATA_FILE` is set (automated run from the consumer), the
 * spec reads profile form data from that JSON file instead of generating
 * fixture data. The `FLOW_TYPE` env var narrows execution to a single flow.
 *
 * NOTE: a full run submits a real application to the UAT backend.
 */
import { readFile } from 'node:fs/promises';
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

// When E2E_PROFILE_DATA_FILE is set, use that data directly instead of
// generating fixture data. This is the automated-run path.
const profileDataFile = process.env.E2E_PROFILE_DATA_FILE;
const explicitFlowType = process.env.FLOW_TYPE as (typeof enrollmateFlowTypes)[number] | undefined;

const activeFlowTypes = explicitFlowType
  ? [explicitFlowType]
  : enrollmateFlowTypes;

for (const flowType of activeFlowTypes) {
  test.describe(`EnrollMate Apply Now — ${flowType}`, () => {
    test(`completes the ${flowType} enrollment flow`, async ({ page }, testInfo) => {
      const flow = getEnrollmateFlowDefinition(flowType);
      initSmoke(testInfo, {
        testId: `enrollmate-apply-now-${flowType}`,
        url: flow.endpoint,
        type: 'e2e',
      });

      // Resolve form data: from profile data file (automated) or generate
      // fixture data (manual run).
      let data: Record<string, unknown>;
      let email: string;

      if (profileDataFile) {
        const raw = await readFile(profileDataFile, 'utf8');
        data = JSON.parse(raw) as Record<string, unknown>;
        email = (data.email as string) ?? `e2e.${flowType}.${Date.now()}@example.edu`;
        // Ensure the async combobox fallback is always wired up for bachelors.
        if (flowType === 'bachelors') {
          data.schoolNotFound = true;
          if (!data.lastschOther) {
            data.lastschOther = data.lastSchoolAttended ?? 'Rizal National High School';
          }
        }
      } else {
        // Unique email per run keeps repeat UAT submissions from colliding.
        email = `e2e.${flowType}.${Date.now()}@example.edu`;

        const overrides: Record<string, unknown> =
          flowType === 'bachelors'
            ? { email, schoolNotFound: true, lastSchoolAttended: 'Rizal National High School' }
            : { email };
            
        data = createEnrollmateFixture(flowType, {
          overrides,
          resolveField: createEnrollmateValueResolver(email),
        });
      }

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

        const fillStart = Date.now();
        const filled = await fillStep(page, step, data);
        const fillDuration = Date.now() - fillStart;
        assertCheck(testInfo, `${label}: filled`, filled.ok, filled.message, fillDuration);
        if (!filled.ok) {
          completedAllSteps = false;
          break;
        }

        const advanceStart = Date.now();
        const advanced = await advanceStep(page);
        const advanceDuration = Date.now() - advanceStart;
        assertCheck(testInfo, `${label}: advanced`, advanced.ok, advanced.message, advanceDuration);
        if (!advanced.ok) {
          completedAllSteps = false;
          break;
        }
      }

      if (!completedAllSteps) return;

      const submitStart = Date.now();
      const submitted = await submitForm(page);
      const submitDuration = Date.now() - submitStart;
      assertCheck(testInfo, 'submit', submitted.ok, submitted.message, submitDuration);
      if (!submitted.ok) return;

      const confirmStart = Date.now();
      const confirmed = await confirmSubmission(page);
      const confirmDuration = Date.now() - confirmStart;
      assertCheck(
        testInfo,
        'submission-confirmed',
        confirmed.ok,
        confirmed.message,
        confirmDuration,
      );
    });
  });
}
