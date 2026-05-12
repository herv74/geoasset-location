# GeoAssets Intelligence — Documentación Funcional y Técnica

> **Proyecto:** Caso II — Aplicación de IA a la Geolocalización de Activos Productivos  
> **Contexto académico:** Trabajo de Fin de Máster (TFM)  
> **Stack:** Vue 3 · FastAPI · Docker · LiteLLM · OpenAI gpt-4o-mini · Google Maps API · PostgreSQL · Redis · CrewAI

---

## 1. Objeto del Proyecto

### 1.1 Propósito

GeoAssets Intelligence es una plataforma de inteligencia geoespacial empresarial que combina fuentes de datos públicas, modelos de lenguaje de gran escala (LLMs) y técnicas de distribución de probabilidades para **identificar, estructurar y visualizar los activos productivos** de cualquier empresa española sobre un mapa interactivo.

El sistema responde a una necesidad real en contextos de análisis de inversión, due diligence, gestión de riesgos y planificación estratégica: conocer dónde están físicamente los activos productivos de una empresa (fábricas, almacenes, oficinas, centros logísticos, plantas de producción, etc.) de forma automatizada, escalable y verificable.

### 1.2 Alcance

- **Geografía cubierta:** España (incluyendo Canarias, Baleares, Ceuta y Melilla).
- **Tipo de entidades analizadas:** Empresas con presencia operativa en territorio español, cotizadas o no.
- **Tipo de activos identificables:** Ver Sección 5 — Catálogo de Categorías de Activos.
- **Fuentes de datos:** Google Maps API (Places + Geocoding), búsqueda web con agente IA, documentos corporativos (informes anuales, memorias, presentaciones).

### 1.3 Propuesta de Valor

| Método tradicional | GeoAssets Intelligence |
|---|---|
| Búsqueda manual fuente por fuente | Tres fuentes automatizadas y combinables |
| Datos no estructurados dispersos | Salida estructurada, categorizada y geocodificada |
| Horas o días de trabajo analítico | Resultado en 60–120 segundos |
| Sin probabilidad de confianza | Score de confianza por activo mediante distribución Beta |
| Visualización estática o ninguna | Mapa interactivo con capas, filtros y detalle por activo |

---

## 2. Arquitectura del Sistema

### 2.1 Vista de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTE (SPA)                              │
│         Vue 3 + Pinia + Vuetify + Leaflet.js                        │
│  SearchBar · AgentSearchView · AgentDocumentReviewView              │
│  ProcessingView · AssetSidebar · AssetMap                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP / SSE (Server-Sent Events)
┌────────────────────────────▼────────────────────────────────────────┐
│                       BACKEND (FastAPI)                             │
│                                                                     │
│  /api/v1/companies   /api/v1/assets   /api/v1/documents             │
│  /api/v1/agent                                                      │
│                                                                     │
│  ┌─────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │  Pipeline Maps  │  │ Pipeline Documento │  │ Pipeline Agente  │  │
│  │  (5 pasos)      │  │ (6 pasos)          │  │ (CrewAI + MCP)   │  │
│  └─────────────────┘  └───────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                       Data Layer                             │   │
│  │   Google Maps API · PostgreSQL · Redis · OpenAI (LLM)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                             │
               ┌─────────────┴─────────────┐
               │       DOCKER COMPOSE       │
               │  frontend · backend        │
               │  postgres · redis          │
               └────────────────────────────┘
