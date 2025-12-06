const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'schuylkill.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Tablas principales
// - entities: representa PJ/PNJ/organizaciones con notas públicas/DM y banderas básicas
// - entity_pois: vincula entidades con PdIs, con visibilidad pública o solo DM
// - entity_sessions: lista sesiones en las que aparece una entidad, con visibilidad
// - entity_links: relaciones dirigidas entre entidades (aliado, enemigo, miembro de...), con visibilidad

const CATEGORY_VALUES = [
  'OV_BASE',
  'CRIME_SCENE',
  'ESOTERROR_CELL',
  'MUNDANE_TOWN',
  'INDUSTRIAL_SITE',
  'NATURAL_SITE',
  'NPC',
  'RUMOR'
];

const VEIL_VALUES = ['intact', 'frayed', 'torn'];

const ENTITY_TYPES = ['pc', 'npc', 'org', 'criatura'];
const REL_VISIBILITY = ['public', 'dm'];
const POI_VISIBILITY = ['agent_public', 'locked'];

const seedData = [
  {
    name: 'Ordo Veritatis Safehouse – Pottsville',
    category: 'OV_BASE',
    latitude: 40.683987,
    longitude: -76.20956,
    image_url: null,
    public_note:
      'Casa alquilada de aspecto anodino. Punto de encuentro y almacenamiento de material.',
    dm_note:
      'Equipamiento básico: kits forenses, conexión cifrada, enlace directo con analista OV. Vecino sospechoso del 3ºB.',
    threat_level: 1,
    veil_status: 'intact',
    session_tag: '1x00'
  },
  {
    name: 'Departamento del Sheriff del Condado de Schuylkill',
    category: 'MUNDANE_TOWN',
    latitude: 40.686306,
    longitude: -76.212402,
    image_url: null,
    public_note:
      'Dependencias del Sheriff. Informes policiales accesibles con dificultad.',
    dm_note:
      'El oficial M. Donahue ha visto cosas raras. Puede ser un contacto potencial.',
    threat_level: 1,
    veil_status: 'intact',
    session_tag: '1x00'
  },
  {
    name: 'Hospital Lehigh Valley – Schuylkill',
    category: 'MUNDANE_TOWN',
    latitude: 40.693405,
    longitude: -76.208275,
    image_url: null,
    public_note: 'Centro médico comarcal.',
    dm_note: 'Aumento anómalo de accidentes auto-infligidos.',
    threat_level: 2,
    veil_status: 'frayed',
    session_tag: '1x01'
  },
  {
    name: 'Blue Hollow Culvert',
    category: 'ESOTERROR_CELL',
    latitude: 40.70682,
    longitude: -76.26391,
    image_url: null,
    public_note: 'Antigua alcantarilla industrial.',
    dm_note: 'Lugar del ritual fracasado. Simbología residual visible con UV.',
    threat_level: 5,
    veil_status: 'torn',
    session_tag: '1x01'
  },
  {
    name: 'Marwood Quarry',
    category: 'INDUSTRIAL_SITE',
    latitude: 40.65042,
    longitude: -76.2533,
    image_url: null,
    public_note: 'Cantera vallada, acceso prohibido.',
    dm_note: "Usada para pruebas acústicas del 'Fenómeno de la Boca Abierta'.",
    threat_level: 4,
    veil_status: 'frayed',
    session_tag: '1x02'
  },
  {
    name: 'The Red Barn',
    category: 'ESOTERROR_CELL',
    latitude: 40.6262,
    longitude: -76.3779,
    image_url: null,
    public_note: 'Granero abandonado.',
    dm_note: 'Punto de reunión de Shear the Veil. Restos animales sin explicación.',
    threat_level: 4,
    veil_status: 'torn',
    session_tag: '1x02'
  },
  {
    name: 'Coldwater Forest Trailhead',
    category: 'NATURAL_SITE',
    latitude: 40.59673,
    longitude: -76.18912,
    image_url: null,
    public_note: 'Entrada a un sendero popular.',
    dm_note: 'Desaparición de Melissa Harper (2019). Posible implicación psico-memética.',
    threat_level: 3,
    veil_status: 'frayed',
    session_tag: '1x03'
  },
  {
    name: 'The Whispering Diner',
    category: 'NPC',
    latitude: 40.6981,
    longitude: -76.174,
    image_url: null,
    public_note: 'Diner 24 horas.',
    dm_note: 'Camarera oye susurros en tuberías. Déjà-vus recurrentes.',
    threat_level: 2,
    veil_status: 'frayed',
    session_tag: '1x01'
  },
  {
    name: 'Crystal Lake Fishing Spot',
    category: 'NATURAL_SITE',
    latitude: 40.5798,
    longitude: -76.4402,
    image_url: null,
    public_note: 'Lugar tranquilo para pesca.',
    dm_note: 'Luces en el agua. Anomalías EM.',
    threat_level: 3,
    veil_status: 'frayed',
    session_tag: '1x02'
  },
  {
    name: 'Knox Street Underpass',
    category: 'RUMOR',
    latitude: 40.68551,
    longitude: -76.21091,
    image_url: null,
    public_note: 'Pasarela con grafitis.',
    dm_note: 'Simbología similar a la entidad Esker-Kin.',
    threat_level: 2,
    veil_status: 'intact',
    session_tag: '1x01'
  },
  {
    name: "St. Mary's Abandoned Chapel",
    category: 'RUMOR',
    latitude: 40.6346,
    longitude: -76.321,
    image_url: null,
    public_note: 'Capilla abandonada.',
    dm_note: 'Ofrendas improvisadas y olor a ozono.',
    threat_level: 3,
    veil_status: 'frayed',
    session_tag: '1x03'
  },
  {
    name: 'Fog Hollow Curve',
    category: 'CRIME_SCENE',
    latitude: 40.66085,
    longitude: -76.3509,
    image_url: null,
    public_note: 'Carretera peligrosa.',
    dm_note: "Todos los conductores vieron 'algo' en la calzada antes de estrellarse.",
    threat_level: 3,
    veil_status: 'frayed',
    session_tag: '1x03'
  }
];

