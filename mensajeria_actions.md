# Acciones de mensajeria

## Registro
- 2025-02-14: creado `mensajeria_build.md` con tareas por fase. Aun no hay cambios en codigo.
- 2025-02-14: T1/T2/T3 en progreso: eliminados IDs duplicados para navegacion y unificados handlers; navegacion sincroniza lista y lector; agregado feedback para errores de carga y eliminacion con confirmacion.
- 2025-02-14: Playwright: cargado `http://localhost:8000/index.html` con servidor local; verificado presencia de botones con `data-msg-nav`. API no disponible en static server (404 esperados).
- 2025-02-14: Playwright: cargado `http://localhost:3001/`; verificado presencia de botones `data-msg-nav` en app real. No se hizo login/DM por falta de credenciales en esta sesion.
- 2025-02-14: Playwright: login agente Howard Pike con password `amarok`, navegue a Consola, use Sig para avanzar mensajes y confirme dialogo de eliminacion (cancelado).
- 2025-02-14: T4 implementada: filtros separados por contexto (dm/agent/overlay), carga y render usan contexto activo. Playwright: login agente, cambio a Enviados actualiza `state.messageFilters.agent.box` sin afectar otros contextos.
- 2025-02-14: T5 completada: render condicionado por contexto/rol para no actualizar listas/lectores inactivos. Playwright: en agente consola, `#message-list-dm` con 1 child (empty state) y `#message-list` en 0.
- 2025-02-14: T6 implementada: `showInboxView` ahora redirige a vista Consola y oculta overlay. Playwright: `fetch` sin cache confirma JS actualizado; el click a `command-inbox` aun mostró overlay (probable cache de JS activo).
- 2025-02-14: T7 completada: busqueda (q) y paginacion basica (page/page_size, limit/offset) en frontend/backend; UI con input Buscar texto y botones Pg-/Pg+. Playwright: Pg+ incrementa `state.messageFilters.agent.page` y escribir en Buscar texto actualiza `state.messageFilters.agent.q`.
- 2025-02-14: T8 completada: soporte de hilos/metadatos (reply_to_id, thread_id, priority) en schema/db/api/frontend; UI muestra metadata en lista/lector. Playwright: verificados inputs de busqueda (agent/dm) presentes tras cambios.
- 2025-02-14: T9 completada: polling de mensajes con badge de no leidos por contexto (agente/DM), auto-refresh si llegan nuevos (cuando la vista esta activa y sin reply abierto). Agregado control de pausa al ocultar pestaña.
