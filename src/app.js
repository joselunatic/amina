const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const {
  isDmSession,
  isAgentSession,
  requireDm: requireDmSession,
  requireAgent: requireAgentSession,
  requireAny: requireAnySession
} = require('./middleware/auth');
const { errorHandler } = require('./middleware/error');
const { registerAuthRoutes } = require('./routes/auth');
const { registerMessageRoutes } = require('./routes/messages');
const { registerEventTickerRoutes } = require('./routes/eventTicker');
const { registerPoiRoutes } = require('./routes/pois');
const { normalizeUsername, validateNewPassword } = require('./validation/auth');
const { getChangedFields, validatePoi, validateEntity } = require('./validation/entities');
const {
  mapPoiToEntity,
  getAllPois,
  getPoiById,
  createPoi,
  updatePoi,
  deletePoi,
  CATEGORY_VALUES,
  VEIL_VALUES,
  getMessages,
  listDmMessageIdentities,
  listAgentMessageIdentities,
  getMessageById,
  createMessage,
  markMessageRead,
  getEntitiesForDm,
  getEntityForDm,
  getEntitiesForAgent,
  getEntityForAgent,
  createEntity,
  updateEntity,
  archiveEntity,
  getEntityContext,
  getCampaignGraphContext,
  getAgentCampaignGraphContext,
  filterAgentEntity,
  unlockEntity,
  replacePoiEntityLinks,
  ENTITY_TYPES,
  deleteMessageForViewer,
  deleteEntity,
  upsertJournalEntry,
  getJournalEntry,
  listJournalEntries,
  getAgentCharacterSheet,
  updateAgentCharacterSheet,
  getAuthUser,
  listAuthUsersByRole,
  updateAuthPassword,
  updateAgentNotesAndLinks,
  updatePoiAgentNotes,
  listChatIdentities,
  getChatIdentityById,
  createChatIdentity,
  updateChatIdentity,
  deleteChatIdentity,
  getChatThreadById,
  resolveChatThread,
  listChatThreads,
  listChatMessages,
  createChatMessage,
  logEntityActivity,
  listEntityActivity,
  listEntropiaZones,
  replaceEntropiaZones
} = require('./db');
const { hashPassword, verifyPassword } = require('../auth');

const app = express();
// Trust first proxy hop (Traefik) so secure cookies work behind HTTPS termination.
app.set('trust proxy', 1);
const DM_SECRET = process.env.DM_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || DM_SECRET || 'amina-dev-session-secret';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365 * 10;
const SESSION_DB_PATH = path.resolve(
  process.env.SESSION_DB_PATH || path.join(__dirname, '..', 'sessions.sqlite')
);
const MAPBOX_TOKEN =
  process.env.MAPBOX_PUBLIC_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  'YOUR_MAPBOX_ACCESS_TOKEN_HERE';
const MAPBOX_STYLE =
  process.env.MAPBOX_STYLE_URL || 'mapbox://styles/joselun/cmi3ezivh00gi01s98tef234h';
const DEBUG_MODE = process.env.DEBUG === 'true';
const POI_ID_OFFSET = 100000;
const DM_ACTOR = 'MrTruth';
const realtimeHooks = {
  broadcastMessageEvent: () => {},
  broadcastChatMessage: () => {}
};

function redactPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = Array.isArray(payload) ? payload.map(redactPayload) : { ...payload };
  const sensitiveKeys = [
    'x-dm-secret',
    'dm_secret',
    'code',
    'unlock_code',
    'locked_hint',
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword'
  ];
  Object.keys(clone).forEach((key) => {
    if (sensitiveKeys.includes(key)) {
      clone[key] = '[redacted]';
    } else if (clone[key] && typeof clone[key] === 'object') {
      clone[key] = redactPayload(clone[key]);
    }
  });
  return clone;
}

function logCrud(label, req, extra = {}) {
  const dm = isDmSession(req);
  const meta = {
    method: req.method,
    path: req.originalUrl || req.url,
    dm,
    body: redactPayload(req.body || {}),
    ...extra
  };
  console.log(`[CRUD] ${label}`, meta);
}

