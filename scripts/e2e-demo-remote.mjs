/**
 * E2E smoke: login as dashboard user → open /app/demo → report console + page text.
 * Usage: node scripts/e2e-demo-remote.mjs
 */
import puppeteer from 'puppeteer';

const BASE = process.env.GATEWAY_URL || 'http://localhost:8080';
const EMAIL = process.env.E2E_EMAIL || 'dashboard@example.com';
const PASS = process.env.E2E_PASSWORD || '12345678';

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
  logs.push(`[${msg.type()}] ${text}`);
  if (msg.type() === 'error') errors.push(text);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('requestfailed', (req) => {
  failedRequests.push(`${req.failure()?.errorText || 'fail'} ${req.url()}`);
});
page.on('response', (res) => {
  const url = res.url();
  if (
    url.includes('remoteEntry') ||
    url.includes('mf-manifest') ||
    url.includes('/r/demo-react/')
  ) {
    logs.push(`[net ${res.status()}] ${url} ct=${res.headers()['content-type'] || ''}`);
  }
});

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASS);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
  ]);

  // Land on /app then go to demo
  await page.goto(`${BASE}/app/demo`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));

  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || '');
  const hasRuntime008 = errors.some((e) => e.includes('RUNTIME-008') || e.includes('import statement'));
  const hasFailedLoad = bodyText.includes('Failed to load') || bodyText.includes('Cannot use import');

  const result = {
    url: page.url(),
    ok: !hasRuntime008 && !hasFailedLoad && !bodyText.includes('Failed to load'),
    hasRuntime008,
    hasFailedLoad,
    bodyPreview: bodyText.slice(0, 800),
    errors,
    failedRequests: failedRequests.slice(0, 30),
    relevantLogs: logs.filter(
      (l) =>
        /Federation|RUNTIME|remoteEntry|mf-manifest|import statement|Failed|error/i.test(l),
    ).slice(0, 80),
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
} catch (e) {
  console.log(JSON.stringify({ ok: false, fatal: String(e), errors, logs: logs.slice(-40) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
