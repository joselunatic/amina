# Effects / Scene System – Recap (iteraciones recientes)

## Backend (solo efectos)
- Nuevas tablas SQLite: `scenes` (name, description, default_target) y `scene_beats` (scene_id, order_index, type, payload JSON, delay_ms, duration_ms, target). No se toca la webapp principal.
- API REST CRUD:
  - `/api/scenes` (GET lista, POST crea, GET/PUT/DELETE /:id)
  - `/api/scenes/:id/beats` (GET lista, POST crea, PUT/DELETE /:beatId, POST /reorder)
- WebSocket `scene-control`: acciones `load/play/next/prev/pause/stop` envían beats como efectos existentes (SCENE_FLYOVER, SCENE_CARD, SCENE_OVERLAY_IMAGE/VIDEO, LABEL_PING, HEATMAP_SET/CLEAR, MODE_BLACKOUT, CLEAR_OVERLAYS). Stop limpia overlays/heatmap/blackout.
- Autoplay: usa delay_ms (o duration_ms / payload duration) para programar siguiente beat; logs detallados en stdout para CRUD y control.

## Consola DM (public/dm.html/.js/.css)
- Nueva pestaña “Escenas”:
  - Lista de escenas (CRUD con DM secret), selector de target.
  - Builder de beats con tipos camera_move, overlay_card, overlay_image, overlay_video, label, heatmap, heatmap_clear, blackout, clear; pick de coords desde mapa o POI; previews de media.
  - Timeline con editar, borrar, reorder ↑/↓.
  - Reproductor (play/pause/next/prev/stop) conectado al WS `scene-control`.
  - Vista previa Mapbox del beat actual.
  - Import/Export de escenas en JSON; botón “Copiar JSON” y textarea amplio.
- Efectos existentes se mantienen (glitch, vignette, barridos, blackout, heatmap, overlays, labels).

## Vista Agente (public/agent.html/.js/.css)
- Soporte para overlay de video (`SCENE_OVERLAY_VIDEO`) además de overlay de imagen; CLEAR_OVERLAYS/stop también ocultan image/video overlays.
- Limpieza extra en CLEAR_OVERLAYS para no dejar restos.

## Ejemplos
- `scene1.json`: escena breve “Incidente Holloway”.
- `scene1_rich.json`: variante más cinematográfica con múltiples flyovers, labels y overlay visual.

## Cómo usar/importar
1) En la pestaña Escenas, pon el DM secret.
2) Export/Import: pega JSON en el textarea y “Importar como nueva” (o usa los archivos de ejemplo).
3) Reproduce con Play; autoplay usa los delays/durations de cada beat. Stop limpia overlays/heatmap/blackout.
