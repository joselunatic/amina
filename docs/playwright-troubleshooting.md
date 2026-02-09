# Playwright CLI Troubleshooting

Use this playbook when `playwright` or `npm run test:e2e` appears to hang.

## 1) Check for hanging processes

```bash
ps aux | rg -i "playwright test|node .*\\.bin/playwright|npm exec playwright|chromium"
pgrep -af "playwright test|node .*\\.bin/playwright|npm exec playwright|chromium"
```

## 2) Kill stuck Playwright processes

```bash
pkill -f "playwright test" || true
pkill -f "node .*\\.bin/playwright" || true
pkill -f "npm exec playwright" || true
```

## 3) Verify CLI health quickly

```bash
timeout 10s node ./node_modules/.bin/playwright --version
```

Expected:
- Exit `0` and prints Playwright version.
- Exit `124` means timeout/hang.

## 4) Run e2e with explicit timeout

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 API_BASE_URL=http://127.0.0.1:3001 timeout 120s npm run test:e2e
echo $?
```

Exit code guide:
- `0`: tests completed.
- `1`: test failure.
- `124`: command timed out (likely hang/very slow run).

## 5) Quick non-UI fallback for API contract verification

If Playwright runner is unstable in the current shell/session:

```bash
npm run test:api-contracts
```

This validates key API contracts without browser UI automation.
