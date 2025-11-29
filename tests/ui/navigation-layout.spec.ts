import { devices, expect, test, type Page } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const AGENT_USERNAME = 'pike';
const AGENT_PASSWORD = '123456';
const DM_SECRET = process.env.TEST_DM_SECRET || 'Pill4skiM0nAm0ur';
const iPhone13 = devices['iPhone 13'];

async function loginAsAgent(page: Page) {
  await page.goto(baseURL);
  await expect(page.locator('#boot-screen')).toBeVisible();
  await page.click('#boot-player');
  await expect(page.locator('#agent-login')).toBeVisible();
  await page.waitForSelector('#agent-select', { state: 'visible' });
  await page.waitForSelector(`#agent-select option[value="${AGENT_USERNAME}"]`, { state: 'attached' });
  await page.selectOption('#agent-select', AGENT_USERNAME);
  await page.fill('#agent-pass', AGENT_PASSWORD);
  await Promise.all([
    page.click('#agent-login-button'),
    page.waitForSelector('#boot-screen.hidden')
  ]);
  await expect(page.locator('nav.workspace-nav.primary-nav')).toBeVisible();
  await expect(page.locator('#workspace')).toBeVisible();
}

async function loginAsDm(page: Page) {
  await page.goto(baseURL);
  await expect(page.locator('#boot-screen')).toBeVisible();
  await page.click('#boot-dm');
  await expect(page.locator('#boot-dm-form')).toBeVisible();
  await page.fill('#boot-dm-secret', DM_SECRET);
  await Promise.all([
    page.locator('#boot-dm-form button[type="submit"]').click(),
    page.waitForSelector('#boot-screen', { state: 'hidden' })
  ]);
  await expect(page.locator('nav.workspace-nav.primary-nav .workspace-tabs.dm-tabs')).toBeVisible();
  await expect(page.locator('#workspace')).toBeVisible();
}

async function clickWorkspaceTab(page: Page, label: string) {
  const nav = page.locator('nav.workspace-nav:visible').first();
  await expect(nav).toBeVisible();
  await nav.getByRole('button', { name: label }).click();
}

async function clickMobileTab(page: Page, label: string) {
  const mobileNav = page.locator('#mobile-nav');
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole('button', { name: label, exact: true }).click();
}

async function expectNavAboveFooter(page: Page) {
  const nav = page.locator('nav.workspace-nav:visible').first();
  await expect(nav).toBeVisible();
}

type TabConfig = {
  label: string;
  view: string;
  scope: 'agent' | 'dm';
  assert: (page: Page) => Promise<void>;
};

const agentTabConfig: TabConfig[] = [
  {
    label: 'Mapa',
    view: 'map',
    scope: 'agent',
    assert: async (page) => {
      await expect(page.locator('#map')).toBeVisible();
      await expect(page.locator('#focal-poi-card')).toBeVisible();
    }
  },
  {
    label: 'Consola',
    view: 'console',
    scope: 'agent',
    assert: async (page) => {
      await expect(page.locator('#mission-brief-card')).toBeVisible();
    }
  },
  {
    label: 'Base de Datos',
    view: 'database',
    scope: 'agent',
    assert: async (page) => {
      await expect(page.locator('#dossier-card .card-title')).toHaveText('Selector de entidades');
    }
  },
  {
    label: 'Relaciones',
    view: 'relations',
    scope: 'agent',
    assert: async (page) => {
      await expect(page.locator('#agent-relations-card-top')).toBeVisible();
    }
  }
];

const dmTabConfig: TabConfig[] = [
  {
    label: 'Mapa',
    view: 'map',
    scope: 'dm',
    assert: async (page) => {
      await expect(page.locator('#dm-focal-poi-card')).toBeVisible();
    }
  },
  {
    label: 'Journal',
    view: 'journal',
    scope: 'dm',
    assert: async (page) => {
      await expect(page.locator('#dm-inbox-card')).toBeVisible();
    }
  },
  {
    label: 'Entidades',
    view: 'entities',
    scope: 'dm',
    assert: async (page) => {
      await expect(page.locator('#dm-entity-detail-card')).toBeVisible();
    }
  },
  {
    label: 'Relaciones',
    view: 'relations',
    scope: 'dm',
    assert: async (page) => {
      await expect(page.locator('#dm-relations-card')).toBeVisible();
    }
  }
];

const agentTabLabels = agentTabConfig.map((tab) => tab.label);
const dmTabLabels = dmTabConfig.map((tab) => tab.label);

test('desktop_agent_tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAgent(page);
  const nav = page.locator('nav.workspace-nav.primary-nav .workspace-tabs.agent-tabs');
  await expect(nav).toBeVisible();
  const tabs = nav.locator('.workspace-tab');
  await expect(tabs).toHaveCount(agentTabLabels.length);
  const texts = await tabs.allTextContents();
  expect(texts.map((text) => text.trim())).toEqual(agentTabLabels);
  for (const tab of agentTabConfig) {
    await nav.getByRole('button', { name: tab.label }).click();
    await expect(page.locator(`.workspace-view[data-view="${tab.view}"].active`)).toBeVisible();
    await tab.assert(page);
  }
});

const mobileTest = test.extend({});
mobileTest.use({ ...iPhone13 });

mobileTest.describe('Mobile agent navigation', () => {
  mobileTest('mobile_agent_tabs', async ({ page }) => {
    await loginAsAgent(page);
    await expect(page.locator('#mobile-nav')).toBeVisible();
    for (const tab of agentTabConfig) {
      await clickMobileTab(page, tab.label);
      const viewClass = tab.scope === 'agent' ? 'agent-view' : 'dm-view';
      await expect(page.locator(`.workspace-view.${viewClass}[data-view="${tab.view}"].active`)).toBeVisible();
      await tab.assert(page);
    }
  });
});

mobileTest.describe('Mobile DM navigation', () => {
  mobileTest('mobile_dm_tabs', async ({ page }) => {
    await loginAsDm(page);
    await expect(page.locator('#mobile-nav')).toBeVisible();
    for (const tab of dmTabConfig) {
      await clickMobileTab(page, tab.label);
      const viewClass = tab.scope === 'agent' ? 'agent-view' : 'dm-view';
      await expect(page.locator(`.workspace-view.${viewClass}[data-view="${tab.view}"].active`)).toBeVisible();
      await tab.assert(page);
    }
  });
});
