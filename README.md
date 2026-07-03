# AMINA — Análisis de Misiones e Investigación de Nuevas Amenazas

AMINA is a retro-futuristic surveillance console for Ordo Veritatis DMs running *The Esoterrorists* in Schuylkill County. It unifies POI intelligence, entity dossiers, real-time effects, and DM-only controls behind a neon CRT interface so you can narrate the membrane, coordinate agents, and run live projections during play.

## Features
- **Three-tier UI**: DM control panel (`/dm`), agent field console (`/agent`), public projector screen (`/entropia`)
- **Real-time WebSocket effects engine**: dispatch narrative events (cards, overlays, HUD updates) to all players simultaneously
- **Entity dossiers**: project classified intel on campaign entities with optional redaction, confidence ratings, and source attribution
- **Map-based POI management**: 71 pre-seeded locations in Schuylkill County; DM can create, edit, delete, and attach images
- **Narrative tools**: presets, scene timelines, analysis queue, media library (image, video, audio)
- **Express + SQLite backend**: REST API for POIs, entities, media, scenes, and analysis tools
- **Design token system** (`amina-tokens.css`): unified color palette across all interfaces (5 narrative voices, accessibility tokens)
- **Neon CRT/X-Files aesthetic**: retro scanlines, viñettes, algorithm background, HUD + CRT boot terminal

## Requirements
- Node.js 18+
- npm
- Mapbox account (access token)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill it out:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and set:
   - `MAPBOX_PUBLIC_TOKEN=pk.yourPublicMapboxToken` (preferred, must be a public `pk.*` token)
   - Optional legacy fallback: `MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_ACCESS_TOKEN_HERE`
   - `MAPBOX_STYLE_URL=mapbox://styles/joselun/cmi3ezivh00gi01s98tef234h` (or your own Mapbox Studio style)
   - `DM_SECRET=someStrongSharedSecret`
   - Optional `PORT=3000` (this branch defaults to `3002` so it can run alongside the production console on `3001`)
   - Optional `DEBUG=true` to stream backend and UI debug logs (shows a debug console panel)

> **Important:** Never commit your real token or DM secret.

## Database
- The first `npm start` run creates `schuylkill.db` (ignored by git) and applies `schema.sql`.
- If the `pois` table is empty, it automatically seeds the atmospheric locations listed in `schema.sql`/`db.js`.
- The schema includes an optional `image_url` column so each POI can reference an external image (served from any HTTPS host).

## Running
```bash
npm start
```
> **Branch note:** This feature branch defaults to port `3002` to avoid colliding with the production console running on `3001`.

