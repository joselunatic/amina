const assert = require('node:assert');
const fetch = global.fetch || require('node-fetch');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const DM_SECRET = process.env.TEST_DM_SECRET || 'Pill4skiM0nAm0ur';

async function expectStatus(response, status) {
  if (response.status !== status) {
    const text = await response.text().catch(() => '');
    throw new Error(`Expected ${status} got ${response.status}: ${text}`);
  }
}

async function postEntity(payload) {
  const res = await fetch(`${BASE_URL}/api/dm/entities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dm-secret': DM_SECRET
    },
    body: JSON.stringify(payload)
  });
  await expectStatus(res, 201);
  return res.json();
}

async function updateEntity(id, payload) {
  const res = await fetch(`${BASE_URL}/api/dm/entities/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-dm-secret': DM_SECRET
    },
    body: JSON.stringify(payload)
  });
  await expectStatus(res, 200);
  return res.json();
}

async function deleteEntity(id, withSecret = true) {
  const headers = withSecret ? { 'x-dm-secret': DM_SECRET } : {};
  const res = await fetch(`${BASE_URL}/api/dm/entities/${id}`, {
    method: 'DELETE',
    headers
  });
  return res;
}

async function getAgentEntities() {
  const res = await fetch(`${BASE_URL}/api/agent/entities`);
  await expectStatus(res, 200);
  return res.json();
}

async function run() {
  console.log('Starting API battery (entity CRUD + link + visibility + delete guard)');

  const payload = {
    type: 'org',
    code_name: `EntityAPI-${Date.now()}`,
    real_name: 'Entity API Test',
    role: 'Operador',
    status: 'activo',
    alignment: 'Neutral',
    threat_level: 2,
    visibility: 'agent_public',
    poi_links: [
      { poi_id: 1, role_at_poi: 'Contacto', session_tag: '1x00', is_public: true }
    ],
    relations: [
      { to_entity_id: 2, relation_type: 'contacto', is_public: true }
    ],
    session_links: [
      { session_tag: '1x01', summary_public: 'Visto', summary_dm: 'Detalle DM', is_public: false }
    ]
  };

  const created = await postEntity(payload);
  assert(created.id, 'created entity must include id');

  const updatedPayload = { ...payload, role: 'Operador Senior', visibility: 'dm_only' };
  const updated = await updateEntity(created.id, updatedPayload);
  assert.strictEqual(updated.role, 'Operador Senior');
  assert.strictEqual(updated.visibility, 'dm_only');

  const ctxRes = await fetch(`${BASE_URL}/api/dm/entities/${created.id}/context`, {
    headers: { 'x-dm-secret': DM_SECRET }
  });
  await expectStatus(ctxRes, 200);
  const ctx = await ctxRes.json();
  assert(Array.isArray(ctx.pois) && ctx.pois.length === 1);
  assert(ctx.relations.some((rel) => rel.to_entity_id === 2));
  assert(ctx.sessions.some((s) => s.session_tag === '1x01'));

  const guard = await deleteEntity(created.id, false);
  assert.strictEqual(guard.status, 401, 'delete without secret should be unauthorized');

  const deleteOk = await deleteEntity(created.id);
  await expectStatus(deleteOk, 204);

  const dmOnly = await postEntity({
    ...payload,
    code_name: `DMOnly-${Date.now()}`,
    visibility: 'dm_only'
  });

  const agentList = await getAgentEntities();
  assert(!agentList.find((entity) => entity.id === dmOnly.id), 'DM-only entity should not appear for agents');

  const dmListRes = await fetch(`${BASE_URL}/api/dm/entities?includeArchived=1`, {
    headers: { 'x-dm-secret': DM_SECRET }
  });
  await expectStatus(dmListRes, 200);
  const dmList = await dmListRes.json();
  assert(dmList.some((entity) => entity.id === dmOnly.id));

  await deleteEntity(dmOnly.id);

  console.log('API battery completed successfully.');
}

run().catch((err) => {
  console.error('API tests failed', err);
  process.exit(1);
});
