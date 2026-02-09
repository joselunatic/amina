# AMINA — Análisis de Misiones e Investigación de Nuevas Amenazas

AMINA is a retro-futuristic surveillance console for Ordo Veritatis DMs running *The Esoterrorists* in Schuylkill County. It unifies POI intelligence, map overlays, and DM-only controls behind a neon CRT interface so you can monitor the membrane in real time.

## Features
- Express + SQLite backend with REST API for managing POIs.
- Mapbox GL JS frontend showing markers, popups, and a filterable list.
- Sr. Verdad access (DM channel) guarded by a shared secret for creating, editing, deleting POIs (including optional reference images).
- Optional auto-seeded database packed with campaign-friendly locations.
- Neon CRT/X-Files aesthetic with AMINA insignia and CRT glow optimized for desktop control panels.

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
- API contract fallback (no browser UI automation): `npm run test:api-contracts`.

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
AMINA now includes a real-time effects system that allows a Game Master (DM) to trigger visual and narrative effects on players' (Agents) screens. This system uses WebSockets for instant communication.

### Architecture
- A WebSocket server is integrated into the main Node.js application.
- A dedicated DM control panel (`/dm.html`) sends effect commands.
- A dedicated Agent view (`/agent.html`) receives and renders these effects on a Mapbox map.

### Usage
1.  **Start the server** as usual:
    ```bash
    npm start
    ```
2.  **DM View**: The Game Master should open the control panel by navigating to [http://localhost:3002/dm.html](http://localhost:3002/dm.html). This page provides a list of connected agents and controls for all available effects.
3.  **Agent View**: Each player should open the agent view by navigating to [http://localhost:3002/agent.html](http://localhost:3002/agent.html). The page will automatically connect to the server and be ready to receive effects. Each agent is assigned a unique, persistent ID stored in a cookie.
# amina