const ENTITY_ACTIVITY_FIELDS = {
  entity: [
    { key: 'code_name', type: 'string' },
    { key: 'real_name', type: 'string' },
    { key: 'role', type: 'string' },
    { key: 'status', type: 'string' },
    { key: 'alignment', type: 'string' },
    { key: 'threat_level', type: 'number' },
    { key: 'image_url', type: 'string' },
    { key: 'mel', type: 'string' },
    { key: 'public_summary', type: 'string' },
    { key: 'dm_notes', type: 'string' },
    { key: 'agent_notes', type: 'string' },
    { key: 'visibility', type: 'string' },
    { key: 'unlock_code', type: 'string' },
    { key: 'locked_hint', type: 'string' },
    { key: 'archived', type: 'boolean' }
  ],
  poi: [
    { key: 'name', type: 'string' },
    { key: 'category', type: 'string' },
    { key: 'latitude', type: 'number' },
    { key: 'longitude', type: 'number' },
    { key: 'image_url', type: 'string' },
    { key: 'agent_notes', type: 'string' },
    { key: 'threat_level', type: 'number' },
    { key: 'veil_status', type: 'string' },
    { key: 'session_tag', type: 'string' },
    { key: 'public_note', type: 'string' },
    { key: 'dm_note', type: 'string' },
    { key: 'visibility', type: 'string' },
    { key: 'unlock_code', type: 'string' },
    { key: 'locked_hint', type: 'string' }
  ]
};

function validatePoiPayload(payload) {
  return validatePoi(payload, { CATEGORY_VALUES, VEIL_VALUES });
}

function validateEntityPayload(payload) {
  return validateEntity(payload, { ENTITY_TYPES });
}

app.use(express.json());
app.use(
  session({
    name: 'amina.sid',
    store: new SQLiteStore({
      db: path.basename(SESSION_DB_PATH),
      dir: path.dirname(SESSION_DB_PATH),
      table: 'sessions'
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_MS
    }
  })
);
app.use(express.static(path.join(__dirname, '..', 'public')));

function encodePoiIds(entity) {
  if (!entity || entity.type !== 'poi') return entity;
  const encodedId = POI_ID_OFFSET + Number(entity.id);
  return {
    ...entity,
    poi_id: entity.id,
    id: encodedId,
    _key: `poi:${encodedId}`
  };
}

function encodePoisInList(list = []) {
  return list.map((item) => (item && item.type === 'poi' ? encodePoiIds(item) : item));
}

function isEncodedPoiId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n >= POI_ID_OFFSET;
}

function decodePoiId(id) {
  const n = Number(id);
  return n - POI_ID_OFFSET;
}

if (DEBUG_MODE) {
  app.use((req, res, next) => {
    console.debug(`[DEBUG] ${req.method} ${req.url}`);
    next();
  });
}

app.get('/api/config', (req, res) => {
  res.json({
    mapboxToken: MAPBOX_TOKEN,
    mapStyle: MAPBOX_STYLE,
    debug: DEBUG_MODE
  });
});

app.get('/api/entropia/zones', requireAnySession, async (req, res, next) => {
  try {
    const zones = await listEntropiaZones();
    logCrud('Entropia zones list', req, { count: zones.length });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
});

app.put('/api/entropia/zones', requireAnySession, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const zones = Array.isArray(payload) ? payload : payload.zones;
    if (!Array.isArray(zones)) {
      return res.status(400).json({ error: 'Zones payload must be an array.' });
    }
    const actor = getActorName(req);
    const updated = await replaceEntropiaZones(zones, actor);
    logCrud('Entropia zones replace', req, { count: updated.length, actor });
    res.json({ zones: updated });
  } catch (err) {
    next(err);
  }
});

registerAuthRoutes(app, {
  getAuthUser,
  listAuthUsersByRole,
  updateAuthPassword,
  hashPassword,
  verifyPassword,
  DM_SECRET,
  normalizeUsername,
  validateNewPassword,
  isDmSession,
  isAgentSession
});

