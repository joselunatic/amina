import { request, type Page } from '@playwright/test';

export const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:3410';
export const agentUsername = process.env.TEST_AGENT_USERNAME || process.env.PLAYWRIGHT_AGENT_USER || 'pike';
export const agentPassword = process.env.TEST_AGENT_PASSWORD || process.env.PLAYWRIGHT_AGENT_PASS || 'amarok';
export const dmSecret = process.env.TEST_DM_SECRET || 'Pill4skiM0nAm0ur';

async function createStorageState(path: string, data: Record<string, string>) {
  const api = await request.newContext({ baseURL });
  try {
    const response = await api.post(path, { data });
    if (!response.ok()) {
      throw new Error(`${path} failed with ${response.status()}: ${await response.text()}`);
    }
    return await api.storageState();
  } finally {
    await api.dispose();
  }
}

export async function getAgentStorageState() {
  return createStorageState('/api/auth/agent', {
    username: agentUsername,
    password: agentPassword
  });
}

export async function getDmStorageState() {
  return createStorageState('/api/auth/dm', {
    password: dmSecret
  });
}

async function applyStorageState(page: Page, storageState: Awaited<ReturnType<typeof getAgentStorageState>>) {
  await page.context().addCookies(storageState.cookies);
}

async function waitForAppShell(page: Page, mode: 'agent' | 'dm') {
  await page.waitForFunction(
    ({ expectedMode }) => {
      const workspace = document.getElementById('workspace');
      const boot = document.getElementById('boot-screen');
      const body = document.body;
      if (!workspace || !boot || !body) return false;
      if (!boot.classList.contains('hidden')) return false;
      if (expectedMode === 'agent') {
        return body.classList.contains('mode-agent');
      }
      return Boolean(window.state?.dmMode) && body.classList.contains('mode-dm');
    },
    { expectedMode: mode },
    { timeout: 15000 }
  );
}

export async function loginAgentPage(page: Page) {
  await applyStorageState(page, await getAgentStorageState());
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForAppShell(page, 'agent');
}

export async function loginDmPage(page: Page) {
  await applyStorageState(page, await getDmStorageState());
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForAppShell(page, 'dm');
}
