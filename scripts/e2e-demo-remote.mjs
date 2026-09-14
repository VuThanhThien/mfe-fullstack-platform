/**
 * E2E smoke: login → /app/demo Home widgets → theme toggle → /app/demo/dashboard
 * (+ hard refresh) → /app/demo/status. Storage allowlist ≈ [mfe-ui-mode].
 * Usage: node scripts/e2e-demo-remote.mjs
 */
import puppeteer from 'puppeteer';

const BASE = process.env.GATEWAY_URL || 'http://localhost:8080';
const EMAIL = process.env.E2E_EMAIL || 'dashboard@example.com';
const PASS = process.env.E2E_PASSWORD || '12345678';
const MODE_KEY = 'mfe-ui-mode';

const errors = [];
const logs = [];
const failedRequests = [];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

page.on('console', (msg) => {
  const text = msg.text();
  // Recharts ResponsiveContainer often warns when width/height is -1 during layout
  if (/The width\(-1\)|height\(-1\)|chart should be greater than 0/i.test(text)) return;
  logs.push(`[${msg.type()}] ${text}`);
  if (msg.type() === 'error') errors.push(text);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('requestfailed', (req) => {
  failedRequests.push(`${req.failure()?.errorText || 'fail'} ${req.url()}`);
});

function storageHygiene() {
  return page.evaluate((modeKey) => {
    const lsKeys = Object.keys(localStorage);
    const ssKeys = Object.keys(sessionStorage);
    const allowedLs = new Set([modeKey, 'mfe-ui-drawer-collapsed']);
    const badLs = lsKeys.filter((k) => !allowedLs.has(k));
    const badSs = ssKeys.slice();
    return {
      mode: localStorage.getItem(modeKey),
      badLs,
      badSs,
      lsKeys,
      ssKeys,
    };
  }, MODE_KEY);
}

async function waitForTestId(testId, timeout = 20000) {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout });
}

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASS);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
  ]);

  await page.goto(`${BASE}/app/demo`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForTestId('demo-home');
  const homeText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
  const homeOk =
    homeText.includes('Welcome back') ||
    homeText.includes('Personal targets') ||
    homeText.includes('Meetings');
  const hasRuntime008 = errors.some(
    (e) => e.includes('RUNTIME-008') || e.includes('import statement'),
  );
  const hasFailedLoad =
    homeText.includes('Failed to load') || homeText.includes('Cannot use import');

  let modeAfterToggle = null;
  const toggle = await page.$('[data-testid="theme-mode-toggle"]');
  if (toggle) {
    const beforeMode =
      (await page.evaluate((k) => localStorage.getItem(k), MODE_KEY)) || 'light';
    await page.$eval('[data-testid="theme-mode-toggle"]', (el) => el.click());
    await page
      .waitForFunction(
        (k, prev) => {
          const next = localStorage.getItem(k);
          return next === 'light' || next === 'dark' ? next !== prev : false;
        },
        { timeout: 5000 },
        MODE_KEY,
        beforeMode === 'dark' ? 'dark' : 'light',
      )
      .catch(() => null);
    modeAfterToggle = await page.evaluate((k) => localStorage.getItem(k), MODE_KEY);
  }

  await page.goto(`${BASE}/app/demo/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await waitForTestId('demo-dashboard');
  let dashText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
  const dashOk =
    (dashText.includes('Activity') || dashText.includes('Visits')) &&
    !dashText.toLowerCase().includes('under construction');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForTestId('demo-dashboard');
  dashText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
  const dashRefreshOk =
    page.url().includes('/app/demo/dashboard') &&
    !dashText.includes('Not Found') &&
    !dashText.includes('Failed to load') &&
    (dashText.includes('Activity') || dashText.includes('Visits'));

  await page.goto(`${BASE}/app/demo/status`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 1500));
  const statusText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || '');
  const statusOk =
    !statusText.includes('Not Found') &&
    (statusText.toLowerCase().includes('status') ||
      statusText.toLowerCase().includes('construction') ||
      statusText.toLowerCase().includes('under'));

  const hygiene = await storageHygiene();
  const modeOk =
    Boolean(toggle) && (modeAfterToggle === 'light' || modeAfterToggle === 'dark');
  const tokensOk = hygiene.badLs.length === 0 && hygiene.badSs.length === 0;

  const ok =
    !hasRuntime008 &&
    !hasFailedLoad &&
    homeOk &&
    dashOk &&
    dashRefreshOk &&
    Boolean(toggle) &&
    modeOk &&
    statusOk &&
    tokensOk;

  const result = {
    url: page.url(),
    ok,
    homeOk,
    dashOk,
    dashRefreshOk,
    hasRuntime008,
    hasFailedLoad,
    toggleFound: Boolean(toggle),
    modeAfterToggle,
    statusOk,
    tokensOk,
    hygiene,
    homePreview: homeText.slice(0, 400),
    dashPreview: dashText.slice(0, 400),
    statusPreview: statusText.slice(0, 400),
    errors: errors.slice(0, 40),
    failedRequests: failedRequests.slice(0, 30),
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.log(
    JSON.stringify({ ok: false, fatal: String(e), errors, logs: logs.slice(-40) }, null, 2),
  );
  process.exit(1);
} finally {
  await browser.close();
}
