/**
 * E2E: shell nav clicks must update URL + outlet both directions.
 * Usage: node scripts/e2e-shell-nav-click.mjs
 */
import puppeteer from 'puppeteer';

const BASE = process.env.GATEWAY_URL || 'http://localhost:8080';
const EMAIL = process.env.E2E_EMAIL || 'dashboard@example.com';
const PASS = process.env.E2E_PASSWORD || '12345678';

const errors = [];
const warnings = [];
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error') errors.push(text);
  if (
    text.includes('Throttling navigation') ||
    text.includes('already registered')
  ) {
    warnings.push(text);
  }
});

function fail(msg) {
  console.error('FAIL:', msg);
  for (const e of errors.slice(-10)) console.error(' ', e);
  process.exitCode = 1;
}

async function clickNav(label) {
  return page.evaluate((text) => {
    const nav = document.querySelector('[data-testid="nav-tree"]');
    if (!nav) return { ok: false, reason: 'no nav-tree' };
    const links = [...nav.querySelectorAll('a')];
    const target = links.find((a) =>
      (a.textContent || '').trim().includes(text),
    );
    if (!target) {
      return {
        ok: false,
        reason: `no ${text} link`,
        links: links.map((a) => ({
          text: (a.textContent || '').trim(),
          href: a.getAttribute('href'),
          selected: a.className.includes('Mui-selected'),
        })),
      };
    }
    target.click();
    return {
      ok: true,
      href: target.getAttribute('href'),
      selectedBefore: target.className.includes('Mui-selected'),
    };
  }, label);
}

async function navSelected(label) {
  return page.evaluate((text) => {
    const nav = document.querySelector('[data-testid="nav-tree"]');
    if (!nav) return null;
    const link = [...nav.querySelectorAll('a')].find((a) =>
      (a.textContent || '').trim().includes(text),
    );
    if (!link) return null;
    return link.className.includes('Mui-selected');
  }, label);
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

  // --- Step 1: /app/product → click Categories ---
  await page.goto(`${BASE}/app/product`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('[data-testid="product-home"]', { timeout: 20000 });
  await page.waitForSelector('[data-testid="nav-tree"]', { timeout: 20000 });
  console.log('1) at', page.url());

  const clickCat = await clickNav('Categories');
  if (!clickCat.ok) {
    fail(JSON.stringify(clickCat));
    await browser.close();
    process.exit(1);
  }
  console.log('1) clicked Categories', clickCat.href);

  await page.waitForFunction(
    () => /\/product\/categories\/?$/.test(window.location.pathname),
    { timeout: 10000 },
  );
  await page.waitForSelector('[data-testid="product-categories"]', {
    timeout: 10000,
  });
  await page
    .waitForFunction(
      () => !document.querySelector('[data-testid="product-home"]'),
      { timeout: 5000 },
    )
    .catch(() => null);

  const catSelected = await navSelected('Categories');
  const productSelectedOnCat = await navSelected('Product');
  console.log('1) after', {
    url: page.url(),
    catSelected,
    productSelectedOnCat,
  });

  if (!catSelected) {
    fail('Categories tab not selected after click');
    await browser.close();
    process.exit(1);
  }

  // --- Step 2: click Product (index) from categories ---
  const clickProd = await clickNav('Product');
  if (!clickProd.ok) {
    fail(JSON.stringify(clickProd));
    await browser.close();
    process.exit(1);
  }
  console.log('2) clicked Product', clickProd.href);

  await page.waitForFunction(
    () => {
      const p = window.location.pathname.replace(/\/$/, '');
      return p === '/app/product';
    },
    { timeout: 10000 },
  );
  await page.waitForSelector('[data-testid="product-home"]', { timeout: 10000 });
  await page
    .waitForFunction(
      () => !document.querySelector('[data-testid="product-categories"]'),
      { timeout: 5000 },
    )
    .catch(() => null);

  // Give selected-state subscription a beat
  await page.waitForFunction(
    () => {
      const nav = document.querySelector('[data-testid="nav-tree"]');
      const product = [...(nav?.querySelectorAll('a') || [])].find((a) =>
        (a.textContent || '').includes('Product'),
      );
      return product?.className.includes('Mui-selected');
    },
    { timeout: 5000 },
  ).catch(() => null);

  const productSelected = await navSelected('Product');
  const catSelectedOnProd = await navSelected('Categories');
  console.log('2) after', {
    url: page.url(),
    productSelected,
    catSelectedOnProd,
  });

  if (!/\/app\/product\/?$/.test(new URL(page.url()).pathname)) {
    fail(`expected /app/product, got ${page.url()}`);
  } else if (!(await page.$('[data-testid="product-home"]'))) {
    fail('product-home not shown after Product nav click');
  } else if (await page.$('[data-testid="product-categories"]')) {
    fail('product-categories still mounted after Product nav click');
  } else if (!productSelected) {
    fail('Product tab not selected after click back to index');
  } else if (catSelectedOnProd) {
    fail('Categories tab still selected on product index');
  } else if (warnings.some((w) => w.includes('Throttling navigation'))) {
    fail(
      `navigation throttle storm (${warnings.filter((w) => w.includes('Throttling')).length} warnings)`,
    );
  } else if (
    warnings.filter((w) => w.includes('already registered')).length > 4
  ) {
    fail(
      `remotes re-registered too often (${warnings.filter((w) => w.includes('already registered')).length})`,
    );
  } else {
    console.log(
      'PASS: Product ↔ Categories nav clicks update URL, outlet, and selected tab',
    );
    if (warnings.length) {
      console.log(
        `note: ${warnings.length} federation/nav warnings (within tolerance)`,
      );
    }
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}
