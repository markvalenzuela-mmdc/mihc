import { test } from '@playwright/test';
import { FAQ } from '../../config/pages.config';
import { checkCta, checkPageLoads } from '../../lib/smoke';
import { assertCheck, initSmoke } from '../../lib/checks';

test('smoke: FAQ page', async ({ page }, testInfo) => {
  const response = await page.goto(FAQ.path);
  initSmoke(testInfo, { testId: FAQ.id, url: page.url() });

  checkPageLoads(testInfo, response);

  // Key content: accordion question triggers render.
  const accordions = page.locator('h3 button[aria-expanded]');
  const count = await accordions.count();
  assertCheck(testInfo, 'key-content', count > 0, `accordion triggers=${count}`);

  for (const cta of FAQ.ctas) await checkCta(testInfo, page, cta);

  // Primary interaction: expanding an accordion reveals its panel.
  if (count > 0) {
    const first = accordions.first();
    await first.click().catch(() => {});
    const expanded = await first.getAttribute('aria-expanded').catch(() => null);
    assertCheck(
      testInfo,
      'accordion:expands',
      expanded === 'true',
      `aria-expanded=${expanded}`,
    );
  }
});
