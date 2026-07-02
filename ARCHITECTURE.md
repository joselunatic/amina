# AMINA — Arquitectura del Sistema

## Descripción General

AMINA es una consola de vigilancia retrofuturista con tres capas:

1. **Capa de Control (DM)**: `/dm` — Panel protegido para el Director de Misión
2. **Capa de Agente**: `/agent` — Vista de jugador con mapa e overlays
3. **Capa de Proyector**: `/entropia` — Pantalla pública para sala (sin auth)

Todas se comunican vía **WebSocket centralizado** para despacho de efectos en tiempo real.

---

## Autenticación

### Flujo de sesión

1. Usuario llega a la **ruta de inicio** (`/`)
2. Terminal CRT de boot le presenta dos opciones:
   - **Field Operative**: entra como `agent` (requiere username + password)
   - **Sr. Verdad Access**: entra como `dm` (requiere DM_SECRET)
3. Servidor valida y crea cookie HttpOnly `amina.sid` con rol en `req.session`

### Protección

- `/dm` → `requireDmSession` middleware (verifica `req.session.role === 'dm'`)
  - Sin sesión DM válida: redirect a login o 401
  - Con sesión válida: sirve `dm.html`

- `/agent` → `requireAgentSession` middleware (verifica `req.session.role === 'agent'`)
  - Sin sesión: redirect a login
  - Con sesión: sirve `agent.html`

- `/entropia` → **Público**, sin protección (rol `screen` en WebSocket)

### WebSocket

Todos los roles se registran vía mensaje `hello`:
```json
{ "type": "hello", "role": "dm|agent|screen" }
```

El servidor valida:
- **`dm`**: requiere sesión DM válida
- **`agent`**: requiere sesión Agent válida, extrae `agentId`
- **`screen`**: sin validación (proyector público)

---

## Base de Datos

### Schema

**Tablas clave para efectos:**

| Tabla | Propósito |
|-------|-----------|
| `dm_presets` | Efectos guardados (nombre, categoría, payload) |
| `analysis_queue` | Análisis pendientes (label, result_effect, status) |
| `media_assets` | Archivos subidos (imagen, vídeo, audio) |
| `scenes` | Escenas (nombre, default_target) |
| `scene_beats` | Beats de escena (tipo, payload, delay, duration, target) |

**Tablas existentes:**
- `pois` — puntos de interés (ubicaciones, entidades)
- `entities` — personajes, organizaciones (BD principal de contexto)
- `messages` — broadcasts (SrVerdad → agentes)
- `chat_threads` — conversaciones privadas

### Archivos subidos

- Guardados en disco: `./uploads/` (UUID como filename)
- Servidos vía: `GET /uploads/<uuid>`
- Metadatos en BD: `media_assets` table

---

## WebSocket — Dispatch de Efectos

### Función `dispatchEffect(effect, payload, target, agentId)`

En `server.js`, ejecutada por:
1. Mensajes directos del DM (`data.type === 'effect'`)
2. POST a `/api/presets/:id/fire` (ruta REST)
3. POST a `/api/analysis/:id/complete` (ruta REST)
4. Timeline de escenas (autoplay on server)

**Targetting:**

```javascript
if (target === 'all') {
  // Broadcast a todos los agentes + pantalla
  agentClients.forEach(ws => ws.send(...))
  screenClients.forEach(ws => ws.send(...))
} else if (target === 'agents') {
  agentClients.forEach(ws => ws.send(...))
} else if (target === 'screen') {
  screenClients.forEach(ws => ws.send(...))
} else if (target === 'agent' && agentId) {
  // Solo el agente especificado
  agentClients.get(agentId).send(...)
}
```

### Formato de mensaje

```json
{
  "type": "effect",
  "effect": "GLITCH|FILE_RECOVERY|SIGNAL_TRIANGULATION|...",
  "payload": {
    "title": "...",
    "body": "...",
    "lng": -76.26,
    "lat": 40.70,
    "duration": 8000,
    "...": "efecto-específico"
  }
}
```

---

## Frontend — Handlers de Efectos

### `agent.js` / `entropia.js`

Ambos escuchan WebSocket e implementan `handleEffect(effect, payload)`:

```javascript
switch (effect) {
  case 'GLITCH': /* distorsión RGB */ break;
  case 'FOCUS_INCIDENT': /* fly-to en mapa */ break;
  case 'FILE_RECOVERY': showFileRecovery(payload); break;
  case 'SIGNAL_TRIANGULATION': showSignalTriangulation(payload); break;
  case 'INTERCEPTED_TRANSMISSION': showInterceptedTransmission(payload); break;
  case 'CORRELATION_REVEAL': showCorrelationReveal(payload); break;
  case 'MEMBRANA_SET': applyMembranaStatus(payload); break; // solo entropia.js
  case 'SCENE_CARD': showCard(payload); break;
  // ... 20+ efectos más
}
```

