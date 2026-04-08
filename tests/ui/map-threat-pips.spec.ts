import { expect, test } from '@playwright/test';
import { loginAgentPage } from '../e2e-helpers';

const MAP_CENTER = [-76.229, 40.68];

async function loginAsAgent(page: any) {
  await loginAgentPage(page);
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

async function waitForMapStable(page: any) {
  await page.waitForFunction(() => {
    // @ts-ignore
    const map = window.state?.map;
    return Boolean(
      map &&
      map.isStyleLoaded &&
      map.isStyleLoaded() &&
      map.areTilesLoaded &&
      map.areTilesLoaded() &&
      map.loaded &&
      map.loaded() &&
      !map.isMoving()
    );
  });
  await page.waitForTimeout(250);
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

async function getProjectedFeaturePoint(page: any, layer: string) {
  return page.evaluate(({ layer }) => {
    const map = window.state?.map;
    if (!map) return null;
    const features = map.queryRenderedFeatures({ layers: [layer] });
    if (!features.length) return null;
    const feature = features[0];
    const coords = feature.geometry.coordinates;
    const canvas = map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const point = map.project(coords);
    return {
      id: feature.id ?? null,
      x: rect.left + point.x,
      y: rect.top + point.y,
      mapLeft: rect.left,
      mapTop: rect.top,
      mapRight: rect.right,
      mapBottom: rect.bottom,
      properties: feature.properties || {}
    };
  }, { layer });
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
    return {
      id: features[0].id ?? null,
      threatLevel: Number(features[0].properties?.threat_level || 0),
      x: rect.left + point.x,
      y: rect.top + point.y,
      mapLeft: rect.left,
      mapTop: rect.top,
      mapRight: rect.right,
      mapBottom: rect.bottom
    };
  }, { zoom });
  if (!target) throw new Error('No POI features found for hover test.');
  return target;
}

test('map shows threat pips across zoom levels', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loginAsAgent(page);
  await waitForMapReady(page);

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
  await waitForMapStable(page);
  const lowZoomCluster = await getProjectedFeaturePoint(page, 'poi-clusters');
  expect(lowZoomCluster).not.toBeNull();
  expect(lowZoomCluster?.properties).toBeTruthy();
  expect(lowZoomCluster?.x).toBeGreaterThan(lowZoomCluster!.mapLeft);
  expect(lowZoomCluster?.x).toBeLessThan(lowZoomCluster!.mapRight);
  expect(lowZoomCluster?.y).toBeGreaterThan(lowZoomCluster!.mapTop);
  expect(lowZoomCluster?.y).toBeLessThan(lowZoomCluster!.mapBottom);

  await jumpToZoom(page, 11);
  const midZoomPoiCount = await page.waitForFunction(() => {
    // @ts-ignore
    const map = window.state?.map;
    return map ? map.queryRenderedFeatures({ layers: ['poi-hit'] }).length : 0;
  });
  expect(await midZoomPoiCount.jsonValue()).toBeGreaterThan(0);
  await waitForMapStable(page);
  const midZoomPoi = await getProjectedFeaturePoint(page, 'poi-hit');
  expect(midZoomPoi).not.toBeNull();
  expect(midZoomPoi?.x).toBeGreaterThan(midZoomPoi!.mapLeft);
  expect(midZoomPoi?.x).toBeLessThan(midZoomPoi!.mapRight);
  expect(midZoomPoi?.y).toBeGreaterThan(midZoomPoi!.mapTop);
  expect(midZoomPoi?.y).toBeLessThan(midZoomPoi!.mapBottom);

  const target = await focusOnFirstPoi(page, 14);
  await page.mouse.move(target.x, target.y);
  await page.mouse.click(target.x, target.y);
  await page.waitForSelector('.poi-threat-tooltip', { state: 'visible' });
  await waitForMapStable(page);
  await expect(page.locator('.poi-threat-tooltip')).toBeVisible();
  await expect(page.locator('.poi-threat-tooltip .mapboxgl-popup-content')).not.toBeEmpty();
  const tooltipText = await page.locator('.poi-threat-tooltip .mapboxgl-popup-content').innerText();
  expect(tooltipText).toContain('Amenaza');
  if (target.threatLevel > 0) {
    expect(tooltipText).toContain(String(target.threatLevel));
  }
  expect(target.x).toBeGreaterThan(target.mapLeft);
  expect(target.x).toBeLessThan(target.mapRight);
  expect(target.y).toBeGreaterThan(target.mapTop);
  expect(target.y).toBeLessThan(target.mapBottom);

  const selectedState = await page.evaluate(({ id }) => {
    const map = window.state?.map;
    return {
      selectedId: window.state?.poiSelectedId ?? null,
      featureSelected:
        id === null || id === undefined || !map
          ? null
          : map.getFeatureState({ source: 'pois', id }).selected ?? null
    };
  }, { id: target.id });
  expect(selectedState.selectedId).toBe(target.id);
  expect(selectedState.featureSelected).toBe(true);
});
