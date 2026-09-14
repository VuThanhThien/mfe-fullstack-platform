/**
 * Cross-remote-state browser verification (admin deep-link, URL page, storage).
 * Usage: node scripts/e2e-cross-remote-state.mjs
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:8080';
const EMAIL = 'admin@example.com';
const PASS = '12345678';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const results = [];
const fail = (name, detail) => results.push({ name, ok: false, detail });
const pass = (name, detail) => results.push({ name, ok: true, detail });

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASS);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
  ]);

  await page.goto(`${BASE}/app/admin/users`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  let body = await page.evaluate(() => document.body?.innerText || '');
  const deepOk =
    /Users/i.test(body) &&
    !/NotFound|Page not found|Failed to load/i.test(body) &&
    page.url().includes('/app/admin/users');
  if (deepOk) pass('deep-link-hard-refresh', page.url());
  else fail('deep-link-hard-refresh', body.slice(0, 500));

  const storage = await page.evaluate(() => ({
    ls: Object.keys(localStorage),
    ss: Object.keys(sessionStorage),
  }));
  const tokenKeys = [...storage.ls, ...storage.ss].filter((k) =>
    /token|access|refresh|jwt/i.test(k),
  );
  if (tokenKeys.length === 0) pass('no-token-storage', storage);
  else fail('no-token-storage', tokenKeys);

  await page.goto(`${BASE}/app/nope`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  body = await page.evaluate(() => document.body?.innerText || '');
  if (/not found|nope|unavailable|unknown/i.test(body)) {
    pass('unknown-route-notfound', body.slice(0, 200));
  } else {
    fail('unknown-route-notfound', body.slice(0, 400));
  }

  await page.goto(`${BASE}/app/admin/users?page=1`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 3000));
  body = await page.evaluate(() => document.body?.innerText || '');
  const pageMatch = body.match(/Page\s+(\d+)\s*\/\s*(\d+)/i);
  if (pageMatch) pass('users-page-indicator', pageMatch[0]);
  else fail('users-page-indicator', body.slice(0, 400));

  await page.goto(`${BASE}/app/admin/users?page=abc`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 3000));
  body = await page.evaluate(() => document.body?.innerText || '');
  const pageMatch2 = body.match(/Page\s+(\d+)\s*\/\s*(\d+)/i);
  if (pageMatch2 && pageMatch2[1] === '1') pass('invalid-page-degrades', pageMatch2[0]);
  else fail('invalid-page-degrades', { text: body.slice(0, 300), match: pageMatch2 });

  // Admin lacks DASHBOARD → /app/demo must NotFound (scope gate, not a regression)
  await page.goto(`${BASE}/app/demo`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));
  body = await page.evaluate(() => document.body?.innerText || '');
  if (/Page not found|404/i.test(body) && /\/app\/demo/.test(body)) {
    pass('admin-demo-scoped-out', 'Admin correctly NotFound on /app/demo');
  } else if (/Demo React/i.test(body)) {
    fail('admin-demo-scoped-out', 'Admin unexpectedly mounted demo');
  } else {
    fail('admin-demo-scoped-out', body.slice(0, 400));
  }

  await page.goto(`${BASE}/app/admin/users/new`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 3000));
  body = await page.evaluate(() => document.body?.innerText || '');
  if (/Create user/i.test(body)) pass('admin-create-form', 'Create user visible');
  else fail('admin-create-form', body.slice(0, 300));

  // Logout via shell button, then dashboard login → demo mounts
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  const logoutBtn = await page.$('button[aria-label="logout"]');
  if (logoutBtn) {
    await Promise.all([
      logoutBtn.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
    ]);
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.click('input[name="email"]', { clickCount: 3 });
  await page.type('input[name="email"]', 'dashboard@example.com');
  await page.click('input[name="password"]', { clickCount: 3 });
  await page.type('input[name="password"]', PASS);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
  ]);
  await page.goto(`${BASE}/app/demo`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  body = await page.evaluate(() => document.body?.innerText || '');
  if (/Demo React/i.test(body) && !/Failed to load|RUNTIME-008/i.test(body)) {
    pass('dashboard-demo-mounts', body.slice(0, 120));
  } else {
    fail('dashboard-demo-mounts', body.slice(0, 400));
  }
} catch (e) {
  fail('fatal', String(e));
} finally {
  await browser.close();
}

const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, results }, null, 2));
process.exit(ok ? 0 : 1);