registerMessageRoutes(app, {
  listAuthUsersByRole,
  getMessages,
  listDmMessageIdentities,
  listAgentMessageIdentities,
  createMessage,
  markMessageRead,
  deleteMessageForViewer,
  getMessageById,
  listChatIdentities,
  getChatIdentityById,
  createChatIdentity,
  updateChatIdentity,
  deleteChatIdentity,
  listChatThreads,
  getChatThreadById,
  listChatMessages,
  resolveChatThread,
  createChatMessage,
  DM_ACTOR,
  requireAny: requireAnySession,
  requireDm: requireDmSession,
  requireAgent: requireAgentSession,
  isDmSession,
  isAgentSession,
  normalizeUsername,
  broadcastMessageEvent: (message) => realtimeHooks.broadcastMessageEvent(message),
  broadcastChatMessage: (payload) => realtimeHooks.broadcastChatMessage(payload)
});

registerEventTickerRoutes(app, {
  rootDir: path.join(__dirname, '..')
});

registerPoiRoutes(app, {
  getAllPois,
  getPoiById,
  createPoi,
  updatePoi,
  deletePoi,
  replacePoiEntityLinks,
  mapPoiToEntity,
  filterAgentEntity,
  CATEGORY_VALUES,
  requireDm: requireDmSession,
  isDmSession,
  isEncodedPoiId,
  decodePoiId,
  validatePoi: validatePoiPayload,
  getChangedFields,
  ENTITY_ACTIVITY_FIELDS,
  logEntityActivity,
  logCrud,
  getActorName,
  MAPBOX_TOKEN
});

app.get('/api/activity', requireAnySession, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;
    const mode = isDmSession(req) ? 'dm' : 'agent';
    const activity = await listEntityActivity({ limit, offset, mode });
    res.json({ ...activity, limit, offset });
  } catch (err) {
    next(err);
  }
});
// --- Dossiers: rutas DM ---
app.get('/api/dm/entities', requireDmSession, async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      status: req.query.status,
      alignment: req.query.alignment,
      session: req.query.session,
      q: req.query.q,
      includeArchived: req.query.includeArchived === '1' || req.query.includeArchived === 'true'
    };
    const entities = await getEntitiesForDm(filters);
    res.json(encodePoisInList(entities));
  } catch (err) {
    next(err);
  }
});

app.get('/api/dm/entities/:id', requireDmSession, async (req, res, next) => {
  try {
    const kind = req.query.kind || req.query.type || '';
    const paramId = req.params.id;
    if (kind === 'poi' || isEncodedPoiId(paramId)) {
      const poiId = kind === 'poi' ? paramId : decodePoiId(paramId);
      const poi = await getPoiById(poiId);
      if (!poi) return res.status(404).json({ error: 'Entidad no encontrada.' });
      return res.json(encodePoiIds(mapPoiToEntity(poi)));
    }
    const entity = await getEntityForDm(paramId);
    if (!entity) return res.status(404).json({ error: 'Entidad no encontrada.' });
    res.json(entity);
  } catch (err) {
    next(err);
  }
});

app.get('/api/dm/entities/:id/context', requireDmSession, async (req, res, next) => {
  try {
    const kind = req.query.kind || req.query.type || '';
    const paramId = req.params.id;
    if (kind === 'poi' || isEncodedPoiId(paramId)) {
      const poiId = kind === 'poi' ? paramId : decodePoiId(paramId);
      const poi = await getPoiById(poiId);
      if (!poi) return res.status(404).json({ error: 'Entidad no encontrada.' });
      const mapped = encodePoiIds(mapPoiToEntity(poi));
      return res.json({ entity: mapped, pois: [mapped], sessions: [], relations: [] });
    }
    const ctx = await getEntityContext(paramId, { includePrivate: true });
    if (!ctx) return res.status(404).json({ error: 'Entidad no encontrada.' });
    const encodedCtx = {
      ...ctx,
      entity: ctx.entity && ctx.entity.type === 'poi' ? encodePoiIds(ctx.entity) : ctx.entity,
      pois: Array.isArray(ctx.pois) ? ctx.pois.map((p) => (p.type === 'poi' ? encodePoiIds(p) : p)) : ctx.pois
    };
    res.json(encodedCtx);
  } catch (err) {
    next(err);
  }
});

