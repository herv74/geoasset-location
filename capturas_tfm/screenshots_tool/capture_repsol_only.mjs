import { chromium } from 'playwright';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const BASE_URL = 'http://localhost:3000';
const SAMPLE = path.resolve(ROOT, '..', 'geoasset-location', 'sample_docs', 'repsol_activos_productivos.docx');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text()); });

  await page.goto(BASE_URL);
  await page.waitForSelector('.search-page');
  await page.waitForTimeout(800);

  const fileInput = page.locator('input.upload-input-hidden');
  await fileInput.setInputFiles(SAMPLE);
  await page.waitForTimeout(700);
  await page.locator('.submit-icon').click();

  await page.waitForSelector('.processing-page, [class*="processing"]', { timeout: 30_000 });
  await page.waitForSelector('.results-view', { timeout: 360_000 });
  await page.waitForTimeout(3500);
  console.log('results loaded');

  await page.screenshot({ path: path.join(ROOT, 'seccion_05_demo', 'slide_29_repsol_map_overview.png') });
  const sidebar = page.locator('.results-sidebar');
  if (await sidebar.count()) {
    await sidebar.screenshot({ path: path.join(ROOT, 'seccion_05_demo', 'slide_29_repsol_sidebar.png') });
    console.log('sidebar saved');
  }

  // Pop a marker for slide_32 alt
  const markers = page.locator('.leaflet-marker-icon').filter({ visible: true });
  const cnt = await markers.count();
  console.log('markers:', cnt);
  for (let i = 0; i < Math.min(cnt, 20); i++) {
    const el = markers.nth(i);
    const cls = (await el.getAttribute('class')) || '';
    if (!cls.includes('marker-cluster')) {
      await el.click({ force: true });
      break;
    }
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ROOT, 'seccion_05_demo', 'slide_32_popup_doc_repsol.png') });
  console.log('popup saved');

  await browser.close();
})();
