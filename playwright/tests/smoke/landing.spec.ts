import { test } from '@playwright/test';
import { LANDING } from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
  exercisePrimaryCta,
  initSmoke,
} from '../../lib/smoke';

test('smoke: landing page', async ({ page, context }, testInfo) => {
  const response = await page.goto(LANDING.path);
  initSmoke(testInfo, { testId: LANDING.id, url: page.url() });

  checkPageLoads(testInfo, response);
  await checkKeyContent(testInfo, page, LANDING);
  for (const cta of LANDING.ctas) await checkCta(testInfo, page, cta);

  const primary = LANDING.ctas.find((c) => c.primary);
  if (primary) await exercisePrimaryCta(testInfo, page, context, primary);
});
