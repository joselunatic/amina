# Entropia Data Tracking

## Objetivo
Modelar y servir la informacion dinamica de Entropia (zonas + modules) desde DB/API, con edición completa para agente y DM.

## Estado
- En curso: UI lee /api/entropia/zones y cae a /data/base_zones.json si no hay sesion.
- UI pendiente: adaptar paneles para consumir modules.

## Cambios realizados
1) Base de datos
- Añadir tablas: entropia_zones, entropia_modules, entropia_module_items.
- Ubicación: schema.sql.

2) API
- Nuevo GET/PUT: /api/entropia/zones.
- Lectura/escritura disponible para sesiones agente y DM.
- Log de actor desde getActorName(req).

3) UI (lectura)
- Consumo desde /api/entropia/zones en public/app.v2.js.
- Normaliza zones/modules/items y pinta modulos en el panel inferior.

4) UI (edicion)
- Editor JSON por zona (lectura + PUT) dentro de la pestaña ENTROPIA.
- Guarda dataset completo via /api/entropia/zones.

3) DB helpers
- listEntropiaZones(): devuelve zonas con modules/items.
- replaceEntropiaZones(zones, actor): reemplaza dataset completo.

## Rollback
1) Eliminar endpoints de /api/entropia/zones en server.js.
2) Quitar funciones listEntropiaZones/replaceEntropiaZones de db.js y module.exports.
3) Eliminar tablas entropia_* de schema.sql y recrear DB si fuera necesario:
   - Borrar schuylkill.db.
   - Ejecutar npm start para regenerar schema.

## Notas
- Sin cambios UI en esta fase.
- Modules incluyen available=false para módulos no disponibles.
