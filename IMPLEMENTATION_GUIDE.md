# AMINA — Guía de Implementación para Contribuidores

Esta guía acelera la implementación de features nuevos manteniendo coherencia con la arquitectura existente.

---

## 1. Antes de Codificar: Checklist de Diseño

### ¿Es un efecto nuevo?

1. **Nombre**: Usa SNAKE_CASE (ej: `ENTITY_DOSSIER`, `INTERCEPTED_TRANSMISSION`)
2. **Targets**: Define dónde aparece — `all` | `agents` | `screen` | `agent:<id>`
3. **Payload schema**:
   ```javascript
   {
     // Contenido visual + duración
     title: string,
     duration: number (ms),
     confidence?: number (1-100),
     source?: string,
     // Añadir más según el efecto
   }
   ```
4. **Voz narrativa**: ¿Usa una de las 5 voces? (ov, intercepted, corrupted, alert, human, anomaly)
5. **Filtrado privado**: ¿Hay datos DM que nunca deben llegar a proyección? Implementar en `buildPayload()` backend

### ¿Es un panel en DM?

1. **Ubicación**: Nuevo tab vs panel dentro de existente
2. **Datos**: ¿Requiere BD nueva? API endpoint nuevo?
3. **Layout**: Responsive en consola DM a ~1600px ancho mínimo
4. **Tokens CSS**: Usar variables de `amina-tokens.css`, no colores hardcoded

### ¿Hay datos privados DM?

**CRÍTICO**: Si tu feature expone `dm_notes`, `unlock_code`, `admin_flag` u otro campo privado:
1. Crear función `buildPayload()` que filtre explícitamente esos campos
2. Auditar en CODE REVIEW
3. Documentar en ARCHITECTURE.md § "Notas de seguridad"
4. Test: enviar a proyector, verificar consola browser que esos campos no aparecen

---

## 2. Estructura de Carpetas — Dónde va Qué

```
/ — Raíz proyecto (versionado en git)
├── src/
│   ├── app.js              ← Express app, middlewares auth
│   ├── server.js           ← WebSocket, dispatchEffect, sceneState
│   ├── db.js               ← CRUD sqlite (db.getPois, db.getEntities, etc.)
│   ├── schema.sql          ← DDL de tablas (actualizar aquí primero)
│   └── routes/
│       ├── auth.js         ← POST /api/auth/*, GET /api/auth/me
│       ├── pois.js         ← CRUD /api/pois
│       ├── media.js        ← CRUD /api/media
│       ├── scenes.js       ← CRUD /api/scenes + /beats
│       ├── presets.js      ← CRUD /api/presets + /fire
│       └── analysis.js     ← CRUD /api/analysis + /complete
├── public/
│   ├── *.html              ← HTML (load CSS antes de JS)
│   ├── *-tokens.css        ← Tokens, cargado PRIMERO
│   ├── *.css               ← Estilos (usa tokens.css vars)
│   ├── *.js                ← Lógica frontend (type="module")
│   └── uploads/            ← Assets subidos (no en git)
└── docs/ (opcional)
    ├── ARCHITECTURE.md     ← Diseño técnico
    ├── DEPLOYMENT.md       ← VPS deployment
    ├── CHANGELOG.md        ← Cambios históricos
    └── IMPLEMENTATION_GUIDE.md ← Este archivo
```

---

## 3. Flujo de Implementación — Paso a Paso

### Caso: Agregar Efecto Nuevo `FANCY_OVERLAY`

#### Paso 1: Backend Design (30 min)

**a) Definir payload schema** (`src/app.js` comentario):

```javascript
// FANCY_OVERLAY — Efecto visual personalizado
// Payload:
//   title: string
//   content: string
//   animation: 'slide-in' | 'fade-in' | 'pop'
//   duration: number (ms)
//   voice: 'ov' | 'intercepted' | 'corrupted' | 'alert' | 'human'
//   colorOverride?: hex (si no, usa token del voice)
```

