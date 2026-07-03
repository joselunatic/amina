# CHANGELOG — AMINA

Todos los cambios notables en el proyecto.

## [Sprint F - Junio 2026] - Visual Redesign & Entity Integration

### Agregado
- **Sistema de Tokens de Diseño** (`public/amina-tokens.css`)
  - Paleta unificada de color para proyector + consola DM
  - 5 voces narrativas (OV, interceptada, corrupta, alerta, humana, anomalía)
  - Tokens funcionales (paneles, fondos, tinta, tipografía JetBrains Mono + Saira Condensed)
  - Cadencias de transición estandarizadas

- **Ficha de Expediente** (`ENTITY_DOSSIER` effect)
  - Proyecta entidades de BD con foto, campos censurables, sello CLASIFICADO
  - **Seguridad crítica**: `dm_notes` e `unlock_code` se filtran automáticamente en `buildDossierPayload()`
  - Panel en consola DM para seleccionar entidad, voces, opciones de redacción
  - Animaciones escalonadas; soporta 71 entidades pre-cargadas

- **Quick-actions de POI desde DM**
  - Botón "Triangular": envía `SIGNAL_TRIANGULATION` con coords de entidad
  - Botón "Alerta": envía `LABEL_PING` + `SCENE_CARD` con nombre + coords de POI
  - Precision: 55-90% (aleatorio; realismo de triangulación)

- **Overlays Mejorados** (en ambas vistas: `/entropia` y `/agent`)
  - Transmisión interceptada: forma de onda animada, líneas perdidas, frecuencia
  - Correlación anómala: nodos conectándose, % coincidencia, fuente
  - Recuperación de archivo: barra progreso, líneas censuradas
  - Todos usan tokens de voz para coherencia cromática

- **API `/api/dm/entities`**
  - GET: lista entidades no archivadas (requiere sesión DM)
  - Devuelve: id, name, real_name, photo_url, threat_level (1..5 barras), category, notes
  - Filtra automáticamente: dm_notes, unlock_code nunca en respuesta

### Modificado
- **`entropia.html`, `entropia.css`, `entropia.js`**
  - Añadido overlay `#dossier-overlay`, `#transmission-overlay`, `#correlation-overlay`
  - Nuevas clases: `.dossier-*`, `.transmission-*`, `.correlation-*` (26/27 críticas presentes)
  - Handlers: `showEntityDossier()`, `hideEntityDossier()`, casos en `handleEffect()`
  - Importa `amina-tokens.css` ANTES de `entropia.css`

- **`agent.html`, `agent.js`, `agent.css`** (mirrors de entropia)
  - Cambios idénticos (simetría proyector/agente)

- **`dm.html`, `dm.css`, `dm.js`**
  - Nuevo panel "Proyectar Expediente": selector de 71 entidades, checkboxes redacción, selector voz
  - Botones: "▶ Proyectar Ficha", "🕸 Proyectar Conexiones"
  - Quick-actions POI: "Triangular", "Alerta"
  - Handlers: `loadEntities()` (carga `/api/dm/entities`), `buildDossierPayload()` (filtra privado), `bindDossierEvents()`
  - Importa `amina-tokens.css` ANTES de `dm.css`

### Verificado
- ✓ 71 entidades cargan desde BD
- ✓ Ficha de expediente renderiza con foto + campos + censura
- ✓ Transmisión / Correlación / Recuperación activan con animaciones correctas
- ✓ Estado de membrana (TORN) afecta HUD + viñeta proyector
- ✓ Todos los IDs/clases JS-requeridos presentes en rediseño
- ✓ Sin errores de JS nuevos en consola
- ✓ Filtrado de dm_notes/unlock_code confirmado en payload

### Pendiente
- [ ] Mover `public/claude_design_entropia/` fuera de servicio (limpieza post-rediseño)
- [ ] Captura de pantalla final del rediseño (preview harness tiene timeout con new CSS)

---

## [Sprint E - Mayo 2026] - Real-Time Effects & Entity System

### Agregado
- **WebSocket Dispatch Engine** (`server.js`)
  - Función `dispatchEffect(effect, payload, target, agentId)`
  - Targets: `all` | `agents` | `screen` | `agent:<id>`
  - Broadcast en tiempo real a `/agent` y `/entropia`

- **5 Overlays Principales** (`/entropia`)
  - Tarjeta de escena (`SCENE_CARD`): 5 estilos de voz + confidence/source
  - Transmisión (`INTERCEPTED_TRANSMISSION`): onda + transcripción + audio
  - Correlación (`CORRELATION_REVEAL`): nodos + links + % confianza
  - Recuperación (`FILE_RECOVERY`): barra progreso + líneas censuradas
  - Triangulación (`SIGNAL_TRIANGULATION`): coords + barras pulsantes

- **Consola DM** (`/dm`)
  - 5 tabs: Efectos, Media, Escenas, Intel, Ayuda
  - 12 quick-event buttons (glitch, ruido, tarjeta, etc.)
  - Constructor de escenas: timeline con beats, reproductor
  - Presets: guardar/categorizar/disparar efectos
  - Cola de análisis: pendiente/procesando/completado
  - Media upload: imagen, vídeo, audio

- **Rutas de API nuevas**
  - `/api/media` — CRUD media assets
  - `/api/scenes` — CRUD scenes + beats
  - `/api/presets` — CRUD presets, `/fire` para lanzar
  - `/api/analysis` — CRUD análisis, `/complete` para disparar

- **DB Tablas nuevas**
  - `media_assets` — archivos subidos
  - `dm_presets` — efectos guardados
  - `analysis_queue` — análisis pendientes
  - `scenes`, `scene_beats` — escenas + timeline

- **Vista Agente** (`/agent`)
  - Recibe efectos WebSocket
  - Renderiza overlays idénticos a `/entropia`
  - Mapa + HUD

### Modificado
- **Boot Terminal** (`app.js`, `public/app.v2.js`)
  - Opciones: Field Operative (agent) vs Sr. Verdad (dm)
  - Session-based auth (HttpOnly cookie `amina.sid`)

- **POI Map** (`app.v2.js`)
  - Pips (microdots) alrededor de POI según threat_level (1..5)
  - Clusters usan máximo threat_level
  - Escalado por zoom

### Verificado
- ✓ WebSocket conecta de 3 clientes (dm, agent, screen)
- ✓ Efectos disparan correctamente por target
- ✓ Overlays renderizan con animaciones
- ✓ DB persiste entre sesiones

---

## [Sprint D - Abril 2026] - POI System Refactor

### Agregado
- **POI Management** (`/api/pois`)
  - CRUD completo: GET, POST, PUT, DELETE
  - Campos: name, category, lat/lng, dm_note, image_url, threat_level, session_tag
  - Filtros: category, session_tag

- **Categorías de POI**
  - `crime`, `cell`, `town`, `industrial`, `natural`, `npc`, `rumor`
  - Iconos generados por canvas: fallback → categoría → unknown

- **71 POIs Pre-seeded**
  - Ubicaciones reales de Schuylkill County, PA
  - Datos atmosféricos + dm_notes privadas

---

## [Sprint A-C - Anterior] - Boot Console & Base Infrastructure

### Contenido Original
- Terminal CRT retrofit con 2 modos (Field Operative / Sr. Verdad)
- Mapbox GL JS integrado
- SQLite BD con schema inicial
- Express + WebSocket base
- Estética X-Files / CRT retro
