import { test } from '@playwright/test';
import { CERTIFICATIONS_OVERVIEW } from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
  exercisePrimaryCta,
} from '../../lib/smoke';
import { initSmoke } from '../../lib/checks';

test('smoke: certifications overview', async ({ page, context }, testInfo) => {
  const d = CERTIFICATIONS_OVERVIEW;
  const response = await page.goto(d.path);
  initSmoke(testInfo, { testId: d.id, url: page.url() });

  checkPageLoads(testInfo, response);
  await checkKeyContent(testInfo, page, d);
  for (const cta of d.ctas) await checkCta(testInfo, page, cta);

  const primary = d.ctas.find((c) => c.primary);
  if (primary) await exercisePrimaryCta(testInfo, page, context, primary);
});
