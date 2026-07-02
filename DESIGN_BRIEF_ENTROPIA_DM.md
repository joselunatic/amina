# Design Brief: AMINA — Pantalla de Proyección (Entropia) + Consola de Efectos DM

> **Prompt para Claude Design.** Copia este documento completo como prompt. Todo el contexto necesario está aquí; el código fuente está en el repo.

---

## 🎬 Contexto General

**Proyecto:** AMINA — Consola de vigilancia, análisis e inteligencia de Ordo Veritatis, para partidas presenciales del juego de rol *Esoterroristas*.

**Qué es narrativamente:** AMINA no es "una web de apoyo". Es una herramienta *dentro del mundo de juego*: un sistema que los personajes usan, pero que puede fallar, ocultar información, contradecirse o mentir. La frase que lo define: **una consola de revelación controlada** — a veces informa, a veces alerta, a veces censura, a veces miente.

**Las dos superficies a diseñar:**

1. **`/entropia` (proyector de sala)** — Pantalla pública proyectada en la pared para todos los jugadores. Sin botones, sin navegación. Funciona como iluminación o música: ambiente continuo de fondo, interrumpido por eventos dramáticos que lanza el DM. Debe ser legible a 3-4 metros, cinematográfica, y aguantar horas encendida sin cansar.

2. **`/dm` tab "Efectos" (consola del DM)** — Herramienta privada del DM en su portátil. Aquí la prioridad es inversa: velocidad y claridad operativa. El modelo mental es **mesa de mezclas / panel de realización de TV**: el DM debe poder lanzar un evento en 2 segundos en mitad de una escena, a media luz, sin equivocarse de botón. Debe ser coherente con la marca AMINA pero funcional ante todo.

**Restricción crítica: SOLO DISEÑO (CSS + ajustes menores de estructura HTML).** No tocar lógica JavaScript. Los `id` y las clases que usa el JS (listados abajo) deben seguir existiendo con el mismo nombre. Puedes añadir wrappers, pseudo-elementos, clases nuevas y variables CSS libremente.

---

## 🧱 Stack técnico

- Vanilla HTML/CSS/JS, sin frameworks ni build. Archivos servidos estáticos.
- Mapa: Mapbox GL (estilo dark) a pantalla completa debajo de todo en `/entropia`.
- Archivos a trabajar:
  - `public/entropia.html` + `public/entropia.css` (proyector)
  - `public/dm.html` + `public/dm.css` (consola DM)
  - NO tocar `entropia.js` ni `dm.js` (puedes leerlos para entender comportamiento).
- Hay conexión a internet en uso real (Mapbox CDN), así que **webfonts permitidas** (Google Fonts u otra CDN). Recomendadas: una monospace con carácter (JetBrains Mono, IBM Plex Mono, Share Tech Mono) y quizá una display condensada para títulos de alerta.
- Viewport objetivo de `/entropia`: 16:9 proyector (1920×1080 típico), visto a distancia. Viewport de `/dm`: portátil 13-15".

---

## 🎨 Dirección estética

Referencias: Expediente X, Fringe, agencias de inteligencia (NSA/GCHQ), archivos clasificados de los 90 mezclados con un sistema de IA moderno que ve cosas que no debería. CRT, fósforo verde, scanlines, sellos de tinta, documentos censurados, terminales de radio militar.

**Las 5 "voces" del sistema** (ya implementadas como variantes CSS, cada una es una fuente narrativa distinta):

| Voz | Color base | Personalidad visual |
|-----|-----------|---------------------|
| `ov` (oficial) | Verde `#00ff88` | Burocrático, frío, rígido, monospace |
| `intercepted` | Ámbar `#ffb700` | Inestable, ruidoso, radio pirata |
| `corrupted` | Gris `#999` | Degradado, glitch, ilegible a ratos |
| `alert` | Rojo `#ff4136` | Pulsante, urgente, amenazante |
| `human` | Verde suave `#c8e8d0` | Cálido, tipografía menos rígida |

Paleta actual: verde `#00ff88` / `#00cc70`, rojo `#ff4136`, ámbar `#ffb700`, púrpura `#b44dff` (anomalías), fondos `#000` → `#050809`. Puedes refinarla (tokens CSS), pero mantén la identidad verde-fósforo + rojo-amenaza.

