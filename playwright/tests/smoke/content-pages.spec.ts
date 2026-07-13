import { test } from '@playwright/test';
import {
  ABOUT,
  SEARCH,
  STATE_OF_WORKING_STUDENTS,
} from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
} from '../../lib/smoke';
import { initSmoke } from '../../lib/checks';

// Standalone content pages: standard smoke check (200 + key content + header CTA).
const pages = [ABOUT, SEARCH, STATE_OF_WORKING_STUDENTS];

for (const d of pages) {
  test(`smoke: ${d.path}`, async ({ page }, testInfo) => {
    const response = await page.goto(d.path);
    initSmoke(testInfo, { testId: d.id, url: page.url() });

    checkPageLoads(testInfo, response);
    await checkKeyContent(testInfo, page, d);
    for (const cta of d.ctas) await checkCta(testInfo, page, cta);
  });
}
