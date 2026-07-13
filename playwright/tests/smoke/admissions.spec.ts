import { test } from '@playwright/test';
import { ADMISSIONS } from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
} from '../../lib/smoke';
import { assertCheck, initSmoke } from '../../lib/checks';

test('smoke: admissions page', async ({ page }, testInfo) => {
  const d = ADMISSIONS;
  const response = await page.goto(d.path);
  initSmoke(testInfo, { testId: d.id, url: page.url() });

  checkPageLoads(testInfo, response);
  await checkKeyContent(testInfo, page, d);

  // Tuition calculator widget: a range slider (years) + a payment-plan dropdown.
  const slider = page.locator('main input[type="range"]').first();
  const dropdown = page.locator('main select').first();
  assertCheck(
    testInfo,
    'tuition-calculator:slider',
    await slider.isVisible().catch(() => false),
    'range slider not visible',
  );
  assertCheck(
    testInfo,
    'tuition-calculator:dropdown',
    await dropdown.isVisible().catch(() => false),
    'payment-plan dropdown not visible',
  );

  for (const cta of d.ctas) await checkCta(testInfo, page, cta);
});
