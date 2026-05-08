import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(process.cwd(), '..');
const BASE_URL = 'http://localhost:3000';
const REPO_ROOT = path.resolve(ROOT, '..', 'geoasset-location');
const SAMPLE_INDITEX_DOCX = path.join(REPO_ROOT, 'sample_docs', 'inditex_activos_productivos.docx');
const SAMPLE_REPSOL_DOCX = path.join(REPO_ROOT, 'sample_docs', 'repsol_activos_productivos.docx');
const SAMPLE_TXT = path.join(REPO_ROOT, 'sample_docs', 'inditex_activos_productivos.txt');

const EXTRAS = path.join(ROOT, 'extras');
const DIRS = {
  header: path.join(EXTRAS, 'header'),
  search: path.join(EXTRAS, 'search'),
  sidebar: path.join(EXTRAS, 'sidebar'),
  mapa: path.join(EXTRAS, 'mapa'),
  agente: path.join(EXTRAS, 'agente'),
};

async function shot(page, dir, name, opts = {}) {
  const out = path.join(DIRS[dir], `${name}.png`);
  await page.screenshot({ path: out, fullPage: false, ...opts });
  console.log(`  saved: ${path.relative(ROOT, out)}`);
}

async function gotoHome(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.search-page', { timeout: 30_000 });
  await page.waitForTimeout(900);
}

async function loadInditexFromCache(page) {
  await gotoHome(page);
  await page.locator('input[placeholder*="company"]').fill('Inditex');
  await page.locator('.submit-icon').click();
  await page.waitForSelector('.results-view', { timeout: 240_000 });
  await page.waitForTimeout(3000);
}

