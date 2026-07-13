import { test } from '@playwright/test';
import { collegePrograms, programDescriptor } from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
  exercisePrimaryCta,
} from '../../lib/smoke';
import { initSmoke } from '../../lib/checks';

for (const slug of collegePrograms) {
  test(`smoke: college program ${slug}`, async ({ page, context }, testInfo) => {
    const d = programDescriptor(slug);
    const response = await page.goto(d.path);
    initSmoke(testInfo, { testId: d.id, url: page.url() });

    checkPageLoads(testInfo, response);
    await checkKeyContent(testInfo, page, d);
    for (const cta of d.ctas) await checkCta(testInfo, page, cta);

    const primary = d.ctas.find((c) => c.primary);
    if (primary) await exercisePrimaryCta(testInfo, page, context, primary);
  });
}
