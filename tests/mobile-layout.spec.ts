import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const AGENT_USERNAME = 'pike';
const AGENT_PASSWORD = 'amarok';
const DM_SECRET = process.env.TEST_DM_SECRET || 'Pill4skiM0nAm0ur';
type MobileTab = 'map' | 'pois' | 'console' | 'database';
const mobileTabSelector = (tab: MobileTab) => `#mobile-nav button[data-mobile-tab="${tab}"]`;

test.use({ viewport: MOBILE_VIEWPORT });

test.describe('Vista móvil AMINA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await expect(page.locator('#boot-screen')).toBeVisible();
    await page.locator('#boot-player').click();
    await expect(page.locator('#agent-login')).toBeVisible();
    await page.waitForSelector(`#agent-select option[value="${AGENT_USERNAME}"]`, { state: 'attached' });
    await page.selectOption('#agent-select', AGENT_USERNAME);
    await page.fill('#agent-pass', AGENT_PASSWORD);
    await Promise.all([
      page.click('#agent-login-button'),
      page.waitForSelector('#boot-screen', { state: 'hidden' })
    ]);
  });

  test('MAPA muestra mapa y oculta workspace', async ({ page }) => {
    await page.locator(mobileTabSelector('map')).click();
    await expect(page.locator('#map')).toBeVisible();
    await expect(page.locator('#focal-poi-card .card-title')).toBeVisible();
    await expect(page.locator('#workspace')).toBeHidden();
  });

  test('PDI oculta mapa y workspace', async ({ page }) => {
    await page.locator(mobileTabSelector('pois')).click();
    await expect(page.locator('#map')).toBeHidden();
    await expect(page.locator('#focal-poi-card .card-title')).toBeVisible();
    await expect(page.locator('#workspace')).toBeHidden();
  });

  test('CONSOLA mantiene workspace visible', async ({ page }) => {
    await page.locator(mobileTabSelector('console')).click();
    await expect(page.getByText('BUZÓN')).toBeVisible();
    await expect(page.getByText('INFORME DE MISIÓN')).toBeVisible();
    await expect(page.locator('#workspace')).toBeVisible();
  });

  test('BASE muestra la lista de entidades', async ({ page }) => {
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
    await page.goto(baseURL);
    await expect(page.locator('#boot-screen')).toBeVisible();
    await page.locator('#boot-dm').click();
    await expect(page.locator('#boot-dm-form')).toBeVisible();
    await page.fill('#boot-dm-secret', DM_SECRET);
    await Promise.all([
      page.locator('#boot-dm-form button[type="submit"]').click(),
      page.waitForSelector('#boot-screen', { state: 'hidden' })
    ]);
    await expect(page.locator('#mobile-nav')).toBeVisible();
  });

  test('Consola móvil muestra filtros del buzón', async ({ page }) => {
    await page.locator(mobileTabSelector('console')).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#msg-box-label')).toHaveText('Entrada');
    await expect(page.locator('#msg-box-inbox')).toHaveClass(/active/);
    await page.locator('#msg-box-sent').click();
    await expect(page.locator('#msg-box-label')).toHaveText('Enviados');
    await expect(page.locator('#message-list-dm')).toBeVisible();
    await expect(page.locator('#message-list-dm .message-list-item').first()).toBeVisible();
  });
});