app.get('/api/dm/graph/campaign', requireDmSession, async (req, res, next) => {
  try {
    const ctx = await getCampaignGraphContext();
    res.json(ctx);
  } catch (err) {
    next(err);
  }
});

app.post('/api/dm/entities', requireDmSession, async (req, res, next) => {
  try {
    logCrud('Entity create', req);
    const raw = req.body || {};
    if (raw.type === 'poi') {
      const { cleaned, entityLinks, linksProvided } = validatePoiPayload(raw);
      const createdPoi = await createPoi(cleaned);
      if (linksProvided) await replacePoiEntityLinks(createdPoi.id, entityLinks);
      await logEntityActivity({
        entity_type: 'poi',
        entity_id: createdPoi.id,
        entity_label: cleaned.name,
        action: 'create',
        updated_fields: [],
        actor_name: getActorName(req),
        visibility: cleaned.visibility
      });
      return res.status(201).json(mapPoiToEntity(createdPoi));
    }
    const payload = validateEntityPayload(raw);
    const created = await createEntity(payload.cleaned, payload.relations);
    await logEntityActivity({
      entity_type: 'entity',
      entity_id: created.id,
      entity_label: payload.cleaned.code_name,
      action: 'create',
      updated_fields: [],
      actor_name: getActorName(req),
      visibility: payload.cleaned.visibility
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/dm/entities/:id', requireDmSession, async (req, res, next) => {
  try {
    logCrud('Entity update', req, { id: req.params.id });
    const existing = await getEntityForDm(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entidad no encontrada.' });

    if (existing.type === 'poi' || req.body?.type === 'poi') {
      const poiId = isEncodedPoiId(req.params.id) ? decodePoiId(req.params.id) : req.params.id;
      const existingPoi = await getPoiById(poiId);
      const { cleaned, entityLinks, linksProvided } = validatePoiPayload(req.body || {});
      if (cleaned.agent_notes === undefined && existingPoi) {
        cleaned.agent_notes = existingPoi.agent_notes || '';
      }
      const updatedPoi = await updatePoi(poiId, cleaned);
      if (linksProvided) await replacePoiEntityLinks(poiId, entityLinks);
      if (existingPoi) {
        const updatedFields = getChangedFields(existingPoi, cleaned, ENTITY_ACTIVITY_FIELDS.poi);
        await logEntityActivity({
          entity_type: 'poi',
          entity_id: poiId,
          entity_label: cleaned.name || existingPoi.name,
          action: 'update',
          updated_fields: updatedFields,
          actor_name: getActorName(req),
          visibility: cleaned.visibility || existingPoi.visibility
        });
      }
      return res.json(mapPoiToEntity(updatedPoi));
    }

    const payload = validateEntityPayload(req.body || {});
    const updated = await updateEntity(req.params.id, payload.cleaned, payload.relations);
    const updatedFields = getChangedFields(existing, payload.cleaned, ENTITY_ACTIVITY_FIELDS.entity);
    await logEntityActivity({
      entity_type: 'entity',
      entity_id: req.params.id,
      entity_label: payload.cleaned.code_name || existing.code_name || existing.name,
      action: 'update',
      updated_fields: updatedFields,
      actor_name: getActorName(req),
      visibility: payload.cleaned.visibility || existing.visibility
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.post('/api/dm/entities/:id/archive', requireDmSession, async (req, res, next) => {
  try {
    logCrud('Entity archive', req, { id: req.params.id });
    const exists = await getEntityForDm(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Entidad no encontrada.' });
    const archived = await archiveEntity(req.params.id);
    res.json(archived);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/dm/entities/:id', requireDmSession, async (req, res, next) => {
  try {
    logCrud('Entity delete', req, { id: req.params.id });
    const kind = req.query.kind || req.query.type || '';
    const paramId = req.params.id;
    if (kind === 'poi' || isEncodedPoiId(paramId)) {
      const poiId = kind === 'poi' ? paramId : decodePoiId(paramId);
      const poi = await getPoiById(poiId);
      if (!poi) return res.status(404).json({ error: 'Entidad no encontrada.' });
      await deletePoi(poiId);
      await logEntityActivity({
        entity_type: 'poi',
        entity_id: poiId,
        entity_label: poi.name,
        action: 'delete',
        updated_fields: [],
        actor_name: getActorName(req),
        visibility: poi.visibility
      });
      return res.status(204).send();
    }
    const existing = await getEntityForDm(paramId);
    if (!existing) return res.status(404).json({ error: 'Entidad no encontrada.' });
    if (existing.type === 'poi') {
      const poiId = isEncodedPoiId(paramId) ? decodePoiId(paramId) : paramId;
      const poi = await getPoiById(poiId);
      if (!poi) return res.status(404).json({ error: 'Entidad no encontrada.' });
      await deletePoi(poiId);
      await logEntityActivity({
        entity_type: 'poi',
        entity_id: poiId,
        entity_label: poi.name,
        action: 'delete',
        updated_fields: [],
        actor_name: getActorName(req),
        visibility: poi.visibility
      });
      return res.status(204).send();
    }
    await deleteEntity(paramId);
    await logEntityActivity({
      entity_type: 'entity',
      entity_id: paramId,
      entity_label: existing.code_name || existing.name || 'Entidad',
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

// --- Dossiers: rutas agente ---
app.get('/api/agent/entities', requireAgentSession, async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      status: req.query.status,
      alignment: req.query.alignment,
      session: req.query.session,
      q: req.query.q
    };
    const entities = await getEntitiesForAgent(filters);
    res.json(encodePoisInList(entities));
  } catch (err) {
    next(err);
  }
});

app.get('/api/agent/entities/:id', requireAgentSession, async (req, res, next) => {
  try {
    const kind = req.query.kind || req.query.type || '';
    const paramId = req.params.id;
    if (kind === 'poi' || isEncodedPoiId(paramId)) {
      const poiId = kind === 'poi' ? paramId : decodePoiId(paramId);
      const poi = await getPoiById(poiId);
      if (!poi) return res.status(404).json({ error: 'Entidad no encontrada.' });
      return res.json(encodePoiIds(filterAgentEntity(mapPoiToEntity(poi))));
    }
    const entity = await getEntityForAgent(paramId);
    if (!entity) return res.status(404).json({ error: 'Entidad no encontrada.' });
    res.json(entity);
  } catch (err) {
    next(err);
  }
});

app.get('/api/agent/entities/:id/context', requireAgentSession, async (req, res, next) => {
  try {
    const kind = req.query.kind || req.query.type || '';
    const paramId = req.params.id;
    if (kind === 'poi' || isEncodedPoiId(paramId)) {
      const poiId = kind === 'poi' ? paramId : decodePoiId(paramId);
      const poi = await getPoiById(poiId);
      if (!poi) return res.status(404).json({ error: 'Entidad no encontrada.' });
      const mapped = encodePoiIds(filterAgentEntity(mapPoiToEntity(poi)));
      return res.json({ entity: mapped, pois: [mapped], sessions: [], relations: [] });
    }
    const entity = await getEntityForAgent(paramId);
    if (!entity) return res.status(404).json({ error: 'Entidad no encontrada.' });
    if (entity.visibility === 'locked') {
      return res.json({ entity });
    }
    const ctx = await getEntityContext(paramId, { includePrivate: false });
    const encodedCtx = {
      ...ctx,
      entity: ctx.entity && ctx.entity.type === 'poi' ? encodePoiIds(ctx.entity) : ctx.entity,
      pois: Array.isArray(ctx.pois) ? ctx.pois.map((p) => (p.type === 'poi' ? encodePoiIds(p) : p)) : ctx.pois
    };
    res.json(encodedCtx);
  } catch (err) {
    next(err);
  }
});

app.post('/api/agent/entities/:id/notes', requireAgentSession, async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const kind = req.query.kind || req.query.type || '';
    const isPoiRequest = kind === 'poi' || isEncodedPoiId(rawId);
    const entityId = isPoiRequest ? Number(kind === 'poi' ? rawId : decodePoiId(rawId)) : rawId;
    const base = await getEntityForAgent(entityId);
    if (!base) return res.status(404).json({ error: 'Entidad no encontrada.' });
    if (base.visibility === 'locked') {
      return res.status(403).json({ error: 'Entidad bloqueada.' });
    }
    if (base.type === 'poi') {
      const agentNotes = typeof req.body?.agent_notes === 'string' ? req.body.agent_notes.trim() : '';
      const previousPoi = await getPoiById(entityId);
      if (!previousPoi) return res.status(404).json({ error: 'Entidad no encontrada.' });
      const updatedPoi = await updatePoiAgentNotes(entityId, agentNotes);
      const updatedFields = getChangedFields(
        { agent_notes: previousPoi.agent_notes || '' },
        { agent_notes: agentNotes },
        [{ key: 'agent_notes', type: 'string' }]
      );
      if (updatedFields.length) {
        await logEntityActivity({
          entity_type: 'poi',
          entity_id: entityId,
          entity_label: previousPoi.name,
          action: 'update',
          updated_fields: updatedFields,
          actor_name: getActorName(req),
          visibility: previousPoi.visibility
        });
      }
      const mapped = filterAgentEntity(mapPoiToEntity(updatedPoi));
      const encoded = mapped ? encodePoiIds(mapped) : mapped;
      const ctx = { entity: encoded, pois: encoded ? [encoded] : [], sessions: [], relations: [] };
      return res.json({ status: 'ok', entity: encoded, context: ctx });
    }

    const rawPoiLinks = Array.isArray(req.body?.poi_links) ? req.body.poi_links : [];
    const rawRelations = Array.isArray(req.body?.relations) ? req.body.relations : [];
    const agentNotes = typeof req.body?.agent_notes === 'string' ? req.body.agent_notes.trim() : '';

    const poiLinks = [];
    for (const link of rawPoiLinks) {
      const poiId = Number(link.poi_id);
      if (!poiId || Number.isNaN(poiId)) continue;
      const poi = await getPoiById(poiId);
      if (!poi || poi.visibility !== 'agent_public') continue;
      poiLinks.push({
        poi_id: poiId,
        role_at_poi: link.role_at_poi ? String(link.role_at_poi).trim() : null,
        session_tag: link.session_tag ? String(link.session_tag).trim() : null
      });
    }
    const dedupedPoiLinks = Array.from(
      new Map(poiLinks.map((link) => [link.poi_id, link])).values()
    );

    const relations = [];
    for (const rel of rawRelations) {
      const targetId = Number(rel.to_entity_id);
      if (!targetId || Number.isNaN(targetId)) continue;
      if (Number(targetId) === Number(entityId)) continue;
      const target = await getEntityForAgent(targetId);
      if (!target || target.visibility === 'locked') continue;
      relations.push({
        to_entity_id: targetId,
        relation_type: rel.relation_type ? String(rel.relation_type).trim() : null,
        strength: rel.strength ? Number(rel.strength) : null
      });
    }
    const dedupedRelations = Array.from(
      new Map(relations.map((rel) => [rel.to_entity_id, rel])).values()
    );

    const updated = await updateAgentNotesAndLinks(entityId, agentNotes, {
      poi_links: dedupedPoiLinks,
      relations: dedupedRelations
    });
    const updatedFields = getChangedFields(
      base,
      { agent_notes: agentNotes },
      [{ key: 'agent_notes', type: 'string' }]
    );
    if (updatedFields.length) {
      await logEntityActivity({
        entity_type: 'entity',
        entity_id: entityId,
        entity_label: base.code_name || base.name || 'Entidad',
        action: 'update',
        updated_fields: updatedFields,
        actor_name: getActorName(req),
        visibility: base.visibility
      });
    }
    const ctx = await getEntityContext(entityId, { includePrivate: false });
    res.json({ status: 'ok', entity: updated, context: ctx });
  } catch (err) {
    next(err);
  }
});

app.get('/api/agent/graph/campaign', requireAgentSession, async (req, res, next) => {
  try {
    const ctx = await getAgentCampaignGraphContext();
    res.json(ctx);
  } catch (err) {
    next(err);
  }
});

app.post('/api/agent/entities/:id/unlock', requireAgentSession, async (req, res, next) => {
  try {
    const code = (req.body && req.body.code) || '';
    const rawId = req.params.id;
    const id = isEncodedPoiId(rawId) ? decodePoiId(rawId) : rawId;
    const result = await unlockEntity(id, code);
    logCrud('Agent unlock', req, { id, status: result.status });
    if (result.status === 'not_found') return res.status(404).json({ error: 'Entidad no encontrada.' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Journal ---
app.get('/api/agent/journal', requireAgentSession, async (req, res, next) => {
  try {
    const season = req.query.season || 2;
    const session = req.query.session || 0;
    const entry = await getJournalEntry({ season, session });
    if (!entry) return res.json({ season: Number(season), session: Number(session), public_note: '' });
    res.json({ season: entry.season, session: entry.session, public_note: entry.public_note || '' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/agent/journal', requireAgentSession, async (req, res, next) => {
  try {
    const season = req.body?.season ?? 2;
    const session = req.body?.session ?? 0;
    const public_note = req.body?.public_note || req.body?.public_summary || '';
    const entry = await upsertJournalEntry({ season, session, public_note, dm_note: null });
    res.json({ season: entry.season, session: entry.session, public_note: entry.public_note || '' });
  } catch (err) {
    next(err);
  }
});

app.get('/api/agent/character-sheet', requireAgentSession, async (req, res, next) => {
  try {
    const agentUsername = req.session.agentId;
    const agentDisplay = req.session.agentDisplay || agentUsername;
    const sheet = await getAgentCharacterSheet(agentUsername, agentDisplay);
    logCrud('Agent character sheet fetch', req, { agentUsername });
    res.json({ sheet });
  } catch (err) {
    next(err);
  }
});

app.put('/api/agent/character-sheet', requireAgentSession, async (req, res, next) => {
  try {
    const agentUsername = req.session.agentId;
    if (!agentUsername) {
      return res.status(401).json({ error: 'Agent session is required.' });
    }
    const payload = req.body && (req.body.sheet || req.body);
    if (!payload) {
      return res.status(400).json({ error: 'Sheet payload is required.' });
    }
    const updated = await updateAgentCharacterSheet(agentUsername, {
      ...payload,
      agent_username: agentUsername
    });
    logCrud('Agent character sheet update', req, { agentUsername });
    res.json({ sheet: updated });
  } catch (err) {
    next(err);
  }
});

app.get('/api/dm/journal', requireDmSession, async (req, res, next) => {
  try {
    if (req.query.list) {
      const list = await listJournalEntries();
      return res.json(list);
    }
    const season = req.query.season || 2;
    const session = req.query.session || 0;
    const entry = await getJournalEntry({ season, session });
    if (!entry) return res.json({ season: Number(season), session: Number(session), public_note: '', dm_note: '' });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

app.post('/api/dm/journal', requireDmSession, async (req, res, next) => {
  try {
    const season = req.body?.season ?? 2;
    const session = req.body?.session ?? 0;
    const public_note = req.body?.public_note || req.body?.public_summary || '';
    const dm_note = req.body?.dm_note || req.body?.dm_notes || '';
    const entry = await upsertJournalEntry({ season, session, public_note, dm_note });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

function getActorName(req) {
  if (isDmSession(req)) return 'Ordo Veritatis';
  if (isAgentSession(req)) {
    return req.session.agentDisplay || req.session.agentId || 'Agente';
  }
  return 'Sistema';
}

app.use(errorHandler);

function setRealtimeHooks(nextHooks = {}) {
  if (typeof nextHooks.broadcastMessageEvent === 'function') {
    realtimeHooks.broadcastMessageEvent = nextHooks.broadcastMessageEvent;
  }
  if (typeof nextHooks.broadcastChatMessage === 'function') {
    realtimeHooks.broadcastChatMessage = nextHooks.broadcastChatMessage;
  }
}

module.exports = {
  app,
  setRealtimeHooks,
  normalizeUsername,
  DEBUG_MODE
};