```

### 2.2 Stack Tecnológico Detallado

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | Vue 3 + Vite + TypeScript | SPA reactiva, composición moderna |
| Estado | Pinia | Store reactivo nativo de Vue 3 |
| UI | Vuetify 3 + MDI icons | Material Design, componentes listos |
| Mapa | Leaflet.js + OpenStreetMap + leaflet.markercluster | Visualización geoespacial interactiva |
| Backend | FastAPI (Python 3.11+) | Async nativo, tipado, OpenAPI automático |
| Streaming | Server-Sent Events (SSE) | Progreso en tiempo real sin WebSocket |
| LLM Gateway | LiteLLM | Abstracción multi-proveedor (OpenAI por defecto; Bedrock/Azure/Anthropic configurables vía env) |
| LLM Provider | OpenAI `gpt-4o-mini` | Modelo canónico de los 3 pipelines |
| Agente IA | CrewAI + DuckDuckGo MCP | Búsqueda web autónoma de documentos |
| Document parsing | Docling | Extracción de texto de PDF/DOCX/PPTX |
| Maps/Places | Google Maps Places API v2 | Fuente principal de activos geolocalizados |
| Geocoding | Google Maps Geocoding API | Resolución de coordenadas desde texto |
| Base de datos | PostgreSQL 16 | Almacenamiento persistente de activos |
| Caché | Redis 7 | TTL por empresa, evita recómputo |
| Contenedores | Docker + Docker Compose | Despliegue reproducible |
| CI/CD | AWS CodeBuild | Build de imágenes Docker |
| Package manager (backend) | uv | Instalación rápida de dependencias Python |
| Package manager (frontend) | Bun 1.1.0 | Build y dev server rápidos |

---

## 3. Modos de Análisis

El sistema permite tres formas de localizar activos, combinables entre sí:

### 3.1 Búsqueda en Google Maps
El usuario escribe el nombre de una empresa. El backend lanza queries paralelas a la Google Places API y filtra y enriquece los resultados con LLMs.

### 3.2 Subida de Documento
El usuario sube un PDF, DOCX o PPTX (máximo 25 MB, configurable vía `UPLOAD_MAX_SIZE_MB`). El pipeline extrae, geocodifica y puntúa los activos mencionados en el documento.

### 3.3 Búsqueda con Agente IA
El usuario activa el modo agente. Un agente CrewAI busca en la web documentos corporativos relevantes (informes anuales, memorias, presentaciones) usando DuckDuckGo. El usuario revisa y selecciona los documentos encontrados, que luego se procesan con el pipeline de documento.

### 3.4 Modo Combinado
Los modos Maps y Documento pueden usarse de forma combinada (search bar con texto **y** documento adjunto en la misma petición). Los activos se deduplican por `id` en el store del frontend (`appendAssets`) y se muestran conjuntamente en el mapa, con indicador de fuente por activo (`data_sources`).

---

## 4. Pipelines de Procesamiento

### 4.1 Pipeline Maps (5 pasos)

```
Usuario escribe empresa
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 0 · Identificación de empresa          ~2 s                │
│  → Slugifica el nombre, crea company_id                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO 1 · Búsqueda en Google Maps            ~10–20 s            │
│  → N queries paralelas (nombre + keywords + provincias)         │
│  → Deduplicación por place_id                                   │
│  → Salida: List[RawPlace]                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO 2 · Filtrado y clasificación con LLM   ~15–30 s            │
│  → Batches de 20 places → LLM evalúa si es activo productivo    │
│  → Asigna categoría (HQ, FAB, LOG, etc.) y llm_confidence       │
│  → Salida: List[FilteredAsset]                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO 3 · Enriquecimiento                    ~10–20 s            │
│  → LLM infiere descripción, tamaño, tags, municipio, provincia  │
│  → Salida: List[EnrichedAsset]                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO 4 · Scoring de confianza               ~3–5 s              │
│  → 6 señales ponderadas + suavizado Beta                        │
│  → Salida: List[ScoredAsset] con confidence_score y tier        │
└─────────────────────────────────────────────────────────────────┘
```

#### Señales del scoring Maps

```python
SIGNALS_WEIGHTS = {
    "name_match":        0.30,  # Primera palabra empresa en nombre del place
    "type_match":        0.20,  # Tipo compatible con activo productivo
    "address_corporate": 0.15,  # Señal fija (valor base 0.5)
    "website_match":     0.15,  # Dominio corporativo en website
    "reviews_b2b":       0.10,  # >100 reseñas → 0.8 | >20 → 0.5 | else → 0.3
    "llm_confidence":    0.10,  # Confianza del LLM en paso 2 (default 0.5)
}
# Score raw suavizado con distribución Beta(1 + raw*10, 1 + (1-raw)*10)
```

---

### 4.2 Pipeline Documento (6 pasos)

```
Usuario sube PDF/DOCX/PPTX (o agente lo descarga)
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO D0 · Parseo del documento                                  │
│  → Docling convierte a Markdown (con OCR opcional)              │
│  → Fallback para PDFs cifrados/imagen                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO D1 · Chunking                                              │
│  → HybridChunker (max 2000 tokens por chunk)                    │
│  → Fallback párrafo-based (max 8000 chars)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO D2 · Extracción de activos con LLM                         │
│  → Un LLM por chunk en paralelo (concurrencia configurable)     │
│  → Extrae: nombre, categoría, dirección, coordenadas, cita      │
│  → Salida: List[DocumentExtractedAsset]                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO D3 · Deduplicación                                         │
│  → Merge de menciones duplicadas (nombre, dirección, coords)    │
│  → Agrupa citas de evidencia separadas por \n---\n              │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO D4 · Geocodificación y enriquecimiento                     │
│  → 1º coords reportadas en doc → 2º Google Geocoding API        │
│  → 3º LLM infiere coords → 4º default Madrid (40.41, -3.70)    │
│  → Añade municipio, provincia, CCAA                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ PASO D5 · Scoring de confianza                                  │
│  → 5 señales distintas a las del pipeline Maps                  │
│  → Salida: List[DocumentScoredAsset]                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Señales del scoring Documento