**b) DB changes** (si necesario):
- Editar `schema.sql` (agregar columnas/tabla)
- Ejecutar `sqlite3 schuylkill.db < schema.sql`
- Agregar CRUD a `db.js`: `db.getFancyOverlay(id)`, etc.

**c) Ruta backend** (si necesario):
- Si es preset guardable: requiere endpoint (`POST /api/presets`)
- Si es análisis: requiere endpoint (`POST /api/analysis/:id/complete`)
- Si es simple: solo WebSocket desde DM → `dispatchEffect()` en `server.js`

#### Paso 2: Frontend Design (60 min)

**a) HTML structure** (`public/entropia.html`, `public/agent.html`):

```html
<!-- Agregar overlay container -->
<div id="fancy-overlay" class="fancy-overlay">
    <div class="fancy-inner">
        <div class="fancy-header" id="fancy-header"></div>
        <div class="fancy-content" id="fancy-content"></div>
        <div class="fancy-footer" id="fancy-footer"></div>
    </div>
</div>
```

**b) CSS** (`public/entropia.css`, `public/agent.css`):

```css
/* Usar tokens, no hardcode */
.fancy-overlay {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(var(--v-ov-rgb), 0.08);
    display: none;
    align-items: center;
    justify-content: center;
}

.fancy-overlay.active {
    display: flex;
    animation: fancy-appear 0.4s ease-out;
}

.fancy-inner {
    background: var(--panel);
    border: var(--hair) solid var(--v-ov);
    padding: 24px;
}

@keyframes fancy-appear {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
```

**c) JavaScript** (`public/entropia.js`, `public/agent.js`):

```javascript
case 'FANCY_OVERLAY':
    showFancyOverlay(payload);
    break;

function showFancyOverlay(payload) {
    const overlay = document.getElementById('fancy-overlay');
    const header = document.getElementById('fancy-header');
    const content = document.getElementById('fancy-content');
    
    header.textContent = payload.title;
    content.textContent = payload.content;
    
    // Aplicar voice color
    overlay.className = `fancy-overlay active fancy-voice-${payload.voice}`;
    
    // Auto-hide después de duration
    if (payload.duration) {
        setTimeout(() => hideFancyOverlay(), payload.duration);
    }
}

function hideFancyOverlay() {
    const overlay = document.getElementById('fancy-overlay');
    overlay.classList.remove('active');
}
```

#### Paso 3: DM Panel (30 min)

**a) HTML** (`public/dm.html`):

```html
<!-- Agregar dentro de tab -->
<div class="section">
    <label>Título</label>
    <input id="fancy-title" type="text" />
    
    <label>Contenido</label>
    <textarea id="fancy-content"></textarea>
    
    <label>Voz</label>
    <select id="fancy-voice">
        <option value="ov">OV Oficial</option>
        <option value="intercepted">Interceptada</option>
        ...
    </select>
    
    <button id="fancy-launch">▶ Lanzar</button>
</div>
```

**b) JavaScript** (`public/dm.js`):

```javascript
function bindFancyEvents() {
    document.getElementById('fancy-launch').addEventListener('click', () => {
        const payload = {
            title: document.getElementById('fancy-title').value,
            content: document.getElementById('fancy-content').value,
            voice: document.getElementById('fancy-voice').value,
            duration: 4000
        };
        dmWs.send(JSON.stringify({
            type: 'effect',
            effect: 'FANCY_OVERLAY',
            target: 'all',
            payload
        }));
    });
}

// Llamar en main()
bindFancyEvents();
```

#### Paso 4: Test & Verify (30 min)

```bash
# 1. Verificar sintaxis JS
node --check public/entropia.js
node --check public/dm.js

# 2. Ejecutar servidor
npm start

# 3. Probar en navegador
#    - Abrir /dm
#    - Completar campos FANCY_OVERLAY
#    - Pulsar "▶ Lanzar"
#    - Verificar que aparece en /entropia y /agent

# 4. Verificar en consola browser
#    - Abrir DevTools → Console
#    - Buscar errores
#    - Verificar payload no contiene dm_notes

# 5. Commit
git add -A
git commit -m "Add FANCY_OVERLAY effect"
```

