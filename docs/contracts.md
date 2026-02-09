# API & WS Contracts (source of truth: code)

This document is derived from `src/app.js`, `src/routes/*.js`, `server.js`, `src/middleware/auth.js`, and frontend callers in `public/*.js`.
If README differs, code wins.

## Session, cookies, auth gates

- Session middleware: `express-session` with cookie name `amina.sid`.
- Cookie flags: `HttpOnly=true`, `SameSite=Lax`, `Secure=(NODE_ENV==='production')`, long maxAge.
- DM login: `POST /api/auth/dm` accepts body `password` or header `x-dm-secret`.
- Agent login: `POST /api/auth/agent` with username/password.
- Protected endpoints use session role checks (`dm`, `agent`, or any authenticated session).
- `x-dm-secret` does **not** bypass protected DM routes directly; it is used for DM login.

## Roles and field visibility

- Roles: `guest`, `agent`, `dm` (`GET /api/auth/me`).
- DM-only endpoints: `/api/dm/*`, chat identity CRUD, POI CRUD, Entropia write (`PUT /api/entropia/zones`), DM journal write/read.
- Agent-only endpoints: `/api/agent/*`, `/api/messages/agent`.
- DM-only data fields (by behavior): `dm_note`, `dm_notes`, locked metadata (`unlock_code`, `locked_hint`) and non-public relations/context.
- Agent view uses filtered entities/POIs (`filterAgentEntity`) and cannot access locked private context unless unlocked.

## HTTP endpoints

## Config and misc
- `GET /api/config`
  - 200: `{ mapboxToken, mapStyle, debug }`
- `GET /api/event-ticker`
  - 200: JSON payload from `docs/eventTicker.json`
  - 500: `{ error: 'Unable to load ticker data.' }` or `{ error: 'Ticker data corrupted.' }`
- `GET /api/activity` (session required)
  - Query: `limit`, `offset`
  - 200: `{ items, total, limit, offset }` (shape comes from DB helper)

## Auth
- `POST /api/auth/dm`
  - Body: `{ password }` (or header `x-dm-secret`)
  - 204 on success
  - 400 missing password, 401 invalid credentials, 409 DM password not configured
- `GET /api/auth/agents`
  - 200: `[{ username, display, configured }]`
- `GET /api/auth/bootstrap`
  - 200: `{ dmConfigured, agents: [{ username, display, configured }] }`
- `POST /api/auth/agent`
  - Body: `{ username, password }`
  - 200: `{ username, display }`
  - 400, 401, 409
- `POST /api/auth/dm/password`
  - Body: `{ currentPassword?, newPassword }`
  - 200: `{ status: 'ok' }`
  - 400, 401, 404
- `POST /api/auth/agent/password`
  - Body: `{ username, currentPassword?, newPassword }`
  - 200: `{ status: 'ok' }`
  - 400, 401, 404
- `GET /api/auth/me`
  - 200: `{ role:'guest' }` | `{ role:'dm' }` | `{ role:'agent', agentId, agentDisplay }`
- `POST /api/auth/logout`
  - 204, clears `amina.sid`

## POIs
- `GET /api/pois`
  - Query: `category`, `session_tag`
  - 200: `[poiEntity...]` (DM full, Agent filtered)
  - 400 invalid category
- `GET /api/pois/:id`
  - 200: `poiEntity` (DM full, Agent filtered)
  - 404 `{ error:'POI not found.' }`
- `POST /api/pois` (DM session)
  - Body (validated): `name, category, latitude, longitude, threat_level, veil_status` + optional notes/visibility/links
  - 201: created POI row
  - 400 validation, 401 unauth
- `PUT /api/pois/:id` (DM session)
  - Same payload model as create
  - 200: updated POI row
  - 404 not found
- `DELETE /api/pois/:id` (DM session)
  - 204
  - 404 not found
- `GET /api/dm/generate_static_map/:poiId`
  - 200: `{ imageUrl }`
  - 404

## Messages and chat
- `GET /api/messages`
  - Query: `recipient, session_tag, since, limit, offset, q, box, unread_only, viewer, role`
  - 200: message list
- `GET /api/messages/identities` (session)
  - 200: `{ identities }`
- `POST /api/messages` (DM session)
  - Body: `{ sender, recipient, subject, body, session_tag?, reply_to_id?, thread_id?, priority? }`
  - 201: created message
  - 400 validation
