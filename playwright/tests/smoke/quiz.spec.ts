import { test } from '@playwright/test';
import { QUIZ } from '../../config/pages.config';
import {
  checkCta,
  checkKeyContent,
  checkPageLoads,
} from '../../lib/smoke';
import { assertCheck, initSmoke } from '../../lib/checks';

test('smoke: quiz page', async ({ page }, testInfo) => {
  const d = QUIZ;
  const response = await page.goto(d.path);
  initSmoke(testInfo, { testId: d.id, url: page.url() });

  checkPageLoads(testInfo, response);
  await checkKeyContent(testInfo, page, d);

  // The quiz entry point is a button (not a link), so assert it directly.
  const startQuiz = page.getByRole('button', { name: 'START QUIZ' });
  assertCheck(
    testInfo,
    'quiz:start-button',
    await startQuiz.isVisible().catch(() => false),
    'START QUIZ button not visible',
  );

  for (const cta of d.ctas) await checkCta(testInfo, page, cta);
});
