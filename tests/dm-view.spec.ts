import { test, expect, type Page } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://172.17.0.1:3002'; // Using the Docker IP as determined earlier

test.describe('DM View - POI Selector Debug', () => {
  let dmPage: Page;
  let consoleLogs: string[] = [];
  let apiPoisResponse: any = null;
  let apiPoisStatus: number | null = null;

  test.beforeEach(async ({ page }) => {
    dmPage = page;

    // Capture console messages
    dmPage.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
      consoleLogs.push(msg.text());
    });

    // Capture network responses
    dmPage.on('response', async response => {
      if (response.url().includes('/api/pois')) {
        apiPoisStatus = response.status();
        try {
          apiPoisResponse = await response.json();
        } catch (e) {
          apiPoisResponse = `Failed to parse JSON: ${e.message}`;
        }
        console.log(`[API/POIS Response] Status: ${apiPoisStatus}, Data:`, apiPoisResponse);
      }
    });

    await dmPage.goto(`${baseURL}/dm.html`);
    await expect(dmPage.locator('h1')).toHaveText('Consola de Efectos de DM');
  });

  test('should correctly populate the POI selector', async () => {
    const poiSelector = dmPage.locator('#poi-select');
    await expect(poiSelector).toBeVisible();

    // Wait for the POIs to be loaded and rendered
    await dmPage.waitForFunction(selector => {
      const select = document.querySelector(selector) as HTMLSelectElement;
      return select && select.options.length > 0 && select.querySelector('option[value=""]')?.textContent !== 'No POIs available';
    }, '#poi-select', { timeout: 10000 }); // Increased timeout for async operations

    // Assert that the selector has options (more than just the empty one if 'No POIs available' is present)
    await expect(poiSelector.locator('option')).not.toHaveCount(0);
    
    // Assert that at least one known POI from the seed data is present (ID 2: Departamento del Sheriff)
    const knownPoiOption = 'Departamento del Sheriff del Condado de Schuylkill';
    await expect(poiSelector.locator(`option:has-text("${knownPoiOption}")`)).toHaveCount(1);
    
    // Click the selector to open the dropdown
    await poiSelector.click();
    
    // Take a screenshot for visual debugging with the selector opened
    await expect(poiSelector).toHaveScreenshot('dm-poi-selector-opened.png');
    
    // Add assertions for the captured data
    expect(apiPoisStatus).toBe(200);
    expect(apiPoisResponse).not.toBeNull();
    expect(Array.isArray(apiPoisResponse)).toBe(true);
    expect(apiPoisResponse.length).toBeGreaterThan(0);
    expect(consoleLogs).not.toContain('Failed to fetch POIs');
  });
});