// =============================================================================
// 1. Header
// =============================================================================
async function captureHeader(page) {
  console.log('\n=== Header ===');
  await gotoHome(page);

  // Topbar isolated
  const topbar = page.locator('.topbar').first();
  if (await topbar.count()) {
    await topbar.screenshot({ path: path.join(DIRS.header, 'header_topbar.png') });
    console.log('  saved: extras/header/header_topbar.png');
  }

  // Click Info → modal
  await page.locator('.info-btn').click();
  await page.waitForSelector('.info-card', { timeout: 5000 });
  await page.waitForTimeout(600);
  await shot(page, 'header', 'header_info_dialog');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

// =============================================================================
// 2. Search bar — quick picks, multi-file, error
// =============================================================================
async function captureSearch(page) {
  console.log('\n=== Search ===');
  await gotoHome(page);

  // Quick picks visible (default state) — focus with crop on hero
  await shot(page, 'search', 'search_landing_quickpicks');

  // Hover quick pick chip
  await page.locator('.v-chip', { hasText: 'Mercadona' }).first().hover();
  await page.waitForTimeout(300);
  await shot(page, 'search', 'search_quickpick_hover');

  // Multi-file upload (2 docs)
  const fileInput = page.locator('input.upload-input-hidden');
  await fileInput.setInputFiles([SAMPLE_INDITEX_DOCX, SAMPLE_REPSOL_DOCX]);
  await page.waitForTimeout(700);
  await shot(page, 'search', 'search_multi_file_upload');

  // Refresh and trigger upload error with .txt
  await gotoHome(page);
  await page.locator('input.upload-input-hidden').setInputFiles(SAMPLE_TXT);
  await page.waitForTimeout(700);
  await shot(page, 'search', 'search_upload_error_unsupported');

  // Search bar with both text and a file (combined mode)
  await gotoHome(page);
  await page.locator('input[placeholder*="company"]').fill('Iberdrola');
  await page.locator('input.upload-input-hidden').setInputFiles(SAMPLE_INDITEX_DOCX);
  await page.waitForTimeout(700);
  await shot(page, 'search', 'search_text_plus_file');

  // Agent toggle ON + text
  await gotoHome(page);
  await page.locator('input[placeholder*="company"]').fill('Telefónica');
  await page.locator('.agent-toggle').click();
  await page.waitForTimeout(400);
  await shot(page, 'search', 'search_agent_mode_with_text');
}

// =============================================================================
// 3. Sidebar — filters, dropdowns, slider, asset selected
// =============================================================================
async function captureSidebar(page) {
  console.log('\n=== Sidebar ===');
  await loadInditexFromCache(page);

  // 1) Open "Tipo de activo" dropdown
  const tipo = page.locator('.sidebar-filters .v-select').nth(0);
  await tipo.click();
  await page.waitForSelector('.v-overlay__content .v-list-item', { timeout: 4000 });
  await page.waitForTimeout(500);
  await shot(page, 'sidebar', 'sidebar_dropdown_tipo_abierto');
  // Pick the first option
  await page.locator('.v-overlay__content .v-list-item').nth(1).click().catch(() => {});
  await page.waitForTimeout(500);

  // 2) Open "Subcategoría"
  const sub = page.locator('.sidebar-filters .v-select').nth(1);
  await sub.click();
  await page.waitForSelector('.v-overlay__content .v-list-item', { timeout: 4000 });
  await page.waitForTimeout(500);
  await shot(page, 'sidebar', 'sidebar_dropdown_subcategoria_abierto');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Reset filters by reloading
  await loadInditexFromCache(page);

  // 3) Type in search box
  const search = page.locator('.sidebar-filters input[placeholder*="Buscar activo"]');
  await search.fill('arteixo');
  await page.waitForTimeout(700);
  await shot(page, 'sidebar', 'sidebar_search_typed');
  await search.fill('');

  // 4) Move confidence min slider — drag thumb
  const slider = page.locator('.v-slider').first();
  const box = await slider.boundingBox();
  if (box) {
    // Click roughly at 50% of the slider
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.waitForTimeout(500);
    await shot(page, 'sidebar', 'sidebar_slider_confidence_movido');
  }

  // 5) Reset slider to 0 by clicking far-left
  if (box) {
    await page.mouse.click(box.x + 4, box.y + box.height / 2);
    await page.waitForTimeout(400);
  }

  // 6) Click an asset in the list → highlighted state
  const items = page.locator('.sidebar-list .v-list-item');
  const cnt = await items.count();
  console.log('  list items:', cnt);
  if (cnt > 0) {
    await items.nth(2).click();
    await page.waitForTimeout(700);
    await shot(page, 'sidebar', 'sidebar_asset_seleccionado');
    // Crop just the sidebar
    const sidebarEl = page.locator('.results-sidebar');
    await sidebarEl.screenshot({ path: path.join(DIRS.sidebar, 'sidebar_lista_iconos_chips.png') });
  }

  // 7) Sidebar export buttons focus
  const footer = page.locator('.sidebar-footer');
  if (await footer.count()) {
    await footer.screenshot({ path: path.join(DIRS.sidebar, 'sidebar_footer_export_csv_excel.png') });
    console.log('  saved sidebar footer');
  }
}

// =============================================================================
// 4. Mapa — capas, leyenda, clusters, zoom, HQ popup
// =============================================================================
async function captureMap(page) {
  console.log('\n=== Mapa ===');
  await loadInditexFromCache(page);

  // 1) Default legend (source mode)
  await shot(page, 'mapa', 'mapa_leyenda_fuente');

  // 2) Toggle legend to superCategory mode
  await page.locator('.legend-toggle button[value="superCategory"]').click();
  await page.waitForTimeout(700);
  await shot(page, 'mapa', 'mapa_leyenda_supercategoria');

  // Reset to source mode
  await page.locator('.legend-toggle button[value="source"]').click();
  await page.waitForTimeout(400);

  // 3) Layer control hover/click
  const layerCtrl = page.locator('.leaflet-control-layers').first();
  if (await layerCtrl.count()) {
    await layerCtrl.hover();
    await page.waitForTimeout(700);
    await shot(page, 'mapa', 'mapa_capas_control_abierto');
    // Move away
    await page.locator('body').click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(300);
  }

  // 4) Zoom out → clusters
  const zoomOut = page.locator('.leaflet-control-zoom-out').first();
  for (let i = 0; i < 3; i++) {
    await zoomOut.click({ delay: 50 });
    await page.waitForTimeout(700);
  }
  await shot(page, 'mapa', 'mapa_clusters_zoom_out');

  // 5) Reset zoom & pan → click cluster to expand or zoom in
  const zoomIn = page.locator('.leaflet-control-zoom-in').first();
  for (let i = 0; i < 6; i++) {
    await zoomIn.click({ delay: 50 });
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
  await shot(page, 'mapa', 'mapa_zoom_detalle_marker');

  // 6) Reset (reload) → find HQ marker via DB click. Easier: open all popups one by one
  await loadInditexFromCache(page);
  // Find the headquarters asset by scrolling sidebar list and clicking entries until popup shows HQ chip
  const items = page.locator('.sidebar-list .v-list-item');
  const cnt = await items.count();
  console.log('  searching HQ across', cnt, 'assets');
  let hqFound = false;
  for (let i = 0; i < Math.min(cnt, 20); i++) {
    await items.nth(i).click();
    await page.waitForTimeout(900);
    // Trigger marker popup by clicking the visible marker for the selected asset (selectAsset opens popup automatically?)
    // The clickable marker we want is whichever popup is open
    const popupHQ = await page.locator('.leaflet-popup-content').filter({ hasText: 'HQ' }).count();
    if (popupHQ > 0) {
      console.log('  HQ popup found at item', i);
      await shot(page, 'mapa', 'mapa_popup_HQ_indicator');
      hqFound = true;
      break;
    }
  }
  if (!hqFound) {
    console.log('  HQ chip not found in first 20 popups; capturing first popup as fallback');
    const markers = page.locator('.leaflet-marker-icon').filter({ visible: true });
    for (let i = 0; i < Math.min(await markers.count(), 5); i++) {
      const cls = (await markers.nth(i).getAttribute('class')) || '';
      if (!cls.includes('marker-cluster')) {
        await markers.nth(i).click({ force: true });
        await page.waitForTimeout(900);
        await shot(page, 'mapa', 'mapa_popup_marker_default');
        break;
      }
    }
  }
}

// =============================================================================
// 5. Agente — eventos en distintas fases (run nuevo, no cache)
// =============================================================================
async function captureAgentEvents(page) {
  console.log('\n=== Agente: eventos en distintas fases ===');
  await gotoHome(page);

  await page.locator('input[placeholder*="company"]').fill('Mercadona');
  await page.locator('.agent-toggle').click();
  await page.waitForTimeout(300);
  await page.locator('.submit-icon').click();

  // Wait for AgentSearchView to appear
  await page.waitForFunction(
    () => document.querySelector('.agent-page, [class*="agent-page"]') !== null,
    undefined,
    { timeout: 30_000 },
  );

  // Capture every ~8 seconds for the first 60s — covers thinking, searching, downloading
  const totalShots = 6;
  for (let i = 0; i < totalShots; i++) {
    await page.waitForTimeout(8000);
    await shot(page, 'agente', `agente_evento_fase_${i + 1}_t${(i + 1) * 8}s`);
  }

  // Now wait for review view
  try {
    await page.waitForFunction(
      () => {
        const html = document.querySelector('main')?.innerHTML || '';
        return html.includes('agent-review') || document.querySelector('.results-view') !== null;
      },
      undefined,
      { timeout: 180_000 },
    );
    await page.waitForTimeout(2500);
    await shot(page, 'agente', 'agente_review_grid_completo');

    // Click first doc to open preview
    const card = page.locator('.doc-card').first();
    if (await card.count()) {
      await card.click();
      await page.waitForTimeout(1800);
      await shot(page, 'agente', 'agente_review_preview_dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Toggle drop on first doc → state with one dropped
    const dropBtn = page.locator('.drop-btn').first();
    if (await dropBtn.count()) {
      await dropBtn.click();
      await page.waitForTimeout(800);
      await shot(page, 'agente', 'agente_review_doc_dropped');
    }
  } catch (e) {
    console.log('  review view did not arrive:', e.message);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[err] ${m.text()}`);
  });

  try {
    await captureHeader(page);
    await captureSearch(page);
    await captureSidebar(page);
    await captureMap(page);
    await captureAgentEvents(page);
  } catch (e) {
    console.error('FATAL:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