```python
SIGNALS_WEIGHTS_DOC = {
    "evidence_strength":   0.30,  # ≥3 menciones→1.0 | 2→0.8 | 1 con cita→0.6 | else→0.3
    "address_specificity": 0.20,  # base 0.4 + dígitos(+0.2) + coma(+0.2) + len>30(+0.2)
    "coordinate_source":   0.20,  # reported→1.0 | google_geocoding→0.8 | llm→0.65 | default→0.2
    "name_quality":        0.15,  # penaliza nombres cortos o genéricos ("planta", "instalación")
    "llm_confidence":      0.15,  # confianza del LLM en paso D2 (default 0.5)
}
# Mismo suavizado Beta que el pipeline Maps
```

---

### 4.3 Pipeline Agente (CrewAI)

```
Usuario activa modo agente para una empresa
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Agente CrewAI — rol: "Geospatial Asset Intelligence Researcher" │
│                                                                 │
│  Herramienta 1: WebSearchTool                                   │
│   → DuckDuckGo vía MCP server (1 req/s rate-limited)           │
│   → Fallback: scraping Bing                                     │
│   → Emite eventos: agent_searching, agent_found_urls            │
│                                                                 │
│  Herramienta 2: DownloadDocumentTool                            │
│   → Valida tipo (.pdf/.docx/.pptx) y tamaño (<25 MB)           │
│   → Comprueba relevancia: nombre empresa + ≥2 keywords          │
│   → Guarda en /tmp/agent_sessions/{session_id}/                 │
│   → Emite eventos: agent_accepted, agent_rejected               │
│                                                                 │
│  Timeout: AGENT_MAX_DURATION_SECONDS (default 120 s)           │
│  Máx. ficheros: AGENT_MAX_FILES (default 5)                     │
│  Máx. iteraciones: AGENT_MAX_ITERATIONS (default 15)            │
└────────────────────────────┬────────────────────────────────────┘
                             │ El usuario revisa y selecciona documentos
                             ▼
                  Pipeline Documento (D0–D5)
                  para cada fichero seleccionado
```

Los documentos procesados por el agente pasan exactamente por el mismo pipeline de 6 pasos que un documento subido manualmente. El campo `data_sources` del activo resultante refleja el procesamiento real: `["document_upload", "llm_inference"]`. La fuente `agent_search` está definida como valor reservado en la taxonomía pero su asignación automática a los activos producidos por el agente es una mejora pendiente del pipeline (`agent_orchestrator.py`).

---

## 5. API — Endpoints

### `GET /api/v1/companies/search`
Búsqueda y autocompletado de empresas vía Google Places.

**Query params:** `q` (min 3 chars), `limit` (default 10, max 20)

**Response:**
```json
{
  "companies": [
    { "id": "mercadona_sa", "name": "Mercadona S.A.", "address": "...", "types": [...], "website": "..." }
  ]
}
```

---

### `POST /api/v1/assets/analyze`
Lanza el pipeline Maps para una empresa. Devuelve caché si existe, o streaming SSE.

**Body:** `{ "company_id": "...", "company_name": "...", "force_refresh": false }`

**Response (caché):** `{ "cached": true, "assets": [...], "metadata": {...} }`

**Response (sin caché):** Stream SSE con eventos `job_started`, `step_start`, `step_complete`, `complete`, `error`.