---

## 4. Patrones Reutilizables

### Patrón: Efecto con Duración Automática

```javascript
function showEphemeralOverlay(payload) {
    const overlay = document.getElementById('my-overlay');
    overlay.classList.add('active');
    
    if (payload.duration) {
        setTimeout(() => hideOverlay(), payload.duration);
    }
}
```

### Patrón: Filtrar Datos Privados

```javascript
// Backend: dm.js
function buildPublicPayload(privateData) {
    return {
        title: privateData.title,
        content: privateData.content,
        // NUNCA:
        // dm_notes: privateData.dm_notes,
        // unlock_code: privateData.unlock_code,
    };
}

// Test
const payload = buildPublicPayload(entity);
console.assert(!payload.dm_notes, 'SECURITY: dm_notes leaked!');
```

### Patrón: WebSocket Targeting

```javascript
// Todos (agentes + proyector)
ws.send(JSON.stringify({ type: 'effect', target: 'all', ... }));

// Solo agentes
ws.send(JSON.stringify({ type: 'effect', target: 'agents', ... }));

// Solo proyector
ws.send(JSON.stringify({ type: 'effect', target: 'screen', ... }));

// Agente específico
ws.send(JSON.stringify({ type: 'effect', target: 'agent:alice', ... }));
```

### Patrón: Usar Tokens de Color

```css
/* ✓ Bien */
.my-element {
    color: var(--v-intercepted);
    background: rgba(var(--v-ov-rgb), 0.1);
    border: var(--hair) solid var(--v-alert);
}

/* ✗ Mal */
.my-element {
    color: #ffb422;
    background: rgba(255, 180, 34, 0.1);
    border: 0.5px solid #ff3b30;
}
```

---

## 5. Verificación Pre-Commit

### Checklist

- [ ] Sintaxis JS: `node --check public/*.js` sin errores
- [ ] IDs HTML: Todos los `getElementById()` en JS existen en HTML
- [ ] Clases CSS: Todas las clases `className =` en JS están en CSS
- [ ] Tokens: Colores usan `var(--v-*)`  u `rgba(var(--v-*-rgb), ...)`
- [ ] Seguridad: `dm_notes` / `unlock_code` NO en payload público
- [ ] Responsive: Probado en 1024px+ (DM), 1600px+ (desktop)
- [ ] WebSocket: Testeado targeting (`all`, `agents`, `screen`, `agent:x`)
- [ ] Logs: Sin `console.error` o `console.warn` nuevos

### Comandos

```bash
# Lint JS syntax
node --check src/app.js src/server.js public/*.js

# Buscar hardcoded colors (anti-pattern)
grep -r '#[0-9a-fA-F]\{6\}' public/*.css | grep -v 'amina-tokens'

# Buscar dm_notes no filtrados
grep -r 'dm_notes' src/ public/ | grep -v 'buildPayload'

# Test WebSocket (manual)
npm start &
# -> /dm -> lanzar efecto -> /agent & /entropia reciben
```

---

## 6. Convenciones de Código

### Nombres

- **Efectos**: `UPPER_SNAKE_CASE` (ej: `FANCY_OVERLAY`, `SIGNAL_TRIANGULATION`)
- **Funciones**: `camelCase` (ej: `showFancyOverlay()`, `hideFancyOverlay()`)
- **IDs HTML**: `kebab-case` (ej: `id="fancy-overlay"`, `id="fancy-header"`)
- **Clases CSS**: `.kebab-case` (ej: `.fancy-overlay`, `.fancy-header`)
- **Variables CSS**: `--kebab-case` (ej: `--v-ov`, `--t-fast`)

### Comentarios

Solo comenta si la lógica NO es evidente:

```javascript
// ✓ Bien: comenta "por qué" no "qué"
// Delay 100ms para permitir reflow antes de animación
setTimeout(() => overlay.classList.add('active'), 100);

// ✗ Mal: comenta "qué" cuando el código es claro
// Añadir clase 'active' a overlay
overlay.classList.add('active');
```

### Importes