**Principio clave del proyector:** el estado base es ambiental y discreto (opacidades bajas, movimiento lento); los eventos son interrupciones dramáticas de alto contraste. La diferencia entre ambos estados ES el efecto teatral.

---

## 📺 Superficie 1: `/entropia` — Inventario completo

### Estado base (siempre visible)
- `#map` — Mapa Mapbox dark fullscreen (fondo).
- `#algorithm-background` — Capa de simulación: 40 nodos de señal, indicadores de amenaza (`.threat-indicator.rupture` rojo / `.entity` púrpura), ondas de escaneo (`.scan-wave`), líneas de red (`.network-line`), hotspots (`.regional-hotspot`), textos flotantes (`.algorithm-status`). Poblada por JS; estiliza las clases.
- `#amina-home` — Home persistente: sello OV (`.ov-seal`), logo AMINA (`.amina-logo`), estado del sistema (`.system-status`, ids `#home-membrana`, `#home-agents`), log de inicialización (`.initialization-log`), footer legal. Se oculta con `.hidden` cuando hay acción sobre el mapa.
- `#amina-hud` — HUD ambiental en esquinas: `#incident-code`, `#membrana-status` (clases de estado `status-intact`/`status-frayed`/`status-torn`), `#system-ticker`, `#signal-indicator`, `#coordinates-display`, `#system-clock`.
- `#scanlines`, `#screen-brand` — Textura CRT y marca de agua.
- **Estados de membrana en `<body>`**: `membrana-frayed` (halo ámbar sutil vía `body::after`) y `membrana-torn` (parpadeo rojo persistente). Son "iluminación de sala" — mejóralos pero mantenlos sutiles, no pueden tapar el contenido.

### Overlays de evento (aparecen con clase `.active`, se pueden previsualizar añadiendo esa clase a mano en DevTools)
- `#card-overlay` — Tarjeta central: `.card-subtitle/.card-title/.card-body/.card-meta` (pie de fiabilidad "CONFIANZA: 62% · FUENTE: X"). Variantes `card-voice-{ov|intercepted|corrupted|alert|human}` y `card-theme-{danger|warning}`.
- `#file-recovery-overlay` — Recuperación de archivo: barra `#recovery-bar` + `%`, líneas `.recovery-line` (con `.censored` = ██████), imagen final `#recovery-image`.
- `#signal-triangulation-overlay` — Triangulación: coords grandes, 5 barras `.tri-bar` animadas, `#tri-precision`, círculo pulsante en mapa (`.triangulation-circle`).
- `#transmission-overlay` — Transmisión interceptada (ámbar): cabecera fuente/frecuencia, forma de onda de 28 `.wave-bar`, transcripción `.transmission-line` (variante `.lost` = "▓▓▓ SEÑAL PERDIDA ▓▓▓"), footer "● GRABANDO" pulsante.
- `#correlation-overlay` — Correlación anómala (rojo): título pulsante, `.correlation-node` conectados por `.correlation-link` (se revelan en secuencia con clase `.revealed`), sello `#correlation-stamp` con % y fuente.
- `#dossier-overlay` — Ficha de expediente: cabecera con clasificación + sello `CLASIFICADO` rotado, nombre grande `#dossier-name`, foto `#dossier-photo` (o placeholder "SIN REGISTRO VISUAL"), campos `.dossier-field` (label/value, `.censored`), resumen, pie de fiabilidad. Variantes `dossier-voice-{intercepted|corrupted|alert}`.
- `#media-image-overlay` / `#media-video-overlay` — Media fullscreen; variante `.cctv-feed` (scanlines, timestamp verde, badge REC, 4:3, desaturado).
- `#blackout-overlay` — Negro total.

### Qué mejorar en el proyector (prioridades)
1. **Cohesión**: los overlays se han construido por sprints; unifícalos con un mismo lenguaje (misma familia de bordes, cabeceras, esquinas, tratamiento de sombras/glow, jerarquía tipográfica). Un sistema de tokens CSS (`--amina-*`) compartido.
2. **Impacto a distancia**: tamaños y contrastes pensados para pared. Los cuerpos de texto de overlays deben leerse a 3 metros.
3. **Textura**: el conjunto puede ganar en materialidad CRT (aberración cromática sutil en títulos, grano, viñeteado, flicker ocasional de fósforo) sin sacrificar legibilidad ni rendimiento (animaciones CSS baratas: transform/opacity; evitar filtros pesados en capas grandes y a 60fps).
4. **El home** ya tiene un brief propio aplicado (`DESIGN_BRIEF_HOME.md`); respétalo o refínalo, no lo rehagas de cero.

