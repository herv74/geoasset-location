# Capturas para la presentación del TFM

Carpeta de capturas tomadas automáticamente con Playwright contra la app levantada en `http://localhost:3000`. Cada subcarpeta corresponde a una sección del índice del PowerPoint.

Las imágenes están a 1920×1080 (formato 16:9, ideal para slides).

## Mapa imagen → slide del índice

### `seccion_02_solucion/`
| Archivo | Slide del índice |
|---|---|
| `slide_08_dashboard_principal.png` | **Slide 8 — Presentación de la plataforma** (estado inicial, hero limpio) |
| `slide_08b_dashboard_results.png` | Slide 8 alternativa: dashboard con resultados (mapa + sidebar) |
| `slide_09a_busqueda_texto.png` | **Slide 9 — Modo 1: Búsqueda Maps** (input con texto) |
| `slide_09b_agent_mode_on.png` | **Slide 9 — Modo 3: Agente IA** (toggle activado) |
| `slide_09c_doc_upload_estado.png` | **Slide 9 — Modo 2: Carga de documento** (file card cargado) |
| `slide_11_scoring_dialog_detalle.png` | **Slide 11 — Sistema de confianza** (dialog con score, tier, señales y pesos) |
| `slide_12_flujo_2_processing.png` | **Slide 12 — Paso 3: seguimiento en tiempo real** (ProcessingView con SSE) |
| `slide_12_flujo_3_results.png` | **Slide 12 — Paso 4: mapa interactivo + sidebar** |

> Slide 10 (taxonomía de 12 categorías): no existe pantalla dedicada en la app; usa los iconos del propio mapa de la slide 12 o construye una grid manual con la lista del catálogo (README sección 6).

### `seccion_04_pipelines/`
| Archivo | Slide del índice |
|---|---|
| `slide_22_processing_maps_inditex.png` | **Slide 19/21 — Pipeline Maps en marcha** (5 pasos visibles, Inditex) |
| `slide_22_processing_doc_repsol.png` | **Slide 22 — Pipeline Documento en marcha** (6 pasos, Repsol) |
| `slide_25_agent_search_view_eventos.png` | **Slide 25 — Pipeline Agente / AgentSearchView** (feed de eventos: thinking, searching, downloading) |
| `slide_26_agent_document_review.png` | **Slide 26 — AgentDocumentReviewView** (revisión y selección de documentos antes del análisis) |
| `slide_18_pipeline_resultado_inditex.png` | **Slide 18 — Comparativa de pipelines** (resultado típico Maps; útil como “pipeline Maps end-to-end”) |

### `seccion_05_demo/`
| Archivo | Slide del índice |
|---|---|
| `slide_28_inditex_map_overview.png` | **Slide 28 — Caso 1 Inditex (Maps)**: mapa de España con marcadores |
| `slide_28_inditex_sidebar_filtros.png` | **Slide 28 — Sidebar de Inditex**: lista, filtros, búsqueda, exportación |
| `slide_29_repsol_map_overview.png` | **Slide 29 — Caso 2 Repsol (Documento)**: mapa con activos extraídos del docx |
| `slide_29_repsol_sidebar.png` | **Slide 29 — Sidebar Repsol** |
| `slide_30_agente_run_logs.png` | **Slide 30 — Caso 3 Agente**: feed en vivo de queries, descargas y validaciones |
| `slide_30_agente_review.png` | **Slide 30 — Caso 3 Agente**: estado tras la ejecución (review/resultados) |
| `slide_32_popup_marker.png` | **Slide 32 — Popup del mapa** (nombre, categoría, dirección, barra de confianza) — caso Inditex/Maps |
| `slide_32_popup_doc_repsol.png` | **Slide 32 alt — Popup en pipeline Documento** (Repsol) |
| `slide_32_dialog_confianza.png` | **Slide 32 — Dialog de detalle de confianza** (score final, tier, fuentes, señales y pesos) |

### `extras/` — funcionalidades adicionales sin slot fijo en el índice

Capturas de funciones de la app que **no estaban explícitamente pedidas** en el índice — header/info dialog, validaciones de upload, dropdowns abiertos del sidebar, slider de confianza, capas del mapa, leyenda en modo "Tipo", clusters, popup HQ, eventos del agente en distintas fases, etc.

Subcarpetas: `header/` (2 imgs), `search/` (6 imgs), `sidebar/` (7 imgs), `mapa/` (6 imgs), `agente/` (7 imgs) — **28 capturas extras** en total.

Mapa imagen → sugerencia de slide en [extras/README.md](extras/README.md).

## Slides que no requieren screenshot de la app

Estas son diagramas o tablas conceptuales — debes generarlas en draw.io / Mermaid / PowerPoint:

- **Sección 00** (1, 2): portada y cronología de pasos manuales
- **Sección 01** (3-7): mapa de España conceptual, flujo manual AS IS, tabla limitaciones, triángulo de pilares, diagrama input→sistema→output
- **Sección 03** (13-17): logos del stack, diagrama de capas, ER simplificado, secuencia SSE, tabla de variables de entorno
- **Sección 06** (33-35): tablas comparativas de competidores y radar chart
- **Sección 07** (36-40): comparativa AS IS vs TO BE, roadmap, conclusiones, cierre con QR
- **Sección 08** (41): bibliografía

## Cómo se generaron

Script Playwright en `screenshots_tool/`:
- `capture.mjs` — carga la SPA, dispara los 3 pipelines reales (Maps Inditex, Documento Repsol con `sample_docs/repsol_activos_productivos.docx`, Agente CrewAI sobre Iberdrola) y captura cada paso.
- `capture_dialog.mjs` — abre el popup de un marker y dispara el dialog de detalle de confianza (slides 11 y 32).

Para regenerar:
```bash
cd capturas_tfm/screenshots_tool
node capture.mjs         # ~10-12 min (consume API: 3 corridas de pipeline)
node capture_dialog.mjs  # ~10 s   (Inditex desde caché Redis)
node capture_extras.mjs  # ~5-8 min (mayoría desde caché + 1 corrida agente)
```
