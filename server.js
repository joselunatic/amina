require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const {
  getAllPois,
  getPoiById,
  createPoi,
  updatePoi,
  deletePoi,
  CATEGORY_VALUES,
  VEIL_VALUES,
  getMessages,
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
  unlockEntity,
  ENTITY_TYPES
} = require('./db');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const DM_SECRET = process.env.DM_SECRET || '';
const MAPBOX_TOKEN =
  process.env.MAPBOX_PUBLIC_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  'YOUR_MAPBOX_ACCESS_TOKEN_HERE';
const MAPBOX_STYLE =
  process.env.MAPBOX_STYLE_URL || 'mapbox://styles/joselun/cmi3ezivh00gi01s98tef234h';
const DEBUG_MODE = process.env.DEBUG === 'true';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/auth/dm', dmSecretRequired, (req, res) => {
  res.status(204).send();
});

const AGENT_USERS = [
  {
    username: 'pike',
    display: 'Howard Pike',
    passwordHash: crypto.createHash('sha256').update('123456').digest('hex')
  },
  {
    username: 'allen',
    display: 'Victoria Allen',
    passwordHash: crypto.createHash('sha256').update('123456').digest('hex')
  }
  ,
  {
    username: 'guerrero',
    display: 'Arnold Guerrero-Hart',
    passwordHash: crypto.createHash('sha256').update('123456').digest('hex')
  },
  {
    username: 'clutter',
    display: 'Dwight Clutter',
    passwordHash: crypto.createHash('sha256').update('123456').digest('hex')
  },
  {
    username: 'redwood',
    display: 'Karen Redwood',
    passwordHash: crypto.createHash('sha256').update('123456').digest('hex')
  }
];

app.get('/api/auth/agents', (req, res) => {
  res.json(AGENT_USERS.map(({ username, display }) => ({ username, display })));
});

app.post('/api/auth/agent', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const user = AGENT_USERS.find((agent) => agent.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json({ username: user.username, display: user.display });
});

