import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  tsconfig: './tsconfig.json',
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* HTML report for local debugging. DB-persisted runs override this via the
   * CLI `--reporter=json` flag (see server/runner/run-smoke.ts). */
  reporter: [['html']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://www.mmdc.mcl.edu.ph',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      testMatch: /smoke\//,
      use: { ...devices['Desktop Chrome'] },
      metadata: { target: 'mmdc-website', type: 'smoke' },
    },

    {
      name: 'firefox',
      testMatch: /smoke\//,
      use: { ...devices['Desktop Firefox'] },
      metadata: { target: 'mmdc-website', type: 'smoke' },
    },

    {
      name: 'webkit',
      testMatch: /smoke\//,
      use: { ...devices['Desktop Safari'] },
      metadata: { target: 'mmdc-website', type: 'smoke' },
    },

    /* EnrollMate Apply Now e2e — drives the live UAT enrollment wizard. */
    {
      name: 'enrollmate',
      testMatch: /e2e\//,
      /* The wizard is long (100+ fields across steps) with async address
       * cascades and a file upload, so it needs far longer than the default. */
      timeout: 420_000,
      use: {
        ...devices['Desktop Chrome'],
        baseURL:
          process.env.PLAYWRIGHT_BASE_URL ??
          'https://uat.enrollmate.mmdc.mcl.edu.ph',
        /* Bound each action so a single missing field fails fast with a clear
         * message instead of consuming the whole (long) test timeout. */
        actionTimeout: 20_000,
      },
      metadata: { target: 'enrollmate', type: 'e2e' },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
