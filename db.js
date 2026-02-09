const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { hashPassword } = require('./auth');

const DB_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(__dirname, 'schuylkill.db');
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

const DEFAULT_AGENT_USERS = [
  { username: 'pike', display: 'Howard Pike' },
  { username: 'allen', display: 'Victoria Allen' },
  { username: 'guerrero', display: 'Arnold Guerrero-Hart' },
  { username: 'clutter', display: 'Dwight Clutter' },
  { username: 'redwood', display: 'Karen Redwood' }
];
const DEFAULT_DM_USER = { username: 'dm', display: 'Sr. Verdad' };
const DEFAULT_GENERAL_MAX = 4;
const DEFAULT_INVESTIGATION_MAX = 1;
const GENERAL_SKILL_NAMES = [
  'Atletismo',
  'Conducir',
  'Escaramuza',
  'Infiltración',
  'Preparación',
  'Vigilancia',
  'Desarmado',
  'Mecánica',
  'Primeros auxilios',
  'Psiquiatría'
];
const INVESTIGATION_SKILL_GROUPS = {
  academicas: [
    'Antropología',
    'Arquitectura',
    'Conocimiento local',
    'Contabilidad',
    'Cultura general',
    'Derecho',
    'Historia',
    'Historia del arte',
    'Historia natural',
    'Idiomas',
    'Investigar',
    'Lingüística',
    'Ocultismo',
    'Patología',
    'Psicología forense'
  ],
  interpersonales: [
    'Adular',
    'Bajos fondos',
    'Burocracia',
    'Consolar',
    'Detección de mentiras',
    'Interrogar',
    'Intimidar',
    'Jerga policial',
    'Ligar',
    'Negociar',
    'Suplantar'
  ],
  tecnicas: [
    'Análisis de documentos',
    'Astronomía',
    'Balística',
    'Criptografía',
    'Entomología forense',
    'Explosivos',
    'Fotografía',
    'Huellas dactilares',
    'Medicina forense',
    'Química',
    'Recoger pruebas',
    'Recuperar datos',
    'Vigilancia electrónica'
  ]
};
const INVESTIGATION_MAX_OVERRIDES = {
  'historia natural': 2
};

function slugifySkillName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildDefaultSkillEntry(name, max, group) {
  const maxValue = Math.max(0, Number(max) || 0);
  return {
    id: slugifySkillName(name),
    name: String(name),
    max: maxValue,
    current: maxValue,
    group: group ? String(group) : ''
  };
}

function buildDefaultGeneralSkills() {
  return GENERAL_SKILL_NAMES.map((name) => buildDefaultSkillEntry(name, DEFAULT_GENERAL_MAX, ''));
}

function buildDefaultInvestigationSkills() {
  return Object.entries(INVESTIGATION_SKILL_GROUPS).flatMap(([group, skills]) =>
    skills.map((name) => {
      const overrideKey = String(name || '').toLowerCase();
      const max = INVESTIGATION_MAX_OVERRIDES[overrideKey] || DEFAULT_INVESTIGATION_MAX;
      return buildDefaultSkillEntry(name, max, group);
    })
  );
}

