import { test, expect, devices } from '@playwright/test';
import { loginAgentPage, loginDmPage } from './e2e-helpers';

const iPhone13 = devices['iPhone 13'];
type MobileTab = 'map' | 'console' | 'database' | 'base';
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

  test('ENTROPIA muestra el workspace base', async ({ page }) => {
    await page.locator(mobileTabSelector('base')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#base-focus-card')).toBeVisible();
    await expect(page.locator('#base-zone-name')).toBeVisible();
  });

  test('CONSOLA mantiene workspace visible', async ({ page }) => {
    await page.locator(mobileTabSelector('console')).click();
    await expect(page.locator('#agent-chat-card')).toBeVisible();
    await expect(page.locator('#mission-brief-card')).toBeVisible();
    await expect(page.locator('#workspace')).toBeVisible();
  });

  test('DOSSIER muestra la lista de entidades', async ({ page }) => {
    await page.locator(mobileTabSelector('database')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#dossier-card .card-title')).toHaveText('Selector de entidades');
    await expect(page.locator('#dossier-list')).toBeVisible();
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
    await page.locator('.dm-mobile-console-tab[data-dm-console-tab="journal"]').click();
    await expect(page.locator('.dm-mobile-console-tab.active')).toHaveText('Journal');
    await expect(page.locator('#journal-public')).toBeVisible();
  });
});
