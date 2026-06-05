# AMINA — Setup y Uso

## Requisitos previos

- **Node.js 18+**
- **npm** (viene con Node)
- **Cuenta Mapbox** (token público)
- **Red local** (todos en la misma red o conectados al mismo servidor)

## Instalación

### 1. Clonar/descargar el repositorio

```bash
cd /ruta/del/proyecto
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:

```bash
# Mapbox — necesario para que los mapas funcionen
MAPBOX_PUBLIC_TOKEN=pk.tu_token_aqui
MAPBOX_STYLE_URL=mapbox://styles/tu_usuario/tu_estilo

# Seguridad — contraseña para DM
DM_SECRET=unPasswordMuySecreto

# Opcional
PORT=3002          # Por defecto 3002
DEBUG=true         # Si quieres logs detallados
```

**⚠️ IMPORTANTE**: nunca commites `.env` ni `schuylkill.db` a git. Están en `.gitignore`.

## Arrancar el servidor

```bash
npm start
```

Verás:
```
Server listening on http://127.0.0.1:3002
```

## Acceso

### URLs locales

| URL | Rol | Qué es | Requiere |
|-----|-----|--------|----------|
| `http://localhost:3002/` | Visitante | Terminal de boot | nada |
| `http://localhost:3002/dm` | DM | Consola de control | DM_SECRET |
| `http://localhost:3002/agent` | Agente | Vista de jugador | Usuario agent + contraseña |
| `http://localhost:3002/entropia` | Público | Pantalla de proyector | nada |

### Acceso desde otra máquina en la red

Reemplaza `localhost` por la IP del servidor:

```
http://192.168.1.100:3002/
```

Para encontrar tu IP local:
- **Windows**: `ipconfig` (busca IPv4 Address en tu red)
- **Mac/Linux**: `ifconfig` (busca inet en tu interfaz de red)

## Setup típico en partida

### Hardware

1. **DM PC/Portátil** — abierto en `/dm` (panel de control)
2. **Jugadores** — móviles/portátiles abiertos en `/agent` (vista de agente)
3. **Proyector de sala** — abierto en `/entropia` (pantalla ambiente)

### Flujo de inicio

1. Arranca el servidor: `npm start`
2. **Proyector**: abre `http://<ip-servidor>:3002/entropia` (déjalo sin tocar)
3. **DM**: abre `http://<ip-servidor>:3002/`, entra con DM_SECRET
4. **Jugadores**: abren `http://<ip-servidor>:3002/`, seleccionan Field Operative, entra con su usuario + `amarok`

Listo. Toda la partida ocurre en tiempo real.

## Funcionalidades del DM

### Consola DM `/dm`

**5 tabs principales:**

1. **Efectos** (Efectos Rápidos)
   - 10 botones preconfigurados (Alerta, Señal, Error, etc.)
   - Mapa interactivo para seleccionar posiciones (click → rellena coords)
   - Controles rápidos: glitch, viñeta, tarjetas de texto

2. **Media** (Repositorio de archivos)
   - Drag-drop para subir imágenes, vídeos, audio
   - Grid visible de archivos
   - Botones: Agentes / Pantalla / Todos (lanza a esa audiencia)
   - Editar descripción, borrar

3. **Escenas** (Timeline de eventos)
   - Crear escena (nombre + target)
   - Añadir "beats" (pasos): cada uno es un efecto con delay, duración, tipo
   - Panel lateral: **Coord Picker** (mapa pequeño, click → inyecta coordenadas)
   - Botones: Play (autoplay), Pause, Next, Prev, Stop
   - Exportar/Importar JSON (prepara sesiones con antelación)

4. **Intel** (Herramientas narrativas)
   - **Presets**: guarda efectos completos, categorízalos, lánzalos con un click
   - **Cola de Análisis**: crea análisis "pendiente" (AMINA procesa), dispara el resultado cuando quieras narrativamente

5. **Ayuda** (Este documento, en la app)
   - Lenguaje jugador, no técnico
   - Tablas de efectos disponibles
   - Explicación de targets (quién recibe cada efecto)

## Ejemplos de uso

### Ejemplo 1: Flash de glitch rápido

1. Tab **Efectos**
2. Botón **"Alerta Membrana"** (rojo pulsante)
3. Aparece en `/agent` y `/entropia` al instante

