import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tmpDir = path.join(projectRoot, 'tests', 'tmp');

fs.mkdirSync(tmpDir, { recursive: true });

const dbPath = process.env.SQLITE_DB_PATH || path.join(tmpDir, 'playwright-e2e.db');
const sessionDbPath = process.env.SESSION_DB_PATH || path.join(tmpDir, 'playwright-e2e-sessions.sqlite');

for (const filePath of [dbPath, sessionDbPath]) {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.HOST = process.env.HOST || '127.0.0.1';
process.env.PORT = process.env.PORT || '3410';
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_DB_PATH = sessionDbPath;
process.env.DM_SECRET = process.env.TEST_DM_SECRET || process.env.DM_SECRET || 'Pill4skiM0nAm0ur';
process.env.DM_DEFAULT_PASSWORD = process.env.DM_DEFAULT_PASSWORD || process.env.DM_SECRET;
process.env.AGENT_DEFAULT_PASSWORD =
  process.env.TEST_AGENT_PASSWORD || process.env.AGENT_DEFAULT_PASSWORD || 'amarok';

require('../server.js');
