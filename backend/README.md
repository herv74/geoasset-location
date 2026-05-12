# Backend — Guía de estructura

Backend FastAPI de GeoAssets Intelligence. La organización del código es:

- `app/` — Código de aplicación.
- `app/core/` — Configuración, paths y helpers transversales (`config.py`, `paths.py`).
- `app/api/` — Routers FastAPI agrupados por dominio: `companies.py`, `assets.py`, `documents.py`, `agent.py`.
- `app/db/` — Capa de persistencia: modelos SQLAlchemy (`AssetRecord`, `CompanyRecord`) y sesión async PostgreSQL.
- `app/pipeline/` — Orquestadores de los tres pipelines (Maps, Documento, Agente) y sus `steps/`.
- `app/prompts/v1/` — Prompts versionados en YAML (`filter_assets`, `enrich_asset`, `extract_doc_assets`, `geocode_assets`).
- `app/schemas/` — Modelos Pydantic genéricos para validación de request/response.
- `app/services/` — Integraciones externas: `google_maps`, `llm_client` (LiteLLM), `cache` (Redis), `document_parser` (Docling), `agent_search` (CrewAI + DDG MCP).
- `tests/` — Infraestructura de tests (`conftest.py`); suite específica pendiente.

Para la documentación funcional completa, ver el [README principal del proyecto](../README.md).