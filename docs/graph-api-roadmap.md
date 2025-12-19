# GraphAPI Roadmap y Diseño

## Objetivo
Centralizar toda la lógica de presentación del grafo Cytoscape en una API dedicada que:
- reciba contexto DM/Agente y construya nodos/aristas con datos de visibilidad, interacción y metadatos;
- controle el layout spread/concentric, el spinner y la sincronización del viewport;
- exponga eventos (tap, dblclick, hover) para que la UI pueda reaccionar sin tener que lidiar con Cytoscape directamente.

## Roadmap
1. **Integrar GraphAPI en `app.v2.js`**: reemplazar la función `renderEntityGraph` por llamadas a `GraphAPI.update`, eliminar selectores de layout y limpiar el DOM de legendas innecesarias.
2. **Robustecer la experiencia visual**: agregar gestos como centro y ajuste tras cambios de tamaño, mejores bounding boxes (con `getBoundingBox` reforzado y `ResizeObserver`) y mantener el loader visible mientras el layout corre.
3. **Diseñar la API y cubrirla con tests**: documentar cómo se construyen los nodos/relaciones, cómo se registran handlers y qué datos se exponen; añadir tests unitarios que simulan Cytoscape para validar loader, resumen y eventos.

## Diseño de GraphAPI
- **Construcción de nodos/aristas**: se reutiliza un único `rebuildElements` que evita duplicados, respeta visibilidad y aplica IDs `e-`/`p-` para mantener focus consistente.
- **Layout y viewport**: `getLayoutOptions` devuelve presets `spread`/`cose` y ahora incluye bounding box derivado de `clientWidth/Height` para evitar nodos fuera de pantalla; `ensureResizeObserver` mantiene `cy.fit()` y `cy.resize()` cuando el contenedor cambia de tamaño.
- **Loader y resumen**: `toggleLoader` controla el overlay; `updateSummary` actualiza el panel adyacente con avatar, etiquetas de amenaza/rol/sesión y muestra mensajes emergentes (whisper) al seleccionar nodos o cambiar el foco.
- **Interacciones**: `setupInteractions` registra tap/cxttap/dblclick/hover y delega en handlers registrados vía `GraphAPI.on`, manteniendo la responsabilidad del DOM en la UI.
- **Handlers**: `ensureDmGraphApi` y `ensureAgentGraphApi` conectan `dblclick` con la selección de entidad activa (`setDmGraphFocus`, `setAgentGraphFocus`).

## Testing
- El archivo `tests/graph-api.spec.mjs` crea un Cytoscape simulado y valida que:
  1. `GraphAPI.update` muestra el loader, actualiza el panel de resumen y oculta el spinner al recibir `layoutstop`;
  2. los handlers registrados con `.on('dblclick')` se invocan con los datos del nodo cuando el stub dispara un evento.
- El script `npm run test:graph-api` ejecuta esta suite sin warnings (`node --no-warnings`).