---

### `GET /api/v1/assets/{company_id}`
Obtiene activos ya procesados de la base de datos.

**Query params:** `category` (opcional), `min_confidence` (0.0–1.0, default 0.0)

**Response:** `{ "assets": [...], "metadata": { "total_assets": N } }`

---

### `POST /api/v1/documents/analyze`
Lanza el pipeline Documento. Acepta dos modos:

**Modo upload:** `multipart/form-data` con campos `file` (PDF/DOCX/PPTX, max 25 MB), `company_name` (opcional), `force_refresh`.

**Modo agente:** `multipart/form-data` con campos `session_id`, `agent_filename`, `source_override` (opcional).

**Response:** Stream SSE con eventos `job_started`, `step_start`, `step_complete`, `complete`, `error`.

---

### `POST /api/v1/agent/search`
Lanza el agente CrewAI para buscar documentos en la web.

**Body:** `{ "company_name": "...", "company_id": "..." }`

**Response:** Stream SSE con eventos `agent_started`, `agent_thinking`, `agent_searching`, `agent_found_urls`, `agent_downloading`, `agent_accepted`, `agent_rejected`, `agent_error`, `agent_complete` / `agent_timeout`.

El evento `agent_complete` incluye: `{ "session_id": "...", "found_files": [...], "total_found": N }`.

---

### `GET /api/v1/agent/sessions/{session_id}/documents/{filename}`
Descarga un documento guardado en la sesión del agente. Devuelve `FileResponse` con el media type apropiado.

---

### `GET /api/v1/agent/sessions/{session_id}/documents/{filename}/metadata`
Metadatos del documento: `{ "filename": "...", "size": N, "page_count": N, "extension": "pdf" }`.

---

## 6. Catálogo de Categorías de Activos

| Código | Categoría | Descripción | Keywords de búsqueda |
|---|---|---|---|
| `HQ` | Sede Central | Oficina principal o casa matriz | sede central, headquarter, dirección general |
| `OFF` | Oficina Regional | Delegación o sucursal administrativa | oficina, delegación, sucursal |
| `FAB` | Fábrica / Planta Industrial | Instalación de manufactura o producción | fábrica, planta, manufactura, producción |
| `LOG` | Centro Logístico | Almacén de distribución y logística | almacén, logística, distribución, centro logístico |
| `TEC` | Centro Tecnológico | I+D, laboratorio, data center | laboratorio, I+D, innovación, data center |
| `COM` | Punto de Venta / Tienda | Local comercial propio | tienda, punto de venta, store |
| `AGR` | Explotación Agrícola / Ganadera | Activo de sector primario | explotación, finca, granja |
| `ENE` | Instalación Energética | Planta fotovoltaica, eólica, subestación | planta solar, parque eólico, subestación |
| `TRA` | Infraestructura de Transporte | Puerto, terminal, estación | terminal, puerto, estación |
| `HOT` | Activo Hotelero / Turístico | Hotel, resort o activo turístico | hotel, resort, complejo turístico |
| `SAN` | Centro Sanitario | Hospital, clínica, centro médico propio | hospital, clínica, centro médico |
| `OTR` | Otro Activo Productivo | No categorizable en las anteriores | — |

---

## 7. Modelo de Datos

### Entidad `Asset` (tabla `assets` en PostgreSQL)

```python
class Asset:
    id: str                          # UUID
    company_id: str                  # FK empresa

    # Identificación
    name: str                        # Nombre normalizado
    raw_name: str                    # Nombre original de la fuente
    category: AssetCategory          # Enum de categorías (Sección 6)
    subcategory: Optional[str]

    # Localización
    latitude: float
    longitude: float
    address: str
    municipality: str
    province: str
    autonomous_community: str
    postal_code: Optional[str]

    # Metadatos funcionales
    description: Optional[str]       # Descripción inferida por LLM
    size_estimate: Optional[str]     # "LARGE" | "MEDIUM" | "SMALL"
    functional_tags: List[str]
    is_headquarters: bool

    # Fuente y confianza
    google_place_id: str
    confidence_score: float          # 0.0 – 1.0 (distribución Beta)
    confidence_tier: str             # "HIGH" | "MEDIUM" | "LOW"
    data_sources: List[str]          # Valores reales asignados por el sistema:
                                     #   pipeline Maps      → ["maps_api", "llm_inference"]
                                     #   pipeline Documento → ["document_upload", "llm_inference"]
                                     #   "agent_search" está reservado en la taxonomía pero
                                     #   no se asigna automáticamente en la implementación actual

    # Contacto
    website: Optional[str]
    phone: Optional[str]

    # Control
    created_at: datetime
    updated_at: datetime
```

