// TODO (epic: inspector): replace this hard-coded smoke check with real check execution.
// This is throwaway scaffolding to prove the pipeline wiring.

import { chromium } from "playwright";

export async function runSmokeCheck(): Promise<Buffer> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    const title = await page.title();

    if (!title.includes("Example")) {
      throw new Error(
        `Title assertion failed: expected title to contain "Example", got "${title}"`,
      );
    }

    const screenshot = await page.screenshot({ type: "png" });
    return Buffer.from(screenshot);
  } finally {
    await context.close();
    await browser.close();
  }
}