app.get('/api/messages', async (req, res, next) => {
  try {
    const agentDisplays = AGENT_USERS.map((a) => a.display);
    const filters = {
      recipient: req.query.recipient,
      session_tag: req.query.session_tag,
      since: req.query.since,
      limit: parseInt(req.query.limit, 10) || 40,
      box: req.query.box,
      unread_only: req.query.unread_only === 'true',
      viewer: req.query.viewer,
    agentDisplays
  };
    filters.enforceDmInbox =
      req.query.viewer === 'Mr. Truth' &&
      !req.query.recipient &&
      (!req.query.box || req.query.box !== 'sent');
    const messages = await getMessages(filters);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

app.get('/api/event-ticker', (req, res) => {
  const jsonPath = path.join(__dirname, 'docs', 'eventTicker.json');
  fs.readFile(jsonPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read ticker data', err);
      return res.status(500).json({ error: 'Unable to load ticker data.' });
    }
    try {
      const payload = JSON.parse(data);
      res.json(payload);
    } catch (parseErr) {
      console.error('Ticker JSON parse error', parseErr);
      res.status(500).json({ error: 'Ticker data corrupted.' });
    }
  });
});

app.post('/api/messages', dmSecretRequired, async (req, res, next) => {
  try {
    const { sender, recipient, subject, body, session_tag } = req.body || {};
    if (!sender || !recipient || !subject || !body) {
      return res.status(400).json({ error: 'All message fields are required.' });
    }
    const created = await createMessage({
      sender: sender.trim(),
      recipient: recipient.trim(),
      subject: subject.trim(),
      body: body.trim(),
      session_tag: session_tag || null,
      created_by: 'MrTruth'
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.post('/api/messages/:id/read', async (req, res, next) => {
  try {
    const viewer = (req.body && req.body.viewer) || req.query.viewer;
    if (!viewer) {
      return res.status(400).json({ error: 'Viewer is required to mark a message as read.' });
    }
    const updated = await markMessageRead(req.params.id, viewer);
    if (!updated) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.post('/api/messages/agent', async (req, res, next) => {
  try {
    const { sender, recipient, subject, body, session_tag, created_by } = req.body || {};
    if (!sender || !recipient || !subject || !body) {
      return res.status(400).json({ error: 'All message fields are required for agent replies.' });
    }
    const created = await createMessage({
      sender: sender.trim(),
      recipient: recipient.trim(),
      subject: subject.trim(),
      body: body.trim(),
      session_tag: session_tag || null,
      created_by: created_by || sender.trim()
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// --- Dossiers: rutas DM ---
app.get('/api/dm/entities', dmSecretRequired, async (req, res, next) => {
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
    res.json(entities);
  } catch (err) {
    next(err);
  }
});

app.get('/api/dm/entities/:id', dmSecretRequired, async (req, res, next) => {
  try {
    const entity = await getEntityForDm(req.params.id);
    if (!entity) return res.status(404).json({ error: 'Entidad no encontrada.' });
    res.json(entity);
  } catch (err) {
    next(err);
  }
});

app.get('/api/dm/entities/:id/context', dmSecretRequired, async (req, res, next) => {
  try {
    const ctx = await getEntityContext(req.params.id, { includePrivate: true });
    if (!ctx) return res.status(404).json({ error: 'Entidad no encontrada.' });
    res.json(ctx);
  } catch (err) {
    next(err);
  }
});

app.post('/api/dm/entities', dmSecretRequired, async (req, res, next) => {
  try {
    const payload = validateEntity(req.body || {});
    const created = await createEntity(payload.cleaned, payload.relations);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/dm/entities/:id', dmSecretRequired, async (req, res, next) => {
  try {
    const exists = await getEntityForDm(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Entidad no encontrada.' });
    const payload = validateEntity(req.body || {});
    const updated = await updateEntity(req.params.id, payload.cleaned, payload.relations);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.post('/api/dm/entities/:id/archive', dmSecretRequired, async (req, res, next) => {
  try {
    const exists = await getEntityForDm(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Entidad no encontrada.' });
    const archived = await archiveEntity(req.params.id);
    res.json(archived);
  } catch (err) {
    next(err);
  }
});

// --- Dossiers: rutas agente ---
app.get('/api/agent/entities', async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      status: req.query.status,
      alignment: req.query.alignment,
      session: req.query.session,
      q: req.query.q
    };
    const entities = await getEntitiesForAgent(filters);
    res.json(entities);
  } catch (err) {
    next(err);
  }
});

app.get('/api/agent/entities/:id', async (req, res, next) => {
  try {
    const entity = await getEntityForAgent(req.params.id);
    if (!entity) return res.status(404).json({ error: 'Entidad no encontrada.' });
    res.json(entity);
  } catch (err) {
    next(err);
  }
});

app.get('/api/agent/entities/:id/context', async (req, res, next) => {
  try {
    const entity = await getEntityForAgent(req.params.id);
    if (!entity) return res.status(404).json({ error: 'Entidad no encontrada.' });
    if (entity.visibility === 'locked') {
      return res.json({ entity });
    }
    const ctx = await getEntityContext(req.params.id, { includePrivate: false });
    res.json(ctx);
  } catch (err) {
    next(err);
  }
});

app.post('/api/agent/entities/:id/unlock', async (req, res, next) => {
  try {
    const code = (req.body && req.body.code) || '';
    const result = await unlockEntity(req.params.id, code);
    if (result.status === 'not_found') return res.status(404).json({ error: 'Entidad no encontrada.' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

function validatePoi(payload) {
  const errors = [];
  const cleaned = {};

  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
    errors.push('Name is required.');
  } else {
    cleaned.name = payload.name.trim();
  }

  if (!payload.category || !CATEGORY_VALUES.includes(payload.category)) {
    errors.push('Category is invalid.');
  } else {
    cleaned.category = payload.category;
  }

  const lat = parseFloat(payload.latitude);
  const lon = parseFloat(payload.longitude);
  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    errors.push('Latitude must be a valid number between -90 and 90.');
  } else {
    cleaned.latitude = lat;
  }
  if (Number.isNaN(lon) || lon < -180 || lon > 180) {
    errors.push('Longitude must be a valid number between -180 and 180.');
  } else {
    cleaned.longitude = lon;
  }

  const threat = parseInt(payload.threat_level, 10);
  if (Number.isNaN(threat) || threat < 1 || threat > 5) {
    errors.push('Threat level must be between 1 and 5.');
  } else {
    cleaned.threat_level = threat;
  }

  if (!payload.veil_status || !VEIL_VALUES.includes(payload.veil_status)) {
    errors.push('Veil status is invalid.');
  } else {
    cleaned.veil_status = payload.veil_status;
  }

  if (payload.image_url !== undefined && payload.image_url !== null && payload.image_url !== '') {
    if (typeof payload.image_url !== 'string') {
      errors.push('Image URL must be a string.');
    } else {
      try {
        const normalized = new URL(payload.image_url.trim());
        if (!['http:', 'https:'].includes(normalized.protocol)) {
          errors.push('Image URL must use http or https.');
        } else {
          cleaned.image_url = normalized.toString();
        }
      } catch (e) {
        errors.push('Image URL is invalid.');
      }
    }
  } else {
    cleaned.image_url = null;
  }

  if (payload.public_note !== undefined) {
    cleaned.public_note = typeof payload.public_note === 'string' ? payload.public_note : '';
  }
  if (payload.dm_note !== undefined) {
    cleaned.dm_note = typeof payload.dm_note === 'string' ? payload.dm_note : '';
  }
  if (payload.session_tag !== undefined) {
    cleaned.session_tag = typeof payload.session_tag === 'string' ? payload.session_tag.trim() : null;
  }

  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.status = 400;
    throw error;
  }

  return cleaned;
}

function validateEntity(payload) {
  const errors = [];
  const cleaned = {};
  const relations = {
    session_links: [],
    poi_links: [],
    relations: []
  };

  if (!payload.type || !ENTITY_TYPES.includes(payload.type)) {
    errors.push('Tipo de entidad inválido.');
  } else {
    cleaned.type = payload.type;
  }

  if (!payload.code_name || typeof payload.code_name !== 'string' || !payload.code_name.trim()) {
    errors.push('Nombre/callsign requerido.');
  } else {
    cleaned.code_name = payload.code_name.trim();
  }

  cleaned.real_name = payload.real_name ? String(payload.real_name).trim() : null;
  cleaned.role = payload.role ? String(payload.role).trim() : null;
  cleaned.status = payload.status ? String(payload.status).trim() : null;
  cleaned.alignment = payload.alignment ? String(payload.alignment).trim() : null;
  cleaned.threat_level = payload.threat_level ? parseInt(payload.threat_level, 10) : null;
  cleaned.first_session = payload.first_session ? String(payload.first_session).trim() : null;
  cleaned.last_session = payload.last_session ? String(payload.last_session).trim() : null;
  cleaned.sessions = payload.sessions ? String(payload.sessions).trim() : null;

  if (payload.image_url) {
    try {
      const u = new URL(payload.image_url.trim());
      if (!['http:', 'https:'].includes(u.protocol)) {
        errors.push('URL de imagen debe ser http o https.');
      } else {
        cleaned.image_url = u.toString();
      }
    } catch (e) {
      errors.push('URL de imagen inválida.');
    }
  } else {
    cleaned.image_url = null;
  }

  cleaned.public_summary = payload.public_summary ? String(payload.public_summary) : '';
  cleaned.dm_notes = payload.dm_notes ? String(payload.dm_notes) : '';
  cleaned.visibility = payload.visibility ? String(payload.visibility) : 'agent_public';
  cleaned.unlock_code = payload.unlock_code ? String(payload.unlock_code) : null;
  cleaned.locked_hint = payload.locked_hint ? String(payload.locked_hint) : null;
  cleaned.archived = payload.archived ? 1 : 0;

  if (Array.isArray(payload.session_links)) {
    payload.session_links.forEach((item) => {
      if (!item || !item.session_tag) return;
      relations.session_links.push({
        session_tag: String(item.session_tag).trim(),
        summary_public: item.summary_public ? String(item.summary_public).trim() : null,
        summary_dm: item.summary_dm ? String(item.summary_dm).trim() : null,
        is_public: item.is_public !== false
      });
    });
  }

  if (Array.isArray(payload.poi_links)) {
    payload.poi_links.forEach((item) => {
      const poiId = Number(item.poi_id);
      if (!poiId || Number.isNaN(poiId)) return;
      relations.poi_links.push({
        poi_id: poiId,
        role_at_poi: item.role_at_poi ? String(item.role_at_poi).trim() : null,
        session_tag: item.session_tag ? String(item.session_tag).trim() : null,
        is_public: item.is_public !== false
      });
    });
  }

  if (Array.isArray(payload.relations)) {
    payload.relations.forEach((item) => {
      const targetId = Number(item.to_entity_id || item.target_id);
      if (!targetId || Number.isNaN(targetId)) return;
      relations.relations.push({
        to_entity_id: targetId,
        relation_type: item.relation_type ? String(item.relation_type).trim() : null,
        strength: item.strength ? parseInt(item.strength, 10) : null,
        is_public: item.is_public !== false
      });
    });
  }

  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.status = 400;
    throw error;
  }

  return { cleaned, relations };
}

function isDmRequest(req) {
  if (!DM_SECRET) return false;
  const headerSecret = req.header('x-dm-secret');
  return !!headerSecret && headerSecret === DM_SECRET;
}

function dmSecretRequired(req, res, next) {
  if (!DM_SECRET) {
    return res.status(500).json({ error: 'DM secret is not configured on the server.' });
  }

  const headerSecret = req.header('x-dm-secret');
  if (!headerSecret) {
    return res.status(401).json({ error: 'DM secret header is required.' });
  }
  if (headerSecret !== DM_SECRET) {
    return res.status(401).json({ error: 'Invalid DM secret.' });
  }

  return next();
}

app.get('/api/pois', async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      session_tag: req.query.session_tag
    };

    if (filters.category && !CATEGORY_VALUES.includes(filters.category)) {
      return res.status(400).json({ error: 'Invalid category filter.' });
    }

    const pois = await getAllPois(filters);
    res.json(pois);
  } catch (err) {
    next(err);
  }
});

app.get('/api/pois/:id', async (req, res, next) => {
  try {
    const poi = await getPoiById(req.params.id);
    if (!poi) {
      return res.status(404).json({ error: 'POI not found.' });
    }
    res.json(poi);
  } catch (err) {
    next(err);
  }
});

app.post('/api/pois', dmSecretRequired, async (req, res, next) => {
  try {
    const data = validatePoi(req.body || {});
    const created = await createPoi(data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/pois/:id', dmSecretRequired, async (req, res, next) => {
  try {
    const existing = await getPoiById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'POI not found.' });
    }
    const data = validatePoi(req.body || {});
    const updated = await updatePoi(req.params.id, data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/pois/:id', dmSecretRequired, async (req, res, next) => {
  try {
    const existing = await getPoiById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'POI not found.' });
    }
    await deletePoi(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
