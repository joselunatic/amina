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
    await expect(page.locator('#workspace')).toBeVisible();
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
  });

  test('DOSSIER muestra la lista de entidades', async ({ page }) => {
    await page.locator(mobileTabSelector('database')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#dossier-card .card-title')).toHaveText('Selector de entidades');
    await expect(page.locator('#dossier-list')).toBeVisible();
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

  test('Mas móvil mantiene acceso a Entropia para DM', async ({ page }) => {
    await page.locator(mobileTabSelector('more')).click();
    await expect(page.locator('#mobile-more-switch')).toBeVisible();
    await expect(page.locator('#mobile-more-switch [data-mobile-more-view="sheet"]')).toHaveClass(/hidden/);
    await page.locator('#mobile-more-switch [data-mobile-more-view="base"]').click();
    await expect(page.locator('#base-focus-card')).toBeVisible();
  });
});
