const { test, expect, request } = require('@playwright/test');

const BASE_URL = process.env.API_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
const DM_SECRET = process.env.TEST_DM_SECRET || process.env.DM_SECRET || 'Pill4skiM0nAm0ur';
const AGENT_USERNAME = process.env.TEST_AGENT_USERNAME || 'pike';
const AGENT_PASSWORD = process.env.TEST_AGENT_PASSWORD || 'amarok';

async function loginDm(ctx) {
  const res = await ctx.post(`${BASE_URL}/api/auth/dm`, {
    data: { password: DM_SECRET }
  });
  await expect(res.status(), await res.text()).toBe(204);
}

async function loginAgent(ctx) {
  const res = await ctx.post(`${BASE_URL}/api/auth/agent`, {
    data: { username: AGENT_USERNAME, password: AGENT_PASSWORD }
  });
  await expect(res.status(), await res.text()).toBe(200);
}

test.describe('API battery (entity CRUD + visibility + session guard)', () => {
  test('should preserve DM/agent contracts', async () => {
    const dmCtx = await request.newContext();

    await loginDm(dmCtx);

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

    const createRes = await dmCtx.post(`${BASE_URL}/api/dm/entities`, { data: payload });
    await expect(createRes.status(), await createRes.text()).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeTruthy();

    const updateRes = await dmCtx.put(`${BASE_URL}/api/dm/entities/${created.id}`, {
      data: { ...payload, role: 'Operador Senior', visibility: 'dm_only' }
    });
    await expect(updateRes.status(), await updateRes.text()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.role).toBe('Operador Senior');
    expect(updated.visibility).toBe('dm_only');

    const ctxRes = await dmCtx.get(`${BASE_URL}/api/dm/entities/${created.id}/context`);
    await expect(ctxRes.status(), await ctxRes.text()).toBe(200);
    const context = await ctxRes.json();
    expect(Array.isArray(context.pois)).toBeTruthy();
    expect(context.pois.length).toBeGreaterThan(0);
    expect(context.relations.some((rel) => rel.to_entity_id === 2)).toBeTruthy();
    expect(context.sessions.some((item) => item.session_tag === '1x01')).toBeTruthy();

    const anonymousCtx = await request.newContext();
    const guardRes = await anonymousCtx.delete(`${BASE_URL}/api/dm/entities/${created.id}`);
    expect(guardRes.status()).toBe(401);
    await anonymousCtx.dispose();

    const deleteRes = await dmCtx.delete(`${BASE_URL}/api/dm/entities/${created.id}`);
    expect(deleteRes.status()).toBe(204);

    const dmOnlyCreateRes = await dmCtx.post(`${BASE_URL}/api/dm/entities`, {
      data: {
        ...payload,
        code_name: `DMOnly-${Date.now()}`,
        visibility: 'dm_only'
      }
    });
    await expect(dmOnlyCreateRes.status(), await dmOnlyCreateRes.text()).toBe(201);
    const dmOnly = await dmOnlyCreateRes.json();

    const dmListRes = await dmCtx.get(`${BASE_URL}/api/dm/entities?includeArchived=1`);
    await expect(dmListRes.status(), await dmListRes.text()).toBe(200);
    const dmList = await dmListRes.json();
    expect(dmList.some((entity) => entity.id === dmOnly.id)).toBeTruthy();

    const agentCtx = await request.newContext();
    await loginAgent(agentCtx);
    const agentListRes = await agentCtx.get(`${BASE_URL}/api/agent/entities`);
    await expect(agentListRes.status(), await agentListRes.text()).toBe(200);
    const agentList = await agentListRes.json();
    expect(agentList.find((entity) => entity.id === dmOnly.id)).toBeFalsy();

    await agentCtx.dispose();

    const dmDeleteRes = await dmCtx.delete(`${BASE_URL}/api/dm/entities/${dmOnly.id}`);
    expect(dmDeleteRes.status()).toBe(204);

    await dmCtx.dispose();
  });
});