Visit [http://localhost:3002](http://localhost:3002) to access the AMINA console. The CRT boot terminal greets you with two modes:
- **Field Operative** (player view)
- **DM Command Access** (requires the DM clearance code)

## Test troubleshooting
- If `playwright` or `npm run test:e2e` hangs, use `docs/playwright-troubleshooting.md`.
- Current primary verification (temporary while e2e is unstable in this environment): `npm run test:api-contracts`.
- UI e2e remains complementary: `npm run test:e2e`.

## Usage
### Player View
- Choose **Field Operative** during the boot sequence, select an agent and enter their password to enter the normal view.
- Map centers on Schuylkill County using your configured Mapbox Studio style (or the default dark style).
- The list on the left can filter by category and session tag.
- Clicking a POI in the list or on the map opens its popup with public intel.

### Amenaza en el mapa (pips)
- Cada PdI dibuja pips (microdots) alrededor del icono según `threat_level` (1..5).
- Los clusters usan el máximo `threat_level` del grupo para definir el anillo de pips.
- Ajustes de tamaño/opacidad por zoom, `minzoom` y geometría de pips en `public/app.v2.js` (funciones `createPipImageData` y `ensurePoiLayers`).
- Escalado actual PDIs: icono base `icon-size` ~0.8@z9 → 1.35@z14, pips `icon-size` ~1.15@z9 → 1.9@z14, anillo de presencia `circle-radius` ~13@z9 → 21@z14.
- Fallback de iconos: `icon_name` se resuelve como específico → categoría → `pdi-unknown`; iconos generados por canvas en `ensurePoiImages`.
- Iconos disponibles: `pdi-base`, `pdi-crime`, `pdi-cell`, `pdi-town`, `pdi-industrial`, `pdi-natural`, `pdi-npc`, `pdi-rumor`, `pdi-unknown`.
- Ajustes de tamaño/opacidad por zoom están en `public/app.v2.js` dentro de `ensurePoiLayers()` y el tamaño del asset en `createPipCanvas()`.

### Sr. Verdad Access (DM Command Layer)
1. From the boot terminal choose **Sr. Verdad Access** and submit the clearance code (same as the old DM secret). You can later hit the **Change Clearance** button on the control panel to re-open the boot overlay and switch roles.
1. Enter the shared secret en el boot overlay (se valida una vez y se guarda la sesión del DJ en cookie HttpOnly; no se expone el secreto al frontend).
2. DM-only tools appear:
   - Form to create POIs (or edit/delete existing ones).
   - Image URL field so you can attach an external illustration per POI.
   - "Pick from map" button fills latitude/longitude by clicking on the map.
   - Popups and the list reveal `dm_note` content.
   - **Message console**: craft retro messages with From/To/Subject/Body for PNJs; they show up for Field Operatives.
   - **Filters** allow Sr. Verdad to review all dispatches by agent, session tag or date.
4. Click **Edit** on a POI to load it into the form, change data, then submit to save.
5. **Delete** prompts for confirmation before removing the POI.
6. Exit Sr. Verdad access to hide sensitive data or re-enter with a different secret.

If the backend rejects the secret (`401 Unauthorized`), a red warning appears, the stored secret is purged, and DM actions are disabled until the correct secret is entered again.

## API Overview
- `GET /api/pois` (optional `category`, `session_tag` query params)
- `GET /api/pois/:id`
- `POST /api/auth/dm` *(requires `x-dm-secret` header, crea sesión de DJ en cookie HttpOnly)*
- `GET /api/auth/me` *(devuelve rol actual: guest/agent/dm)*
- `POST /api/auth/logout` *(cierra sesión y limpia la cookie)*
- `GET /api/auth/agents` *(returns the list of field agents that can log in locally)*
- `POST /api/auth/agent` *(checks field agent username + password y crea sesión de agente)*
- `GET /api/messages` *(returns latest broadcast messages for agents)*
- `POST /api/messages` *(creates a new message; requires `x-dm-secret` header)*
- `GET /api/event-ticker` *(serves OV ticker items for the footer scroller)*
- `POST /api/pois` *(requires `x-dm-secret` header)*
- `PUT /api/pois/:id` *(requires `x-dm-secret` header)*
- `DELETE /api/pois/:id` *(requires `x-dm-secret` header)*

All responses are JSON and include `dm_note` and `image_url`; the frontend decides when to display sensitive or visual data.

## Notes
- This is not production-ready security—`DM_SECRET` is a light-duty shared secret for table use.
- Keep `.env` and `schuylkill.db` out of source control.
- Customize `public/favicon.ico` or styling assets as desired.
### Agent credentials
- Default field agents:
  - `pike` / `amarok` (Howard Pike)
  - `allen` / `amarok` (Victoria Allen)
- These usernames appear in the **Field Operative** flow; enter their password to authenticate.

## Real-Time Effects System

AMINA includes a complete real-time effects engine with WebSocket dispatch, in-game overlays, and narrative tools for the DM.

### Three Views

| View | URL | Auth | Purpose |
|------|-----|------|---------|
| **Consola DM** | `/dm` | ✓ Requiere sesión DM | Control panel: lanzar efectos, gestionar escenas, repositorio de media |
| **Vista Agente** | `/agent` | ✓ Requiere sesión Agente | Mapa + overlays: recibe efectos en tiempo real |
| **Pantalla Entropia** | `/entropia` | ✗ Pública (proyector) | Proyector de sala: mapa + HUD ambiental, sin controles |

### Consola DM (`/dm`) — Tabs

1. **Efectos**: 
   - 12 botones rápidos (glitch, ruido, tarjeta de escena, etc.)
   - Control de membrana (Intacta → Debilitada → Rota; visible en `/entropia`)
   - Mapa de operaciones: click → rellena coordenadas para efectos de cámara
   - **Panel de expedientes**: selector de 71 entidades BD, opciones de redacción, selector de voz narrativa
   - **Proyectar ficha**: visualiza entidad clasificada en proyector (censura automática de campos dm_notes)
   - **Quick-actions de POI**: triangular ubicación de entidad, lanzar alerta con nombre + coords

2. **Media**: Repositorio de imágenes, vídeos y audio. Drag-drop upload. Descripción, borrado, lanzamiento directo desde la consola.

3. **Escenas**: Constructor de timelines. Crea escenas con N beats. Cada beat: efecto + delay + duración + target. Reproductor: Play, Pause, Next, Prev, Stop. Exporta/Importa JSON.
   - **Coord Picker (panel lateral)**: Mapa interactivo. Click → inyecta coords. Vista previa según tipo de efecto.

4. **Intel**: 
   - **Presets**: Guarda efectos completos. Categorízalos, dispara con un click.
   - **Cola de Análisis**: Crea análisis "pendientes" (estados: pendiente → procesando → completado). Dispara resultado cuando narrativamente encaja.

5. **Ayuda**: Guía completa en lenguaje jugador. Sin jerga técnica.

### Targets (destinatarios)

Cada efecto elige a quién llega:
- **Todos**: jugadores + proyector
- **Solo jugadores**: solo `/agent`
- **Proyector**: solo `/entropia`
- **Jugador X**: privado (solo ese agente)

### Pantalla Entropia (`/entropia`)

Pública (sin auth). Pensada para el proyector de sala.
- Mapa de Schuylkill County en pantalla completa
- HUD ambiental: reloj, código de incidente, estado AMINA, ticker
- Recibe efectos en tiempo real (misma infraestructura que agentes)
- Cero controles visibles, solo visualización
- Reconexión automática si cae

### Efectos disponibles

**Visuales**: Glitch, Ruido, Viñeta, Pantalla negra, Recuperación de archivo (barra progreso + líneas censuradas)

**Cámara & Mapa**: Sacudida, Enfocar posición, Mostrar área rectangular, Etiquetas flotantes, Heatmap

**Multimedia**: Imagen fullscreen, Vídeo, Audio, CCTV (efecto cámara de vigilancia)

**Tarjetas narrativas**: `SCENE_CARD` con 5 estilos de voz (OV oficial, interceptada, corrupta, alerta, humano). Incluye opcionales `confidence` y `source` → pie de fiabilidad ("CONFIANZA: 62% · FUENTE: ARCHIVO SELLADO")

**Transmisiones**: `INTERCEPTED_TRANSMISSION` — forma de onda animada + transcripción parcial con líneas perdidas + audio opcional

**Análisis**: `CORRELATION_REVEAL` — nodos conectados revelándose + % coincidencia + fuente; `SIGNAL_TRIANGULATION` — coords precisas + barras de fuerza pulsantes

**Fichas de expediente**: `ENTITY_DOSSIER` — proyecta entidad de BD con campos censurables, foto CLASIFICADO, resumen y pie de confianza. **Crítico de seguridad**: `dm_notes` e `unlock_code` nunca se envían a proyección (privado de DM)

**Estado de membrana**: `MEMBRANA_SET` (INTACT/FRAYED/TORN) — cambia el HUD del proyector, añade viñeta de distorsión persistente

**POI vivos**: Parpadeo, Resalte, Bloqueo visual, Ephemeral (temporal), Quick-actions desde DM (triangular coordenadas, lanzar alerta)

### API nuevos

**Media**:
- `GET /api/media` — lista assets
- `POST /api/media` — subir (multipart, DM-only)
- `PUT /api/media/:id` — editar descripción
- `DELETE /api/media/:id` — borrar

**Escenas**:
- `GET /api/scenes` — lista
- `POST /api/scenes` — crear
- `GET /api/scenes/:id` — detalle + beats
- `POST /api/scenes/:id/beats` — añadir beat
- `PUT /api/scenes/:id/beats/:id` — editar beat
- `DELETE /api/scenes/:id/beats/:id` — borrar beat
- `POST /api/scenes/:id/beats/reorder` — reordenar

**Presets**:
- `GET /api/presets?category=` — lista con filtro
- `POST /api/presets` — crear
- `PUT /api/presets/:id` — editar
- `DELETE /api/presets/:id` — borrar
- `POST /api/presets/:id/fire` — lanzar ahora vía WS

**Análisis**:
- `GET /api/analysis` — lista
- `POST /api/analysis` — crear
- `POST /api/analysis/:id/complete` — disparar resultado
- `POST /api/analysis/:id/reset` — reabrir completado
- `DELETE /api/analysis/:id` — borrar

**Entidades**:
- `GET /api/dm/entities` — lista todas las entidades (requiere sesión DM). Filtra `archived = false`
- Cada entidad: `id`, `name`, `real_name`, `photo_url`, `threat_level` (1..5 barras), `category`, `notes`, `dm_notes` (privado), `unlock_code` (privado)

Todos requieren sesión DM válida.

### Diseño visual y tokens

**Sistema de tokens** (`public/amina-tokens.css`):
- Unifica la paleta de color en proyector (`/entropia`) y consola DM (`/dm`)
- **5 voces narrativas**: OV oficial (`--v-ov` #12ff92), interceptada (`--v-intercepted` #ffb422), corrupta, alerta (`--v-alert` #ff3b30), humana, anomalía
- Cada voz incluye variantes RGB para efectos de opacidad en overlays
- **Tokens funcionales**: paneles, fondos, tinta, tipografía (JetBrains Mono + Saira Condensed)
- Cadencias de transición (`--t-fast`, `--t-slow`) para coherencia de animación
- Aplicado automáticamente: `/entropia` y `/dm` cargan `amina-tokens.css` antes de CSS propio

**Rediseño reciente** (Junio 2026):
- Claude Design profesionalizó home screen, overlays de fichas, transmisiones, correlaciones
- Mejora legibilidad a 3m (proyector); jerarquía en-vivo vs preparación en consola
- Todos los JS handlers (`entropia.js`, `agent.js`, `dm.js`) verificados y funcionales post-rediseño
- Sin regresiones: 71 entidades cargan, efectos disparan, WebSocket conecta

### Bases de datos

Nuevas tablas:
- `media_assets` — archivos subidos
- `dm_presets` — efectos guardados
- `analysis_queue` — análisis pendientes
- `scenes`, `scene_beats` — escenas y timelines

### WebSocket

Mensaje `effect`: `{ type: 'effect', effect, payload, target, agentId }`
Targets: `all` | `agents` | `screen` | `agent`

Rol `screen` se registra sin auth (proyector).
