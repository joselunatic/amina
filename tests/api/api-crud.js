// Simple API smoke tests for CRUD over unified entities endpoint (including POI)
// Run with: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3410 TEST_DM_SECRET=... node tests/api/api-crud.js

const { request } = require('@playwright/test');

const DM_SECRET = process.env.TEST_DM_SECRET || process.env.DM_SECRET || 'Pill4skiM0nAm0ur';
const BASE_URL =
  process.env.API_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 3410}`;

async function loginDm(api) {
  const res = await api.post(`${BASE_URL}/api/auth/dm`, {
    data: { password: DM_SECRET }
  });
  if (res.status() !== 204) {
    throw new Error(`DM login failed: ${res.status()} ${await res.text()}`);
  }
}

async function apiRequest(api, path, { method = 'GET', body } = {}) {
  const res = await api.fetch(`${BASE_URL}${path}`, {
    method,
    data: body
  });
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // ignore
  }
  return { res, json };
}

async function run() {
  const createdIds = [];
  const tests = [];
  const api = await request.newContext();

  await loginDm(api);

  tests.push(async () => {
    const payload = {
      type: 'criatura',
      code_name: 'spec-criatura',
      role: 'bestia de prueba',
      status: 'activa',
      alignment: 'test',
      threat_level: 2,
      public_summary: 'nota publica',
      dm_notes: 'nota dm'
    };
    const { res, json } = await apiRequest(api, '/api/dm/entities', { method: 'POST', body: payload });
    if (res.status() !== 201) throw new Error(`POST criatura failed: ${res.status()} ${JSON.stringify(json)}`);
    createdIds.push(json.id);
    console.log('Created criatura id', json.id);
  });

  tests.push(async () => {
    const payload = {
      type: 'poi',
      name: 'spec-poi',
      category: 'OV_BASE',
      latitude: 40.68,
      longitude: -76.22,
      image_url: '',
      public_note: 'poi summary',
      dm_note: 'poi dm',
      threat_level: 2,
      veil_status: 'intact',
      session_tag: 'test'
    };
    const { res, json } = await apiRequest(api, '/api/dm/entities', { method: 'POST', body: payload });
    if (res.status() !== 201) throw new Error(`POST poi failed: ${res.status()} ${JSON.stringify(json)}`);
    createdIds.push(json.id);
    console.log('Created poi id', json.id);
  });

  tests.push(async () => {
    const { res, json } = await apiRequest(api, '/api/dm/entities');
    if (res.status() !== 200) throw new Error(`GET list failed: ${res.status()}`);
    if (!Array.isArray(json) || json.length === 0) throw new Error('GET list returned empty array');
    console.log('List count', json.length);
  });

  tests.push(async () => {
    // update first created creature
    const id = createdIds[0];
    const patch = { type: 'criatura', code_name: 'spec-criatura', status: 'contenida' };
    const { res, json } = await apiRequest(api, `/api/dm/entities/${id}`, { method: 'PUT', body: patch });
    if (res.status() !== 200) throw new Error(`PUT criatura failed: ${res.status()} ${JSON.stringify(json)}`);
    if (json.status !== 'contenida') throw new Error('PUT criatura did not update status');
  });

  tests.push(async () => {
    // delete all created
    for (const id of createdIds) {
      const { res } = await apiRequest(api, `/api/dm/entities/${id}`, { method: 'DELETE' });
      if (res.status() !== 204) throw new Error(`DELETE ${id} failed: ${res.status()}`);
    }
  });

  try {
    for (const t of tests) {
      await t();
    }
  } finally {
    await api.dispose();
  }
  console.log('API CRUD tests OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