### Efectos narrativos especiales

- **`INTERCEPTED_TRANSMISSION`** — Overlay ámbar con forma de onda animada (28 barras) y transcripción línea a línea. Payload: `{ source, frequency, lines: [], lost: [índices], audio_url?, duration }`. Las líneas en `lost` se renderizan como "▓▓▓ SEÑAL PERDIDA ▓▓▓".
- **`CORRELATION_REVEAL`** — Overlay rojo que conecta 2-4 nodos con líneas animadas en secuencia y remata con sello de coincidencia. Payload: `{ title?, nodes: [], confidence?, source?, duration }`.
- **`MEMBRANA_SET`** — Solo `entropia.js`. Payload: `{ status: 'INTACT'|'FRAYED'|'TORN' }`. Actualiza HUD + home (etiquetas en español vía `MEMBRANA_LABELS`) y aplica clase `membrana-frayed`/`membrana-torn` al `<body>` (parpadeo ambiental persistente vía `::after`).
- **`ENTITY_DOSSIER`** — Ficha de expediente. Payload genérico: `{ title, classification?, stamp?, image_url?, fields: [{label, value?, redacted?}], summary?, threat_level?, voice?, confidence?, source?, duration }`. La consola DM lo construye desde una entidad real (`buildDossierPayload` en `dm.js`) — `dm_notes` y `unlock_code` nunca entran en el payload; el nombre real sale `redacted` salvo opt-in. "Proyectar Conexiones" consulta `/api/dm/entities/:id/context` y lanza un `CORRELATION_REVEAL` con los `to_code_name` de las relaciones.
- **Acciones rápidas de POI** — En la sección POI de la tab Efectos: `#poi-triangulate` lanza `SIGNAL_TRIANGULATION` sobre las coordenadas reales del POI (precisión aleatoria 55-90%); `#poi-alert` lanza `LABEL_PING` + `SCENE_CARD` (voz alert) con nombre y coordenadas del POI.

### Estilos de voz (SCENE_CARD)

Las tarjetas de texto aceptan campos opcionales `confidence` (número) y `source` (texto) que se muestran como pie de fiabilidad (`.card-meta`): "CONFIANZA: 62% · FUENTE: ARCHIVO SELLADO". La fiabilidad mostrada es narrativa — el DM decide si es verdad.

Además soportan 5 "voces" visuales:

```css
.card-voice-ov         /* Verde oficial, tipografía rígida */
.card-voice-intercepted /* Ámbar, bordes inestables */
.card-voice-corrupted  /* Gris, glitch */
.card-voice-alert      /* Rojo pulsante */
.card-voice-human      /* Verde suave, itálica */
```

Aplicadas vía: `cardOverlay.classList.add('card-voice-' + payload.voice)`

---

## Panel DM — Arquitectura

### Tabs

1. **Efectos** (`#tab-effects`)
   - Controles rápidos (camera, blackout, POI, tarjetas)
   - 12 botones preconfigurados → `sendEffect(evt.effect || 'SCENE_CARD', ...)` (los eventos rápidos pueden declarar `effect` + `payload` arbitrarios)
   - Control de membrana: 3 botones → `sendEffect('MEMBRANA_SET', { status }, 'screen')` (`sendEffect` acepta un tercer parámetro que fuerza el target ignorando el selector)
   - Mapa de operaciones (click → rellena focus-coords)

2. **Media** (`#tab-media`)
   - Drag-drop upload → `/api/media` (multer)
   - Grid de assets → botones de lanzamiento
   - Delete → borrado de archivo en disco

3. **Escenas** (`#tab-scenes`)
   - Crear escenas (nombre + target)
   - Añadir beats (tipo, payload, delay, duration, target)
   - Reproductor: Play → autoplay on server via WS `scene-control`
   - **Coord Picker (panel lateral)**:
     - Mapa lazy-loaded, solo al abrir tab
     - Click → inyecta lng/lat en payload textarea
     - Preview visual según tipo de efecto
     - Toggle INICIO/FIN para SWEEP_AREA

4. **Intel** (`#tab-intel`)
   - **Presets**: CRUD de efectos guardados
   - **Análisis**: CRUD de análisis pendientes
   - Filtro por categoría (presets)
   - Botón "Disparar" → complete + lanza efecto

5. **Ayuda** (`#tab-help`)
   - Documentación en lenguaje usuario
   - Sin jerga técnica, solo explicación funcional

### Estado global (`dm.js`)

```javascript
const state = {
  ws: null,           // WebSocket connection
  agents: [],         // Lista de agentes conectados
  pois: [],           // POIs para seleccionar
  scenes: [],         // Escenas guardadas
  activeSceneId: null,// Escena en edición
  currentBeats: [],   // Beats de escena activa
  coordPickerMap: null,      // Mapa interactivo lateral
  coordPickerCallback: null, // Inyección de coords
  // ...
};
```

