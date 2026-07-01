import { test } from '@playwright/test';
import { BSIT_LEAD_FORM } from '../../config/pages.config';
import { assertCheck, checkCta, checkPageLoads, initSmoke } from '../../lib/smoke';

test('smoke: BSIT lead form', async ({ page }, testInfo) => {
  const d = BSIT_LEAD_FORM;
  const response = await page.goto(d.path);
  initSmoke(testInfo, { testId: d.id, url: page.url() });

  checkPageLoads(testInfo, response);

  // Key content: the lead-capture form renders with its fields.
  const form = page.locator('main form').first();
  const visible = await form.isVisible().catch(() => false);
  const inputs = visible ? await form.locator('input').count() : 0;
  assertCheck(
    testInfo,
    'key-content',
    visible && inputs > 0,
    `form visible=${visible} inputs=${inputs}`,
  );

  for (const cta of d.ctas) await checkCta(testInfo, page, cta);
});
