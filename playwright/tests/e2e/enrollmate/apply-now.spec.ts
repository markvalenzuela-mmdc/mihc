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
import { test, type Page } from '@playwright/test';
import {
  enrollmateFlowTypes,
  getEnrollmateFlowDefinition,
} from '@mihc/enrollmate-contract';
import type { EnrollmateFlowDefinition } from '@mihc/enrollmate-contract';
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
  const flowDefinition = getEnrollmateFlowDefinition(flowType);

  test.describe.serial(`EnrollMate Apply Now — ${flowType}`, () => {
    let page!: Page;
    let flow!: EnrollmateFlowDefinition;
    let data!: Record<string, unknown>;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      flow = flowDefinition;

      // Resolve form data: from profile data file (automated) or generate
      // fixture data (manual run).
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
            ? {
                email,
                schoolNotFound: true,
                lastSchoolAttended: 'Rizal National High School',
                fthrDeceased: 'Living',
                mthrDeceased: 'Living',
                guardian: 'Others',
              }
            : { email };

        data = createEnrollmateFixture(flowType, {
          overrides,
          resolveField: createEnrollmateValueResolver(email),
        });
      }
    });

    test.afterAll(async () => {
      await page?.close();
    });

    test('page-loads', async ({}, testInfo) => {
      initSmoke(testInfo, {
        testId: `enrollmate-apply-now-${flowType}`,
        url: flow.endpoint,
        type: 'e2e',
      });

      const response = await page.goto(flow.endpoint);
      assertCheck(
        testInfo,
        'page-loads',
        Boolean(response && response.ok()),
        `expected ok 2xx, got status=${response?.status()}`,
      );
    });

    for (const step of flowDefinition.steps.filter(hasFields)) {
      const label = `step-${step.step} (${step.title})`;

      test(`${label}: filled`, async ({}, testInfo) => {
        initSmoke(testInfo, {
          testId: `enrollmate-apply-now-${flowType}`,
          url: flow.endpoint,
          type: 'e2e',
        });
        const started = Date.now();
        const outcome = await fillStep(page, step, data);
        assertCheck(testInfo, `${label}: filled`, outcome.ok, outcome.message, Date.now() - started);
      });

      test(`${label}: advanced`, async ({}, testInfo) => {
        initSmoke(testInfo, {
          testId: `enrollmate-apply-now-${flowType}`,
          url: flow.endpoint,
          type: 'e2e',
        });
        const started = Date.now();
        const outcome = await advanceStep(page);
        assertCheck(testInfo, `${label}: advanced`, outcome.ok, outcome.message, Date.now() - started);
      });
    }

    test('submit', async ({}, testInfo) => {
      initSmoke(testInfo, {
        testId: `enrollmate-apply-now-${flowType}`,
        url: flow.endpoint,
        type: 'e2e',
      });
      const started = Date.now();
      const outcome = await submitForm(page);
      assertCheck(testInfo, 'submit', outcome.ok, outcome.message, Date.now() - started);
    });

    test('submission-confirmed', async ({}, testInfo) => {
      initSmoke(testInfo, {
        testId: `enrollmate-apply-now-${flowType}`,
        url: flow.endpoint,
        type: 'e2e',
      });
      const started = Date.now();
      const outcome = await confirmSubmission(page);
      assertCheck(testInfo, 'submission-confirmed', outcome.ok, outcome.message, Date.now() - started);
    });
  });
}