### Umbrales de confianza (configurables)

| Tier | Condición por defecto |
|---|---|
| HIGH | `confidence_score >= 0.65` |
| MEDIUM | `confidence_score >= 0.35` |
| LOW | `confidence_score < 0.35` |

---

## 8. Interfaz de Usuario

### 8.1 Pantalla de Búsqueda (`SearchBar`)

- Campo de búsqueda de empresa con autocompletado (debounce 300 ms, mínimo 3 caracteres).
- Toggle de **modo agente** para activar la búsqueda web autónoma.
- Subida de documentos (drag & drop o click): PDF, DOCX, PPTX hasta 25 MB.
- Chips de búsqueda rápida con ejemplos de empresas.

### 8.2 Vista del Agente (`AgentSearchView`)

Interfaz a pantalla completa mientras el agente busca documentos:
- Animación de robot y contador de tiempo restante.
- Feed de eventos agrupados por tipo: thinking, searching, found_urls, downloading, accepted, rejected.
- Contador de documentos encontrados y botón "Saltar" para interrumpir el agente.

### 8.3 Revisión de Documentos del Agente (`AgentDocumentReviewView`)

Vista de revisión previa al análisis:
- Grid de tarjetas con previsualización de los documentos encontrados.
- Toggle drop/keep por documento.
- Visor de documento integrado con control de páginas y zoom.
- El usuario confirma qué documentos analizar antes de lanzar el pipeline.

### 8.4 Vista de Procesamiento (`ProcessingView`)

Pantalla de carga mientras corre el pipeline:
- Barra de progreso global con porcentaje.
- Lista de pasos con estado visual: pendiente / en curso (animado) / completado / error.
- Contador de resultados parciales por paso (ej: "83 ubicaciones encontradas").
- Botones de reintentar y cancelar.

### 8.5 Vista Principal — Mapa + Sidebar

**Panel lateral izquierdo (`AssetSidebar`):**
- Nombre de la empresa y resumen: total de activos, desglose por categoría y nivel de confianza.
- Lista de activos con búsqueda, filtro por categoría (super-categoría y subcategoría), slider de confianza mínima y chips de filtro por fuente; los chips se generan dinámicamente a partir de las fuentes realmente presentes en `data_sources` (típicamente `maps_api` y/o `document_upload`).
- Botones de exportación: **CSV** (UTF-8 con BOM para Excel) y **Excel** (.xlsx via SheetJS).
- Botón "Nueva búsqueda" para volver al inicio.

**Mapa interactivo (`AssetMap`):**
- Leaflet.js centrado en España con clustering de marcadores.
- Capas base: OpenStreetMap, satélite, topográfico.
- Marcadores con icono diferenciado por categoría y color por fuente de datos.
- Marcadores `LOW` semitransparentes.
- Click en marcador → popup (`AssetPopup`) con nombre, categoría, dirección, score de confianza (barra visual), tags funcionales y enlace a Google Maps.
- Leyenda de fuentes de datos visible en el mapa.

---

## 9. Estructura del Repositorio

