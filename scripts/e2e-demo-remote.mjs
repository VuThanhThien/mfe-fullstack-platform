/**
 * E2E smoke: login → /app/product (+ categories) → /app/article.
 * Storage allowlist ≈ [mfe-ui-mode, mfe-ui-drawer-collapsed].
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

  await page.goto(`${BASE}/app/product`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForTestId('product-home');
  const homeText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
  const homeOk =
    homeText.includes('Products') ||
    homeText.includes('Pro Laptop') ||
    homeText.includes('Browse categories');
  const hasRuntime008 = errors.some(
    (e) => e.includes('RUNTIME-008') || e.includes('import statement'),
  );
  const hasFailedLoad =
    homeText.includes('Failed to load') || homeText.includes('Cannot use import');

  await page.goto(`${BASE}/app/product/categories`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await waitForTestId('product-categories');
  const catText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || '');
  const categoriesOk =
    catText.includes('Categories') &&
    (catText.includes('Hardware') || catText.includes('Software')) &&
    !catText.includes('Not Found');

  await page.goto(`${BASE}/app/article`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await waitForTestId('article-hub');
  const articleText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || '');
  const articleOk =
    articleText.includes('Articles') &&
    !articleText.includes('Not Found') &&
    !articleText.includes('Failed to load');

  const hygiene = await storageHygiene();
  const tokensOk = hygiene.badLs.length === 0 && hygiene.badSs.length === 0;

  const ok =
    !hasRuntime008 &&
    !hasFailedLoad &&
    homeOk &&
    categoriesOk &&
    articleOk &&
    tokensOk;

  const result = {
    url: page.url(),
    ok,
    homeOk,
    categoriesOk,
    articleOk,
    hasRuntime008,
    hasFailedLoad,
    tokensOk,
    hygiene,
    homePreview: homeText.slice(0, 400),
    catPreview: catText.slice(0, 400),
    articlePreview: articleText.slice(0, 400),
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