### Ejemplo 2: Imagen de vigilancia

1. Tab **Media**
2. Drag-drop una imagen JPG
3. Click botón **"Todos"**
4. Aparece fullscreen en agentes + proyector (con efecto CCTV si la subiste con ese flag)

### Ejemplo 3: Secuencia cinemática (escena)

1. Tab **Escenas**
2. Nueva escena: "Interrogatorio"
3. Añade beats:
   - Beat 1: GLITCH (delay 0ms, duration 500ms)
   - Beat 2: FOCUS_INCIDENT en coordenadas (delay 500ms, duration 4000ms)
   - Beat 3: SCENE_CARD "Voz detectada" (delay 1000ms, duration 5000ms)
4. Click **Play**
5. Se ejecutan automáticamente en orden con timing exacto

### Ejemplo 4: Análisis pendiente

1. Tab **Intel** → Cola de Análisis
2. Nuevo análisis:
   - Label: "VOICEPRINT ANALYSIS"
   - Descripción: "grabación de Victoria Allen"
   - Efecto resultado: SCENE_CARD
   - Payload: `{ "title": "MATCH FOUND", "body": "CONFIDENCE 87%", "voice": "ov" }`
3. Guardar
4. **20 minutos después** en la partida (momento tenso):
5. Click **"⚡ Disparar"**
6. El resultado aparece en agentes

## Troubleshooting

### "No puedo acceder a `/dm`"

**Síntoma**: Redirect a login aunque ingresé DM_SECRET

**Solución**:
1. Abre la URL raíz: `http://localhost:3002/`
2. Selecciona **Sr. Verdad Access**
3. Entra con el DM_SECRET (debe coincidir con `.env`)
4. Se crea sesión → ahora `/dm` funciona

### "El mapa no carga"

**Síntoma**: Mapas grises, sin tiles

**Solución**:
1. Verifica `MAPBOX_PUBLIC_TOKEN` en `.env` (debe ser `pk.*`, no `sk.*`)
2. El token debe estar habilitado en tu cuenta Mapbox
3. Recarga la página (Ctrl+F5 o Cmd+Shift+R)

### "Los efectos no llegan a los agentes"

**Síntoma**: Lanzas un efecto pero no aparece en `/agent`

**Solución**:
1. Verifica que el agente está conectado (lista en DM)
2. Verifica el **target**: debe ser "Todos" o "Solo Agentes"
3. Abre consola del navegador (F12) y busca errores WS
4. Si hay error de conexión, reinicia cliente + servidor

### "Coord Picker no funciona"

**Síntoma**: Click en el mapa no rellena coordenadas

**Solución**:
1. Abre tab **Escenas**
2. Abre un beat existente o crea uno nuevo
3. El mapa lateral debe aparecer a la derecha
4. Si no aparece, espera 2-3s (carga lazy)
5. Mapbox debe estar inicializado (sin errores en consola)

## Datos de prueba

### Agentes por defecto

| Usuario | Contraseña | Nombre |
|---------|-----------|--------|
| `pike` | `amarok` | Howard Pike |
| `allen` | `amarok` | Victoria Allen |

Usa cualquiera para probar `/agent`.

### POIs de prueba

La BD viene precargada con localizaciones de Schuylkill County:
- Hospital
- Mina de Carbón
- Rectoría
- Estación de tren
- etc.

Visible en el mapa de `/agent` y `/entropia`.

## Desarrollo y debugging

### Logs del servidor

```bash
npm start
# O con DEBUG:
DEBUG=true npm start
```

Verás logs de:
- Conexiones WebSocket
- Efectos despachados
- Escenas en autoplay
- Errores de autenticación

### Consola del navegador

Abre **F12** en cualquier vista:
- **Network** → WebSocket para ver mensajes en tiempo real
- **Console** → logs de `console.log()` del frontend
- **Application** → cookies (verifica `amina.sid`)

### Reinicio limpio

```bash
# Mata el servidor (Ctrl+C)
# Borra la BD (opcional):
rm schuylkill.db
# Reinicia:
npm start
```

## Próximos pasos

Una vez todo funciona:
1. Crea tus propias **escenas** para la sesión
2. Sube tus propias **imágenes** al repositorio de media
3. Prepara **presets** de efectos narrativos clave
4. Abre `/entropia` en el proyector de sala

¡Diversión asegurada! 🎭
