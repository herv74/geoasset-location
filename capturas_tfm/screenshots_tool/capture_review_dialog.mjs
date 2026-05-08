import { chromium } from 'playwright';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const BASE_URL = 'http://localhost:3000';
const OUTDIR = path.join(ROOT, 'extras', 'agente');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await page.waitForSelector('.search-page');
  await page.waitForTimeout(700);

  await page.locator('input[placeholder*="company"]').fill('Iberdrola');
  await page.locator('.agent-toggle').click();
  await page.waitForTimeout(300);
  await page.locator('.submit-icon').click();

  // Wait for review view (or timeout)
  try {
    await page.waitForFunction(
      () => document.querySelector('.agent-review-page, .docs-grid') !== null,
      undefined,
      { timeout: 180_000 },
    );
    await page.waitForTimeout(2000);
    console.log('review view loaded');
    await page.screenshot({ path: path.join(OUTDIR, 'agente_review_grid_iberdrola.png') });

    // Click first doc card to open preview dialog
    const card = page.locator('.doc-card').first();
    if (await card.count()) {
      await card.click();
      await page.waitForSelector('.viewer-shell', { timeout: 5000 });
      await page.waitForTimeout(2200);
      await page.screenshot({ path: path.join(OUTDIR, 'agente_review_preview_dialog.png') });
      console.log('saved preview dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    } else {
      console.log('no doc cards found');
    }

    // Toggle drop on first doc
    const drop = page.locator('.drop-btn').first();
    if (await drop.count()) {
      await drop.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUTDIR, 'agente_review_doc_dropped.png') });
      console.log('saved dropped state');
    }
  } catch (e) {
    console.log('did not reach review:', e.message);
  }

  await browser.close();
})();
