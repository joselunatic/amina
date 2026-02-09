const { createHttpError } = require('./common');

function normalizeFieldValue(value, type) {
  if (type === 'number') {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }
  if (type === 'boolean') {
    return Boolean(value);
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function getChangedFields(existing, next, fields) {
  if (!existing || !next) return [];
  return fields
    .filter((field) => {
      const current = normalizeFieldValue(existing[field.key], field.type);
      const incoming = normalizeFieldValue(next[field.key], field.type);
      return current !== incoming;
    })
    .map((field) => field.key);
}

function validatePoi(payload, options = {}) {
  const { CATEGORY_VALUES = [], VEIL_VALUES = [] } = options;
  const errors = [];
  const cleaned = {};
  const entityLinks = [];
  const linksProvided = Array.isArray(payload.entity_links);
  const allowedVisibility = ['agent_public', 'locked'];

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
  if (payload.agent_notes !== undefined) {
    cleaned.agent_notes = typeof payload.agent_notes === 'string' ? payload.agent_notes : '';
  }
  if (payload.session_tag !== undefined) {
    cleaned.session_tag = typeof payload.session_tag === 'string' ? payload.session_tag.trim() : null;
  }
  const vis = payload.visibility ? String(payload.visibility).trim() : 'agent_public';
  if (!allowedVisibility.includes(vis)) {
    errors.push('Visibility is invalid.');
  } else {
    cleaned.visibility = vis;
  }
  if (payload.unlock_code !== undefined) {
    cleaned.unlock_code = payload.unlock_code ? String(payload.unlock_code).trim() : null;
  }
  if (payload.locked_hint !== undefined) {
    cleaned.locked_hint = payload.locked_hint ? String(payload.locked_hint).trim() : null;
  }

  if (Array.isArray(payload.entity_links)) {
    payload.entity_links.forEach((link) => {
      const entityId = Number(link.entity_id || link.to_entity_id);
      if (!entityId || Number.isNaN(entityId)) return;
      entityLinks.push({
        entity_id: entityId,
        role_at_poi: link.role_at_poi ? String(link.role_at_poi).trim() : null,
        session_tag: link.session_tag ? String(link.session_tag).trim() : null,
        is_public: link.is_public !== false
      });
    });
  }

  if (errors.length) {
    throw createHttpError(400, errors.join(' '));
  }

  return { cleaned, entityLinks, linksProvided };
}

function validateEntity(payload, options = {}) {
  const { ENTITY_TYPES = [] } = options;
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
  cleaned.mel = payload.mel ? String(payload.mel).trim() : null;
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
    throw createHttpError(400, errors.join(' '));
  }

  return { cleaned, relations };
}

module.exports = {
  getChangedFields,
  validatePoi,
  validateEntity
};
