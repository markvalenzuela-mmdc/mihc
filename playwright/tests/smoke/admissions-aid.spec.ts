import { test } from '@playwright/test';
import {
  admissionsAidDescriptor,
  admissionsAidSlugs,
  financialLoanDescriptor,
  financialLoanSlugs,
} from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
  exercisePrimaryCta,
  initSmoke,
} from '../../lib/smoke';

// Scholarship/discount + financial-tool pages under /admissions/, plus the two
// root-level financing programs. All share the same content + CTA shape.
const pages = [
  ...admissionsAidSlugs.map((slug) => admissionsAidDescriptor(slug)),
  ...financialLoanSlugs.map((slug) => financialLoanDescriptor(slug)),
];

for (const d of pages) {
  test(`smoke: ${d.path}`, async ({ page, context }, testInfo) => {
    const response = await page.goto(d.path);
    initSmoke(testInfo, { testId: d.id, url: page.url() });

    checkPageLoads(testInfo, response);
    await checkKeyContent(testInfo, page, d);
    for (const cta of d.ctas) await checkCta(testInfo, page, cta);

    const primary = d.ctas.find((c) => c.primary);
    if (primary) await exercisePrimaryCta(testInfo, page, context, primary);
  });
}
