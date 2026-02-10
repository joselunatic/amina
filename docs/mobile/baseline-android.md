# Baseline Android

Objetivo: mantener el frontend web en `public/` y aislar el contenedor Android en `mobile/`.

## Estructura

- `public/`: frontend web principal.
- `mobile/`: proyecto Capacitor para Android.
- `mobile/android/`: proyecto Android nativo generado por Capacitor.

## Comandos desde raíz

- `npm run mobile:install`
- `npm run mobile:add:android`
- `npm run mobile:sync`
- `npm run mobile:open`
- `npm run mobile:run`

## Configuración de URL

- `mobile/capacitor.config.json` define `server.url` (por defecto `https://amina.joselun.xyz`).
- Tras cambiar la URL, ejecutar `npm run mobile:sync`.

## Smoke móvil mínimo

1. Login agente.
2. Ver lista de POIs.
3. Crear/editar/borrar un POI.
4. Ver mensajes.
5. Si aplica, validar recepción WS de evento DM -> Agent.
