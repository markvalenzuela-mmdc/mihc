import { test } from '@playwright/test';
import {
  NEWS_OVERVIEW,
  newsCategories,
  newsCategoryDescriptor,
} from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
} from '../../lib/smoke';
import { assertCheck, initSmoke } from '../../lib/checks';

test('smoke: news & events overview', async ({ page }, testInfo) => {
  const d = NEWS_OVERVIEW;
  const response = await page.goto(d.path);
  initSmoke(testInfo, { testId: d.id, url: page.url() });

  checkPageLoads(testInfo, response);
  await checkKeyContent(testInfo, page, d);

  // The overview should link every news category landing page.
  const hrefs = await page
    .locator('main a[href*="/news-and-events/"]')
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''),
    );
  for (const slug of newsCategories) {
    const linked = hrefs.some((h) => h.includes(`/news-and-events/${slug}/`));
    assertCheck(testInfo, `links-category:${slug}`, linked, `no link to ${slug}`);
  }

  for (const cta of d.ctas) await checkCta(testInfo, page, cta);
});

// Category landing pages redirect to /page/1/ but still resolve HTTP 200.
for (const slug of newsCategories) {
  test(`smoke: news category ${slug}`, async ({ page }, testInfo) => {
    const d = newsCategoryDescriptor(slug);
    const response = await page.goto(d.path);
    // The category URL is a client-side redirect shell (empty <main>) that lands
    // on /page/1/, where the real content renders. Wait for the redirect to
    // settle before asserting key content.
    await page.waitForURL('**/page/1/');
    initSmoke(testInfo, { testId: d.id, url: page.url() });

    checkPageLoads(testInfo, response);
    await checkKeyContent(testInfo, page, d);
    for (const cta of d.ctas) await checkCta(testInfo, page, cta);
  });
}
