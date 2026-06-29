import { chromium } from "playwright";

export async function runSmokeCheck(): Promise<Buffer> {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const title = await page.title();

    if (!title.includes("Example")) {
      throw new Error(`Unexpected title: ${title}`);
    }

    return await page.screenshot({ fullPage: true });
  } finally {
    await browser.close();
  }
}