import { chromium } from 'playwright';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const BASE_URL = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[page-error] ${msg.text()}`);
  });

  await page.goto(BASE_URL);
  await page.waitForSelector('.search-page');
  await page.waitForTimeout(1000);

  // Inditex - hits Redis cache so completes in seconds
  await page.locator('input[placeholder*="company"]').fill('Inditex');
  await page.locator('.submit-icon').click();

  await page.waitForSelector('.results-view', { timeout: 240_000 });
  await page.waitForTimeout(3500);
  console.log('results loaded');

  const markers = page.locator('.leaflet-marker-icon').filter({ visible: true });
  const cnt = await markers.count();
  console.log('markers:', cnt);

  // Pick a non-cluster marker
  for (let i = 0; i < Math.min(cnt, 20); i++) {
    const el = markers.nth(i);
    const cls = (await el.getAttribute('class')) || '';
    if (!cls.includes('marker-cluster')) {
      await el.click({ force: true });
      console.log('clicked marker', i);
      break;
    }
  }
  await page.waitForTimeout(1500);

  // The info button: icon button inside leaflet popup with mdi-information-outline icon
  // Vuetify renders the icon as <i class="mdi mdi-information-outline">
  const infoBtn = page.locator('.leaflet-popup-content button[data-action="confidence-detail"]').first();

  const visible = await infoBtn.count();
  console.log('info button found:', visible);
  if (visible) {
    await infoBtn.click();
    await page.waitForTimeout(1500);
    // The v-dialog renders in a portal at body root, with .v-dialog and .v-card inside .v-overlay
    await page.waitForSelector('.v-dialog .v-card', { timeout: 5000 });
    await page.waitForTimeout(800);
    const a = path.join(ROOT, 'seccion_02_solucion', 'slide_11_scoring_dialog_detalle.png');
    const b = path.join(ROOT, 'seccion_05_demo', 'slide_32_dialog_confianza.png');
    await page.screenshot({ path: a });
    await page.screenshot({ path: b });
    console.log('saved dialog -> seccion_02 + seccion_05');
  } else {
    console.log('NO info button - dumping popup HTML for diagnosis');
    const html = await page.locator('.leaflet-popup-content').first().innerHTML().catch(() => '(none)');
    console.log(html.slice(0, 2000));
  }

  await browser.close();
})();
