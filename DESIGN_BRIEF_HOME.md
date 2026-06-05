# Design Brief: AMINA Home Screen — Cinematographic Design

## 🎬 Contexto General

**Proyecto:** AMINA — Sistema de análisis y vigilancia de Ordo Veritatis  
**Objetivo:** Diseñar una home screen espectacular, diegética y cinematográfica que sea el equivalente visual de cómo sería AMINA en una película de espías/sobrenatural  
**Restricción:** SOLO DISEÑO — no tocar código, no complicarse, aprovechar lo ya implementado  
**Libertad:** Total creatividad en composición, layout, animaciones visuales, jerarquía de información

---

## 📊 Estado Actual (Lo que Ya Existe)

### Estructura Técnica Implementada
- **Capa de fondo:** Algorithm background con 40+ elementos dinámicos (signal nodes, threat indicators, scanning waves)
- **Home container:** Centro de la pantalla con borde verde AMINA y glow effects
- **Secciones internas:**
  - OV seal (diamante + "ORDO VERITATIS")
  - AMINA logo ["ANÁLISIS DE MISIONES E INVESTIGACIÓN DE NUEVAS AMENAZAS"]
  - Sistema de estado (4 líneas: estado sistema, membrana, agentes, zona vigilancia)
  - Log de inicialización (5 líneas de timestamp + mensajes del sistema)
  - Footer legal

### Animaciones Existentes
- Glow pulse en bordes (4s)
- Scanlines enrollándose (8s)
- Pulsing logo (2s breathing)
- OV seal parpadeo (2s)
- Status indicators pulsando (1.5s)
- Textos apareciéndose con delays escalonados
- Log messages con timestamps

### Colores Establecidos
- Verde principal: #00ff88 (AMINA, señales)
- Verde oscuro: #00cc70 (subtextos)
- Rojo: #ff4136 (amenazas)
- Púrpura: #b44dff (anomalías)
- Fondo oscuro: #000000, #050809 (gradiente)

### Viewport Target
- Proyector a gran tamaño (wall display)
- Debe ser legible a distancia
- Motion continua para mantener atención

---

## 🎭 Visión Narrativa (Lo Que Queremos Comunicar)

Este NO es un dashboard típico. Es:
- **Un sistema de IA/análisis sobrenatural** viendo el mundo
- **Vigilancia interdimensional** detectando grietas en la realidad (veil ruptures)
- **Red de inteligencia global** de una organización secreta
- **Equivalente cinematográfico** a: 
  - Pantallas de satélite de espías (Mission Impossible)
  - Sistemas de detección sobrenatural (Supernatural, X-Files)
  - HUD futurista paranormal (Predator, Alien)
  - NSA/GCHQ global surveillance aesthetic mezclado con lo paranormal

---

## ✨ Desafío Creativo Para Claude Design

### Lo que NO queremos
- ❌ Dashboards de datos típicos (gráficos, barras, números)
- ❌ Complejidad innecesaria (mantener legible)
- ❌ UI de consola de juego (queremos cinematográfico)
- ❌ Futurismo cliché (evitar 80s/90s vaporwave)

### Lo que SÍ queremos
- ✅ **Cinematografía:** Composición de película (regla de tercios, depth, focal points)
- ✅ **Diegético:** Todo debe parecer un sistema real que está "viendo" algo
- ✅ **Impacto visual:** "Wow" factor al verlo proyectado en pared grande
- ✅ **Narrativa en una imagen:** El layout cuenta una historia sin palabras
- ✅ **Escalable:** Debe funcionar a cualquier tamaño de pantalla grande
- ✅ **Integrable:** Trabajar con lo ya implementado (animaciones CSS, algoritmo background)

---

## 🎨 Libertad Creativa — Sugerencias de Exploración

### Posible Dirección 1: "Global Eyes"
**Concepto:** Todo gira alrededor de un "ojo" central viendo el mundo  
**Elementos:**
- Mapa mundi circular/iris en el centro
- AMINA logo puede integrarse como "pupila"
- Señales/amenazas como puntos en mapa alrededor
- OV seal como emblema de "quien ve"
- Log podría ser "frecuencia detectada" scrolleando

**Ventaja:** Impacto visual inmediato, narrativa clara