function buildDefaultCharacterSheet(agentUsername, agentDisplay) {
  const display = agentDisplay || agentUsername || 'Agente';
  return {
    agent_username: agentUsername,
    character_name: display,
    character_role: 'Agente de campo OV',
    health_current: 10,
    health_max: 10,
    stability_current: 8,
    stability_max: 8,
    general_skills: buildDefaultGeneralSkills(),
    investigation_skills: buildDefaultInvestigationSkills()
  };
}

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
  await ensureMessageThreadColumns();
  await ensureChatTables();
  await ensureJournalTable();
  await ensureAuthUsersTable();
  await ensureAuthSeed();
  await ensureCharacterSheetTable();
  await ensurePoiVisibilityColumns();
  await ensureActivityTable();

  await ensureEntitiesTables();
  await ensureChatIdentitySeed();
  await seedCharacterSheetsIfMissing();
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
    (name, category, latitude, longitude, image_url, public_note, dm_note, agent_notes, threat_level, veil_status, session_tag, visibility, unlock_code, locked_hint)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const result = await run(sql, [
    poi.name,
    poi.category,
    poi.latitude,
    poi.longitude,
    poi.image_url || null,
    poi.public_note || null,
    poi.dm_note || null,
    poi.agent_notes || null,
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
      agent_notes = ?,
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
    poi.agent_notes || null,
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
  const role = filters.role;
  const dmActor = filters.dmActor || 'MrTruth';

  if (filters.recipient) {
    conditions.push('recipient = ?');
    params.push(filters.recipient);
  }

  if (filters.session_tag) {
    conditions.push('session_tag = ?');
    params.push(filters.session_tag);
  }

  if (filters.q) {
    const needle = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      '(LOWER(subject) LIKE ? OR LOWER(body) LIKE ? OR LOWER(sender) LIKE ? OR LOWER(recipient) LIKE ?)'
    );
    params.push(needle, needle, needle, needle);
  }

  if (filters.box === 'sent') {
    if (role === 'dm') {
      conditions.push('created_by = ?');
      params.push(dmActor);
    } else if (filters.viewer) {
      conditions.push('created_by = ?');
      params.push(filters.viewer);
      if (role === 'agent' && dmActor) {
        conditions.push(
          'EXISTS (SELECT 1 FROM messages parent WHERE parent.id = messages.reply_to_id AND parent.created_by = ?)'
        );
        params.push(dmActor);
      }
    }
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
    `SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit || 100, filters.offset || 0]
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

async function listDmMessageIdentities(dmActor) {
  const rows = await all(
    'SELECT DISTINCT sender FROM messages WHERE created_by = ? ORDER BY sender COLLATE NOCASE',
    [dmActor]
  );
  return rows.map((row) => row.sender).filter(Boolean);
}

async function listAgentMessageIdentities(dmActor, agentDisplay) {
  if (!agentDisplay) return [];
  const recipients = [
    agentDisplay,
    'All agents',
    'all agents',
    'Todos los agentes',
    'todos los agentes'
  ];
  const placeholders = recipients.map(() => '?').join(',');
  const rows = await all(
    `SELECT DISTINCT sender
     FROM messages
     WHERE created_by = ? AND recipient IN (${placeholders})
     ORDER BY sender COLLATE NOCASE`,
    [dmActor, ...recipients]
  );
  return rows.map((row) => row.sender).filter(Boolean);
}

async function getMessageById(id) {
  if (!id) return null;
  return get('SELECT * FROM messages WHERE id = ?', [id]);
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
  if (!existing.has('agent_notes')) {
    pending.push('ALTER TABLE pois ADD COLUMN agent_notes TEXT');
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

async function ensureMessageThreadColumns() {
  const columns = await all(`PRAGMA table_info(messages)`);
  const existing = new Set(columns.map((col) => col.name));
  if (!existing.has('reply_to_id')) {
    await run('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER');
  }
  if (!existing.has('thread_id')) {
    await run('ALTER TABLE messages ADD COLUMN thread_id INTEGER');
  }
  if (!existing.has('priority')) {
    await run("ALTER TABLE messages ADD COLUMN priority TEXT DEFAULT 'normal'");
  }
}

async function ensureChatTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS dm_identities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_username TEXT NOT NULL,
      dm_identity_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(agent_username, dm_identity_id),
      FOREIGN KEY (dm_identity_id) REFERENCES dm_identities(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('dm','agent')),
      sender_label TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES chat_threads(id)
    )
  `);
}