---

## 🎛 Superficie 2: `/dm` tab "Efectos" — Inventario

Estructura: header con selector de destino `#agent-select` (Todos / Solo Agentes / Pantalla / agente concreto) + tabs (Efectos, Media, Escenas, Intel, Ayuda). Dentro de Efectos, dos columnas de `.control-section`:

- **Eventos Narrativos Rápidos** — `#quick-events-grid` con 12 `.quick-event-btn` (`.event-label` + `.event-hint`). Es LA sección de uso en vivo: debe ser lo más prominente y clicable.
- **Efectos Visuales** — glitch, ruido, viñeta (slider), blackout, limpiar, `#effect-home`.
- **Estado de Membrana** — 3 botones `#membrana-intact/frayed/torn` (afectan al proyector).
- **Efectos de Cámara** — nudge, focus (input coords), sweep.
- **Efectos de POI** — `#poi-select` + parpadeo/resaltar/bloquear + **acciones rápidas** `#poi-triangulate` / `#poi-alert`.
- **Tipo de Marker**, **Capas**, **POI Efímero**.
- **Proyectar Expediente** — `#dossier-entity-select` (71+ entidades), checkboxes `.dossier-options` (revelar nombre real / imagen / resumen), selector de voz, fuente y confianza opcionales, botones `#dossier-project-btn` / `#dossier-connections-btn`.
- **Card de Escena** — inputs de tarjeta manual.
- Columna derecha: **Mapa de Operaciones** (`#dm-map`) + imagen satelital.

### Qué mejorar en la consola (prioridades)
1. **Jerarquía de uso en vivo vs preparación**: eventos rápidos, membrana y acciones de POI/expediente son "en vivo" (deben dominar visualmente, botones grandes, alto contraste); cámara/capas/marker/card manual son "preparación" (pueden compactarse, colapsarse o quedar secundarios).
2. **Codificación por color de las voces**: los botones que lanzan eventos con voz deberían llevar su color (borde o barra lateral ámbar/rojo/gris/verde) para que el DM sepa qué tono va a proyectar sin leer el hint.
3. **Feedback de disparo**: estado visual claro al lanzar (flash/confirmación en el botón). Hoy apenas hay feedback.
4. **El selector de destino** (`#agent-select`) es crítico y peligroso (decide si algo va al proyector o a un jugador concreto): dale presencia y estado visible — p.ej. color de acento global según destino seleccionado.
5. **Densidad**: es una herramienta profesional, no un dashboard bonito. Compacta pero con targets de click generosos (mínimo 40px de alto en botones de uso en vivo).
6. Modo oscuro siempre (se usa a media luz en la mesa).

---

## ✅ Entregables y criterios de aceptación

1. `entropia.css` y `dm.css` rediseñados sobre un sistema de tokens CSS común (puede vivir duplicado en ambos ficheros o en un `amina-tokens.css` nuevo enlazado desde ambos HTML).
2. Ajustes de `entropia.html`/`dm.html` solo estructurales/decorativos: sin renombrar ni eliminar ids/clases que usa el JS (todo lo listado en los inventarios).
3. Sin cambios en `.js`.
4. Animaciones solo CSS, transform/opacity preferente; nada que degrade un proyector a 60fps.
5. Cada overlay verificable añadiendo `.active` (y las variantes de voz) a mano; los 5 estilos de voz distinguibles a 3 metros.
6. La consola DM debe seguir siendo operable al 100%: mismo número de controles, ninguno oculto tras hover-only.

## 🚫 Fuera de alcance
- Nada de lógica nueva, ni librerías JS, ni canvas/Three.js.
- No rediseñar las tabs Media/Escenas/Intel/Ayuda (solo heredarán tokens); el foco es tab Efectos + proyector.
- No tocar `/agent` (vista móvil de jugadores) en esta pasada.
