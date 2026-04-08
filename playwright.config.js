const { defineConfig } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3410';

module.exports = defineConfig({
  testDir: './tests',
  testIgnore: ['graph-api.spec.mjs', 'api/contracts-runner.mjs', 'api/run-contracts-isolated.mjs', 'tmp/**'],
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    headless: true
  },
  webServer: {
    command: 'node tests/e2e-server.mjs',
    url: `${baseURL}/api/config`,
    timeout: 120_000,
    reuseExistingServer: false
  }
});