---

## Escenas y Autoplay

### Flujo

1. DM abre tab Escenas, crea escena + beats
2. Pulsa **Play** → WS message `{ type: 'scene-control', action: 'play', sceneId }`
3. Servidor recibe, carga beats de BD
4. Inicia `advanceBeat()` (recursive setTimeout)
5. Cada beat:
   - Espera `delay_ms`
   - Llama `dispatchEffect(beat.type, payload, target)`
   - Espera `duration_ms` antes del siguiente

### Campos de beat

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `type` | string | `FOCUS_INCIDENT`, `SCENE_CARD`, etc. |
| `payload` | JSON string | `{"lng":-76.26,"lat":40.70}` |
| `delay_ms` | int | `500` (espera antes de ejecutar) |
| `duration_ms` | int | `3000` (cuánto permanece activo) |
| `target` | string | `inherit`, `all`, `agents`, `screen`, `agent` |
| `label` | string | Descripción privada (para el DM) |

---

## Presets

### Flujo de guardado

1. DM abre tab Intel → Presets
2. Rellena: nombre, categoría, tipo efecto, payload JSON
3. Click "Guardar" → POST `/api/presets`
4. Backend valida JSON, inserta en BD
5. DM ve lista actualizada, filtrable por categoría

### Lanzamiento

Click "▶ Lanzar" → POST `/api/presets/:id/fire`
- Backend carga preset de BD
- Llama `dispatchEffect(effect, payload, target)`
- Efecto aparece en agentes/pantalla al instante

---

## Análisis Pendientes

### Estados

- **pending**: mostrado en consola del agente como badge ámbar
- **complete**: badge verde, análisis finalizado
- **reset**: vuelve a pending (para reusar)

### Flujo narrativo

1. Agentes encuentran pista → DM crea análisis:
   ```
   Label: "VOICEPRINT ANALYSIS" (público)
   Descripción: "grabación de Victoria Allen" (privado)
   Resultado: SCENE_CARD
   Payload: { title: "MATCH FOUND", body: "CONFIDENCE 87%", voice: "ov" }
   ```

2. Análisis aparece en pendientes, los agentes ven badge "PENDIENTE"

3. DM espera 20 minutos (momento narrativo tenso)

4. DM pulsa "⚡ Disparar" → POST `/api/analysis/:id/complete`
   - Backend lanza el efecto vía `dispatchEffect()`
   - Análisis pasa a "COMPLETADO"
   - Agentes ven tarjeta de resultado

---

## Pantalla Entropia

### Particularidades

- **Sin auth** (rol `screen`)
- **Sin controles** (botones ocultos)
- **HUD ambiental** permanente:
  - Reloj (actualiza cada 1s)
  - Código de incidente aleatorio (INC-XXXX-XX)
  - Estado de membrana (INTACT/FRAYED/TORN)
  - Ticker scrolling (TICKER_MESSAGES array)
  - Coordenadas del mapa (update on pan)
  - Signal indicator + logo AMINA
  
- **Scanlines CSS** para efecto CRT (overlay semitransparente)

- **Reconexión automática** si WS cae (setTimeout 3s)

---

## Coord Picker — Interactividad

### Inicialización

- Lazy-loaded al abrir tab Escenas
- `initCoordPickerMap()` crea Mapbox en `#coord-picker-map`
- Añade marcadores POI como referencia semitransparente
- Registra listener `state.coordPickerMap.on('click', handleCoordPickerClick)`

### Inyección de coordenadas

Al click en el mapa:
1. `handleCoordPickerClick(lng, lat)` captura coords
2. Actualiza display: `"LNG: -76.229030  LAT: 40.680000"`
3. Llama `state.coordPickerCallback(lng, lat)` (si registrado)
4. Callback inyecta en payload textarea según tipo:
   ```javascript
   injectCoordsIntoPayload(payloadStr, type, lng, lat)
   ```

### Preview visual

`updateCoordPickerPreview(type, payloadStr)` dibuja:
- **FOCUS_INCIDENT**: Marcador verde en posición
- **SWEEP_AREA**: Rectángulo con esquinas A (verde) y B (rojo)
- **SIGNAL_TRIANGULATION**: Marcador + círculo pulsante
- **LABEL_PING**: Marcador ámbar con texto
- **HEATMAP_SET**: N marcadores rojos numerados

---

## Estructura de archivos