### Posible Dirección 2: "Network Consciousness"
**Concepto:** Sistema viendo como red viva/orgánica (menos UI, más arte)  
**Elementos:**
- Nodos y conexiones como sistema neural
- AMINA en el centro o como entidad difusa
- Estado fluye como "pulsos" por las conexiones
- Log como "pensamientos" del sistema
- OV como observador externo

**Ventaja:** Único, memorable, futurista sin ser cliché

### Posible Dirección 3: "Multi-Screen Surveillance"
**Concepto:** Estilo "Mission Control" pero paranormal  
**Elementos:**
- Múltiples "ventanas" o "feeds" organizadas
- AMINA en un panel, OV en otro, estado en otro, log en otro
- Cada panel puede tener su propia animación/vibe
- Interconexión visual entre paneles
- Background algoritmo visible a través de paneles

**Ventaja:** Modular, complejo pero organizado, muy cinematográfico

### Posible Dirección 4: "Architect" (más minimalista)
**Concepto:** Menos es más — diseño extremadamente limpio y elegante  
**Elementos:**
- Espacios negativos enormes (proyector grande lo permite)
- AMINA como punto central minimal
- OV seal sutilmente en esquina
- Estado/log como líneas delgadas de texto
- Todo respira, mucho negro, poco texto

**Ventaja:** Funciona a cualquier tamaño, no envejece, clase

### Posible Dirección 5: "Threat Assessment Live"
**Concepto:** Como sistema viendo amenazas en tiempo real (heatmap/scanning)  
**Elementos:**
- Centro muestra "amenaza actual" (rojo pulsante)
- Circunferencias/anillos de análisis alrededor
- OV seal como "fuente" de análisis
- AMINA como "IA que analiza"
- Log como "threat level history"

**Ventaja:** Narrativamente tiene tensión, dinámico

---

## 🔧 Contexto Técnico (Para que No Compliques)

### Lo que YA FUNCIONA (úsalo)
```
✅ Algoritmo background — 70+ elementos dinámicos (signals, threats, waves, hotspots)
✅ CSS animations — Todos los keyframes, glow effects, pulsing
✅ HTML structure — Divs correctos con IDs
✅ WebSocket integration — Los datos fluyen (agentes, estado membrana)
✅ Responsiveness — Escalable a cualquier tamaño
✅ Spanish translations — Todo en español
```

### Lo que PUEDES CAMBIAR (es tu juego)
```
🎨 Layout — Reorganiza los elementos como quieras
🎨 Jerarquía visual — Qué es grande, qué es pequeño, qué está centrado
🎨 Composición — Simetría, asimetría, focal points, depth
🎨 Tipografía — Tamaños, pesos, colores, posiciones
🎨 Spacing — Márgenes, padding, breathing room
🎨 Animaciones CSS — Tiempos, easings, transiciones (las que existen)
🎨 Colores — Paleta, gradientes, glows (manteniendo verde/rojo/púrpura narrativos)
🎨 Efectos visuales — Blur, filters, overlays, borders
```

### Lo que NO TOQUES
```
🚫 HTML elements (estructura divs)
🚫 JavaScript logic (no modificar JS)
🚫 Endpoints/backend (todo backend está bien)
🚫 WebSocket (conexión funciona)
```

---

## 🎬 Inspiración Visual (Si Necesitas)

### Películas/Shows para Mood
- **Ex Machina** — HUD minimalista, IQ orgánico
- **Blade Runner 2049** — Cinematografía enorme, mucho espacio negativo
- **Tenet** — Información diegética, overlays complejos pero claros
- **Minority Report** — UI futurista que tiene sentido narrativo
- **The Matrix** — Terminal aesthetic, información fluyendo
- **Alien** — Tech paranoia, retro-futurismo
- **Bourne Identity** — Surveillance tech real
- **Fringe** — Paranormal + tech aesthetic
- **Inception** — Información visualizada como arquitectura mental

### Elementos Visuales Que Funcionan
- ✅ Grid lines (pero subt para no sobrecargar)
- ✅ Scanlines (ya lo tenemos)
- ✅ Glitch/distortion (sutil)
- ✅ Circular/concentric elements (ojo, iris, ondas)
- ✅ Nodos/red visualization (neural, conexiones)
- ✅ Texto moviéndose (data stream, log)
- ✅ Múltiples capas de profundidad (parallax)