const entitySeed = [
  {
    name: 'Howard Pike',
    type: 'pc',
    role: 'Agente de campo OV',
    status: 'activo',
    allegiance: 'Ordo Veritatis',
    image_url: null,
    public_note: 'Analista táctico con historial militar. Preferencia por despliegues discretos.',
    dm_note: 'Sensible al estrés; vigilar exposición a fenómenos tipo rojo.',
    session_first: '1x00',
    session_last: '1x03'
  },
  {
    name: 'Victoria Allen',
    type: 'pc',
    role: 'Agente de campo OV',
    status: 'activo',
    allegiance: 'Ordo Veritatis',
    image_url: null,
    public_note: 'Especialista en entrevistas y HUMINT. Buen rapport con fuerzas locales.',
    dm_note: 'Curiosidad elevada; riesgo de perseguir hilos psico-meméticos.',
    session_first: '1x00',
    session_last: '1x03'
  },
  {
    name: 'MOT',
    type: 'npc',
    role: 'Contacto OV / Operador remoto',
    status: 'activo',
    allegiance: 'Ordo Veritatis',
    image_url: null,
    public_note: 'Voz sintética en las transmisiones. Provee rutas y cifrado.',
    dm_note: 'Puede ser suplantado; validar challenge-responses si detectan latencia rara.',
    session_first: '1x00',
    session_last: '1x03'
  },
  {
    name: 'Sheriff Michael Donahue',
    type: 'npc',
    role: 'Sheriff del Condado de Schuylkill',
    status: 'activo',
    allegiance: 'Simpatizante OV',
    image_url: null,
    public_note: 'Cooperativo pero nervioso. Provee acceso a informes locales.',
    dm_note: 'Ha visto símbolos; posible objetivo de reclutamiento o neutralización según evolucione.',
    session_first: '1x00',
    session_last: '1x02'
  },
  {
    name: 'Dra. Evelyn Kessler',
    type: 'npc',
    role: 'Médico Forense del condado',
    status: 'activo',
    allegiance: 'Neutral',
    image_url: null,
    public_note: 'Meticulosa. Ha observado anomalías en autopsias recientes.',
    dm_note: 'Sospecha de manipulación de cuerpos; mantiene notas privadas en papel.',
    session_first: '1x01',
    session_last: '1x03'
  },
  {
    name: 'Ordo Veritatis',
    type: 'org',
    role: 'Orden internacional',
    status: 'activo',
    allegiance: 'Ordo Veritatis',
    image_url: null,
    public_note: 'Red OV desplegada en la región con cobertura limitada.',
    dm_note: 'Recursos restringidos; el nodo AMINA es prioridad para monitoreo.',
    session_first: '1x00',
    session_last: '1x03'
  },
  {
    name: 'Shear the Veil',
    type: 'org',
    role: 'Célula esoterrorista',
    status: 'activo',
    allegiance: 'Esoterror',
    image_url: null,
    public_note: 'Célula dispersa con foco en rituales de fractura del velo.',
    dm_note: 'Conexiones con el Red Barn. Miembros clave no identificados.',
    session_first: '1x02',
    session_last: '1x03'
  }
];

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ ...this });
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function withTransaction(task) {
  await run('BEGIN TRANSACTION');
  try {
    const result = await task();
    await run('COMMIT');
    return result;
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

async function initialize() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  await ensureMessageSessionColumn();
  await ensureMessageReadByColumn();
  await ensureMessageDeletedByColumn();
  await ensureJournalTable();
  await ensurePoiVisibilityColumns();

  await ensureEntitiesTables();
  await seedPoisIfEmpty();
  await seedEntitiesIfEmpty();
}

async function seedPoisIfEmpty() {
  const countRow = await get('SELECT COUNT(*) as count FROM pois');
  if (countRow && countRow.count === 0) {
    const insertSql = `
      INSERT INTO pois
      (name, category, latitude, longitude, image_url, public_note, dm_note, threat_level, veil_status, session_tag, visibility, unlock_code, locked_hint)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agent_public', NULL, NULL)
    `;
    for (const poi of seedData) {
      await run(insertSql, [
        poi.name,
        poi.category,
        poi.latitude,
        poi.longitude,
        poi.image_url || null,
        poi.public_note,
        poi.dm_note,
        poi.threat_level,
        poi.veil_status,
        poi.session_tag,
        'agent_public'
      ]);
    }
  }
}

async function seedEntitiesIfEmpty() {
  const countRow = await get('SELECT COUNT(*) as count FROM entities');
  if (!countRow || countRow.count !== 0) return;

  const poiMap = await getPoiMapByName();
  const createdMap = new Map();

  for (const entity of entitySeed) {
    const sessionTags = buildSeedSessions(entity.session_first, entity.session_last);
    const poiLinks = buildSeedPoiLinks(entity.name, poiMap).map((l) => ({
      poi_id: l.poi_id,
      role_at_poi: l.role,
      session_tag: entity.session_last || entity.session_first || null,
      is_public: l.visibility !== 'dm'
    }));
    const rels = buildSeedEntityLinks(entity.name).map((l) => ({
      to_entity_name: l.target,
      relation_type: l.relation,
      is_public: l.visibility !== 'dm'
    }));

    const created = await createEntity(
      {
        type: entity.type,
        code_name: entity.name,
        role: entity.role,
        status: entity.status,
        alignment: entity.allegiance,
        image_url: entity.image_url,
        public_summary: entity.public_note,
        dm_notes: entity.dm_note,
        first_session: entity.session_first,
        last_session: entity.session_last,
        sessions: sessionTags.join(','),
        visibility: 'agent_public'
      },
      {
        poi_links: poiLinks,
        session_links: sessionTags.map((tag) => ({ session_tag: tag, summary_public: null, summary_dm: null, is_public: 1 })),
        relations: []
      }
    );
    createdMap.set(entity.name, created.id);
    // Temporarily store relations; resolve after all created
    createdMap.set(`${entity.name}_rels`, rels);
  }

  // Resolver relaciones con IDs reales
  for (const entity of entitySeed) {
    const sourceId = createdMap.get(entity.name);
    const rels = createdMap.get(`${entity.name}_rels`) || [];
    if (!sourceId) continue;
    const resolved = [];
    for (const rel of rels) {
      const targetId = createdMap.get(rel.to_entity_name) || (await findEntityIdByName(rel.to_entity_name));
      if (!targetId) continue;
      resolved.push({
        to_entity_id: targetId,
        relation_type: rel.relation_type,
        strength: null,
        is_public: rel.is_public
      });
    }
    if (resolved.length) {
      await replaceEntityLinks(sourceId, { relations: resolved });
    }
  }
}

function buildSeedSessions(first, last) {
  const tags = new Set();
  if (first) tags.add(first);
  if (last) tags.add(last);
  if (!tags.size) return [];
  return Array.from(tags);
}

function buildSeedPoiLinks(name, poiMap) {
  const links = [];
  const safehouseId = poiMap.get('Ordo Veritatis Safehouse – Pottsville');
  const sheriffId = poiMap.get('Departamento del Sheriff del Condado de Schuylkill');
  const hospitalId = poiMap.get('Hospital Lehigh Valley – Schuylkill');
  const redBarnId = poiMap.get('The Red Barn');

  if (name === 'Howard Pike' || name === 'Victoria Allen') {
    if (safehouseId) links.push({ poi_id: safehouseId, role: 'Briefings de equipo', visibility: 'public' });
  }
  if (name === 'MOT') {
    if (safehouseId) links.push({ poi_id: safehouseId, role: 'Canal cifrado', visibility: 'public' });
  }
  if (name === 'Sheriff Michael Donahue') {
    if (sheriffId) links.push({ poi_id: sheriffId, role: 'Punto de contacto', visibility: 'public' });
  }
  if (name === 'Dra. Evelyn Kessler') {
    if (hospitalId) links.push({ poi_id: hospitalId, role: 'Informes forenses', visibility: 'public' });
  }
  if (name === 'Ordo Veritatis') {
    if (safehouseId) links.push({ poi_id: safehouseId, role: 'Nodo OV', visibility: 'public' });
  }
  if (name === 'Shear the Veil') {
    if (redBarnId) links.push({ poi_id: redBarnId, role: 'Punto ritual', visibility: 'dm' });
  }
  return links;
}

function buildSeedEntityLinks(name) {
  if (name === 'Howard Pike' || name === 'Victoria Allen') {
    return [{ target: 'Ordo Veritatis', relation: 'Agente OV', visibility: 'public' }];
  }
  if (name === 'MOT') {
    return [{ target: 'Ordo Veritatis', relation: 'Operador remoto', visibility: 'dm' }];
  }
  if (name === 'Sheriff Michael Donahue') {
    return [{ target: 'Ordo Veritatis', relation: 'Colaborador potencial', visibility: 'dm' }];
  }
  if (name === 'Dra. Evelyn Kessler') {
    return [{ target: 'Ordo Veritatis', relation: 'Fuente forense', visibility: 'dm' }];
  }
  if (name === 'Shear the Veil') {
    return [{ target: 'Ordo Veritatis', relation: 'Enemigo', visibility: 'public' }];
  }
  return [];
}

async function getAllPois(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }

  if (filters.session_tag) {
    conditions.push('session_tag = ?');
    params.push(filters.session_tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM pois ${where} ORDER BY created_at DESC`;
  return all(sql, params);
}

async function getPoiById(id) {
  return get('SELECT * FROM pois WHERE id = ?', [id]);
}

async function createPoi(poi) {
  const sql = `
    INSERT INTO pois
    (name, category, latitude, longitude, image_url, public_note, dm_note, threat_level, veil_status, session_tag, visibility, unlock_code, locked_hint)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const result = await run(sql, [
    poi.name,
    poi.category,
    poi.latitude,
    poi.longitude,
    poi.image_url || null,
    poi.public_note || null,
    poi.dm_note || null,
    poi.threat_level,
    poi.veil_status,
    poi.session_tag || null,
    poi.visibility || 'agent_public',
    poi.unlock_code || null,
    poi.locked_hint || null
  ]);

  return getPoiById(result.lastID);
}

async function updatePoi(id, poi) {
  const sql = `
    UPDATE pois SET
      name = ?,
      category = ?,
      latitude = ?,
      longitude = ?,
      image_url = ?,
      public_note = ?,
      dm_note = ?,
      threat_level = ?,
      veil_status = ?,
      session_tag = ?,
      visibility = ?,
      unlock_code = ?,
      locked_hint = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  await run(sql, [
    poi.name,
    poi.category,
    poi.latitude,
    poi.longitude,
    poi.image_url || null,
    poi.public_note || null,
    poi.dm_note || null,
    poi.threat_level,
    poi.veil_status,
    poi.session_tag || null,
    poi.visibility || 'agent_public',
    poi.unlock_code || null,
    poi.locked_hint || null,
    id
  ]);

  return getPoiById(id);
}

async function replacePoiEntityLinks(poiId, links = []) {
  await run('DELETE FROM entity_poi_links WHERE poi_id = ?', [poiId]);
  if (!Array.isArray(links)) return;
  for (const link of links) {
    const entityId = Number(link.entity_id || link.to_entity_id);
    if (!entityId || Number.isNaN(entityId)) continue;
    const role = link.role_at_poi || link.relation_type || null;
    const sessionTag = link.session_tag || null;
    const isPublic = link.is_public === false ? 0 : 1;
    await run(
      `INSERT INTO entity_poi_links (entity_id, poi_id, role_at_poi, session_tag, is_public)
       VALUES (?, ?, ?, ?, ?)`,
      [entityId, poiId, role, sessionTag, isPublic]
    );
  }
}

async function deletePoi(id) {
  await run('DELETE FROM entity_poi_links WHERE poi_id = ?', [id]);
  const result = await run('DELETE FROM pois WHERE id = ?', [id]);
  return result.changes > 0;
}

async function getMessages(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.recipient) {
    conditions.push('recipient = ?');
    params.push(filters.recipient);
  }

  if (filters.session_tag) {
    conditions.push('session_tag = ?');
    params.push(filters.session_tag);
  }

  if (filters.box === 'sent' && filters.viewer) {
    conditions.push('created_by = ?');
    params.push(filters.viewer);
  } else if (filters.enforceDmInbox && Array.isArray(filters.agentDisplays)) {
    const placeholders = filters.agentDisplays.map(() => '?').join(',');
    conditions.push(
      `(recipient = ? OR (recipient NOT IN (${placeholders}) AND recipient != ?))`
    );
    params.push('Sr. Verdad', ...filters.agentDisplays, 'All agents');
  } else if (
    filters.viewer &&
    Array.isArray(filters.agentDisplays) &&
    filters.agentDisplays.includes(filters.viewer) &&
    !filters.recipient &&
    filters.box !== 'sent'
  ) {
    // Agent inbox without specific recipient: include direct and 'All agents'
    conditions.push('(recipient = ? OR recipient = ?)');
    params.push(filters.viewer, 'All agents');
  } else if (filters.viewer && !filters.box) {
    // Default inbox scope for agent
    conditions.push('(recipient = ? OR recipient = ?)');
    params.push(filters.viewer, 'All agents');
  }

  if (filters.since) {
    conditions.push('created_at >= ?');
    params.push(filters.since);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await all(
    `SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT ?`,
    [...params, filters.limit || 100]
  );
  const viewer = filters.viewer;
  const parsed = rows.map((row) => ({
    ...row,
    read_by: parseReadBy(row.read_by)
  }));

  if (filters.unread_only && viewer) {
    return parsed.filter((msg) => !hasBeenReadBy(msg, viewer));
  }
  // filter deleted by viewer (per box)
  if (viewer) {
    return parsed.filter((msg) => !hasBeenDeletedBy(msg, viewer, filters.box || 'inbox'));
  }
  return parsed;
}

async function ensureMessageSessionColumn() {
  const columns = await all(`PRAGMA table_info(messages)`);
  const hasSession = columns.some((col) => col.name === 'session_tag');
  if (!hasSession) {
    await run('ALTER TABLE messages ADD COLUMN session_tag TEXT');
  }
}

async function ensurePoiVisibilityColumns() {
  const columns = await all("PRAGMA table_info('pois')");
  const existing = new Set(columns.map((c) => c.name));
  const pending = [];
  if (!existing.has('visibility')) {
    pending.push("ALTER TABLE pois ADD COLUMN visibility TEXT NOT NULL DEFAULT 'agent_public'");
  }
  if (!existing.has('unlock_code')) {
    pending.push('ALTER TABLE pois ADD COLUMN unlock_code TEXT');
  }
  if (!existing.has('locked_hint')) {
    pending.push('ALTER TABLE pois ADD COLUMN locked_hint TEXT');
  }
  for (const sql of pending) {
    await run(sql);
  }
}

async function ensureMessageReadByColumn() {
  const columns = await all(`PRAGMA table_info(messages)`);
  const hasReadBy = columns.some((col) => col.name === 'read_by');
  if (!hasReadBy) {
    await run('ALTER TABLE messages ADD COLUMN read_by TEXT');
  }
}

async function ensureMessageDeletedByColumn() {
  const columns = await all(`PRAGMA table_info(messages)`);
  const hasDeletedBy = columns.some((col) => col.name === 'deleted_by');
  if (!hasDeletedBy) {
    await run('ALTER TABLE messages ADD COLUMN deleted_by TEXT');
  }
}

async function ensureJournalTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season INTEGER NOT NULL DEFAULT 1,
      session INTEGER NOT NULL DEFAULT 0,
      public_note TEXT DEFAULT '',
      dm_note TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(season, session)
    )
  `);
}

async function ensureEntitiesTables() {
  // Tabla principal de entidades. Incluye campos nuevos para modo bloqueado, hints y visibilidad.
  await run(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('pc','npc','org','criatura')),
      name TEXT,
      role TEXT,
      status TEXT,
      allegiance TEXT,
      image_url TEXT,
      public_note TEXT,
      dm_note TEXT,
      session_first TEXT,
      session_last TEXT,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columns = await all(`PRAGMA table_info(entities)`);
  const ensureColumn = async (name, type, defaultSql) => {
    const exists = columns.some((col) => col.name === name);
    if (!exists) {
      await run(`ALTER TABLE entities ADD COLUMN ${name} ${type} ${defaultSql || ''}`);
    }
  };

  await ensureColumn('code_name', 'TEXT', '');
  await ensureColumn('real_name', 'TEXT', '');
  await ensureColumn('threat_level', 'INTEGER', '');
  await ensureColumn('first_session', 'TEXT', '');
  await ensureColumn('last_session', 'TEXT', '');
  await ensureColumn('sessions', 'TEXT', '');
  await ensureColumn('mel', 'TEXT', '');
  await ensureColumn('public_summary', 'TEXT', '');
  await ensureColumn('dm_notes', 'TEXT', '');
  await ensureColumn('visibility', "TEXT NOT NULL DEFAULT 'agent_public'", '');
  await ensureColumn('unlock_code', 'TEXT', '');
  await ensureColumn('locked_hint', 'TEXT', '');
  await ensureColumn('alignment', 'TEXT', '');

  // Tabla de enlaces entidad-PdI (visible/DM) usando esquema solicitado
  await run(`
    CREATE TABLE IF NOT EXISTS entity_poi_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id INTEGER NOT NULL,
      poi_id INTEGER NOT NULL,
      role_at_poi TEXT,
      session_tag TEXT,
      is_public INTEGER DEFAULT 1,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    )
  `);

  // Tabla de enlaces entidad-sesión
  await run(`
    CREATE TABLE IF NOT EXISTS entity_session_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id INTEGER NOT NULL,
      session_tag TEXT NOT NULL,
      summary_public TEXT,
      summary_dm TEXT,
      is_public INTEGER DEFAULT 1,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    )
  `);

  // Grafo entidad-entidad
  await run(`
    CREATE TABLE IF NOT EXISTS entity_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_entity_id INTEGER NOT NULL,
      to_entity_id INTEGER NOT NULL,
      relation_type TEXT,
      strength INTEGER,
      is_public INTEGER DEFAULT 1,
      FOREIGN KEY (from_entity_id) REFERENCES entities(id),
      FOREIGN KEY (to_entity_id) REFERENCES entities(id)
    )
  `);
}

function parseReadBy(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // fallback for legacy comma-separated
    return String(value)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
}

function hasBeenReadBy(message, viewer) {
  const list = Array.isArray(message.read_by) ? message.read_by : parseReadBy(message.read_by);
  return list.includes(viewer);
}

async function createMessage(message) {
  const sql = `
    INSERT INTO messages
    (sender, recipient, subject, body, session_tag, created_by, read_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await run(sql, [
    message.sender,
    message.recipient,
    message.subject,
    message.body,
    message.session_tag || null,
    message.created_by,
    null
  ]);
  return get('SELECT * FROM messages ORDER BY created_at DESC LIMIT 1');
}

async function markMessageRead(id, viewer) {
  const message = await get('SELECT * FROM messages WHERE id = ?', [id]);
  if (!message) return null;
  const current = parseReadBy(message.read_by);
  if (!current.includes(viewer)) {
    current.push(viewer);
    await run('UPDATE messages SET read_by = ? WHERE id = ?', [JSON.stringify(current), id]);
  }
  return get('SELECT * FROM messages WHERE id = ?', [id]);
}

function hasBeenDeletedBy(message, viewer, box) {
  const list = parseDeletedBy(message.deleted_by);
  const key = `${viewer}:${box || 'inbox'}`;
  return list.includes(key);
}

function parseDeletedBy(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return String(value)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
}

async function upsertJournalEntry(entry) {
  const season = Number(entry.season) || 1;
  const session = Number(entry.session) || 0;
  const publicNote = entry.public_note || entry.public_summary || '';
  const dmNote = entry.dm_note || entry.dm_notes || '';
  await run(
    `
    INSERT INTO journal_entries (season, session, public_note, dm_note)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(season, session) DO UPDATE SET
      public_note = excluded.public_note,
      dm_note = excluded.dm_note,
      updated_at = CURRENT_TIMESTAMP
  `,
    [season, session, publicNote, dmNote]
  );
  return get('SELECT * FROM journal_entries WHERE season = ? AND session = ?', [season, session]);
}

async function getJournalEntry({ season, session }) {
  const s = Number(season) || 1;
  const sess = Number(session) || 0;
  return get('SELECT * FROM journal_entries WHERE season = ? AND session = ?', [s, sess]);
}

async function listJournalEntries() {
  return all('SELECT * FROM journal_entries ORDER BY season DESC, session DESC');
}

async function deleteMessageForViewer(id, viewer, box) {
  const message = await get('SELECT * FROM messages WHERE id = ?', [id]);
  if (!message) return null;
  const current = parseDeletedBy(message.deleted_by);
  const key = `${viewer}:${box || 'inbox'}`;
  if (!current.includes(key)) {
    current.push(key);
    await run('UPDATE messages SET deleted_by = ? WHERE id = ?', [JSON.stringify(current), id]);
  }
  return get('SELECT * FROM messages WHERE id = ?', [id]);
}

// --- Helpers de entidades (v2) ---
async function getPoiMapByName() {
  const rows = await all('SELECT id, name FROM pois');
  const map = new Map();
  rows.forEach((row) => map.set(row.name, row.id));
  return map;
}

async function findEntityIdByName(name) {
  const row = await get('SELECT id FROM entities WHERE name = ? OR code_name = ? LIMIT 1', [name, name]);
  return row ? row.id : null;
}

function normalizeVisibility(value) {
  const allowed = ['agent_public', 'locked', 'dm_only'];
  return allowed.includes(value) ? value : 'agent_public';
}

function normalizeMelEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const text = entry.trim();
    return text ? { text, is_public: true } : null;
  }
  const text = (entry.text || entry.mel || '').toString().trim();
  if (!text) return null;
  const isPublic = entry.is_public !== false && entry.visibility !== 'dm';
  return { text, is_public: isPublic };
}

function parseMel(raw = '') {
  if (!raw) return [];
  const trimmed = typeof raw === 'string' ? raw.trim() : raw;
  if (typeof trimmed === 'string' && trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeMelEntry).filter(Boolean);
      }
    } catch (err) {
      console.warn('Fallo al parsear MEL JSON', err);
    }
  }
  return String(trimmed)
    .split(/[\n;,]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeMelEntry(line))
    .filter(Boolean);
}

function serializeMelPublic(list = []) {
  const safe = list.map(normalizeMelEntry).filter(Boolean);
  return safe.length ? JSON.stringify(safe) : '';
}

function filterMelForAgent(raw = '') {
  const items = parseMel(raw).filter((item) => item.is_public !== false);
  return items.length ? serializeMelPublic(items) : '';
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    kind: 'entity',
    code_name: row.code_name || row.name,
    real_name: row.real_name || '',
    alignment: row.alignment || row.allegiance || '',
    mel: row.mel || '',
    public_summary: row.public_summary || row.public_note || '',
    dm_notes: row.dm_notes || row.dm_note || ''
  };
}

function mapPoiToEntity(row) {
  if (!row) return null;
  const visibility = row.visibility || 'agent_public';
  return {
    id: row.id,
    type: 'poi',
    kind: 'poi',
    code_name: row.name,
    name: row.name,
    role: row.category,
    status: row.veil_status,
    alignment: row.veil_status || '',
    veil_status: row.veil_status || '',
    threat_level: row.threat_level,
    image_url: row.image_url,
    public_summary: row.public_note || '',
    dm_notes: row.dm_notes || row.dm_note || '',
    dm_note: row.dm_notes || row.dm_note || '',
    visibility,
    unlock_code: row.unlock_code || null,
    locked_hint: row.locked_hint || '',
    poi_latitude: row.latitude,
    poi_longitude: row.longitude,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    session_tag: row.session_tag,
    archived: 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function getEntitiesForDm(filters = {}) {
  const wantsPois = !filters.type || filters.type === 'poi';
  const wantsEntities = !filters.type || filters.type !== 'poi';

  let entities = [];
  if (wantsEntities) {
    const rows = await queryEntities(filters, { includeArchived: filters.includeArchived });
    entities = rows.map(mapRow);
  }
  if (wantsPois) {
    const poiFilters = {};
    if (filters.session) poiFilters.session_tag = filters.session;
    const pois = await getAllPois(poiFilters);
    entities = entities.concat(pois.map(mapPoiToEntity));
  }
  return entities;
}

async function getEntityForDm(id) {
  const row = await get('SELECT * FROM entities WHERE id = ?', [id]);
  if (row) return mapRow(row);
  const poi = await getPoiById(id);
  return poi ? mapPoiToEntity(poi) : null;
}

async function getEntitiesForAgent(filters = {}) {
  const wantsPois = !filters.type || filters.type === 'poi';
  const wantsEntities = !filters.type || filters.type !== 'poi';

  let entities = [];
  if (wantsEntities) {
    const rows = await queryEntities(filters, { agentView: true });
    entities = rows.map((row) => filterAgentEntity(mapRow(row)));
  }
  if (wantsPois) {
    const poiFilters = {};
    if (filters.session) poiFilters.session_tag = filters.session;
    const pois = await getAllPois(poiFilters);
    entities = entities.concat(
      pois
        .map(mapPoiToEntity)
        .map(filterAgentEntity)
        .filter(Boolean)
    );
  }
  return entities;
}

async function getEntityForAgent(id) {
  const row = await get('SELECT * FROM entities WHERE id = ?', [id]);
  if (row) {
    if (row.visibility === 'dm_only' || row.archived) return null;
    return filterAgentEntity(mapRow(row));
  }
  const poi = await getPoiById(id);
  if (!poi) return null;
  return filterAgentEntity(mapPoiToEntity(poi));
}

function filterAgentEntity(entity) {
  if (!entity) return null;
  if (entity.visibility === 'locked' && entity.type === 'poi') {
    return {
      id: entity.id,
      type: entity.type,
      kind: entity.kind || 'poi',
      code_name: entity.code_name,
      name: entity.name || entity.code_name,
      category: entity.category,
      visibility: entity.visibility,
      locked_hint: entity.locked_hint || '',
      locked: true,
      poi_latitude: entity.poi_latitude ?? entity.latitude,
      poi_longitude: entity.poi_longitude ?? entity.longitude,
      latitude: entity.latitude,
      longitude: entity.longitude
    };
  }
  if (entity.visibility === 'locked') {
    return {
      id: entity.id,
      type: entity.type,
      code_name: entity.code_name,
      status: entity.status,
      alignment: entity.alignment,
      image_url: entity.image_url,
      visibility: entity.visibility,
      locked_hint: entity.locked_hint || '',
      locked: true
    };
  }
  if (entity.type === 'poi') {
    return {
      id: entity.id,
      type: entity.type,
      kind: entity.kind || 'poi',
      code_name: entity.code_name,
      name: entity.name,
      role: entity.role,
      status: entity.status,
      alignment: entity.alignment,
      threat_level: entity.threat_level,
      image_url: entity.image_url,
      mel: filterMelForAgent(entity.mel || ''),
      public_summary: entity.public_summary || '',
      visibility: entity.visibility,
      locked_hint: entity.locked_hint || '',
      poi_latitude: entity.poi_latitude ?? entity.latitude,
      poi_longitude: entity.poi_longitude ?? entity.longitude,
      latitude: entity.latitude,
      longitude: entity.longitude,
      category: entity.category,
      session_tag: entity.session_tag,
      veil_status: entity.veil_status
    };
  }
  return {
    id: entity.id,
    type: entity.type,
    code_name: entity.code_name,
    real_name: entity.real_name,
    role: entity.role,
    status: entity.status,
    alignment: entity.alignment,
    threat_level: entity.threat_level,
    image_url: entity.image_url,
    mel: filterMelForAgent(entity.mel || ''),
    first_session: entity.first_session,
    last_session: entity.last_session,
    sessions: entity.sessions,
    public_summary: entity.public_summary || '',
    visibility: entity.visibility,
    locked_hint: entity.locked_hint || ''
  };
}

async function queryEntities(filters = {}, options = {}) {
  const conditions = [];
  const params = [];
  if (filters.type && ENTITY_TYPES.includes(filters.type)) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.alignment) {
    conditions.push('alignment = ?');
    params.push(filters.alignment);
  }
  if (filters.session) {
    conditions.push('(first_session = ? OR last_session = ? OR sessions LIKE ?)');
    params.push(filters.session, filters.session, `%${filters.session}%`);
  }
  if (filters.q) {
    conditions.push('(code_name LIKE ? OR name LIKE ? OR role LIKE ?)');
    params.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`);
  }
  if (!options.includeArchived) {
    conditions.push('archived = 0');
  }
  if (options.agentView) {
    conditions.push("visibility != 'dm_only'");
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return all(`SELECT * FROM entities ${where} ORDER BY created_at DESC`, params);
}

