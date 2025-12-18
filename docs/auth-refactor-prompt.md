# Prompt para nueva instancia Codex: Refactor de gestion de usuarios y sesiones

## Contexto
AMINA es una webapp con Express + SQLite y frontend en `public/app.v2.js`. La autenticacion actual es muy simple:
- DM: secreto compartido en header `x-dm-secret`. En frontend se guarda en cookie `amina_secret`.
- Agentes: `/api/auth/agent` valida usuario/clave, pero no hay sesion en servidor. El frontend guarda `amina_role` y `amina_agent`.
- El rol se calcula en cliente y se persiste con cookies simples.
- `hydrateFromCookies()` borra cookies de agente en recarga para forzar re-seleccion.

Resultado: inestabilidad percibida (se "sale" de AMINA tras recargas o cambios de estado).

## Alcance y restricciones
- Enfocarse solo en la webapp principal (no tocar realtime effects `/agent.html`, `/dm.html`, websockets).
- Branch: `main`.
- No tocar ni commitear la DB (`schuylkill.db`).

## Documentacion relevante
- `README.md` describe el flujo DM/Agente y endpoints.
- `docs/auth-refactor-roadmap.md` define el plan del refactor.

## Objetivo
Implementar una gestion de sesiones mas estable y segura, reduciendo dependencia de cookies en cliente.

## Requisitos funcionales
- DM: autenticar con secreto una vez; crear sesion en servidor. No guardar secreto en cookie del cliente.
- Agente: autenticar con usuario/clave; crear sesion en servidor.
- Persistencia: la sesion debe sobrevivir recargas sin forzar re-login.
- API: incluir un endpoint `GET /api/auth/me` (o equivalente) para hidratar estado.
- Logout: endpoint `POST /api/auth/logout`.
- Mantener UX actual (boot screen y roles) con cambios minimos.

## Requisitos tecnicos
- Backend: middleware de sesion (cookie HttpOnly). Definir `requireDmSession` y `requireAgentSession`.
- Frontend: reemplazar uso de `amina_secret`/`amina_role` por la sesion server-side.
- Compatibilidad temporal: opcionalmente aceptar `x-dm-secret` mientras migra el frontend.
- Evitar romper permisos existentes en rutas DM/Agente.

## Entregables
- Cambios en `server.js` con sesion y endpoints nuevos.
- Cambios en `public/app.v2.js` para login, logout e hidratacion via `/api/auth/me`.
- Actualizar `README.md` con el nuevo flujo.
- Notas de pruebas manuales.

## Puntos a vigilar
- Multi-tab: evitar que una pestana invalide otra sin logout.
- `handleUnauthorized()` no debe borrar cookies de rol; debe pedir re-auth.
- No almacenar secretos en cookies accesibles desde JS.
