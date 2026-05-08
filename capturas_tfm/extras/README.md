# Capturas extra — funcionalidades no asignadas a slide

Capturas de funcionalidades de la app que **no están explícitamente pedidas** en el índice del PowerPoint pero que documentan el comportamiento real del producto. Útiles si quieres añadir slides extra (anexos, demo extendida, sección de "features adicionales") o simplemente como respaldo visual de la memoria.

Cada subcarpeta agrupa por área funcional. La sugerencia entre paréntesis indica dónde encajaría cada captura **si quisieras** incluirla en la presentación oficial.

## `header/`
| Archivo | Qué muestra | Sugerencia de uso |
|---|---|---|
| `header_topbar.png` | Topbar Vuetify aislada (logo + botón Info) | Slide 8 (presentación de la plataforma) |
| `header_info_dialog.png` | Dialog de "Info" con descripción del producto | Slide 8 alternativa o anexo |

## `search/`
| Archivo | Qué muestra | Sugerencia |
|---|---|---|
| `search_landing_quickpicks.png` | Landing con chips de empresas sugeridas (Mercadona, Inditex, Repsol, Telefónica, Iberdrola, BBVA) | Slide 8 (UI principal) |
| `search_quickpick_hover.png` | Chip "Mercadona" en hover | — |
| `search_multi_file_upload.png` | Dos documentos cargados a la vez (file cards) | Slide 9 (mostrar que admite múltiples docs) |
| `search_upload_error_unsupported.png` | Tras subir un `.txt` (formato no soportado) | Slide 38 (limitaciones) o anexo de validaciones |
| `search_text_plus_file.png` | Texto + documento simultáneamente (modo combinado) | Slide 27 (modo combinado del sistema) |
| `search_agent_mode_with_text.png` | Toggle agente activo + texto "Telefónica" | Slide 9 (modo 3 — agente IA) |

## `sidebar/`
| Archivo | Qué muestra | Sugerencia |
|---|---|---|
| `sidebar_dropdown_tipo_abierto.png` | Dropdown "Tipo de activo" abierto con super-categorías y conteos | Slide 11 o slide 12 (filtros funcionales) |
| `sidebar_dropdown_subcategoria_abierto.png` | Dropdown "Subcategoría" abierto | — |
| `sidebar_search_typed.png` | Filtro por texto activo ("arteixo") sobre la lista | Slide 12 (UX completa) |
| `sidebar_slider_confidence_movido.png` | Slider de confianza mínima movido (filtra LOW/MEDIUM) | Slide 11 (sistema de tiers) |
| `sidebar_asset_seleccionado.png` | Asset highlighted en la lista tras click | Slide 12 (interactividad) |
| `sidebar_lista_iconos_chips.png` | Sidebar recortado: iconos por categoría + chips de fuente y porcentaje | Slide 10 (taxonomía con iconos reales) |
| `sidebar_footer_export_csv_excel.png` | Botones de exportación CSV / Excel + "Nueva búsqueda" | Slide 12 paso 4 |

## `mapa/`
| Archivo | Qué muestra | Sugerencia |
|---|---|---|
| `mapa_leyenda_fuente.png` | Leyenda en modo "Fuente" (chip Maps API) | Slide 11 (fuentes y scoring) |
| `mapa_leyenda_supercategoria.png` | Leyenda en modo "Tipo" — color por super-categoría | Slide 10 (taxonomía) |
| `mapa_capas_control_abierto.png` | Selector de capas base de Leaflet abierto (OSM / satélite / topo) | Slide 13 o anexo |
| `mapa_clusters_zoom_out.png` | Marker clustering al hacer zoom-out | Slide 28 alternativa o anexo de UX |
| `mapa_zoom_detalle_marker.png` | Zoom-in extremo sobre un marker individual | — |
| `mapa_popup_HQ_indicator.png` | Popup de la sede central de Inditex (Arteixo) con chip **HQ** ámbar | Slide 28 (caso Inditex) o slide 32 (popup detallado) |

## `agente/`
| Archivo | Qué muestra | Sugerencia |
|---|---|---|
| `agente_evento_fase_1_t8s.png` … `_fase_6_t48s.png` | Seis frames del feed del agente cada 8s — evolución de eventos: thinking → searching → found_urls → downloading → accepted/rejected | Slide 25 (puedes intercalar 2-3 de estos para mostrar la evolución) |
| `agente_resultados_finales_mercadona.png` | Mercadona tras agente: el sistema procesó los docs encontrados sin parar en review y aterrizó directo en mapa+sidebar (modo "auto-flow") | Slide 30 alt (resultado final del flujo agente) |

> **Nota sobre la review view del agente:** la captura canónica de `AgentDocumentReviewView` está en [seccion_04_pipelines/slide_26_agent_document_review.png](../seccion_04_pipelines/slide_26_agent_document_review.png) (un único doc). En esta corrida Mercadona el agente encadenó directamente a análisis sin pasar por la review (comportamiento esperado cuando todos los docs encontrados son aceptados sin necesidad de validación humana).

## Funcionalidades de la app sin captura aún (no testeables sin escenario específico)
Estas funcionalidades existen en el código pero requieren un escenario que no se da con los datos de demo — anótalas si las quieres cubrir manualmente:

- **Activos multi-fuente** (`data_sources` con 2+ valores y filtros por fuente activos en sidebar): hoy cada empresa procesa por una sola pipeline, así que `Object.keys(store.sourceCounts).length > 1` no se da. Habría que combinar manualmente o usar el `source_override` en el endpoint de documentos.
- **Marker LOW semitransparente**: con los datos de Inditex/Repsol todos los assets salen HIGH, no aparece ningún LOW.
- **Estado "cached: true"**: la respuesta cacheada se procesa internamente; no hay un indicador visual diferente al usuario.
- **Errores del pipeline en runtime** (LLM caído, Maps API bloqueada): tendrías que provocarlos retirando temporalmente la API key.
- **Botón "Saltar" en AgentSearchView** (interrumpir agente): visible en el AgentSearchView, no se enfocó en captura aislada.