```
amina/
├── public/
│   ├── dm.html              ← Panel DM (protegido por /dm ruta)
│   ├── agent.html           ← Vista de agente
│   ├── entropia.html        ← Pantalla de proyector
│   ├── dm.js                ← Lógica tabs, media, escenas, intel
│   ├── agent.js             ← WebSocket + handlers de efectos
│   ├── entropia.js          ← Idem agente (sin auth)
│   ├── dm.css               ← Estilos tabs + coord picker
│   ├── agent.css            ← Overlays + efectos visuales
│   ├── entropia.css         ← HUD + scanlines + overlays
│   └── amina-tokens.css     ← Tokens de diseño compartidos (voces, paneles, tipografía) — cargado ANTES de entropia.css/dm.css
├── src/
│   ├── app.js               ← Express app, rutas protegidas
│   ├── routes/
│   │   ├── media.js         ← POST /api/media (upload)
│   │   ├── scenes.js        ← CRUD escenas + beats
│   │   ├── presets.js       ← CRUD presets + fire
│   │   ├── analysis.js      ← CRUD análisis + complete
│   │   └── auth.js          ← Autenticación
│   └── middleware/
│       └── auth.js          ← requireDmSession, etc.
├── uploads/                 ← Archivos subidos (ignorados en git)
├── schema.sql               ← DDL de tablas
├── db.js                    ← Funciones CRUD SQLite
├── server.js                ← WebSocket + sceneState + dispatchEffect
└── sessions.sqlite          ← BD de sesiones (ignorada)
```

---

## Orden de carga (frontend)

### `dm.html`
1. Carga `dm.js` (type="module")
2. `dm.js` → importa módulos, `main()` inicia:
   - `connectWebSocket()` → registra rol `dm`
   - `initTabs()` → tab switching
   - `loadPois()`, `loadMedia()`, `loadScenes()`, etc.
   - `bindMediaEvents()`, `bindPresetsEvents()`, `bindAnalysisEvents()`
   - `initializeDmMap()` → mapa de operaciones
   - **Coord picker cargado lazy** al abrir tab Escenas

### `agent.html`
1. Carga `agent.js` (type="module")
2. `agent.js` → `main()` inicia:
   - `connectWebSocket()` → registra rol `agent` + agentId
   - `initializeMap()` → mapa principal
   - WebSocket listener para efectos

### `entropia.html`
1. Carga `entropia.js` (type="module")
2. Similar a agent pero:
   - `connectWebSocket()` → registra rol `screen`
   - `initializeHUD()` → reloj, ticker, membrana, etc.
   - Sin agentId, sin controles de usuario

---

## Ciclo de vida de un efecto

### Caso: DM lanza preset

1. **UI**: Click "▶ Lanzar" en preset
2. **HTTP**: POST `/api/presets/:id/fire`
3. **Backend**:
   - `registerPresetsRoutes()` → middleware `requireDm`
   - Carga preset de BD
   - Llama `realtimeHooks.dispatchEffect(effect, payload, target)` (closure)
   - `server.js:dispatchEffect()` enruta a clientes:
     - Si `target=all`: envía a agentClients + screenClients
4. **Frontend**:
   - WebSocket recibe `{ type: 'effect', effect, payload }`
   - `handleEffect(effect, payload)` → elige handler
   - Handler renderiza overlay/modificación del mapa
   - Efecto visible en pantalla de agente(s) y/o proyector

### Caso: Escena en autoplay

1. **UI**: DM pulsa "▶ Play" en escena
2. **WS**: DM envía `{ type: 'scene-control', action: 'play', sceneId }`
3. **Backend**:
   - Valida sesión DM
   - `db.getSceneBeats(sceneId)`
   - Inicializa `sceneState`, llama `advanceBeat()`
   - Cada beat: setTimeout → `dispatchEffect()` → broadcast a agentes/pantalla
4. **Frontend**:
   - Recibe efectos en orden, con delays
   - Renderiza según tipo

---

## Ciclo de vida de un análisis

1. **DM crea análisis** en tab Intel:
   - Label (público): "VOICEPRINT ANALYSIS"
   - Descripción (privado): "grabación Victoria"
   - Result effect: "SCENE_CARD"
   - Result payload: `{ title, body, voice }`

2. **BD**: Inserta en `analysis_queue` con `status='pending'`

3. **Agentes ven**: Badge "PENDIENTE" en consola (implementación futura en agent.js)

4. **DM pulsa "⚡ Disparar"**: POST `/api/analysis/:id/complete`
   - Backend: Carga análisis, lanza result effect vía `dispatchEffect()`
   - Actualiza status a `complete`
   - Efecto apareció en agentes

5. **Opcionalmente**: DM puede "Reabrir" (reset a pending) para reusar

---

## Notas de seguridad

- **`DM_SECRET`**: Shared secret para boot. NO es para prod.
- **WebSocket sin auth adicional**: Confiamos en la sesión HTTP.
- **Uploads**: Sin validación de contenido (SVG/XSS posible). Usar HTTPS en prod.
- **Sesiones**: HttpOnly cookies, 10 años de TTL (ajustable en env).