```
geoasset-location/
│
├── docker-compose.yml          # Producción (4 servicios)
├── dev.docker-compose.yml      # Desarrollo con hot-reload y puertos expuestos
├── run.sh                      # Script de arranque: --dev | prod | --down
├── .env.example                # Plantilla de variables
├── .env.defaults               # Defaults no secretos
├── .env.secrets_defaults       # Plantilla de secretos (vacía)
├── README.md
│
├── frontend/
│   ├── src/
│   │   ├── App.vue                         # Raíz, gestiona vista activa
│   │   ├── main.ts
│   │   ├── components/
│   │   │   ├── Header.vue                  # Barra superior con info de la plataforma
│   │   │   ├── SearchBar.vue               # Búsqueda, upload y modo agente
│   │   │   ├── AgentSearchView.vue         # Feed en tiempo real del agente
│   │   │   ├── AgentDocumentReviewView.vue # Revisión de documentos del agente
│   │   │   ├── ProcessingView.vue          # Pantalla de carga del pipeline
│   │   │   ├── AssetMap.vue                # Mapa Leaflet interactivo
│   │   │   ├── AssetSidebar.vue            # Panel lateral: lista, filtros, export
│   │   │   └── AssetPopup.vue              # Popup de detalle de activo
│   │   ├── stores/
│   │   │   └── store.ts                    # Store único Pinia (toda la app)
│   │   ├── services/
│   │   │   └── backend.ts                  # Cliente Axios + SSE al backend
│   │   ├── types/
│   │   │   └── types.ts                    # Tipos TypeScript (Asset, Company, etc.)
│   │   ├── plugins/
│   │   │   └── vuetify.ts                  # Configuración Vuetify
│   │   └── styles/
│   ├── Dockerfile                          # Build Bun → Nginx
│   ├── dev.Dockerfile                      # Dev con hot-reload Bun
│   └── nginx.conf                          # Reverse proxy + SPA fallback
│
└── backend/
    ├── app/
    │   ├── main.py                         # FastAPI app, routers, CORS, lifecycle
    │   ├── api/
    │   │   ├── companies.py                # GET /api/v1/companies/search
    │   │   ├── assets.py                   # POST + GET /api/v1/assets/...
    │   │   ├── documents.py                # POST /api/v1/documents/analyze
    │   │   └── agent.py                    # POST + GET /api/v1/agent/...
    │   ├── pipeline/
    │   │   ├── orchestrator.py             # Coordinador pipeline Maps
    │   │   ├── doc_orchestrator.py         # Coordinador pipeline Documento
    │   │   ├── agent_orchestrator.py       # Coordinador pipeline Agente
    │   │   ├── models.py                   # Modelos Pydantic del pipeline
    │   │   └── steps/
    │   │       ├── step0_identify.py
    │   │       ├── step1_maps.py
    │   │       ├── step2_llm_filter.py
    │   │       ├── step3_enrich.py
    │   │       ├── step4_scoring.py
    │   │       ├── doc_step0_parse.py
    │   │       ├── doc_step1_chunk.py
    │   │       ├── doc_step2_extract.py
    │   │       ├── doc_step3_dedup.py
    │   │       ├── doc_step4_geocode.py
    │   │       └── doc_step5_scoring.py
    │   ├── prompts/v1/
    │   │   ├── filter_assets.yaml          # Paso 2 Maps: filtrado y clasificación
    │   │   ├── enrich_asset.yaml           # Paso 3 Maps: enriquecimiento
    │   │   ├── extract_doc_assets.yaml     # Paso D2: extracción de activos de doc
    │   │   └── geocode_assets.yaml         # Paso D4: geocodificación por LLM
    │   ├── services/
    │   │   ├── google_maps.py              # Google Places + Geocoding API
    │   │   ├── llm_client.py              # Wrapper LiteLLM con semáforo
    │   │   ├── cache.py                    # Redis client
    │   │   ├── document_parser.py          # Docling: parse + chunking
    │   │   └── agent_search.py             # CrewAI + DuckDuckGo MCP
    │   ├── db/
    │   │   ├── models.py                   # SQLAlchemy ORM (AssetRecord, CompanyRecord)
    │   │   └── session.py                  # Sesión async PostgreSQL
    │   └── core/
    │       ├── config.py                   # Settings (Pydantic BaseSettings)
    │       └── paths.py                    # Carga de .env files
    ├── tests/
    │   └── conftest.py                     # Setup pytest, marker --llm
    ├── entrypoint.sh                       # uvicorn (dev) / gunicorn (prod)
    ├── Dockerfile
    ├── dev.Dockerfile
    └── pyproject.toml
```

---

## 10. Variables de Entorno

### Secretos — requieren valor real (`.env.secrets`)

```env
GOOGLE_MAPS_API_KEY=          # Google Maps Places API v2 + Geocoding API
OPENAI_API_KEY=               # API key de OpenAI (provider LLM por defecto)

# Opcional — para usar AWS Bedrock en lugar de OpenAI, descomenta:
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION_NAME=eu-west-1
```

### Configuración — valores por defecto funcionales (`.env.defaults`)

