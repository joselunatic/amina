import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3002';
const DM_SECRET = process.env.TEST_DM_SECRET || 'Pill4skiM0nAm0ur';

async function loginAsDm(page) {
  await page.goto(BASE_URL);
  await page.waitForSelector('#boot-dm', { state: 'visible' });
  await page.click('#boot-dm');
  await page.fill('#boot-dm-secret', DM_SECRET);
  await page.click('#boot-dm-form button[type="submit"]');
  await page.waitForFunction(() => window.state?.dmMode, { timeout: 10000 });
}

test('dblclicking a relation node changes focus', async ({ page }) => {
  await loginAsDm(page);
  const relationsTab = page.locator('button.workspace-tab[data-view="relations"]:visible').first();
  await relationsTab.click();
  const graph = page.locator('#dm-graph');
  const nodeCanvas = graph.locator('canvas[data-id=\"layer2-node\"]');
  await nodeCanvas.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForFunction(() => !document.getElementById('dm-graph')?.classList.contains('graph-loading'));
  const initialLabel = await page.textContent('#dm-graph-summary strong');
  const initialFocusId = await page.evaluate(() => window.state.dmGraphFocusId);
  const coords = await page.evaluate(() => {
    const api = (window as any).dmGraphApi;
    if (!api) return null;
    const nodes = api.cy.nodes();
    if (!nodes || nodes.length < 2) return null;
    const focusId = window.state.dmGraphFocusId;
    const entityCandidates = nodes.filter((node) => {
      const type = node.data('type');
      const candidateId = Number(node.data('entityId'));
      return candidateId && candidateId !== focusId && type !== 'poi';
    });
    if (!entityCandidates || entityCandidates.length === 0) return null;
    const target = entityCandidates[0];
    const rendered = target.renderedPosition();
    const rect = document.getElementById('dm-graph')?.getBoundingClientRect();
    if (!rect) return null;
    return { x: rect.left + rendered.x, y: rect.top + rendered.y };
  });
  expect(coords).not.toBeNull();
  await page.mouse.dblclick(coords.x, coords.y);
  await page.waitForFunction(
    (prevId) => window.state.dmGraphFocusId && window.state.dmGraphFocusId !== prevId,
    initialFocusId,
    { timeout: 10000 }
  );
  const afterLabel = await page.textContent('#dm-graph-summary strong');
  const afterFocusId = await page.evaluate(() => window.state.dmGraphFocusId);
  expect(afterFocusId).not.toBe(initialFocusId);
  expect(afterLabel?.trim()).not.toBe(initialLabel?.trim());
});