async function getEntityContext(entityId, options = {}) {
  const includePrivate = !!options.includePrivate;
  const entity = includePrivate ? await getEntityForDm(entityId) : await getEntityForAgent(entityId);
  if (!entity) return null;

  const linkFilter = includePrivate ? '' : 'AND is_public = 1';

  const pois = await all(
    `SELECT l.*, p.name, p.session_tag as poi_session, p.latitude, p.longitude
     FROM entity_poi_links l
     JOIN pois p ON p.id = l.poi_id
     WHERE l.entity_id = ? ${linkFilter}`,
    [entityId]
  );

  const sessions = await all(
    `SELECT * FROM entity_session_links WHERE entity_id = ? ${linkFilter}`,
    [entityId]
  );

  const relations = await all(
    `SELECT r.*, e.code_name as to_code_name, e.type as to_type, e.alignment as to_alignment
     FROM entity_relations r
     JOIN entities e ON e.id = r.to_entity_id
     WHERE r.from_entity_id = ? ${linkFilter}`,
    [entityId]
  );

  return {
    entity,
    pois,
    sessions,
    relations
  };
}

async function createEntity(entity, relations = {}) {
  return withTransaction(async () => {
    const result = await run(
      `INSERT INTO entities
        (type, code_name, name, real_name, role, status, alignment, threat_level, image_url, first_session, last_session, sessions, mel, public_summary, dm_notes, visibility, unlock_code, locked_hint, archived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [
        entity.type,
        entity.code_name || entity.name,
        entity.code_name || entity.name,
        entity.real_name || null,
        entity.role || null,
        entity.status || null,
        entity.alignment || null,
        entity.threat_level || null,
        entity.image_url || null,
        entity.first_session || null,
        entity.last_session || null,
        entity.sessions || null,
        entity.mel || null,
        entity.public_summary || null,
        entity.dm_notes || null,
        normalizeVisibility(entity.visibility),
        entity.unlock_code || null,
        entity.locked_hint || null,
        entity.archived ? 1 : 0
      ]
    );

    await replaceEntityLinks(result.lastID, relations);
    return getEntityForDm(result.lastID);
  });
}

async function updateEntity(id, entity, relations = {}) {
  return withTransaction(async () => {
    await run(
      `UPDATE entities SET
        type = ?,
        code_name = ?,
        name = ?,
        real_name = ?,
        role = ?,
        status = ?,
        alignment = ?,
        threat_level = ?,
        image_url = ?,
        first_session = ?,
        last_session = ?,
        sessions = ?,
        mel = ?,
        public_summary = ?,
        dm_notes = ?,
        visibility = ?,
        unlock_code = ?,
        locked_hint = ?,
        archived = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      , [
        entity.type,
        entity.code_name || entity.name,
        entity.code_name || entity.name,
        entity.real_name || null,
        entity.role || null,
        entity.status || null,
        entity.alignment || null,
        entity.threat_level || null,
        entity.image_url || null,
        entity.first_session || null,
        entity.last_session || null,
        entity.sessions || null,
        entity.mel || null,
        entity.public_summary || null,
        entity.dm_notes || null,
        normalizeVisibility(entity.visibility),
        entity.unlock_code || null,
        entity.locked_hint || null,
        entity.archived ? 1 : 0,
        id
      ]
    );

    await replaceEntityLinks(id, relations);
    return getEntityForDm(id);
  });
}

