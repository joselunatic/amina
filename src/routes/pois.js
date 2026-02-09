function registerPoiRoutes(app, deps) {
  const {
    getAllPois,
    getPoiById,
    createPoi,
    updatePoi,
    deletePoi,
    replacePoiEntityLinks,
    mapPoiToEntity,
    filterAgentEntity,
    CATEGORY_VALUES,
    requireDm,
    isDmSession,
    isEncodedPoiId,
    decodePoiId,
    validatePoi,
    getChangedFields,
    ENTITY_ACTIVITY_FIELDS,
    logEntityActivity,
    logCrud,
    getActorName,
    MAPBOX_TOKEN
  } = deps;

  app.get('/api/pois', async (req, res, next) => {
    try {
      const isDm = isDmSession(req);
      const filters = {
        category: req.query.category,
        session_tag: req.query.session_tag
      };

      if (filters.category && !CATEGORY_VALUES.includes(filters.category)) {
        return res.status(400).json({ error: 'Invalid category filter.' });
      }

      const pois = await getAllPois(filters);
      const mapped = pois.map(mapPoiToEntity);
      const visible = isDm ? mapped : mapped.map(filterAgentEntity).filter(Boolean);
      logCrud('POI list', req, { count: visible.length, dm: isDm });
      res.json(visible);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/pois/:id', async (req, res, next) => {
    try {
      const poiId = isEncodedPoiId(req.params.id) ? decodePoiId(req.params.id) : req.params.id;
      const poi = await getPoiById(poiId);
      if (!poi) return res.status(404).json({ error: 'POI not found.' });
      const isDm = isDmSession(req);
      const mapped = mapPoiToEntity(poi);
      logCrud('POI get', req, { id: poiId, dm: isDm, visibility: mapped.visibility });
      res.json(isDm ? mapped : filterAgentEntity(mapped));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/pois', requireDm, async (req, res, next) => {
    try {
      logCrud('POI create', req);
      const { cleaned, entityLinks, linksProvided } = validatePoi(req.body || {});
      const created = await createPoi(cleaned);
      if (linksProvided) {
        await replacePoiEntityLinks(created.id, entityLinks);
      }
      await logEntityActivity({
        entity_type: 'poi',
        entity_id: created.id,
        entity_label: cleaned.name,
        action: 'create',
        updated_fields: [],
        actor_name: getActorName(req),
        visibility: cleaned.visibility
      });
      const fresh = await getPoiById(created.id);
      res.status(201).json(fresh);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/pois/:id', requireDm, async (req, res, next) => {
    try {
      const poiId = isEncodedPoiId(req.params.id) ? decodePoiId(req.params.id) : req.params.id;
      logCrud('POI update', req, { id: poiId });
      const existing = await getPoiById(poiId);
      if (!existing) {
        return res.status(404).json({ error: 'POI not found.' });
      }
      const { cleaned, entityLinks, linksProvided } = validatePoi(req.body || {});
      if (cleaned.agent_notes === undefined) {
        cleaned.agent_notes = existing.agent_notes || '';
      }
      await updatePoi(poiId, cleaned);
      if (linksProvided) {
        await replacePoiEntityLinks(poiId, entityLinks);
      }
      const updatedFields = getChangedFields(existing, cleaned, ENTITY_ACTIVITY_FIELDS.poi);
      await logEntityActivity({
        entity_type: 'poi',
        entity_id: poiId,
        entity_label: cleaned.name || existing.name,
        action: 'update',
        updated_fields: updatedFields,
        actor_name: getActorName(req),
        visibility: cleaned.visibility || existing.visibility
      });
      const fresh = await getPoiById(poiId);
      res.json(fresh);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/pois/:id', requireDm, async (req, res, next) => {
    try {
      const poiId = isEncodedPoiId(req.params.id) ? decodePoiId(req.params.id) : req.params.id;
      logCrud('POI delete', req, { id: poiId });
      const existing = await getPoiById(poiId);
      if (!existing) {
        return res.status(404).json({ error: 'POI not found.' });
      }
      await deletePoi(poiId);
      await logEntityActivity({
        entity_type: 'poi',
        entity_id: poiId,
        entity_label: existing.name,
        action: 'delete',
        updated_fields: [],
        actor_name: getActorName(req),
        visibility: existing.visibility
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/dm/generate_static_map/:poiId', async (req, res, next) => {
    try {
      const poi = await getPoiById(req.params.poiId);
      if (!poi) {
        return res.status(404).json({ error: 'POI not found.' });
      }

      const lon = poi.longitude;
      const lat = poi.latitude;
      const zoom = 15;
      const width = 800;
      const height = 600;
      const style = 'mapbox/satellite-v9';
      const marker = `pin-s-star+ff0000(${lon},${lat})`;
      const staticImageUrl = `https://api.mapbox.com/styles/v1/${style}/static/${marker}/${lon},${lat},${zoom},0/${width}x${height}?access_token=${MAPBOX_TOKEN}`;

      res.json({ imageUrl: staticImageUrl });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = {
  registerPoiRoutes
};
