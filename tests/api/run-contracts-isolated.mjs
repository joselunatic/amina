import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectRoot = process.cwd();
const port = Number(process.env.TEST_PORT || 3310 + Math.floor(Math.random() * 200));
const host = process.env.TEST_HOST || '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const tmpDir = path.join(projectRoot, 'tests', 'tmp');
const dbPath = path.join(tmpDir, `contracts-${Date.now()}.db`);
const templateDbPath = path.join(projectRoot, 'schuylkill.db');

fs.mkdirSync(tmpDir, { recursive: true });
if (fs.existsSync(templateDbPath)) {
  fs.copyFileSync(templateDbPath, dbPath);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/config`);
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(300);
  }
  throw new Error(`Server did not become ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

async function main() {
  const serverEnv = {
    ...process.env,
    NODE_ENV: 'test',
    HOST: host,
    PORT: String(port),
    SQLITE_DB_PATH: dbPath
  };

  const server = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStdout = '';
  let serverStderr = '';
  server.stdout.on('data', (chunk) => {
    serverStdout += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverStderr += chunk.toString();
  });

  try {
    await waitForServer(baseUrl);

    await new Promise((resolve, reject) => {
      const runner = spawn(process.execPath, ['--no-warnings', 'tests/api/contracts-runner.mjs'], {
        cwd: projectRoot,
        env: {
          ...process.env,
          API_BASE_URL: baseUrl
        },
        stdio: 'inherit'
      });
      runner.on('exit', (code) => {
        if (code === 0) return resolve();
        reject(new Error(`contracts-runner exited with code ${code}`));
      });
      runner.on('error', reject);
    });

    console.log(`Isolated contracts OK (db: ${dbPath})`);
  } finally {
    if (!server.killed) {
      server.kill('SIGTERM');
      await sleep(300);
      if (!server.killed) server.kill('SIGKILL');
    }

    if (serverStdout || serverStderr) {
      fs.writeFileSync(path.join(tmpDir, `contracts-server-${Date.now()}.log`), `${serverStdout}\n${serverStderr}`);
    }

    try {
      fs.unlinkSync(dbPath);
    } catch (_) {
      // keep DB for debugging if unlink fails
    }
  }
}

main().catch((err) => {
  console.error('Isolated contracts failed', err);
  process.exit(1);
});
