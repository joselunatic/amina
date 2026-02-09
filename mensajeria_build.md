# Roadmap de mensajeria (tareas)

## Fase rapida (1-3 dias)
**Objetivo:** corregir fallos funcionales y sincronia basica.

### T1. Eliminar IDs duplicados y unificar handlers prev/next
- **Problema:** `#msg-prev` y `#msg-next` aparecen duplicados en agente y DM; `getElementById` solo enlaza el primero.
- **Cambio:** usar clases/data-atributos para botones de navegacion y enlazar a todos los botones relevantes.
- **Archivos:** `public/index.html`, `public/app.v2.js`
- **Riesgos:** bajo; asegurar que la navegacion mantiene el foco correcto.

### T2. Sincronizar lista y lector al navegar
- **Problema:** `showPrevMessage`/`showNextMessage` actualizan el lector pero no refrescan la lista activa.
- **Cambio:** re-render de listas tras cambiar `activeMessageIndex` (o actualizar clases active sin recrear todo).
- **Archivos:** `public/app.v2.js`
- **Riesgos:** bajo; cuidar performance si se re-renderiza todo.

### T3. Feedback de acciones destructivas y errores de carga
- **Problema:** eliminar mensajes y fallos de carga no muestran feedback visible al usuario.
- **Cambio:** confirmacion antes de eliminar; mostrar mensaje de error en carga.
- **Archivos:** `public/app.v2.js`, `public/styles.css` (si se agrega UI)
- **Riesgos:** bajo; evitar bloquear flujo DM.

## Fase media (1-2 semanas)
**Objetivo:** coherencia de UX entre vistas y reduccion de duplicaciones.

### T4. Separar estado de filtros por rol/vista
- **Problema:** `state.messageFilters` se comparte entre DM/agente/overlay.
- **Cambio:** dividir filtros por contexto (e.g. `messageFiltersDm`, `messageFiltersAgent`, `messageFiltersOverlay`).
- **Archivos:** `public/app.v2.js`
- **Riesgos:** medio; riesgo de regresion en carga de mensajes.

### T5. Unificar render y evitar renders de vistas inactivas
- **Problema:** se actualizan listas y lectores para ambas vistas aunque no esten visibles.
- **Cambio:** render condicional por vista activa; abstraer helpers comunes.
- **Archivos:** `public/app.v2.js`
- **Riesgos:** medio; asegurar que no se rompe el modo mobile.

### T6. Integrar overlay de inbox o deprecacion controlada
- **Problema:** overlay es UI paralelo sin acciones ni estados completos.
- **Cambio:** decidir si se integra a la vista de consola o se elimina con fallback.
- **Archivos:** `public/index.html`, `public/app.v2.js`, `public/styles.css`
- **Riesgos:** medio; impacto en flujo boot/command.

## Fase larga (2-6 semanas)
**Objetivo:** mensajeria robusta y escalable.

### T7. Paginacion y busqueda avanzada
- **Cambio:** paginar resultados y agregar busqueda por asunto/remitente/sesion.
- **Archivos:** `public/app.v2.js`, backend `/api/messages`.
- **Riesgos:** alto; cambios en API y estado.

### T8. Hilos y metadatos de mensaje
- **Cambio:** threading (replies agrupadas) y estado extendido (etiquetas, prioridad).
- **Archivos:** `public/app.v2.js`, backend, esquema DB.
- **Riesgos:** alto; migraciones.

### T9. Actualizacion en tiempo real
- **Cambio:** WebSocket o polling optimizado con badges de no leidos.
- **Archivos:** `public/app.v2.js`, servidor.
- **Riesgos:** alto; sincronizacion y escalado.
