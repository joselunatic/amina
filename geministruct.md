📘 instructions.md
Especificación completa para el desarrollo del Sistema de Control de Efectos en Tiempo Real (Vista DM ↔ Vista Agente)

Este documento define de forma exhaustiva los requerimientos funcionales, técnicos y de arquitectura que Gemini debe implementar.
Se utiliza como contract del sistema.

Gemini debe ceñirse estrictamente a lo descrito aquí.

1. Contexto del Proyecto

Se requiere un sistema web para una campaña única del juego Esoterroristas / AMINA, compuesto por:

Una vista DM (Director) para controlar efectos.

Varias vistas Agente (jugadores) que muestran un mapa Mapbox y reciben efectos en tiempo real.

Un servidor WebSocket que enruta eventos desde el DM hacia los Agentes.

No se usan frameworks (ni React).
Frontend basado en HTML + JS + CSS puro.

2. Roles
DM

Controla los efectos visuales.

Puede enviar efectos a todos los agentes o a uno concreto.

Debe visualizar la lista en tiempo real de agentes conectados.

Agente

Muestra el mapa.

Ejecuta los efectos recibidos.

No envía efectos.

Se identifica mediante un agentId persistido en cookie.

3. Alcance

Gemini debe entregar:

Servidor WebSocket completo
Conforme a los requisitos definidos abajo.

agent.html + CSS + JS
Implementando:

Gestión de agentId por cookie.

Conexión WS.

Recepción y ejecución de efectos.

Overlays visuales (glitch, vignette, ruido).

Markers HTML controlables por clases (parpadeo, highlight).

Mapa Mapbox con configuración básica.

dm.html + CSS + JS
Implementando:

Conexión WS.

Recepción de lista de agentes.

UI con panel de controles.

Capacidad de enviar efectos globales o dirigidos.

Estructura de carpetas limpia.

Documentación mínima de despliegue.

NOTA: NO usar React, Vue, frameworks de estado ni build tools.

4. Arquitectura de Comunicación (WebSocket)
4.1. Handshake inicial

Cada cliente debe enviar un mensaje hello al conectar:

Agente:
{
  "type": "hello",
  "role": "agent",
  "agentId": "<valor cookie agentId>"
}

DM:
{
  "type": "hello",
  "role": "dm"
}

4.2. Lista de agentes

Cuando conecta o desconecta cualquier agente:

{
  "type": "agents-list",
  "agents": [
    { "agentId": "..." },
    ...
  ]
}


Se envía solo a los DM.

4.3. Envío de efectos (solo DM → servidor)

Modelo general:

{
  "type": "effect",
  "effect": "<nombre efecto>",
  "target": "all" | "agent",
  "agentId": "<solo si target='agent'>",
  "payload": {
      ... parámetros específicos del efecto ...
  }
}

4.4. Reenvío de efectos (servidor → agentes)

El servidor reenvía solo a:

todos los agentes (target: all), o

al agentId indicado (target: agent)

5. Gestión de Identidad del Agente
Requisitos:

En agent.html, al cargar:

Comprobar si existe cookie agentId.

Si no existe, generarla (UUID o similar).

Guardarla por 1 año, path /.

Tras abrir WebSocket:

Enviar mensaje hello con el agentId.

El servidor debe asociar cada conexión con:

role

agentId (solo agentes)

El servidor debe mantener la lista de agentes conectados y enviarla a los DM.

6. Catálogo Oficial de Efectos

Gemini debe implementar lógica para permitir enviar estos efectos desde la vista DM y ejecutarlos en la vista Agente.

6.1. Efectos Visuales Globales

GLITCH

VIGNETTE_LEVEL (0–3)

NOISE_PULSE

6.2. Efectos de Cámara

NUDGE_CAMERA

FOCUS_INCIDENT
Payload incluye: { lng, lat, zoom, pitch, bearing }

SWEEP_AREA
Payload incluye: { start: {lng,lat}, end: {lng,lat}, durationMs }

6.3. Efectos POI

POI_BLINK_ON (payload: { poiId })

POI_BLINK_OFF

POI_HIGHLIGHT

POI_LOCKED

POI_UNLOCKED

Los POIs son markers HTML con un atributo data-poi-id.

6.4. Efectos sobre Capas

LAYER_TOGGLE
Payload: { layerId, visible }

6.5. Efectos Narrativos

THREAT_LEVEL_SET (0–3)

TIME_OF_NIGHT_SET (0–3 o continuo)

7. Requerimientos para la Vista Agente
7.1. Elementos obligatorios

Contenedor de mapa Mapbox.

Overlays para efectos:

.glitch-overlay

.vignette-overlay

.noise-overlay

Markers HTML con atributo data-poi-id.

7.2. Comportamiento

Procesar mensajes WebSocket tipo effect.

Ejecutar el efecto correspondiente.

Mantener estado local opcional (p.ej. threat level).

7.3. Diseño

CSS claro, estructurado, sin frameworks.

Animaciones CSS para:

glitch

parpadeo POI

overlays

8. Requerimientos para la Vista DM
8.1. Elementos obligatorios

Selector de agente:

Opción “Todos los agentes”

Lista dinámica basada en agents-list

Botones o controles para disparar cada tipo de efecto.

Componentes UI claros y simples.

8.2. Comportamiento

Conexión WebSocket.

Envío de mensajes effect.

Actualización en vivo de la lista de agentes.

9. Requerimientos del Servidor WebSocket
9.1. Funciones

Recibir hello → registrar rol y agentId.

Mantener lista de agentes conectados.

Enviar lista actualizada a los DM cuando cambie.

Recibir effect desde DM y reenviar a:

todos los agentes, o

el agente objetivo.

9.2. Restricciones

Un agente no puede enviar efectos.

Solo un DM debe aceptar comandos.

Memoria suficiente para ~10 agentes.

No requiere persistencia en disco.

10. Requisitos No Funcionales

HTML/JS/CSS sencillo, mantenible y modular.

Sin frameworks.

Estructura de carpetas clara.

Código comentado.

Compatible con navegadores modernos.

Gestión simple de errores WS.

Deploy trivial con Node: node server.js.

11. Criterios de Aceptación

Un agente obtiene un agentId persistente.

El DM siempre ve la lista actual de agentes.

El DM puede enviar cualquier efecto global.

El DM puede enviar cualquier efecto a un agente concreto.

Los agentes ejecutan los efectos sin refrescar.

Efectos visuales integrados con Mapbox.

Sistema funcional con al menos 10 agentes.

El servidor nunca retransmite un efecto a un DM.

El sistema soporta desconexión/reconexión limpia.

12. Entregables Finales (que Gemini debe producir)

Servidor WebSocket completo (archivo server.js).

agent.html, con:

Gestión de cookie agentId

Código cliente WS

Mapbox inicializado

Lógica de efectos + overlays

Markers POI

CSS asociado

dm.html, con:

Conexión WS

UI de selección de agente

Controles de efectos

CSS asociado

Readme de despliegue:

Dependencias

Comandos de ejecución

Consideraciones técnicas

13. Instrucciones para Gemini

Gemini debe:

Leer este instructions.md.

Generar todos los archivos necesarios.

No omitir ningún efecto del catálogo.

No introducir frameworks.

Mantener compatibilidad con navegadores actuales.

Entregar código completo y funcional.
