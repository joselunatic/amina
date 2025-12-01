CREATE TABLE IF NOT EXISTS pois (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  image_url TEXT,
  public_note TEXT,
  dm_note TEXT,
  threat_level INTEGER NOT NULL DEFAULT 1 CHECK(threat_level BETWEEN 1 AND 5),
  veil_status TEXT NOT NULL DEFAULT 'intact' CHECK(veil_status IN ('intact','frayed','torn')),
  session_tag TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  session_tag TEXT,
  created_by TEXT NOT NULL,
  read_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  read_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entidades (PJ/PNJ/Organizaciones) y relaciones
CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('pc','npc','org','criatura')),
  code_name TEXT,
  real_name TEXT,
  role TEXT,
  status TEXT,
  alignment TEXT,
  threat_level INTEGER,
  image_url TEXT,
  first_session TEXT,
  last_session TEXT,
  sessions TEXT,
  public_summary TEXT,
  dm_notes TEXT,
  visibility TEXT NOT NULL DEFAULT 'agent_public',
  unlock_code TEXT,
  locked_hint TEXT,
  archived INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación entidad-PdI (visibilidad pública o solo DM)
CREATE TABLE IF NOT EXISTS entity_poi_links (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  poi_id INTEGER NOT NULL,
  role_at_poi TEXT,
  session_tag TEXT,
  is_public INTEGER DEFAULT 1,
  FOREIGN KEY (entity_id) REFERENCES entities(id)
);

-- Tabla de relación entidad-sesión
CREATE TABLE IF NOT EXISTS entity_session_links (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  session_tag TEXT NOT NULL,
  summary_public TEXT,
  summary_dm TEXT,
  is_public INTEGER DEFAULT 1,
  FOREIGN KEY (entity_id) REFERENCES entities(id)
);

-- Grafo entidad-entidad
CREATE TABLE IF NOT EXISTS entity_relations (
  id INTEGER PRIMARY KEY,
  from_entity_id INTEGER NOT NULL,
  to_entity_id INTEGER NOT NULL,
  relation_type TEXT,
  strength INTEGER,
  is_public INTEGER DEFAULT 1,
  FOREIGN KEY (from_entity_id) REFERENCES entities(id),
  FOREIGN KEY (to_entity_id) REFERENCES entities(id)
);

-- Optional seeding for quick starts. Commented so deployments can decide whether to run it manually.
-- INSERT INTO pois
-- (name, category, latitude, longitude, public_note, dm_note, threat_level, veil_status, session_tag)
-- VALUES
-- ("Ordo Veritatis Safehouse – Pottsville", "OV_BASE", 40.683987, -76.209560,
--  "Casa alquilada de aspecto anodino. Punto de encuentro y almacenamiento de material.",
--  "Equipamiento básico: kits forenses, conexión cifrada, enlace directo con analista OV. Vecino sospechoso del 3ºB.",
--  1, "intact", "1x00"),
-- ("Departamento del Sheriff del Condado de Schuylkill", "MUNDANE_TOWN", 40.686306, -76.212402,
--  "Dependencias del Sheriff. Informes policiales accesibles con dificultad.",
--  "El oficial M. Donahue ha visto cosas raras. Puede ser un contacto potencial.",
--  1, "intact", "1x00"),
-- ("Hospital Lehigh Valley – Schuylkill", "MUNDANE_TOWN", 40.693405, -76.208275,
--  "Centro médico comarcal.",
--  "Aumento anómalo de accidentes auto-infligidos.",
--  2, "frayed", "1x01"),
-- ("Blue Hollow Culvert", "ESOTERROR_CELL", 40.706820, -76.263910,
--  "Antigua alcantarilla industrial.",
--  "Lugar del ritual fracasado. Simbología residual visible con UV.",
--  5, "torn", "1x01"),
-- ("Marwood Quarry", "INDUSTRIAL_SITE", 40.650420, -76.253300,
--  "Cantera vallada, acceso prohibido.",
--  "Usada para pruebas acústicas del 'Fenómeno de la Boca Abierta'.",
--  4, "frayed", "1x02"),
-- ("The Red Barn", "ESOTERROR_CELL", 40.626200, -76.377900,
--  "Granero abandonado.",
--  "Punto de reunión de Shear the Veil. Restos animales sin explicación.",
--  4, "torn", "1x02"),
-- ("Coldwater Forest Trailhead", "NATURAL_SITE", 40.596730, -76.189120,
--  "Entrada a un sendero popular.",
--  "Desaparición de Melissa Harper (2019). Posible implicación psico-memética.",
--  3, "frayed", "1x03"),
-- ("The Whispering Diner", "NPC", 40.698100, -76.174000,
--  "Diner 24 horas.",
--  "Camarera oye susurros en tuberías. Déjà-vus recurrentes.",
--  2, "frayed", "1x01"),
-- ("Crystal Lake Fishing Spot", "NATURAL_SITE", 40.579800, -76.440200,
--  "Lugar tranquilo para pesca.",
--  "Luces en el agua. Anomalías EM.",
--  3, "frayed", "1x02"),
-- ("Knox Street Underpass", "RUMOR", 40.685510, -76.210910,
--  "Pasarela con grafitis.",
--  "Simbología similar a la entidad Esker-Kin.",
--  2, "intact", "1x01"),
-- ("St. Mary's Abandoned Chapel", "RUMOR", 40.634600, -76.321000,
--  "Capilla abandonada.",
--  "Ofrendas improvisadas y olor a ozono.",
--  3, "frayed", "1x03"),
-- ("Fog Hollow Curve", "CRIME_SCENE", 40.660850, -76.350900,
--  "Carretera peligrosa.",
--  "Todos los conductores vieron 'algo' en la calzada antes de estrellarse.",
--  3, "frayed", "1x03");
