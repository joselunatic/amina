import { expect, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';
const AGENT_USERNAME = process.env.PLAYWRIGHT_AGENT_USER || 'pike';
const AGENT_PASSWORD = process.env.PLAYWRIGHT_AGENT_PASS || 'amarok';
const MAP_CENTER = [-76.229, 40.68];

async function loginAsAgent(page: any) {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#boot-player', { state: 'visible', timeout: 20000 });
  await page.click('#boot-player');
  await page.waitForSelector('#agent-login', { state: 'visible' });
  await page.waitForFunction(
    (username) => {
      const select = document.querySelector('#agent-select');
      if (!select) return false;
      return Array.from(select.options).some((opt) => opt.value === username);
    },
    AGENT_USERNAME
  );
  await page.selectOption('#agent-select', AGENT_USERNAME);
  await page.fill('#agent-pass', AGENT_PASSWORD);
  await Promise.all([
    page.click('#agent-login-button'),
    page.waitForSelector('#boot-screen.hidden')
  ]);
  await expect(page.locator('body')).toHaveClass(/mode-agent/);
}

async function waitForMapReady(page: any) {
  await page.waitForFunction(() => {
    // @ts-ignore
    const map = window.state?.map;
    return Boolean(map && map.isStyleLoaded());
  });
  await page.waitForFunction(() => {
    // @ts-ignore
    const map = window.state?.map;
    return Boolean(map && map.getSource && map.getSource('pois'));
  });
}

async function jumpToZoom(page: any, zoom: number) {
  await page.evaluate(
    async ({ zoom, center }) => {
      // @ts-ignore
      const map = window.state?.map;
      map.jumpTo({ zoom, center });
      await new Promise((resolve) => map.once('idle', resolve));
    },
    { zoom, center: MAP_CENTER }
  );
}

async function focusOnFirstPoi(page: any, zoom: number) {
  const target = await page.evaluate(async ({ zoom }) => {
    const map = window.state?.map;
    const features = map.queryRenderedFeatures({ layers: ['poi-hit'] });
    if (!features.length) return null;
    const coords = features[0].geometry.coordinates;
    map.jumpTo({ zoom, center: coords });
    await new Promise((resolve) => map.once('idle', resolve));
    const canvas = map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const point = map.project(coords);
    return { x: rect.left + point.x, y: rect.top + point.y };
  }, { zoom });
  if (!target) throw new Error('No POI features found for hover test.');
  return target;
}

test('map shows threat pips across zoom levels', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loginAsAgent(page);
  await waitForMapReady(page);

  const map = page.locator('#map');

  const lowZoom = await page.evaluate(async () => {
    // @ts-ignore
    const map = window.state?.map;
    const zooms = [7, 6, 5];
    for (const zoom of zooms) {
      map.jumpTo({ zoom, center: [-76.229, 40.68] });
      await new Promise((resolve) => map.once('idle', resolve));
      const clusters = map.queryRenderedFeatures({ layers: ['poi-clusters'] });
      if (clusters.length) return zoom;
    }
    return map.getZoom();
  });
  await expect(lowZoom).toBeDefined();
  await expect(map).toHaveScreenshot('map-threat-pips-zoom-low.png');

  await jumpToZoom(page, 11);
  await page.waitForFunction(() => {
    // @ts-ignore
    const map = window.state?.map;
    return Boolean(map && map.queryRenderedFeatures({ layers: ['poi-hit'] }).length > 0);
  });
  await expect(map).toHaveScreenshot('map-threat-pips-zoom-mid.png');

  const target = await focusOnFirstPoi(page, 14);
  await page.mouse.move(target.x, target.y);
  await page.mouse.click(target.x, target.y);
  await page.waitForSelector('.poi-threat-tooltip', { state: 'visible' });
  await expect(map).toHaveScreenshot('map-threat-pips-zoom-high-selected.png');
});