async function archiveEntity(id) {
  await run('UPDATE entities SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return getEntityForDm(id);
}

async function replaceEntityLinks(entityId, relations = {}) {
  const { poi_links = [], session_links = [], relations: rels = [] } = relations;
  await run('DELETE FROM entity_poi_links WHERE entity_id = ?', [entityId]);
  await run('DELETE FROM entity_session_links WHERE entity_id = ?', [entityId]);
  await run('DELETE FROM entity_relations WHERE from_entity_id = ?', [entityId]);

  for (const link of poi_links) {
    if (!link.poi_id) continue;
    await run(
      `INSERT INTO entity_poi_links (entity_id, poi_id, role_at_poi, session_tag, is_public)
      VALUES (?, ?, ?, ?, ?)`
      , [entityId, link.poi_id, link.role_at_poi || null, link.session_tag || null, link.is_public ? 1 : 0]
    );
  }

  for (const s of session_links) {
    if (!s.session_tag) continue;
    await run(
      `INSERT INTO entity_session_links (entity_id, session_tag, summary_public, summary_dm, is_public)
      VALUES (?, ?, ?, ?, ?)`
      , [entityId, s.session_tag, s.summary_public || null, s.summary_dm || null, s.is_public ? 1 : 0]
    );
  }

  for (const rel of rels) {
    if (!rel.to_entity_id) continue;
    await run(
      `INSERT INTO entity_relations (from_entity_id, to_entity_id, relation_type, strength, is_public)
      VALUES (?, ?, ?, ?, ?)`
      , [entityId, rel.to_entity_id, rel.relation_type || null, rel.strength || null, rel.is_public ? 1 : 0]
    );
  }
}

async function unlockEntity(id, code) {
  const entity = await get('SELECT * FROM entities WHERE id = ?', [id]);
  if (entity) {
    if (entity.visibility !== 'locked') return { status: 'not_locked' };
    if (entity.unlock_code && code && entity.unlock_code === code) {
      await run('UPDATE entities SET visibility = ? WHERE id = ?', ['agent_public', id]);
      const updated = await get('SELECT * FROM entities WHERE id = ?', [id]);
      const mapped = mapRow(updated);
      return { status: 'ok', public_summary: mapped.public_summary || '', entity: filterAgentEntity(mapped) };
    }
    return { status: 'invalid_code' };
  }
  // Try POI unlock
  const poi = await get('SELECT * FROM pois WHERE id = ?', [id]);
  if (!poi) return { status: 'not_found' };
  if (poi.visibility !== 'locked') return { status: 'not_locked' };
  if (poi.unlock_code && code && poi.unlock_code === code) {
    await run('UPDATE pois SET visibility = ? WHERE id = ?', ['agent_public', id]);
    const updated = await get('SELECT * FROM pois WHERE id = ?', [id]);
    const mapped = mapPoiToEntity(updated);
    return { status: 'ok', public_summary: mapped.public_summary || '', entity: filterAgentEntity(mapped) };
  }
  return { status: 'invalid_code' };
}

async function deleteEntity(id) {
  return withTransaction(async () => {
    // Delete relations first to maintain referential integrity
    await run('DELETE FROM entity_poi_links WHERE entity_id = ?', [id]);
    await run('DELETE FROM entity_session_links WHERE entity_id = ?', [id]);
    await run('DELETE FROM entity_relations WHERE from_entity_id = ? OR to_entity_id = ?', [id, id]);

    const result = await run('DELETE FROM entities WHERE id = ?', [id]);
    return result.changes > 0;
  });
}

module.exports = {
  initialize,
  getAllPois,
  getPoiById,
  createPoi,
  updatePoi,
  deletePoi,
  replacePoiEntityLinks,
  CATEGORY_VALUES,
  VEIL_VALUES,
  getMessages,
  createMessage,
  markMessageRead,
  deleteMessageForViewer,
  getEntitiesForDm,
  getEntityForDm,
  getEntitiesForAgent,
  getEntityForAgent,
  createEntity,
  updateEntity,
  archiveEntity,
  deleteEntity,
  mapPoiToEntity,
  getEntityContext,
  filterAgentEntity,
  unlockEntity,
  ENTITY_TYPES,
  upsertJournalEntry,
  getJournalEntry,
  listJournalEntries
};

initialize().catch((err) => {
  console.error('Failed to initialize database', err);
  process.exit(1);
});
