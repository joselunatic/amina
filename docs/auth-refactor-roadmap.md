# Roadmap: Refactor de gestion de usuarios y sesiones (AMINA webapp)

## Contexto actual (resumen)
- DM: autenticacion por secreto compartido en header `x-dm-secret` y guardado en cookie (`amina_secret`).
- Agentes: login contra `/api/auth/agent` sin sesion en servidor; el cliente guarda `amina_role` y `amina_agent`.
- La UI y el rol dependen de cookies en cliente y de estado en memoria.
- `hydrateFromCookies()` borra `amina_role` y `amina_agent` para forzar re-seleccion tras recarga.

## Objetivos
- Evitar desconexiones inesperadas y perdida de rol tras recarga.
- Consolidar un modelo de sesion estable y verificable en servidor.
- Mantener el flujo DM/Agente con UX similar, pero mas robusto.
- No tocar el sistema de realtime effects.

## Fase 0 - Inventario y requisitos
- Mapear todos los puntos de entrada de autenticacion y permisos:
  - `POST /api/auth/dm`, `POST /api/auth/agent`, uso de `x-dm-secret`.
  - Cookies `amina_role`, `amina_secret`, `amina_agent`, `agent_active_entity`.
  - `handleUnauthorized()` y `hydrateFromCookies()` en `public/app.v2.js`.
- Definir roles y capacidades reales:
  - DM: CRUD completo + visibilidad DM.
  - Agente: lectura publica + desbloqueos.
- Decidir persistencia: sesion server-side vs token.

## Fase 1 - Diseno de sesion y modelo de identidad
- Propuesta base (simple y robusta):
  - Sesion HTTP con cookie HttpOnly (server-side), mismo dominio.
  - Estado de sesion: `{ role: 'dm' | 'agent', agentId, agentDisplay }`.
  - Endpoint `POST /api/auth/logout` para limpiar sesion.
- DM:
  - Validar secreto una vez y crear sesion DM en servidor.
  - Evitar guardar el secreto en cookie del cliente.
- Agente:
  - `POST /api/auth/agent` crea sesion y devuelve perfil.
  - Persistir el rol sin borrar cookies en `hydrateFromCookies()`.

## Fase 2 - Implementacion incremental
- Backend:
  - Introducir middleware de sesion.
  - Proteger rutas DM con `requireDmSession`.
  - Opcional: permitir `x-dm-secret` durante transicion.
- Frontend:
  - Reemplazar `amina_secret` y `amina_role` con consulta a `/api/auth/me`.
  - `handleUnauthorized()` debe forzar re-auth, no limpiar cookies criticas.
  - Eliminar el borrado forzado de cookies en `hydrateFromCookies()`.
- Persistencia del agente:
  - Mantener `amina_agent` solo si es necesario para UI; evitar que determine permisos.

## Fase 3 - Migracion y compatibilidad
- Mantener compatibilidad con secreto DM en header durante un periodo corto.
- Si hay varias pestañas:
  - Segmentar estado UI (p. ej. `sessionStorage` para pestaña) sin romper sesion global.
- Definir estrategia de logout:
  - Boton de cierre llama a `/api/auth/logout`.

## Fase 4 - Observabilidad y pruebas
- Añadir logs ligeros de eventos auth:
  - login, logout, expiracion, intento invalido.
- Casos de prueba manual:
  - Recarga de pagina no debe sacar a DM o Agente.
  - 401 temporal no debe eliminar el rol de forma agresiva.
  - Multi-tab: una pestana no debe invalidar otra sin accion explicita.

## Fase 5 - Limpieza
- Eliminar cookies antiguas (`amina_secret`, `amina_role`) y rutas legacy si se decide.
- Documentar el nuevo flujo en README.