- `POST /api/messages/:id/read`
  - Body/query: `viewer`
  - 200 updated message, 400, 404
- `POST /api/messages/:id/delete`
  - Body/query: `viewer`, optional `box`
  - 200 `{ status:'ok' }`, 400, 404
- `POST /api/messages/agent` (agent session)
  - Body: `{ recipient?, subject, body, session_tag?, reply_to_id?, thread_id?, priority? }`
  - 201 created message
  - 400/403/404 validation/permissions

- `GET /api/chat/identities` (session) -> `{ identities }`
- `POST /api/chat/identities` (DM) body `{ name }` -> 201 created, 400, 409
- `PUT /api/chat/identities/:id` (DM) body `{ name }` -> 200 updated, 404, 409
- `DELETE /api/chat/identities/:id` (DM) -> 204, 404, 409 in-use
- `GET /api/chat/threads` (session) -> `{ threads }`
- `GET /api/chat/threads/:id/messages` (session) -> `{ thread, messages }`, 400, 403, 404
- `POST /api/chat/messages` (session)
  - Body DM mode: `{ body, threadId? }` or `{ body, agentUsername, identityId }`
  - Body Agent mode: `{ body, threadId? }` or `{ body, identityId }`
  - 201: `{ thread, message }`, 400, 403, 404

## Entropia
- `GET /api/entropia/zones` (session)
  - 200: `{ zones }`
- `PUT /api/entropia/zones` (session)
  - Body: array or `{ zones:[...] }`
  - 200: `{ zones: updated }`
  - 400 invalid payload

## Dossiers / entities
- DM (all require DM session)
  - `GET /api/dm/entities`
  - `GET /api/dm/entities/:id`
  - `GET /api/dm/entities/:id/context`
  - `GET /api/dm/graph/campaign`
  - `POST /api/dm/entities`
  - `PUT /api/dm/entities/:id`
  - `POST /api/dm/entities/:id/archive`
  - `DELETE /api/dm/entities/:id`
- Agent (all require agent session)
  - `GET /api/agent/entities`
  - `GET /api/agent/entities/:id`
  - `GET /api/agent/entities/:id/context`
  - `POST /api/agent/entities/:id/notes`
  - `GET /api/agent/graph/campaign`
  - `POST /api/agent/entities/:id/unlock`
- Common error patterns: 401 unauthenticated, 403 forbidden/locked, 404 not found, 400 validation.

## Journal and character sheet
- Agent
  - `GET /api/agent/journal?season=&session=` -> `{ season, session, public_note }`
  - `POST /api/agent/journal` body `{ season?, session?, public_note? }` -> same shape
  - `GET /api/agent/character-sheet` -> `{ sheet }`
  - `PUT /api/agent/character-sheet` body `{ sheet }` or sheet object -> `{ sheet }`
- DM
  - `GET /api/dm/journal` (`?list=1` returns list, else one entry)
  - `POST /api/dm/journal` body `{ season?, session?, public_note?, dm_note? }`

## WebSocket contracts

Transport:
- WS endpoint: same host/port as HTTP (`ws://<host>:<port>`).
- Static pages present: `/dm.html`, `/agent.html`.

Client hello frames:
- DM console: `{ type:'hello', role:'dm' }`
- Agent view: `{ type:'hello', role:'agent', agentId }`
- Message console channel: `{ type:'hello', role:'console' }`
- Chat realtime channel: `{ type:'hello', role:'chat', mode:'dm'|'agent', agentUsername? }`

Server -> client events:
- `agents-list`: `{ type:'agents-list', agents:[{ agentId }] }`
- `effect`: `{ type:'effect', effect, payload }`
- `message`: `{ type:'message', message:{ id,sender,recipient,created_by,reply_to_id,thread_id,priority,created_at } }`
- `chat`: `{ type:'chat', event:'message', threadId, thread, message }`

Client -> server effect trigger:
- DM-only accepted: `{ type:'effect', effect, target:'all'|'agent', agentId?, payload }`

## README discrepancies (code takes precedence)

- README says several DM write routes require `x-dm-secret`; code requires an active DM session cookie for protected DM endpoints.
- README summary for `GET /api/messages` is agent-only; code supports role-aware inbox/sent filters for DM and agent.
- README endpoint list is incomplete (chat, entities, journals, entropia, activity, character sheet are present in code).
