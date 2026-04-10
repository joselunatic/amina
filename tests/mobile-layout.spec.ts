import { test, expect, devices } from '@playwright/test';
import { loginAgentPage, loginDmPage } from './e2e-helpers';

const iPhone13 = devices['iPhone 13'];
type MobileTab = 'map' | 'console' | 'database' | 'archive' | 'more';
const mobileTabSelector = (tab: MobileTab) => `#mobile-nav button[data-mobile-tab="${tab}"]`;

test.use({ ...iPhone13 });

test.describe('Vista móvil AMINA', () => {
  test.beforeEach(async ({ page }) => {
    await loginAgentPage(page);
    await expect(page.locator('#mobile-nav')).toBeVisible();
  });

  test('MAPA mantiene el mapa operativo en móvil', async ({ page }) => {
    await page.locator(mobileTabSelector('map')).click();
    await expect(page.locator('#map')).toBeVisible();
    await expect(page.locator('#focal-poi-card .mobile-focal-card')).toBeVisible();
    await expect(page.locator('#workspace')).toBeHidden();
  });

  test('MAPA compacto usa la card focal sin popup flotante', async ({ page }) => {
    await page.locator(mobileTabSelector('map')).click();
    const poiId = await page.locator('#poi-list .poi-item').first().getAttribute('data-poi-id');
    expect(poiId).toBeTruthy();
    await page.evaluate((id) => {
      const globalWindow = window as Window & { focusOnPoi?: (poiId: number) => void };
      if (typeof globalWindow.focusOnPoi === 'function') {
        globalWindow.focusOnPoi(Number(id));
      }
    }, poiId);
    await page.waitForTimeout(500);
    await expect(page.locator('.mapboxgl-popup')).toHaveCount(0);
    await expect(page.locator('#focal-poi-card .mobile-focal-card.is-compact')).toBeVisible();
  });

  test('CONSOLA mantiene workspace visible', async ({ page }) => {
    await page.locator(mobileTabSelector('console')).click();
    await expect(page.locator('#agent-chat-card')).toBeVisible();
    await expect(page.locator('#mission-brief-card')).toBeHidden();
    await expect(page.locator('#workspace')).toBeVisible();
  });

  test('ARCHIVO separa el registro de sesiones de la consola', async ({ page }) => {
    await page.locator(mobileTabSelector('archive')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#mission-brief-card')).toBeVisible();
    await expect(page.locator('#agent-chat-card')).toBeHidden();
    await expect(page.locator('#agent-journal-detail')).toBeVisible();
    await expect(page.locator('#agent-journal-season-chips')).toBeVisible();
    await expect(page.locator('#agent-journal-toggle')).toBeHidden();
  });

  test('ARCHIVO usa chips de temporada y selector de episodio existente', async ({ page }) => {
    await page.locator(mobileTabSelector('archive')).click();
    await page.locator('[data-agent-journal-season-chip="2"]').click();
    await expect(page.locator('[data-agent-journal-season-chip="2"]')).toHaveClass(/active/);
    const picker = page.locator('#agent-journal-session-picker');
    await expect(picker).toBeVisible();
    const disabled = await picker.isDisabled();
    if (!disabled) {
      await picker.click();
      await expect(page.locator('#agent-journal-session-sheet')).toBeVisible();
      await expect(page.locator('#agent-journal-session-options .archive-session-create')).toBeVisible();
      const options = page.locator('#agent-journal-session-options .archive-session-option');
      if (await options.count()) {
        await expect(options.first()).toBeVisible();
      } else {
        await expect(page.locator('#agent-journal-session-options .archive-session-option-empty')).toBeVisible();
      }
    }
  });

  test('ARCHIVO permite preparar un episodio nuevo desde el selector', async ({ page }) => {
    await page.locator(mobileTabSelector('archive')).click();
    await page.locator('[data-agent-journal-season-chip="2"]').click();
    await page.locator('#agent-journal-session-picker').click();
    const createButton = page.locator('#agent-journal-session-options .archive-session-create');
    await expect(createButton).toBeVisible();
    const currentStateBefore = (await page.locator('#agent-journal-current-state').textContent()) || '';
    await createButton.click();
    await expect(page.locator('#agent-journal-session-sheet')).toBeHidden();
    const currentStateAfter = (await page.locator('#agent-journal-current-state').textContent()) || '';
    expect(currentStateAfter).not.toBe(currentStateBefore);
    await expect(page.locator('#agent-journal-session-picker')).toContainText('Nueva');
  });

  test('ARCHIVO al abrir selector resetea el scroll vertical', async ({ page }) => {
    await page.locator(mobileTabSelector('archive')).click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('#agent-journal-session-picker').click();
    await expect(page.locator('#agent-journal-session-sheet')).toBeVisible();
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(40);
  });

  test('DOSSIER muestra la lista de entidades', async ({ page }) => {
    await page.locator(mobileTabSelector('database')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#dossier-card .card-title')).toHaveText('Selector de entidades');
    await expect(page.locator('#dossier-list')).toBeVisible();
  });

  test('DOSSIER devuelve el foco al detalle superior al cambiar de entidad', async ({ page }) => {
    await page.locator(mobileTabSelector('database')).click();
    const items = page.locator('#dossier-list .dossier-card-row');
    await expect(items).toHaveCount(8, { timeout: 15000 }).catch(() => {});
    const count = await items.count();
    expect(count).toBeGreaterThan(1);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await items.nth(1).click();
    await page.waitForTimeout(300);
    const detailBox = await page.locator('#agent-entity-detail-card').boundingBox();
    expect(detailBox).not.toBeNull();
    expect(detailBox!.y).toBeLessThan(220);
  });

  test('MAS agrupa ficha y entropia', async ({ page }) => {
    await page.locator(mobileTabSelector('more')).click();
    await expect(page.locator('#mobile-more-switch')).toBeVisible();
    await page.locator('#mobile-more-switch [data-mobile-more-view="sheet"]').click();
    await expect(page.locator('#character-sheet-card')).toBeVisible();
    await page.locator('#mobile-more-switch [data-mobile-more-view="base"]').click();
    await expect(page.locator('#base-focus-card')).toBeVisible();
  });
  test('Logout regresa a arranque', async ({ page }) => {
    await page.locator('#logout-button').click();
    await expect(page.locator('#boot-screen')).toBeVisible();
  });
});

test.describe('Vista móvil Sr. Verdad', () => {
  test.beforeEach(async ({ page }) => {
    await loginDmPage(page);
    await expect(page.locator('#mobile-nav')).toBeVisible();
  });

  test('Consola móvil muestra filtros del buzón', async ({ page }) => {
    await page.locator(mobileTabSelector('console')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('.dm-mobile-console-tab.active')).toHaveText('Mensajería');
    await expect(page.locator('#dm-chat-card')).toBeVisible();
  });

  test('Archivo móvil abre journal sin mezclarlo con mensajería', async ({ page }) => {
    await page.locator(mobileTabSelector('archive')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('.dm-mobile-console-tab.active')).toHaveText('Journal');
    await expect(page.locator('#journal-public')).toBeVisible();
  });

  test('DOSSIER DM devuelve el foco al detalle superior al cambiar de entidad', async ({ page }) => {
    await page.locator(mobileTabSelector('database')).click();
    const items = page.locator('#dm-entity-list .dossier-card-row');
    const count = await items.count();
    expect(count).toBeGreaterThan(1);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await items.nth(1).click();
    await page.waitForTimeout(300);
    const detailBox = await page.locator('#dm-entity-detail-card').boundingBox();
    expect(detailBox).not.toBeNull();
    expect(detailBox!.y).toBeLessThan(220);
  });

  test('Mas móvil mantiene acceso a Entropia para DM', async ({ page }) => {
    await page.locator(mobileTabSelector('more')).click();
    await expect(page.locator('#mobile-more-switch')).toBeVisible();
    await expect(page.locator('#mobile-more-switch [data-mobile-more-view="sheet"]')).toHaveClass(/hidden/);
    await page.locator('#mobile-more-switch [data-mobile-more-view="base"]').click();
    await expect(page.locator('#base-focus-card')).toBeVisible();
  });
});