En `public/*.js`, importar módulos explícitamente:

```javascript
// En dm.js
import { connectWebSocket, sendEffect } from './websocket-utils.js';

// NO: usar variables globales
// window.connectWebSocket()
```

---

## 7. Testing

### Test Manual (Rápido)

```bash
npm start  # Terminal 1
# Terminal 2:
curl -X POST http://localhost:3002/api/auth/dm \
  -H "Content-Type: application/json" \
  -d '{"password":"dev-test-secret"}' \
  -c cookies.txt

# Enviar efecto
curl -X POST http://localhost:3002/effect \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "effect":"FANCY_OVERLAY",
    "target":"all",
    "payload":{"title":"Test","duration":3000}
  }'

# Abrir http://localhost:3002/entropia en navegador → ver efecto
```

### Test Contractual (Recomendado)

Agregar a `test/effects.test.js`:

```javascript
test('FANCY_OVERLAY payload filtering', () => {
    const entity = { title: 'Test', dm_notes: 'PRIVADO' };
    const payload = buildFancyPayload(entity);
    expect(payload.dm_notes).toBeUndefined();
});

test('FANCY_OVERLAY renders in both entropia and agent', async () => {
    // Simular WebSocket a ambas vistas
    // Verificar que overlay.classList.contains('active')
});
```

```bash
npm run test:effects
```

---

## 8. Documentación Esperada

Actualizar siempre:

1. **README.md** — Agregar efecto a sección "Efectos disponibles"
2. **ARCHITECTURE.md** — Agregar handler + schema en "Handlers de Efectos Nuevos"
3. **CHANGELOG.md** — Nota bajo Sprint actual
4. **Este archivo** (IMPLEMENTATION_GUIDE.md) — Agregar patrón si es genérico

---

## 9. Git Workflow

```bash
# Feature branch
git checkout -b feat/fancy-overlay

# Commits atómicos
git add src/
git commit -m "Add FANCY_OVERLAY backend: dispatch + payload schema"

git add public/
git commit -m "Add FANCY_OVERLAY frontend: overlays + handlers"

git add public/dm.js
git commit -m "Add FANCY_OVERLAY control panel"

# Before push: update docs
git add CHANGELOG.md ARCHITECTURE.md
git commit -m "Docs: add FANCY_OVERLAY"

# Push & PR
git push origin feat/fancy-overlay
# -> Create PR on GitHub
# -> Code review
# -> Merge to main
```

---

## 10. Troubleshooting Común

### "getElementById() retorna null"

```javascript
// ✗ Error: overlay no existe
const overlay = document.getElementById('fancy-overlay');
overlay.classList.add('active');  // Crash: Cannot read property

// ✓ Fix: verificar que existe en HTML
// <div id="fancy-overlay"></div>
// Si falta, lo agregaste incorrectamente
```

### "Efecto no dispara en proyector"

```javascript
// ✗ Error: typo en nombre efecto
case 'FANCY_OVERLAY':  // Pero backend envía 'fancy_overlay'

// ✓ Fix: verificar coherencia
// Backend: effect: 'FANCY_OVERLAY'
// Frontend: case 'FANCY_OVERLAY':
```

### "Color no aplica correctamente"

```css
/* ✗ Error: token no definido */
.my-element {
    color: var(--v-fancy);  /* No existe en amina-tokens.css */
}

/* ✓ Fix: usar tokens existentes */
.my-element {
    color: var(--v-ov);  /* Existe y tiene valor */
}
```

### "DM notes filtra pero aparecen en console"

```javascript
// ✗ Error: olvidaste filtrar buildPayload
const payload = { ...entity };  // Incluye dm_notes

// ✓ Fix: filtrar explícitamente
const payload = {
    title: entity.title,
    // Omitir dm_notes
};
```

---

## Contacto & Preguntas

Referencia rápida:
- **ARCHITECTURE.md** — Diseño técnico global
- **README.md** — Features + API overview
- **DEPLOYMENT.md** — VPS setup
- **Este archivo** — Procedimiento paso-a-paso

¡Éxito con tu feature! 🚀
