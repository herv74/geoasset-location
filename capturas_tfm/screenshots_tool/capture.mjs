import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(process.cwd(), '..');
const BASE_URL = 'http://localhost:3000';
const SAMPLE_DOC = path.resolve(ROOT, '..', 'geoasset-location', 'sample_docs', 'inditex_activos_productivos.docx');
const SAMPLE_DOC_REPSOL = path.resolve(ROOT, '..', 'geoasset-location', 'sample_docs', 'repsol_activos_productivos.docx');

const SECTIONS = {
  s02: path.join(ROOT, 'seccion_02_solucion'),
  s04: path.join(ROOT, 'seccion_04_pipelines'),
  s05: path.join(ROOT, 'seccion_05_demo'),
};

async function shot(page, section, name, options = {}) {
  const outPath = path.join(SECTIONS[section], `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false, ...options });
  console.log(`  saved: ${path.relative(ROOT, outPath)}`);
}

async function waitForResults(page, timeoutMs = 240_000) {
  console.log(`  waiting for results view (up to ${Math.round(timeoutMs/1000)}s)...`);
  await page.waitForSelector('.results-view', { timeout: timeoutMs });
  await page.waitForTimeout(2500);
}

async function gotoHome(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.search-page', { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

async function clickQuickPick(page, label) {
  await page.locator('.v-chip', { hasText: new RegExp(`^${label}$`) }).first().click();
}

async function captureStaticScreens(page) {
  console.log('\n=== Section 02: static UI screens ===');
  await gotoHome(page);

  // Slide 8: dashboard principal (initial state)
  await shot(page, 's02', 'slide_08_dashboard_principal');

  // Slide 9: search bar with focus + agent toggle highlighted
  await page.locator('input[placeholder*="company"]').click();
  await page.keyboard.type('Inditex', { delay: 30 });
  await page.waitForTimeout(500);
  await shot(page, 's02', 'slide_09a_busqueda_texto');

  // Toggle agent ON to show the third mode
  await page.locator('.agent-toggle').click();
  await page.waitForTimeout(400);
  await shot(page, 's02', 'slide_09b_agent_mode_on');

  // Reset state
  await page.locator('.agent-toggle').click();
  await page.locator('input[placeholder*="company"]').fill('');
  await page.waitForTimeout(300);
}

async function runInditexMaps(page) {
  console.log('\n=== Section 04+05: Inditex Maps pipeline ===');
  await gotoHome(page);

  await page.locator('input[placeholder*="company"]').fill('Inditex');
  await page.waitForTimeout(400);

  // Submit
  await page.locator('.submit-icon').click();

  // Capture processing view ASAP
  await page.waitForSelector('.processing-page, [class*="processing"]', { timeout: 30_000 });
  await page.waitForTimeout(4000);
  await shot(page, 's04', 'slide_22_processing_maps_inditex');
  await shot(page, 's02', 'slide_12_flujo_2_processing');

  // wait for results
  await waitForResults(page, 300_000);
  await shot(page, 's05', 'slide_28_inditex_map_overview');
  await shot(page, 's02', 'slide_12_flujo_3_results');
  await shot(page, 's02', 'slide_08b_dashboard_results');

  // Sidebar focus: capture only the sidebar for slide 28 detail
  const sidebar = page.locator('.results-sidebar');
  if (await sidebar.count()) {
    await sidebar.screenshot({ path: path.join(SECTIONS.s05, 'slide_28_inditex_sidebar_filtros.png') });
    console.log('  saved sidebar focus');
  }

  // Click a marker to show popup. Marker icons are .leaflet-marker-icon
  const markers = page.locator('.leaflet-marker-icon').filter({ visible: true });
  const count = await markers.count();
  console.log(`  visible markers: ${count}`);
  if (count > 0) {
    // Click the first plain (non-cluster) marker. Cluster markers usually contain text spans
    let clicked = false;
    for (let i = 0; i < Math.min(count, 12); i++) {
      const el = markers.nth(i);
      const cls = (await el.getAttribute('class')) || '';
      if (!cls.includes('marker-cluster')) {
        await el.click().catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked && count > 0) await markers.first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, 's05', 'slide_32_popup_marker');

    // Try to open the confidence detail dialog (info button inside popup)
    const detailBtn = page.locator('.leaflet-popup .v-btn').filter({ has: page.locator('.mdi-information-outline') }).first();
    if (await detailBtn.count()) {
      await detailBtn.click().catch(() => {});
      await page.waitForTimeout(1200);
      await shot(page, 's02', 'slide_11_scoring_dialog_detalle');
      await shot(page, 's05', 'slide_32_dialog_confianza');
      // close
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(400);
    }
  }

  // Capture map zoomed-out (already done above) and a sidebar+map overall
  await shot(page, 's04', 'slide_18_pipeline_resultado_inditex');
}

async function runRepsolDocument(page) {
  if (!fs.existsSync(SAMPLE_DOC_REPSOL)) {
    console.log(`  WARN: missing sample doc ${SAMPLE_DOC_REPSOL}`);
    return;
  }
  console.log('\n=== Section 04+05: Repsol Document pipeline ===');
  await gotoHome(page);

  // Trigger hidden file input upload directly
  const fileInput = page.locator('input.upload-input-hidden');
  await fileInput.setInputFiles(SAMPLE_DOC_REPSOL);
  await page.waitForTimeout(800);
  // Show the search bar with the file card uploaded
  await shot(page, 's02', 'slide_09c_doc_upload_estado');

  // Submit (file alone is enough to enable submit)
  await page.locator('.submit-icon').click();

  await page.waitForSelector('.processing-page, [class*="processing"]', { timeout: 30_000 });
  await page.waitForTimeout(4000);
  await shot(page, 's04', 'slide_22_processing_doc_repsol');

  await waitForResults(page, 360_000);
  await shot(page, 's05', 'slide_29_repsol_map_overview');
  const sidebar = page.locator('.results-sidebar');
  if (await sidebar.count()) {
    await sidebar.screenshot({ path: path.join(SECTIONS.s05, 'slide_29_repsol_sidebar.png') });
    console.log('  saved sidebar focus');
  }

  // Capture a popup with confidence too — useful for slide 32
  const markers = page.locator('.leaflet-marker-icon').filter({ visible: true });
  const cnt = await markers.count();
  if (cnt > 0) {
    for (let i = 0; i < Math.min(cnt, 12); i++) {
      const el = markers.nth(i);
      const cls = (await el.getAttribute('class')) || '';
      if (!cls.includes('marker-cluster')) {
        await el.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(1200);
    await shot(page, 's05', 'slide_32_popup_doc_repsol');
  }
}

async function runAgent(page) {
  console.log('\n=== Section 04+05: Agent pipeline (CrewAI + DuckDuckGo) ===');
  await gotoHome(page);

  await page.locator('input[placeholder*="company"]').fill('Iberdrola');
  await page.locator('.agent-toggle').click();
  await page.waitForTimeout(400);
  await page.locator('.submit-icon').click();

  // AgentSearchView appears
  await page.waitForFunction(() => {
    return document.querySelector('.agent-page, [class*="agent"]') !== null;
  }, undefined, { timeout: 30_000 });
  await page.waitForTimeout(6000);
  await shot(page, 's04', 'slide_25_agent_search_view_eventos');
  await shot(page, 's05', 'slide_30_agente_run_logs');

  // Try to wait for review view (or end). Up to 180s.
  try {
    await page.waitForFunction(() => {
      const html = document.querySelector('main')?.innerHTML || '';
      return html.includes('agent-review') || document.querySelector('.results-view') !== null;
    }, undefined, { timeout: 180_000 });
    await page.waitForTimeout(2500);
    await shot(page, 's04', 'slide_26_agent_document_review');
    await shot(page, 's05', 'slide_30_agente_review');
  } catch (e) {
    console.log(`  agent flow did not reach review view: ${e.message}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [page-error] ${msg.text()}`);
  });

  try {
    await captureStaticScreens(page);
    await runInditexMaps(page);
    await runRepsolDocument(page);
    await runAgent(page);
  } catch (e) {
    console.error('FATAL:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
