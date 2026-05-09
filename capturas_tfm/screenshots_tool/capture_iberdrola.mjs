// Captura específica para sustituir la slide 30 (Inditex → Iberdrola)
// y añadir la slide del detalle de scoring del frontend.
//
// Uso (desde geoasset-location/capturas_tfm/screenshots_tool):
//   1) Levantar la app:    cd ../../ && ./run.sh --dev
//   2) En otra terminal:   cd capturas_tfm/screenshots_tool && node capture_iberdrola.mjs
//
// Requisitos: la app sirviendo el frontend en http://localhost:3000.
// Modo: pipeline Maps (sin toggle de agente) — buscamos un dashboard con muchos
// activos para que impacte visualmente.

import { chromium } from 'playwright';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(ROOT, 'iberdrola_slide30');

async function shot(page, name, options = {}) {
  const outPath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false, ...options });
  console.log(`  saved: ${path.relative(ROOT, outPath)}`);
}

async function gotoHome(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.search-page', { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

async function waitForResults(page, timeoutMs = 300_000) {
  console.log(`  esperando resultados (hasta ${Math.round(timeoutMs / 1000)}s)...`);
  await page.waitForSelector('.results-view', { timeout: timeoutMs });
  await page.waitForTimeout(2500);
}

async function clickFirstNonClusterMarker(page) {
  const markers = page.locator('.leaflet-marker-icon').filter({ visible: true });
  const count = await markers.count();
  console.log(`  markers visibles: ${count}`);
  for (let i = 0; i < Math.min(count, 20); i++) {
    const el = markers.nth(i);
    const cls = (await el.getAttribute('class')) || '';
    if (!cls.includes('marker-cluster')) {
      await el.click().catch(() => {});
      return true;
    }
  }
  if (count > 0) {
    await markers.first().click().catch(() => {});
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Viewport algo más alto que en capture.mjs para que el dashboard no quede recortado
  const context = await browser.newContext({ viewport: { width: 1920, height: 1200 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [page-error] ${msg.text()}`);
  });

  try {
    console.log('\n=== Iberdrola · pipeline Maps ===');
    await gotoHome(page);

    // Tecleamos Iberdrola SIN activar toggle de agente → pipeline Maps directo
    await page.locator('input[placeholder*="company"]').fill('Iberdrola');
    await page.waitForTimeout(400);
    await page.locator('.submit-icon').click();

    // Esperar resultados (Maps suele tardar ~45-60s; damos margen)
    await waitForResults(page, 300_000);

    // 1. Dashboard completo (sustituto de slide_28_inditex_map_overview)
    await shot(page, 'iberdrola_01_dashboard_full');

    // 2. Sidebar focal (sustituto de slide_28_inditex_sidebar_filtros)
    const sidebar = page.locator('.results-sidebar');
    if (await sidebar.count()) {
      await sidebar.screenshot({
        path: path.join(OUT_DIR, 'iberdrola_02_sidebar.png'),
      });
      console.log('  saved: iberdrola_slide30/iberdrola_02_sidebar.png');
    }

    // 3. Mapa solo (sin sidebar) — útil si quieren ampliar la captura
    const mapEl = page.locator('.results-map, .leaflet-container').first();
    if (await mapEl.count()) {
      await mapEl.screenshot({
        path: path.join(OUT_DIR, 'iberdrola_03_map_only.png'),
      });
      console.log('  saved: iberdrola_slide30/iberdrola_03_map_only.png');
    }

    // 4. Marker popup — clicamos un asset desde la sidebar; eso dispara
    //    flyTo(zoom=14) + openPopup() automáticamente (ver AssetMap.vue watch).
    //    Es más fiable que clicar el mapa porque ahí muchos markers son clusters.
    const sidebarItem = page.locator('.results-sidebar .asset-item, .results-sidebar [class*="asset"]').first();
    let popupOpened = false;
    if (await sidebarItem.count()) {
      await sidebarItem.click().catch(() => {});
      // flyTo dura ~1s + openPopup tiene setTimeout 500ms; damos margen
      await page.waitForSelector('.leaflet-popup', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      popupOpened = (await page.locator('.leaflet-popup').count()) > 0;
    }
    if (!popupOpened) {
      // Fallback: intento desde el mapa
      await clickFirstNonClusterMarker(page);
      await page.waitForTimeout(1500);
      popupOpened = (await page.locator('.leaflet-popup').count()) > 0;
    }
    if (popupOpened) {
      await shot(page, 'iberdrola_04_popup_marker');

      // 5. Dialog de scoring (botón info dentro del popup) — esto es lo que pide
      //    la segunda nota en rojo: "enseñar scoring en otra"
      // El popup se renderiza vía L.bindPopup con HTML plano: el botón es un
      // <button data-action="confidence-detail"> dentro de .leaflet-popup, NO un .v-btn.
      const detailBtn = page.locator('.leaflet-popup [data-action="confidence-detail"]').first();
      if (await detailBtn.count()) {
        await detailBtn.click().catch(() => {});
        await page.waitForTimeout(1800);
        await shot(page, 'iberdrola_05_scoring_dialog_full');

        // 5b. Recorte solo del dialog para que se vea más limpio
        const dialog = page.locator('.v-overlay__content .v-card').first();
        if (await dialog.count()) {
          await dialog.screenshot({
            path: path.join(OUT_DIR, 'iberdrola_06_scoring_dialog_focus.png'),
          });
          console.log('  saved: iberdrola_slide30/iberdrola_06_scoring_dialog_focus.png');
        }
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(400);
      } else {
        console.log('  WARN: no encontré botón [data-action=confidence-detail] en el popup');
      }
    } else {
      console.log('  WARN: no se pudo abrir popup ni desde sidebar ni desde mapa');
    }

    console.log('\n✓ Listo. Capturas en capturas_tfm/iberdrola_slide30/');
  } catch (e) {
    console.error('FATAL:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
