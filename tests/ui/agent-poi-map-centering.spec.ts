import { expect, test } from '@playwright/test';
import { loginAgentPage } from '../e2e-helpers';

async function loginAsAgent(page: any) {
  await loginAgentPage(page);
  await expect(page.locator('body')).toHaveClass(/mode-agent/);
}

test('agent POI map recenters when switching dossiers', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loginAsAgent(page);

  await page.getByRole('button', { name: 'Base de Datos', exact: true }).click();
  await expect(page.locator('.workspace-view.agent-view[data-view="database"].active')).toBeVisible();
  await page.locator('.dossier-type[data-dossier-type="poi"]').click();

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

  expect(center1).not.toBeNull();
  expect(center2).not.toBeNull();
  expect(center1).not.toEqual(center2);
});