---

## 📋 Especificaciones de Entrega

### Qué Queremos de Ti (Claude Design)

1. **Una propuesta de layout/composición** para la home
   - Croquis o wireframe visual
   - Jerarquía de elementos
   - Focal points y composición

2. **Especificación visual completa:**
   - Dónde va cada elemento (AMINA, OV seal, estado, log)
   - Tamaños relativos (jerarquía)
   - Colores y estilos (tipografía, glows, efectos)
   - Animaciones propuestas (qué se mueve, cómo)
   - Paleta completa

3. **Directrices CSS:**
   - Qué cambios CSS se necesitan
   - Nuevos estilos, cambios de layout
   - Media queries si es necesario
   - Animaciones CSS adicionales si aplica

4. **Mockup final:**
   - Imagen/render de cómo se vería
   - Idealmente varios estados (idle, con amenaza, etc.)
   - Vista completa y detalles

### Restricciones Técnicas
- ✅ Debe seguir estructura HTML existente (no cambiar elementos)
- ✅ Debe usar solo CSS (no agregar HTML divs)
- ✅ Debe ser responsive (funciona en cualquier tamaño)
- ✅ Debe mantener todas las animaciones existentes (o mejorarlas)
- ✅ Debe escalar bien a proyector grande (wall-size)

### Restricciones Narrativas
- ✅ Debe ser "cine" no "UI típica"
- ✅ Debe contar historia de vigilancia sobrenatural
- ✅ Debe mantener "diegético" (parece sistema real)
- ✅ Debe tener impacto visual (wow factor)
- ✅ Debe ser legible a distancia

---

## 🎯 Resumen del Brief

**TL;DR:**
> Diseña una home screen para AMINA que sea lo que verías en una película de espías paranormal. Debe ser espectacular, cinematográfica, diegética, y escalable a pared grande. Úsalo que existe, cambia solo CSS/layout, mantén la narrativa. Tienes libertad total para crear. No compliques, wow.

---

## 📞 Context Dump (Para que Tengas Todo)

### Qué es AMINA
- Sistema de análisis de Ordo Veritatis (organización sobrenatural secreta)
- Detecta anomalías, amenazas extraterrestres, "roturas del velo"
- Red global de vigilancia/inteligencia
- Interfaz entre realidad normal y sobrenatural

### Quién lo usa
- Agentes de campo (jugadores) ven instrucciones
- SR. Verdad (DM) lo controla desde consola
- Pantalla Entropia (proyector) es lo que "ve" AMINA en tiempo real

### Tono General del Proyecto
- Ludbresco (juego de rol)
- Film noir / espías paranormal
- Retro-futurista (tech que parece 90s pero avanzada)
- Diegético (todo parece "real" dentro del universo)
- Narrativa antes que funcionalidad

### Contexto Actual
- Ya tenemos algoritmo de fondo con 70+ elementos dinámicos
- Home screen básica funciona pero es genérica
- Ahora queremos hacerla **cinematográfica y memorable**
- Es el punto de entrada visual a todo el sistema

---

## ✅ Checklist Para Tu Propuesta

Cuando envíes la propuesta, asegúrate de incluir:

- [ ] Concepto/visión general en 2-3 frases
- [ ] Layout/wireframe visual mostrando disposición
- [ ] Explicación de por qué este diseño funciona narrativamente
- [ ] Especificación de dónde va cada elemento (AMINA, OV, estado, log)
- [ ] Paleta de colores completa
- [ ] Tipos de animaciones propuestas
- [ ] Cambios CSS necesarios
- [ ] Mockup/render visual final
- [ ] Cómo escala a proyector grande
- [ ] 1-2 elementos "wow factor" que la hacen memorable
- [ ] Notas sobre integrabilidad con código existente

---

## 🚀 Ya Estás Listo

Tienes todo el contexto. Tienes libertad creativa. Tienes restricciones claras. Ahora: **hazla espectacular.** 🎬

Piensa cinematografía. Piensa "si esto estuviera en una película de espías paranormal, ¿qué vería el público?" Esa es tu home.

**Go.**
