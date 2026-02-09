const { test, expect, request } = require('@playwright/test');

const BASE_URL = process.env.API_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
const DM_SECRET = process.env.TEST_DM_SECRET || process.env.DM_SECRET || 'Pill4skiM0nAm0ur';

test.describe('API basic contracts', () => {
  test('config and auth/me shapes', async ({ request: req }) => {
    const cfgRes = await req.get(`${BASE_URL}/api/config`);
    await expect(cfgRes.status(), await cfgRes.text()).toBe(200);
    const cfg = await cfgRes.json();
    expect(typeof cfg.mapboxToken).toBe('string');
    expect(typeof cfg.mapStyle).toBe('string');
    expect(typeof cfg.debug).toBe('boolean');

    const meGuestRes = await req.get(`${BASE_URL}/api/auth/me`);
    await expect(meGuestRes.status(), await meGuestRes.text()).toBe(200);
    const meGuest = await meGuestRes.json();
    expect(meGuest.role).toBe('guest');
  });

  test('session-gated endpoints and DM session role', async () => {
    const guestCtx = await request.newContext();
    const guestIdentityRes = await guestCtx.get(`${BASE_URL}/api/messages/identities`);
    expect(guestIdentityRes.status()).toBe(401);
    await guestCtx.dispose();

    const dmCtx = await request.newContext();
    const loginRes = await dmCtx.post(`${BASE_URL}/api/auth/dm`, { data: { password: DM_SECRET } });
    await expect(loginRes.status(), await loginRes.text()).toBe(204);

    const meDmRes = await dmCtx.get(`${BASE_URL}/api/auth/me`);
    await expect(meDmRes.status(), await meDmRes.text()).toBe(200);
    const meDm = await meDmRes.json();
    expect(meDm.role).toBe('dm');

    const idRes = await dmCtx.get(`${BASE_URL}/api/messages/identities`);
    await expect(idRes.status(), await idRes.text()).toBe(200);
    const identities = await idRes.json();
    expect(Array.isArray(identities.identities)).toBeTruthy();

    await dmCtx.dispose();
  });
});
