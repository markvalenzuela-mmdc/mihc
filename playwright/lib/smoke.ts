/**
 * Reusable smoke-test page/CTA check helpers.
 *
 * Each check records a named pass/fail into the test's annotations (read later by
 * the results reporter) AND drives the test status via a soft assertion — so a
 * single test runs all its checks and still ends "failed" if any check failed.
 *
 * The underlying `assertCheck`/`initSmoke` primitives live in `checks.ts` because
 * both the smoke and e2e targets depend on them.
 */
import type {
  BrowserContext,
  Page,
  Response,
  TestInfo,
} from '@playwright/test';
import type { Cta, PageDescriptor } from '../config/pages.config';
import { assertCheck } from './checks';

/** Page returned HTTP 200 with no navigation error. */
export function checkPageLoads(testInfo: TestInfo, response: Response | null): void {
  const status = response?.status();
  assertCheck(
    testInfo,
    'page-loads',
    Boolean(response && response.ok()),
    `expected ok 2xx, got status=${status}`,
  );
}

/**
 * Key content for the page renders. Defaults to asserting <main> is visible with
 * substantial text — robust across page types (heading tags vary: some pages have
 * no <h1>). A descriptor may override `keyContent` with a specific selector.
 *
 * Existence is checked via count() first so a missing selector fails fast instead
 * of blocking on an auto-waiting text read.
 */
export async function checkKeyContent(
  testInfo: TestInfo,
  page: Page,
  descriptor: PageDescriptor,
): Promise<void> {
  const selector = descriptor.keyContent ?? 'main';
  const minLen = descriptor.keyContent ? 1 : 200;
  const el = page.locator(selector).first();
  const exists = (await el.count()) > 0;
  const visible = exists ? await el.isVisible().catch(() => false) : false;
  const text = visible ? ((await el.innerText().catch(() => '')) ?? '').trim() : '';
  assertCheck(
    testInfo,
    'key-content',
    visible && text.length >= minLen,
    `selector "${selector}" visible=${visible} textLen=${text.length}`,
  );
}

function ctaLink(page: Page, cta: Cta) {
  // Scope to header + main so we don't match the top promo banner (whose text
  // contains "Enroll now!") or the footer sitemap.
  return page.locator('header, main').getByRole('link', { name: cta.name }).first();
}

/** A CTA is present, visible, enabled, and points at a valid destination. */
export async function checkCta(
  testInfo: TestInfo,
  page: Page,
  cta: Cta,
): Promise<void> {
  const link = ctaLink(page, cta);
  const visible = await link.isVisible().catch(() => false);
  const enabled = visible ? await link.isEnabled().catch(() => false) : false;
  const href = visible ? await link.getAttribute('href').catch(() => null) : null;
  const hrefOk = Boolean(href && new RegExp(cta.expectedHrefPattern).test(href));
  assertCheck(
    testInfo,
    `cta:${cta.name}`,
    visible && enabled && hrefOk,
    `visible=${visible} enabled=${enabled} href=${href} expected~=${cta.expectedHrefPattern}`,
  );
}

/**
 * Click the primary CTA and assert it reaches the expected destination.
 * Handles both same-tab navigation and target=_blank popups.
 */
export async function exercisePrimaryCta(
  testInfo: TestInfo,
  page: Page,
  context: BrowserContext,
  cta: Cta,
): Promise<void> {
  const name = `cta:${cta.name}:navigates`;
  const dest = new RegExp(cta.expectedDestination ?? cta.expectedHrefPattern);
  const link = ctaLink(page, cta);
  try {
    const target = await link.getAttribute('target').catch(() => null);
    if (target === '_blank') {
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        link.click(),
      ]);
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const url = popup.url();
      assertCheck(testInfo, name, dest.test(url), `popup url=${url}`);
      await popup.close();
    } else {
      await link.click();
      await page.waitForURL(dest, { timeout: 30_000 }).catch(() => {});
      const url = page.url();
      assertCheck(testInfo, name, dest.test(url), `url=${url}`);
    }
  } catch (e) {
    assertCheck(testInfo, name, false, String(e).slice(0, 160));
  }
}
