import { test, expect, chromium } from '@playwright/test';
import { baseURL, getDmStorageState } from '../e2e-helpers';

test('dblclicking a relation node changes focus', async () => {
  const storageState = await getDmStorageState();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState
  });
  const page = await context.newPage();

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => window.state?.dmMode, { timeout: 10000 });
    const relationsTab = page.locator('button.workspace-tab[data-view="relations"]:visible').first();
    await relationsTab.click();
    const graph = page.locator('#dm-graph');
    const nodeCanvas = graph.locator('canvas[data-id=\"layer2-node\"]');
    await nodeCanvas.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForFunction(() => !document.getElementById('dm-graph')?.classList.contains('graph-loading'));
    const initialLabel = await page.textContent('#dm-graph-summary strong');
    const initialFocusId = await page.evaluate(() => window.state.dmGraphFocusId);
    const coords = await page.evaluate(() => {
      const api = window.dmGraphApi;
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
  } finally {
    await context.close();
    await browser.close();
  }
});