async function ensureChatIdentitySeed() {
  const defaults = ['Sr. Verdad', 'Sra. Lealtad'];
  for (const name of defaults) {
    await run(
      `INSERT OR IGNORE INTO dm_identities (name, created_at, updated_at)
       VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name]
    );
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

async function ensureAuthUsersTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('dm', 'agent')),
      username TEXT NOT NULL,
      display TEXT NOT NULL,
      password_hash TEXT,
      password_salt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role, username)
    )
  `);
}

async function ensureCharacterSheetTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS agent_character_sheets (
      agent_username TEXT PRIMARY KEY,
      character_name TEXT,
      character_role TEXT,
      health_current INTEGER DEFAULT 0,
      health_max INTEGER DEFAULT 0,
      stability_current INTEGER DEFAULT 0,
      stability_max INTEGER DEFAULT 0,
      general_skills TEXT,
      investigation_skills TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAuthUser(role, username) {
  return get('SELECT * FROM auth_users WHERE role = ? AND username = ?', [role, username]);
}

async function listAuthUsersByRole(role) {
  return all('SELECT * FROM auth_users WHERE role = ? ORDER BY display ASC', [role]);
}

async function createAuthUser({ role, username, display, password_hash, password_salt }) {
  await run(
    `
    INSERT INTO auth_users (role, username, display, password_hash, password_salt)
    VALUES (?, ?, ?, ?, ?)
  `,
    [role, username, display, password_hash || null, password_salt || null]
  );
  return getAuthUser(role, username);
}

async function updateAuthPassword({ role, username, password_hash, password_salt }) {
  await run(
    `
    UPDATE auth_users
    SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP
    WHERE role = ? AND username = ?
  `,
    [password_hash || null, password_salt || null, role, username]
  );
  return getAuthUser(role, username);
}

async function ensureAuthSeed() {
  const defaultAgentPassword = process.env.AGENT_DEFAULT_PASSWORD || 'amarok';
  const defaultDmPassword = process.env.DM_SECRET || process.env.DM_DEFAULT_PASSWORD || '';

  const dmUser = await getAuthUser('dm', DEFAULT_DM_USER.username);
  if (!dmUser) {
    const dmCreds = defaultDmPassword ? hashPassword(defaultDmPassword) : null;
    await createAuthUser({
      role: 'dm',
      username: DEFAULT_DM_USER.username,
      display: DEFAULT_DM_USER.display,
      password_hash: dmCreds ? dmCreds.hash : null,
      password_salt: dmCreds ? dmCreds.salt : null
    });
  }

  for (const agent of DEFAULT_AGENT_USERS) {
    const existing = await getAuthUser('agent', agent.username);
    if (existing) continue;
    const agentCreds = defaultAgentPassword ? hashPassword(defaultAgentPassword) : null;
    await createAuthUser({
      role: 'agent',
      username: agent.username,
      display: agent.display,
      password_hash: agentCreds ? agentCreds.hash : null,
      password_salt: agentCreds ? agentCreds.salt : null
    });
  }
}

async function seedCharacterSheetsIfMissing() {
  const agents = await listAuthUsersByRole('agent');
  for (const agent of agents) {
    const existing = await get('SELECT agent_username FROM agent_character_sheets WHERE agent_username = ?', [
      agent.username
    ]);
    if (existing) continue;
    const defaults = buildDefaultCharacterSheet(agent.username, agent.display);
    await run(
      `
      INSERT INTO agent_character_sheets (
        agent_username,
        character_name,
        character_role,
        health_current,
        health_max,
        stability_current,
        stability_max,
        general_skills,
        investigation_skills,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      [
        defaults.agent_username,
        defaults.character_name,
        defaults.character_role,
        defaults.health_current,
        defaults.health_max,
        defaults.stability_current,
        defaults.stability_max,
        JSON.stringify(defaults.general_skills),
        JSON.stringify(defaults.investigation_skills)
      ]
    );
  }
}

async function ensureActivityTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS entity_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      entity_label TEXT NOT NULL,
      action TEXT NOT NULL,
      updated_fields TEXT,
      actor_name TEXT,
      visibility TEXT NOT NULL DEFAULT 'agent_public',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const columns = await all(`PRAGMA table_info(entity_activity)`);
  const hasActor = columns.some((col) => col.name === 'actor_name');
  if (!hasActor) {
    await run(`ALTER TABLE entity_activity ADD COLUMN actor_name TEXT`);
  }
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
  await ensureColumn('agent_notes', 'TEXT', '');
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
  let threadId = message.thread_id || null;
  if (!threadId && message.reply_to_id) {
    const parent = await get('SELECT id, thread_id FROM messages WHERE id = ?', [message.reply_to_id]);
    threadId = parent ? parent.thread_id || parent.id : message.reply_to_id;
  }
  const priority = message.priority || 'normal';
  const sql = `
    INSERT INTO messages
    (sender, recipient, subject, body, session_tag, reply_to_id, thread_id, priority, created_by, read_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await run(sql, [
    message.sender,
    message.recipient,
    message.subject,
    message.body,
    message.session_tag || null,
    message.reply_to_id || null,
    threadId,
    priority,
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

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function parseSkillList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function normalizeSkillEntry(entry) {
  if (!entry) return null;
  const name = String(entry.name || '').trim() || 'Habilidad';
  const id = entry.id ? String(entry.id) : slugifySkillName(name);
  const max = Math.max(0, Number(entry.max) || 0);
  const current = clampNumber(Number(entry.current) || 0, 0, max);
  return {
    id,
    name,
    max,
    current,
    group: entry.group ? String(entry.group) : ''
  };
}

function normalizeSkillList(list) {
  return (Array.isArray(list) ? list : [])
    .map((entry) => normalizeSkillEntry(entry))
    .filter((entry) => entry);
}

function normalizeCharacterSheetRow(row, fallback) {
  if (!row && !fallback) return null;
  const source = row || fallback;
  const generalRaw = row ? row.general_skills : source.general_skills;
  const investigationRaw = row ? row.investigation_skills : source.investigation_skills;
  const generalSkills = normalizeSkillList(
    typeof generalRaw === 'string' ? parseSkillList(generalRaw) : generalRaw
  );
  const investigationSkills = normalizeSkillList(
    typeof investigationRaw === 'string' ? parseSkillList(investigationRaw) : investigationRaw
  );
  return {
    agent_username: source.agent_username,
    character_name: source.character_name || '',
    character_role: source.character_role || '',
    health_max: Math.max(0, Number(source.health_max) || 0),
    stability_max: Math.max(0, Number(source.stability_max) || 0),
    health_current: clampNumber(Number(source.health_current) || 0, 0, Math.max(0, Number(source.health_max) || 0)),
    stability_current: clampNumber(
      Number(source.stability_current) || 0,
      0,
      Math.max(0, Number(source.stability_max) || 0)
    ),
    general_skills: generalSkills,
    investigation_skills: investigationSkills,
    updated_at: source.updated_at || null
  };
}

async function getAgentCharacterSheet(agentUsername, agentDisplay) {
  if (!agentUsername) return null;
  const row = await get('SELECT * FROM agent_character_sheets WHERE agent_username = ?', [agentUsername]);
  if (row) return normalizeCharacterSheetRow(row);
  const defaults = buildDefaultCharacterSheet(agentUsername, agentDisplay);
  await run(
    `
    INSERT INTO agent_character_sheets (
      agent_username,
      character_name,
      character_role,
      health_current,
      health_max,
      stability_current,
      stability_max,
      general_skills,
      investigation_skills,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,
    [
      defaults.agent_username,
      defaults.character_name,
      defaults.character_role,
      defaults.health_current,
      defaults.health_max,
      defaults.stability_current,
      defaults.stability_max,
      JSON.stringify(defaults.general_skills),
      JSON.stringify(defaults.investigation_skills)
    ]
  );
  return normalizeCharacterSheetRow(null, defaults);
}

async function updateAgentCharacterSheet(agentUsername, payload) {
  if (!agentUsername || !payload) return null;
  const normalized = normalizeCharacterSheetRow(payload, payload);
  if (!normalized) return null;
  await run(
    `
    INSERT OR REPLACE INTO agent_character_sheets (
      agent_username,
      character_name,
      character_role,
      health_current,
      health_max,
      stability_current,
      stability_max,
      general_skills,
      investigation_skills,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,
    [
      agentUsername,
      normalized.character_name,
      normalized.character_role,
      normalized.health_current,
      normalized.health_max,
      normalized.stability_current,
      normalized.stability_max,
      JSON.stringify(normalized.general_skills),
      JSON.stringify(normalized.investigation_skills)
    ]
  );
  const saved = await get('SELECT * FROM agent_character_sheets WHERE agent_username = ?', [agentUsername]);
  return normalizeCharacterSheetRow(saved);
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

async function listChatIdentities() {
  return all('SELECT * FROM dm_identities ORDER BY name COLLATE NOCASE');
}

async function getChatIdentityById(id) {
  return get('SELECT * FROM dm_identities WHERE id = ?', [id]);
}

async function createChatIdentity(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  await run(
    `INSERT INTO dm_identities (name, created_at, updated_at)
     VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [trimmed]
  );
  return get('SELECT * FROM dm_identities WHERE name = ?', [trimmed]);
}

async function updateChatIdentity(id, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  await run(
    `UPDATE dm_identities
     SET name = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [trimmed, id]
  );
  return get('SELECT * FROM dm_identities WHERE id = ?', [id]);
}

async function deleteChatIdentity(id) {
  const usage = await get('SELECT COUNT(*) as count FROM chat_threads WHERE dm_identity_id = ?', [id]);
  if (usage && usage.count > 0) {
    return { ok: false, reason: 'in_use' };
  }
  const result = await run('DELETE FROM dm_identities WHERE id = ?', [id]);
  return { ok: result.changes > 0 };
}

async function getChatThreadById(id) {
  return get(
    `
    SELECT t.id,
           t.agent_username,
           u.display as agent_display,
           t.dm_identity_id,
           i.name as dm_identity_name,
           t.created_at,
           t.updated_at
    FROM chat_threads t
    JOIN dm_identities i ON i.id = t.dm_identity_id
    LEFT JOIN auth_users u ON u.username = t.agent_username AND u.role = 'agent'
    WHERE t.id = ?
  `,
    [id]
  );
}

async function getChatThreadByKey(agentUsername, identityId) {
  return get(
    `
    SELECT t.id,
           t.agent_username,
           u.display as agent_display,
           t.dm_identity_id,
           i.name as dm_identity_name,
           t.created_at,
           t.updated_at
    FROM chat_threads t
    JOIN dm_identities i ON i.id = t.dm_identity_id
    LEFT JOIN auth_users u ON u.username = t.agent_username AND u.role = 'agent'
    WHERE t.agent_username = ? AND t.dm_identity_id = ?
  `,
    [agentUsername, identityId]
  );
}

async function resolveChatThread(agentUsername, identityId) {
  await run(
    `INSERT OR IGNORE INTO chat_threads (agent_username, dm_identity_id, created_at, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [agentUsername, identityId]
  );
  return getChatThreadByKey(agentUsername, identityId);
}

async function listChatThreads({ role, agentUsername }) {
  const params = [];
  const conditions = [];
  if (role === 'agent' && agentUsername) {
    conditions.push('t.agent_username = ?');
    params.push(agentUsername);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await all(
    `
    SELECT t.id,
           t.agent_username,
           u.display as agent_display,
           t.dm_identity_id,
           i.name as dm_identity_name,
           t.created_at,
           t.updated_at,
           m.id as last_message_id,
           m.sender_role as last_message_role,
           m.sender_label as last_message_label,
           m.body as last_message_body,
           m.created_at as last_message_at
    FROM chat_threads t
    JOIN dm_identities i ON i.id = t.dm_identity_id
    LEFT JOIN auth_users u ON u.username = t.agent_username AND u.role = 'agent'
    LEFT JOIN chat_messages m ON m.id = (
      SELECT id
      FROM chat_messages
      WHERE thread_id = t.id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    )
    ${where}
    ORDER BY COALESCE(m.created_at, t.updated_at) DESC, t.id DESC
  `,
    params
  );
  return rows;
}

async function listChatMessages(threadId, { limit = 200, offset = 0 } = {}) {
  return all(
    `
    SELECT *
    FROM chat_messages
    WHERE thread_id = ?
    ORDER BY created_at ASC, id ASC
    LIMIT ? OFFSET ?
  `,
    [threadId, limit, offset]
  );
}

async function createChatMessage({ threadId, senderRole, senderLabel, body }) {
  await run(
    `
    INSERT INTO chat_messages (thread_id, sender_role, sender_label, body)
    VALUES (?, ?, ?, ?)
  `,
    [threadId, senderRole, senderLabel, body]
  );
  await run('UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [threadId]);
  return get(
    'SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
    [threadId]
  );
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
    dm_notes: row.dm_notes || row.dm_note || '',
    agent_notes: row.agent_notes || ''
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
    agent_notes: row.agent_notes || '',
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
      agent_notes: entity.agent_notes || '',
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
    agent_notes: entity.agent_notes || '',
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
    `SELECT l.*, p.name, p.session_tag as poi_session, p.latitude, p.longitude, p.public_note
     FROM entity_poi_links l
     JOIN pois p ON p.id = l.poi_id
     WHERE l.entity_id = ? ${linkFilter}`,
    [entityId]
  );

  const sessions = await all(
    `SELECT * FROM entity_session_links WHERE entity_id = ? ${linkFilter}`,
    [entityId]
  );

  const outgoingRelations = await all(
    `SELECT r.*, e.code_name as to_code_name, e.type as to_type, e.role as to_role, e.alignment as to_alignment, e.image_url as to_image_url, e.visibility as to_visibility, e.public_summary as to_public_summary, e.public_note as to_public_note
     FROM entity_relations r
     JOIN entities e ON e.id = r.to_entity_id
     WHERE r.from_entity_id = ? ${linkFilter}`,
    [entityId]
  );
  const incomingRelations = await all(
    `SELECT r.*, e.id as from_entity_id, e.code_name as from_code_name, e.type as from_type, e.role as from_role, e.alignment as from_alignment, e.image_url as from_image_url, e.visibility as from_visibility, e.public_summary as from_public_summary, e.public_note as from_public_note
     FROM entity_relations r
     JOIN entities e ON e.id = r.from_entity_id
     WHERE r.to_entity_id = ? ${linkFilter}`,
    [entityId]
  );
  const relationsByTarget = new Map();
  outgoingRelations.forEach((rel) => {
    const targetId = Number(rel.to_entity_id);
    if (!targetId || Number.isNaN(targetId)) return;
    relationsByTarget.set(targetId, {
      ...rel,
      from_entity_id: entityId,
      to_entity_id: targetId
    });
  });
  incomingRelations.forEach((rel) => {
    const targetId = Number(rel.from_entity_id);
    if (!targetId || Number.isNaN(targetId)) return;
    if (relationsByTarget.has(targetId)) return;
    relationsByTarget.set(targetId, {
      ...rel,
      from_entity_id: entityId,
      to_entity_id: targetId,
      to_code_name: rel.from_code_name,
      to_type: rel.from_type,
      to_role: rel.from_role,
      to_alignment: rel.from_alignment,
      to_image_url: rel.from_image_url,
      to_visibility: rel.from_visibility,
      to_public_summary: rel.from_public_summary,
      to_public_note: rel.from_public_note
    });
  });
  const relations = Array.from(relationsByTarget.values());

  return {
    entity,
    pois,
    sessions,
    relations
  };
}

async function getCampaignGraphContext() {
  const entities = await all('SELECT * FROM entities WHERE archived = 0');
  const entityIdSet = new Set(entities.map((entity) => entity.id));
  const nodes = entities.map((entity) => ({
    id: entity.id,
    entityId: entity.id,
    graphId: `e-${entity.id}`,
    code_name: entity.code_name || entity.name || `Entidad ${entity.id}`,
    type: entity.type || 'npc',
    role: entity.role || '',
    visibility: entity.visibility || 'agent_public',
    image_url: entity.image_url || '',
    session: entity.sessions || '',
    public_summary: entity.public_summary || entity.dm_notes || '',
    threat: entity.threat_level,
    alignment: entity.alignment || ''
  }));

  const edges = [];
  const relations = await all('SELECT * FROM entity_relations');
  relations.forEach((rel, index) => {
    if (!entityIdSet.has(rel.from_entity_id) || !entityIdSet.has(rel.to_entity_id)) return;
    const isPublic = rel.is_public !== 0;
    edges.push({
      data: {
        id: rel.id ? `rel-${rel.id}` : `rel-${index}`,
        source: `e-${rel.from_entity_id}`,
        target: `e-${rel.to_entity_id}`,
        relation: rel.relation_type || rel.relation || 'vínculo',
        strength: rel.strength || 1,
        linkType: 'entity',
        is_public: isPublic ? 1 : 0
      }
    });
  });

  const poiLinks = await all(
    `SELECT l.*, p.name, p.category, p.public_note, p.image_url
     FROM entity_poi_links l
     JOIN pois p ON p.id = l.poi_id`
  );
  const poiNodes = new Map();
  poiLinks.forEach((link, idx) => {
    if (!entityIdSet.has(link.entity_id)) return;
    if (!poiNodes.has(link.poi_id)) {
      poiNodes.set(link.poi_id, {
        id: link.poi_id,
        graphId: `p-${link.poi_id}`,
        entityId: link.poi_id,
        code_name: link.name || 'PdI',
        type: 'poi',
        role: link.category || 'PdI',
        visibility: link.visibility || 'agent_public',
        image_url: link.image_url || '',
        public_summary: link.public_note || '',
        session: link.session_tag || link.poi_session || ''
      });
    }
    edges.push({
      data: {
        id: `poi-${link.entity_id}-${link.poi_id}-${idx}`,
        source: `e-${link.entity_id}`,
        target: `p-${link.poi_id}`,
        relation: link.role_at_poi || 'PdI',
        strength: 1,
        linkType: 'poi',
        is_public: link.is_public !== 0 ? 1 : 0
      }
    });
  });

  const allNodes = [...nodes, ...poiNodes.values()];
  const firstEntityNode = allNodes.find(
    (node) => node.entityId && node.type !== 'poi'
  );
  const graphFocusId = firstEntityNode?.graphId || firstEntityNode?.id || null;

  return {
    entity: {
      id: 'campaign',
      code_name: 'Campaña',
      type: 'org',
      role: 'Vista global',
      visibility: 'agent_public',
      public_summary: 'Mapa completo de relaciones y PdI activos.'
    },
    graph: {
      nodes: allNodes.map((node) => ({ data: node })),
      edges
    },
    graphFocusId
  };
}

async function getAgentCampaignGraphContext() {
  const entities = await all("SELECT * FROM entities WHERE archived = 0 AND visibility = 'agent_public'");
  const entityIdSet = new Set(entities.map((entity) => entity.id));

  const nodes = entities.map((entity) => ({
    id: entity.id,
    entityId: entity.id,
    graphId: `e-${entity.id}`,
    code_name: entity.code_name || entity.name || `Entidad ${entity.id}`,
    type: entity.type || 'npc',
    role: entity.role || '',
    visibility: entity.visibility || 'agent_public',
    image_url: entity.image_url || '',
    session: entity.sessions || '',
    public_summary: entity.public_summary || entity.dm_notes || '',
    threat: entity.threat_level,
    alignment: entity.alignment || ''
  }));

  const edges = [];
  const relations = await all('SELECT * FROM entity_relations');
  relations.forEach((rel, index) => {
    if (!entityIdSet.has(rel.from_entity_id) || !entityIdSet.has(rel.to_entity_id)) return;
    edges.push({
      data: {
        id: rel.id ? `rel-${rel.id}` : `rel-${index}`,
        source: `e-${rel.from_entity_id}`,
        target: `e-${rel.to_entity_id}`,
        relation: rel.relation_type || rel.relation || 'vínculo',
        strength: rel.strength || 1,
        linkType: 'entity',
        is_public: rel.is_public !== 0 ? 1 : 0
      }
    });
  });

  const poiLinks = await all(
    `SELECT l.*, p.name, p.category, p.public_note, p.image_url
     FROM entity_poi_links l
     JOIN pois p ON p.id = l.poi_id
     WHERE p.visibility = 'agent_public'`
  );
  const poiNodes = new Map();
  poiLinks.forEach((link, idx) => {
    if (!entityIdSet.has(link.entity_id)) return;
    if (!poiNodes.has(link.poi_id)) {
      poiNodes.set(link.poi_id, {
        id: link.poi_id,
        graphId: `p-${link.poi_id}`,
        entityId: link.poi_id,
        code_name: link.name || 'PdI',
        type: 'poi',
        role: link.category || 'PdI',
        visibility: link.visibility || 'agent_public',
        image_url: link.image_url || '',
        public_summary: link.public_note || '',
        session: link.session_tag || link.poi_session || ''
      });
    }
    edges.push({
      data: {
        id: `poi-${link.entity_id}-${link.poi_id}-${idx}`,
        source: `e-${link.entity_id}`,
        target: `p-${link.poi_id}`,
        relation: link.role_at_poi || 'PdI',
        strength: 1,
        linkType: 'poi',
        is_public: link.is_public !== 0 ? 1 : 0
      }
    });
  });

  const allNodes = [...nodes, ...poiNodes.values()];
  const firstEntityNode = allNodes.find((node) => node.entityId && node.type !== 'poi');
  const graphFocusId = firstEntityNode?.graphId || firstEntityNode?.id || null;

  return {
    entity: {
      id: 'campaign-agent',
      code_name: 'Campaña Agente',
      type: 'org',
      role: 'Vista de agentes',
      visibility: 'agent_public',
      public_summary: 'Mapa global visible para agentes.'
    },
    graph: {
      nodes: allNodes.map((node) => ({ data: node })),
      edges
    },
    graphFocusId
  };
}

async function createEntity(entity, relations = {}) {
  return withTransaction(async () => {
    const result = await run(
      `INSERT INTO entities
        (type, code_name, name, real_name, role, status, alignment, threat_level, image_url, first_session, last_session, sessions, mel, public_summary, dm_notes, agent_notes, visibility, unlock_code, locked_hint, archived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        entity.agent_notes || null,
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
    let agentNotesValue = entity.agent_notes;
    if (agentNotesValue === undefined) {
      const existing = await get('SELECT agent_notes FROM entities WHERE id = ?', [id]);
      agentNotesValue = existing?.agent_notes || null;
    }
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
        agent_notes = ?,
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
        agentNotesValue,
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

async function updateAgentNotesAndLinks(entityId, agentNotes, relations = {}) {
  const { poi_links = [], relations: rels = [] } = relations || {};
  return withTransaction(async () => {
    await run('UPDATE entities SET agent_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      agentNotes || '',
      entityId
    ]);
    await run('DELETE FROM entity_poi_links WHERE entity_id = ? AND is_public = 1', [entityId]);
    await run('DELETE FROM entity_relations WHERE from_entity_id = ? AND is_public = 1', [entityId]);

    for (const link of poi_links) {
      if (!link.poi_id) continue;
      await run(
        `INSERT INTO entity_poi_links (entity_id, poi_id, role_at_poi, session_tag, is_public)
        VALUES (?, ?, ?, ?, 1)`
        , [entityId, link.poi_id, link.role_at_poi || null, link.session_tag || null]
      );
    }

    for (const rel of rels) {
      if (!rel.to_entity_id) continue;
      await run(
        `INSERT INTO entity_relations (from_entity_id, to_entity_id, relation_type, strength, is_public)
        VALUES (?, ?, ?, ?, 1)`
        , [entityId, rel.to_entity_id, rel.relation_type || null, rel.strength || null]
      );
    }
    return getEntityForAgent(entityId);
  });
}

async function updatePoiAgentNotes(poiId, agentNotes) {
  await run('UPDATE pois SET agent_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    agentNotes || '',
    poiId
  ]);
  return getPoiById(poiId);
}

async function logEntityActivity({
  entity_type,
  entity_id,
  entity_label,
  action,
  updated_fields,
  visibility,
  actor_name
}) {
  if (!entity_type || !entity_label || !action) return;
  const fieldsValue = Array.isArray(updated_fields) ? JSON.stringify(updated_fields) : null;
  await run(
    `
    INSERT INTO entity_activity
      (entity_type, entity_id, entity_label, action, updated_fields, actor_name, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [
      String(entity_type),
      entity_id == null ? null : Number(entity_id),
      String(entity_label),
      String(action),
      fieldsValue,
      actor_name ? String(actor_name) : null,
      normalizeVisibility(visibility)
    ]
  );
}

async function listEntityActivity({ limit = 10, offset = 0, mode = 'dm' } = {}) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const where = mode === 'agent' ? "WHERE visibility = 'agent_public'" : '';
  const rows = await all(
    `SELECT * FROM entity_activity ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );
  const totalRow = await get(`SELECT COUNT(*) as total FROM entity_activity ${where}`);
  const items = rows.map((row) => ({
    ...row,
    updated_fields: row.updated_fields ? JSON.parse(row.updated_fields) : []
  }));
  return { items, total: totalRow ? totalRow.total : 0 };
}

async function listEntropiaZones() {
  const zoneRows = await all('SELECT * FROM entropia_zones ORDER BY id');
  const moduleRows = await all('SELECT * FROM entropia_modules ORDER BY zone_id, sort_order, id');
  const itemRows = await all('SELECT * FROM entropia_module_items ORDER BY module_ref, sort_order, id');

  const zoneMap = new Map();
  zoneRows.forEach((row) => {
    zoneMap.set(row.id, {
      id: row.id,
      code: row.code || null,
      name: row.name,
      summary: row.summary || '',
      tags: row.tags ? JSON.parse(row.tags) : [],
      updatedAt: row.updated_at,
      updatedBy: row.updated_by || null,
      modules: []
    });
  });

  const moduleMap = new Map();
  moduleRows.forEach((row) => {
    const zone = zoneMap.get(row.zone_id);
    if (!zone) return;
    const module = {
      module_id: row.module_id,
      label: row.label,
      type: row.type,
      available: row.available === 1,
      summary: row.summary || '',
      items: []
    };
    zone.modules.push(module);
    moduleMap.set(row.id, module);
  });

  itemRows.forEach((row) => {
    const module = moduleMap.get(row.module_ref);
    if (!module) return;
    module.items.push({
      item_id: row.item_id || null,
      label: row.label,
      status: row.status || null,
      qty: row.qty == null ? null : Number(row.qty),
      notes: row.notes || ''
    });
  });

  return Array.from(zoneMap.values());
}

async function replaceEntropiaZones(zones = [], actorName = 'Sistema') {
  const normalizedZones = Array.isArray(zones) ? zones : [];
  return withTransaction(async () => {
    await run('DELETE FROM entropia_module_items');
    await run('DELETE FROM entropia_modules');
    await run('DELETE FROM entropia_zones');

    for (const zone of normalizedZones) {
      if (!zone || !zone.id || !zone.name) continue;
      const tagsValue = Array.isArray(zone.tags) ? JSON.stringify(zone.tags) : JSON.stringify([]);
      await run(
        `INSERT INTO entropia_zones
          (id, code, name, summary, tags, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [
          String(zone.id),
          zone.code ? String(zone.code) : null,
          String(zone.name),
          zone.summary ? String(zone.summary) : '',
          tagsValue,
          actorName
        ]
      );

      const modules = Array.isArray(zone.modules) ? zone.modules : [];
      for (let idx = 0; idx < modules.length; idx += 1) {
        const module = modules[idx];
        const moduleId = module.module_id || module.id;
        if (!module || !moduleId || !module.label || !module.type) continue;
        const result = await run(
          `INSERT INTO entropia_modules
            (zone_id, module_id, label, type, available, summary, sort_order, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          [
            String(zone.id),
            String(moduleId),
            String(module.label),
            String(module.type),
            module.available ? 1 : 0,
            module.summary ? String(module.summary) : '',
            idx,
            actorName
          ]
        );

        const items = Array.isArray(module.items) ? module.items : [];
        for (let j = 0; j < items.length; j += 1) {
          const item = items[j];
          if (!item || !item.label) continue;
          const itemId = item.item_id || item.id;
          await run(
            `INSERT INTO entropia_module_items
              (module_ref, item_id, label, status, qty, notes, sort_order, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [
              result.lastID,
              itemId ? String(itemId) : null,
              String(item.label),
              item.status ? String(item.status) : null,
              item.qty == null ? null : Number(item.qty),
              item.notes ? String(item.notes) : '',
              j,
              actorName
            ]
          );
        }
      }
    }
    return listEntropiaZones();
  });
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
  listDmMessageIdentities,
  listAgentMessageIdentities,
  getMessageById,
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
  getCampaignGraphContext,
  getAgentCampaignGraphContext,
  filterAgentEntity,
  unlockEntity,
  ENTITY_TYPES,
  upsertJournalEntry,
  getJournalEntry,
  listJournalEntries,
  getAgentCharacterSheet,
  updateAgentCharacterSheet,
  getAuthUser,
  listAuthUsersByRole,
  createAuthUser,
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
};

initialize().catch((err) => {
  console.error('Failed to initialize database', err);
  process.exit(1);
});
