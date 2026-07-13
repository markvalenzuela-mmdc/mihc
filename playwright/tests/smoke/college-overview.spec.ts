import { test } from '@playwright/test';
import { COLLEGE_OVERVIEW, collegePrograms } from '../../config/pages.config';
import {
  checkKeyContent,
  checkPageLoads,
  exercisePrimaryCta,
} from '../../lib/smoke';
import { assertCheck, initSmoke } from '../../lib/checks';

test('smoke: college programs overview', async ({ page, context }, testInfo) => {
  const d = COLLEGE_OVERVIEW;
  const response = await page.goto(d.path);
  initSmoke(testInfo, { testId: d.id, url: page.url() });

  checkPageLoads(testInfo, response);
  await checkKeyContent(testInfo, page, d);

  // The overview should link every individual college program page.
  const hrefs = await page.locator('main a[href*="/college-programs/"]').evaluateAll(
    (els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''),
  );
  for (const slug of collegePrograms) {
    const linked = hrefs.some((h) => h.includes(`/college-programs/${slug}/`));
    assertCheck(testInfo, `links-program:${slug}`, linked, `no link to ${slug}`);
  }

  const primary = d.ctas.find((c) => c.primary);
  if (primary) await exercisePrimaryCta(testInfo, page, context, primary);
});
