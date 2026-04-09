import { chromium, devices, expect, test, type Page } from '@playwright/test';
import { baseURL, getAgentStorageState, loginAgentPage, loginDmPage } from '../e2e-helpers';

const iPhone13 = devices['iPhone 13'];

async function loginAsAgent(page: Page) {
  await loginAgentPage(page);
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await expect(page.locator('#workspace')).toBeVisible();
}

async function loginAsDm(page: Page) {
  await loginDmPage(page);
  await expect(page.locator('#mobile-nav')).toBeVisible();
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

async function clickMobileMoreOption(page: Page, view: 'sheet' | 'base') {
  await expect(page.locator('#mobile-more-switch')).toBeVisible();
  await page.locator(`#mobile-more-switch [data-mobile-more-view="${view}"]`).click({ force: true });
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
    label: 'Ficha',
    view: 'sheet',
    scope: 'agent',
    assert: async (page) => {
      await expect(page.locator('#character-sheet-card')).toBeVisible();
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
    label: 'ENTROPIA',
    view: 'base',
    scope: 'agent',
    assert: async (page) => {
      await expect(page.locator('#base-focus-card')).toBeVisible();
    }
  },
  {
    label: 'Relaciones',
    view: 'relations',
    scope: 'agent',
    assert: async (page) => {
      await expect(page.locator('#agent-relations-card')).toBeVisible();
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
      await expect(page.locator('.dm-mobile-console-tab.active')).toHaveText('Mensajería');
      await expect(page.locator('#dm-chat-card')).toBeVisible();
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
    label: 'ENTROPIA',
    view: 'base',
    scope: 'dm',
    assert: async (page) => {
      await expect(page.locator('#base-focus-card')).toBeVisible();
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

const mobileAgentTabConfig = [
  {
    label: 'Mapa',
    view: 'map',
    scope: 'agent',
    assert: async (page: Page) => {
      await expect(page.locator('#focal-poi-card')).toBeVisible();
    }
  },
  {
    label: 'Dossier',
    view: 'database',
    scope: 'agent',
    assert: async (page: Page) => {
      await expect(page.locator('#dossier-card')).toBeVisible();
    }
  },
  {
    label: 'Consola',
    view: 'console',
    scope: 'agent',
    assert: async (page: Page) => {
      await expect(page.locator('#agent-chat-card')).toBeVisible();
      await expect(page.locator('#mission-brief-card')).toBeHidden();
    }
  },
  {
    label: 'Archivo',
    view: 'console',
    scope: 'agent',
    assert: async (page: Page) => {
      await expect(page.locator('#mission-brief-card')).toBeVisible();
      await expect(page.locator('#agent-chat-card')).toBeHidden();
    }
  },
  {
    label: 'Más',
    view: 'sheet',
    scope: 'agent',
    assert: async (page: Page) => {
      await clickMobileMoreOption(page, 'sheet');
      await expect(page.locator('#character-sheet-card')).toBeVisible();
      await clickMobileMoreOption(page, 'base');
      await expect(page.locator('#base-focus-card')).toBeVisible();
    }
  }
];

const mobileDmTabConfig = [
  {
    label: 'Mapa',
    view: 'map',
    scope: 'dm',
    assert: async (page: Page) => {
      await expect(page.locator('#map')).toBeVisible();
      await expect(page.locator('#workspace')).toBeVisible();
    }
  },
  {
    label: 'Dossier',
    view: 'entities',
    scope: 'dm',
    assert: async (page: Page) => {
      await expect(page.locator('#dm-entity-detail-card')).toBeVisible();
    }
  },
  {
    label: 'Consola',
    view: 'journal',
    scope: 'dm',
    assert: async (page: Page) => {
      await expect(page.locator('#dm-chat-card')).toBeVisible();
      await expect(page.locator('.dm-mobile-console-tab.active')).toHaveText('Mensajería');
    }
  },
  {
    label: 'Archivo',
    view: 'journal',
    scope: 'dm',
    assert: async (page: Page) => {
      await expect(page.locator('.dm-mobile-console-tab.active')).toHaveText('Journal');
      await expect(page.locator('#journal-public')).toBeVisible();
    }
  },
  {
    label: 'Más',
    view: 'base',
    scope: 'dm',
    assert: async (page: Page) => {
      await expect(page.locator('#mobile-more-switch')).toBeVisible();
      await expect(page.locator('#mobile-more-switch [data-mobile-more-view="sheet"]')).toHaveClass(/hidden/);
      await clickMobileMoreOption(page, 'base');
      await expect(page.locator('#base-focus-card')).toBeVisible();
    }
  }
];

test('desktop_agent_tabs', async () => {
  const browser = await chromium.launch({ headless: true });
  const storageState = await getAgentStorageState();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState
  });
  const page = await context.newPage();
  const debugEvents: string[] = [];
  page.on('pageerror', (error) => debugEvents.push(`pageerror:${error.message}`));
  page.on('crash', () => debugEvents.push('page:crash'));

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(
      (expectedCount) => {
        const workspace = document.getElementById('workspace');
        const nav = document.querySelector('nav.workspace-nav.primary-nav .workspace-tabs.agent-tabs');
        const tabs = nav ? nav.querySelectorAll('.workspace-tab').length : 0;
        const boot = document.getElementById('boot-screen');
        return Boolean(workspace && nav && tabs >= expectedCount && boot?.classList.contains('hidden'));
      },
      agentTabLabels.length,
      { timeout: 15000 }
    );

    const nav = page.locator('nav.workspace-nav.primary-nav .workspace-tabs.agent-tabs');
    await expect(nav).toBeVisible();
    const tabs = nav.locator('.workspace-tab');
    await expect(tabs).toHaveCount(agentTabLabels.length);
    const texts = await tabs.allTextContents();
    expect(texts.map((text) => text.trim())).toEqual(agentTabLabels);
    for (const tab of agentTabConfig) {
      await nav.getByRole('button', { name: tab.label }).click();
      await expect(page.locator('body')).toHaveAttribute('data-workspace-view', tab.view);
      await tab.assert(page);
    }
  } catch (error) {
    if (debugEvents.length) {
      console.error('desktop_agent_tabs debug:', debugEvents.join(' | '));
    }
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
});

const mobileTest = test.extend({});
mobileTest.use({ ...iPhone13 });

mobileTest.describe('Mobile agent navigation', () => {
  mobileTest('mobile_agent_tabs', async ({ page }) => {
    await loginAsAgent(page);
    await expect(page.locator('#mobile-nav')).toBeVisible();
    for (const tab of mobileAgentTabConfig) {
      await clickMobileTab(page, tab.label);
      await expect(page.locator('body')).toHaveAttribute('data-workspace-view', tab.view);
      await tab.assert(page);
    }
  });
});

mobileTest.describe('Mobile DM navigation', () => {
  mobileTest('mobile_dm_tabs', async ({ page }) => {
    await loginAsDm(page);
    await expect(page.locator('#mobile-nav')).toBeVisible();
    for (const tab of mobileDmTabConfig) {
      await clickMobileTab(page, tab.label);
      await expect(page.locator('body')).toHaveAttribute('data-workspace-view', tab.view);
      await tab.assert(page);
    }
  });
});
