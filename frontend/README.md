# Frontend

SPA del frontend de GeoAssets Intelligence. Stack:

- **Vue 3** (Composition API) + **TypeScript** + **Vite**.
- **Vuetify 3** + Material Design Icons para la UI.
- **Pinia** como store reactivo único.
- **Leaflet.js** + `leaflet.markercluster` para el mapa interactivo.
- **Bun** como package manager y dev server.
- **Axios** para HTTP y `EventSource` para SSE.

## Estructura

- `src/App.vue` — Raíz; gestiona la vista activa según `store.currentView`.
- `src/components/` — Componentes funcionales (SearchBar, ProcessingView, AssetMap, AssetSidebar, AssetPopup, AgentSearchView, AgentDocumentReviewView, Header).
- `src/stores/store.ts` — Store Pinia único de toda la app.
- `src/services/backend.ts` — Cliente Axios y consumo SSE.
- `src/types/types.ts` — Tipos TypeScript compartidos.
- `Dockerfile` / `dev.Dockerfile` / `nginx.conf` — Build de producción con Nginx y dev server con Bun.

## Desarrollo

Lo habitual es arrancar todo con `docker compose -f dev.docker-compose.yml up` desde la raíz del proyecto (hot-reload activado). Si quieres trabajar fuera de Docker, instala [Bun](https://bun.sh/docs/installation) y ejecuta:

```bash
bun install
bun run dev
```

Para la documentación funcional completa, ver el [README principal del proyecto](../README.md).