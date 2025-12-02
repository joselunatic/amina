import { expect, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';
const AGENT_USERNAME = process.env.PLAYWRIGHT_AGENT_USER || 'pike';
const AGENT_PASSWORD = process.env.PLAYWRIGHT_AGENT_PASS || '123456';

async function loginAsAgent(page: any) {
  await page.goto(baseURL);
  await page.click('#boot-player');
  await page.waitForSelector('#agent-login', { state: 'visible' });
  await page.selectOption('#agent-select', AGENT_USERNAME);
  await page.fill('#agent-pass', AGENT_PASSWORD);
  await Promise.all([
    page.click('#agent-login-button'),
    page.waitForSelector('#boot-screen.hidden')
  ]);
  await expect(page.locator('body')).toHaveClass(/mode-agent/);
}

test('agent POI map recenters when switching dossiers', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loginAsAgent(page);

  await page.getByRole('button', { name: 'Base de Datos', exact: true }).click();
  await expect(page.locator('.workspace-view.agent-view[data-view="database"].active')).toBeVisible();

  const poiItems = page.locator('#dossier-list .dossier-card-row');
  const firstPoi = poiItems.nth(0);
  const secondPoi = poiItems.nth(1);

  await expect(firstPoi).toBeVisible();
  await expect(secondPoi).toBeVisible();

  // select first POI and read map center
  await firstPoi.click();
  await page.waitForTimeout(1200); // allow map render
  const center1 = await page.evaluate(() => {
    // @ts-ignore
    const m = window.state?.agentEntitiesMap || window.state?.entitiesMap || null;
    if (!m) return null;
    const c = m.getCenter();
    return [c.lng, c.lat];
  });

  // select second POI and read map center
  await secondPoi.click();
  await page.waitForTimeout(1200);
  const center2 = await page.evaluate(() => {
    // @ts-ignore
    const m = window.state?.agentEntitiesMap || window.state?.entitiesMap || null;
    if (!m) return null;
    const c = m.getCenter();
    return [c.lng, c.lat];
  });

  expect(center1).not.toEqual(center2);
});