```env
# Modelos LLM (via LiteLLM)
# Provider canónico: OpenAI gpt-4o-mini. Para cambiar a Bedrock/Azure/
# Anthropic, sobreescribe estos tres en .env.secrets (p.ej.
# bedrock/openai.gpt-oss-120b-1:0) — la capa LiteLLM hace el resto.
LITELLM_MODEL=openai/gpt-4o-mini
LITELLM_FALLBACK_MODEL=
PIPELINE_LITELLM_MODEL=openai/gpt-4o-mini
PIPELINE_LITELLM_FALLBACK_MODEL=
AGENT_LITELLM_MODEL=openai/gpt-4o-mini
AGENT_LITELLM_FALLBACK_MODEL=
LITELLM_MAX_WORKERS=5
LITELLM_TIMEOUT=30

# Base de datos PostgreSQL
POSTGRES_DB=geoassets
POSTGRES_USER=geoassets
POSTGRES_PASSWORD=geoassets

# Redis
REDIS_TTL_SECONDS=86400       # 24h de caché por empresa

# Pipeline Maps
MAPS_MAX_QUERY_BUDGET=50
MAPS_MAX_RESULTS_PER_QUERY=20
MAPS_KEYWORDS_PER_CATEGORY=8
MAPS_MAX_CONCURRENT_REQUESTS=10

# Pipeline Documento
UPLOAD_MAX_SIZE_MB=25
DOC_EXTRACTION_MAX_CONCURRENCY=8
DOC_GEOCODE_MAX_CONCURRENCY=8
DOCLING_NUM_THREADS=4
DOCLING_PDF_OCR=false         # OCR para PDFs imagen (más lento)

# Pipeline Agente
AGENT_MAX_DURATION_SECONDS=120
AGENT_MAX_FILES=5
AGENT_MAX_ITERATIONS=15

# Scoring
CONFIDENCE_THRESHOLD_HIGH=0.65
CONFIDENCE_THRESHOLD_MEDIUM=0.35

# Servidor
BACKEND_DEBUG=false
BACKEND_NUM_WORKERS=1
```

---

## 11. Puesta en Marcha

### Requisitos previos

- Docker + Docker Compose
- Credenciales de Google Maps API (Places + Geocoding activadas)
- API key de OpenAI (provider LLM por defecto)
  - *Alternativa*: credenciales AWS con acceso a Bedrock en `eu-west-1` si prefieres ese proveedor (sobreescribir modelos en `.env.secrets`).

### Con Docker (recomendado)

```bash
# 1. Copiar plantilla de secretos y rellenar con valores reales
cp .env.secrets_defaults .env.secrets
# Editar .env.secrets con GOOGLE_MAPS_API_KEY y OPENAI_API_KEY

# 2. Arrancar (producción)
./run.sh

# 3. Arrancar (desarrollo, hot-reload, puertos expuestos)
./run.sh --dev

# 4. Parar
./run.sh --down
```

**Accesos:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000` (solo en modo dev)
- Swagger docs: `http://localhost:8000/docs` (solo en modo dev)

### Desarrollo sin Docker (backend)

```bash
cd backend
uv sync
BACKEND_DEBUG=true uv run uvicorn app.main:app --reload
```

### Desarrollo sin Docker (frontend)

```bash
cd frontend
bun install
bun run dev        # Dev server en http://localhost:3000
```

---

## 12. Ciclo de Vida del Desarrollo de IA Generativa

En cumplimiento de los requisitos del TFM, el proyecto sigue las fases establecidas del ciclo de vida de IA generativa:

### 12.1 Definición del Problema y Casos de Uso
- Identificación de la tarea: extracción y estructuración de información geoespacial empresarial desde tres fuentes heterogéneas.
- Definición de métricas de éxito: precision/recall de activos identificados vs. ground truth manual.
- Establecimiento de criterios de calidad mínimos por caso de uso y fuente.

