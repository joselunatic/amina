import assert from 'node:assert/strict';

const BASE_URL = process.env.API_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
const DM_SECRET = process.env.TEST_DM_SECRET || process.env.DM_SECRET || 'Pill4skiM0nAm0ur';
const AGENT_USERNAME = process.env.TEST_AGENT_USERNAME || 'pike';
const AGENT_PASSWORD = process.env.TEST_AGENT_PASSWORD || 'amarok';

function jarFromResponse(res) {
  const raw = res.headers.get('set-cookie') || '';
  const first = raw.split(',')[0] || '';
  return first.split(';')[0];
}

async function main() {
  const cfgRes = await fetch(`${BASE_URL}/api/config`);
  assert.equal(cfgRes.status, 200);
  const cfg = await cfgRes.json();
  assert.equal(typeof cfg.mapboxToken, 'string');

  const meGuestRes = await fetch(`${BASE_URL}/api/auth/me`);
  assert.equal(meGuestRes.status, 200);
  const meGuest = await meGuestRes.json();
  assert.equal(meGuest.role, 'guest');

  const dmLoginRes = await fetch(`${BASE_URL}/api/auth/dm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: DM_SECRET })
  });
  assert.equal(dmLoginRes.status, 204);
  const dmCookie = jarFromResponse(dmLoginRes);
  assert.ok(dmCookie.includes('amina.sid='));

  const dmMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: dmCookie }
  });
  assert.equal(dmMeRes.status, 200);
  const dmMe = await dmMeRes.json();
  assert.equal(dmMe.role, 'dm');

  const payload = {
    type: 'org',
    code_name: `EntityAPI-${Date.now()}`,
    real_name: 'Entity API Test',
    role: 'Operador',
    status: 'activo',
    alignment: 'Neutral',
    threat_level: 2,
    visibility: 'agent_public',
    poi_links: [{ poi_id: 1, role_at_poi: 'Contacto', session_tag: '1x00', is_public: true }],
    relations: [{ to_entity_id: 2, relation_type: 'contacto', is_public: true }],
    session_links: [{ session_tag: '1x01', summary_public: 'Visto', summary_dm: 'Detalle DM', is_public: false }]
  };

  const createRes = await fetch(`${BASE_URL}/api/dm/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: dmCookie },
    body: JSON.stringify(payload)
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.ok(created.id);

  const guardDeleteRes = await fetch(`${BASE_URL}/api/dm/entities/${created.id}`, { method: 'DELETE' });
  assert.equal(guardDeleteRes.status, 401);

  const dmOnlyCreateRes = await fetch(`${BASE_URL}/api/dm/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: dmCookie },
    body: JSON.stringify({ ...payload, code_name: `DMOnly-${Date.now()}`, visibility: 'dm_only' })
  });
  assert.equal(dmOnlyCreateRes.status, 201);
  const dmOnly = await dmOnlyCreateRes.json();

  const agentLoginRes = await fetch(`${BASE_URL}/api/auth/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: AGENT_USERNAME, password: AGENT_PASSWORD })
  });
  assert.equal(agentLoginRes.status, 200);
  const agentCookie = jarFromResponse(agentLoginRes);

  const agentListRes = await fetch(`${BASE_URL}/api/agent/entities`, {
    headers: { Cookie: agentCookie }
  });
  assert.equal(agentListRes.status, 200);
  const agentList = await agentListRes.json();
  assert.ok(!agentList.find((entity) => entity.id === dmOnly.id));

  for (const id of [created.id, dmOnly.id]) {
    const delRes = await fetch(`${BASE_URL}/api/dm/entities/${id}`, {
      method: 'DELETE',
      headers: { Cookie: dmCookie }
    });
    assert.equal(delRes.status, 204);
  }

  console.log('Contracts runner OK');
}

main().catch((err) => {
  console.error('Contracts runner failed', err);
  process.exit(1);
});