### 12.2 Selección y Diseño del Modelo
- LLM de propósito general: OpenAI `gpt-4o-mini` para los 3 pipelines (filtrado/clasificación Maps, extracción documental y agente CrewAI). Elegido por relación coste/latencia/calidad en tareas estructuradas con esquema JSON.
- Abstracción multi-proveedor vía LiteLLM: cambiar a AWS Bedrock (`bedrock/openai.gpt-oss-120b-1:0`, `bedrock/eu.anthropic.claude-haiku-4-5-...`), Azure OpenAI o Anthropic directo sólo requiere sobreescribir `LITELLM_MODEL`, `AGENT_LITELLM_MODEL` y `PIPELINE_LITELLM_MODEL` en `.env.secrets`, sin tocar código.
- Diseño de prompts: prompt engineering con esquema JSON estricto, ejemplos few-shot y versioning en `.yaml`.
- Agente autónomo con CrewAI + herramientas especializadas (búsqueda web + descarga validada).

### 12.3 Preparación de Datos
- Limpieza y normalización de resultados crudos de Google Maps (deduplicación por `place_id`).
- Deduplicación cross-chunk en el pipeline de documentos (nombre, dirección, coordenadas).
- Validación de relevancia de documentos en el agente (nombre empresa + densidad de keywords).

### 12.4 Desarrollo e Implementación
- Prompt versioning en ficheros `.yaml` bajo `app/prompts/v1/`.
- Tres pipelines modulares e independientes: cada paso es testeable aisladamente.
- Paralelismo controlado con semáforos para no superar rate limits de APIs externas.
- Streaming SSE en todos los pipelines para retroalimentación en tiempo real al usuario.

### 12.5 Evaluación y Validación
- Validación funcional end-to-end del sistema sobre empresas reales (Inditex, Repsol, Iberdrola, Mercadona) cubriendo los 3 pipelines, el dashboard, el detalle de scoring y la exportación.
- Inspección manual del `confidence_score` y `confidence_tier` para verificar la calibración del scoring sobre activos conocidos.
- Infraestructura de tests preparada (`backend/tests/conftest.py` con setup pytest); la suite de tests unitarios automatizados con pytest queda como línea de mejora pendiente, junto al cálculo numérico de precision/recall sobre un ground truth público.

### 12.6 Despliegue y Monitorización
- Contenerización completa con Docker Compose (4 servicios).
- Build automatizado con AWS CodeBuild.
- Caché Redis con TTL configurable por empresa (evita recómputo en accesos repetidos).
- Health checks automáticos de PostgreSQL y Redis antes de arrancar el backend.

### 12.7 Mejora Continua
- Registro de versiones de prompts con control de versiones Git.
- Parámetros de scoring y umbrales de confianza configurables vía variables de entorno sin redeployment.
- Tres fuentes de datos combinables para aumentar cobertura en empresas con poca presencia digital.

---

## 13. Limitaciones Conocidas y Consideraciones

1. **Cobertura de Google Maps:** Google Maps no garantiza la indexación completa de activos industriales o logísticos en zonas rurales. Empresas de sectores primarios o con activos muy dispersos pueden tener cobertura inferior.

2. **Rate limits:** La Google Maps Places API tiene cuotas por proyecto. Para análisis de muchas empresas consecutivas se recomienda implementar cola de trabajos.

3. **Alucinaciones LLM:** Los LLMs pueden clasificar incorrectamente lugares ambiguos o extraer activos inexistentes de documentos. El score de confianza mitiga esto, pero no lo elimina. Se recomienda revisión humana para activos con confianza LOW.

4. **Geocodificación por defecto:** Activos extraídos de documentos sin información de localización suficiente se asignan a Madrid (40.4168, -3.7038) como fallback, con `coordinate_source: "default"` y score reducido.

5. **Actualización de datos:** Los resultados se cachean 24 horas por defecto. Usar `force_refresh: true` para forzar un nuevo análisis.

6. **Empresas sin presencia digital:** El pipeline Maps está optimizado para empresas con perfil en Google Business. Microempresas sin presencia verificable pueden no aparecer; el pipeline de documentos es más adecuado en esos casos.

7. **Coste de API:** Cada análisis completo genera entre 50–200 llamadas a Google Maps y 10–30 llamadas a LLMs. El pipeline de documento genera llamadas adicionales a LLM por chunk. Se recomienda monitorizar el coste por empresa en producción.

8. **Documentos del agente:** El agente usa DuckDuckGo vía MCP server con límite de 1 req/s y fallback a Bing scraping. La disponibilidad de documentos públicos varía según la empresa. El timeout de 120 s puede interrumpir búsquedas de empresas con poca presencia online.

---

*Documento actualizado — versión 2.0 · Mayo 2026*
