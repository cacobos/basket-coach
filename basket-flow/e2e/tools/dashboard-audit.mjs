import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.PB_BASE || 'http://localhost:4200';
const EV = '../docs/ux-pipeline/baseline/evidencia';
const email = process.env.PB_EMAIL;
const pass = process.env.PB_PASS;
fs.mkdirSync(EV, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const pages = {};
let label = '_init';
function setLabel(l) {
  label = l;
  if (!pages[l]) pages[l] = { errors: [], warnings: [], badResponses: [] };
}
setLabel('_init');
page.on('console', m => {
  if (m.type() === 'error') pages[label].errors.push(m.text().slice(0, 250));
  else if (m.type() === 'warning') pages[label].warnings.push(m.text().slice(0, 200));
});
page.on('response', r => {
  if (r.status() >= 400) pages[label].badResponses.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 140)}`);
});
async function shot(name) {
  try { await page.screenshot({ path: `${EV}/${name}.png`, fullPage: false }); } catch {}
}

const out = {};

// ---------- 1. LOGIN PAGE ----------
setLabel('01-login');
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);
await shot('01-login');
out.loginInputs = await page.locator('input').evaluateAll(els => els.map(e => ({ type: e.type, placeholder: e.placeholder || null, id: e.id || null }))).catch(() => []);
out.loginButtons = await page.getByRole('button').allTextContents().catch(() => []);
out.loginHeadings = await page.locator('h1,h2,h3').allTextContents().catch(() => []);

// ---------- 2. WRONG PASSWORD ----------
setLabel('02-login-wrong-pass');
try {
  const emailInput = page.locator('input[type="email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await emailInput.fill(email);
  await passInput.fill('contrasena-erronea-123');
  const btns = page.getByRole('button');
  let clicked = false;
  for (const b of await btns.all()) {
    const t = ((await b.textContent()) || '').toLowerCase();
    if (/iniciar|entrar|acceder|login|sesion/.test(t) && !/google/.test(t)) { await b.click(); clicked = true; break; }
  }
  if (!clicked) await passInput.press('Enter');
  await page.waitForTimeout(3500);
  out.wrongPassErrorVisible = await page.locator('.error, [class*="error"], [role="alert"], mat-error').allTextContents().catch(() => []);
  out.wrongPassStillOnLogin = page.url().includes('login');
} catch (e) { out.wrongPassTestError = String(e).slice(0, 300); }
await shot('02-login-error');

// ---------- 3. CORRECT LOGIN ----------
setLabel('03-login-success');
try {
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(pass);
  const btns = page.getByRole('button');
  let clicked = false;
  for (const b of await btns.all()) {
    const t = ((await b.textContent()) || '').toLowerCase();
    if (/iniciar|entrar|acceder|login|sesion/.test(t) && !/google/.test(t)) { await b.click(); clicked = true; break; }
  }
  if (!clicked) await passInput.press('Enter');
  await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  out.afterLoginUrl = page.url();
} catch (e) { out.loginError = String(e).slice(0, 400); }
await shot('03-post-login');

// ---------- 4. ROOT REDIRECT TEST ----------
setLabel('04-root-redirect');
try {
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  out.rootRedirectsTo = page.url();
} catch (e) { out.rootRedirectError = String(e).slice(0, 200); }

// ---------- 5. SIDEBAR INVENTORY ----------
setLabel('05-sidebar');
await shot('05-current-view');
try {
  const links = await page.locator('aside a, nav a, [class*="sidebar"] a').evaluateAll(els =>
    els.map(a => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') }))
       .filter(l => l.href && l.href.startsWith('/') && l.text)
  );
  const seen = new Set();
  out.sidebarLinks = links.filter(l => { const k = l.href; if (seen.has(k)) return false; seen.add(k); return true; });
} catch (e) { out.sidebarError = String(e).slice(0, 300); }
out.userChipText = await page.locator('aside, [class*="sidebar"]').first().innerText().then(t => t.slice(-300)).catch(() => '');

// ---------- 6. PERF ON CURRENT PAGE ----------
try {
  out.perfCurrent = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? { ttfbMs: Math.round(nav.responseStart), domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), loadMs: Math.round(nav.loadEventEnd) } : null;
  });
} catch {}

// ---------- 7. AXE ON DASHBOARD ----------
setLabel('06-axe-dashboard');
try {
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.0/axe.min.js', timeout: 15000 });
  const axeRes = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
  out.axeDashboard = axeRes.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
} catch (e) { out.axeDashboardError = String(e).slice(0, 200); }

// ---------- 8. CRAWL EVERY SIDEBAR ROUTE ----------
let idx = 10;
for (const link of out.sidebarLinks || []) {
  idx++;
  setLabel(`${idx}-${link.href.replace(/\//g, '_')}`);
  try {
    await page.goto(BASE + link.href, { waitUntil: 'networkidle', timeout: 25000 }).catch(async () => {
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    });
    await page.waitForTimeout(2200);
    const routeInfo = {
      finalUrl: page.url(),
      headings: await page.locator('h1,h2,h3').allTextContents().then(a => a.map(t => t.trim()).filter(Boolean).slice(0, 6)).catch(() => []),
      mainTextLength: await page.locator('main, [class*="content"]').first().innerText().then(t => t.length).catch(() => -1),
    };
    pages[label].routeInfo = routeInfo;
    await shot(`${idx}-route${link.href.replace(/\//g, '-')}`);
  } catch (e) {
    pages[label].crawlError = String(e).slice(0, 250);
  }
}

// ---------- 9. AXE ON LOGIN (fresh context reuse) ----------
setLabel('99-axe-login');
try {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.0/axe.min.js', timeout: 15000 });
  const axeRes = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
  out.axeLogin = axeRes.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
} catch (e) { out.axeLoginError = String(e).slice(0, 200); }

// ---------- SUMMARY ----------
const summary = {};
for (const [k, v] of Object.entries(pages)) {
  summary[k] = { errors: v.errors?.length || 0, warnings: v.warnings?.length || 0, badResponses: v.badResponses?.length || 0 };
}
out.consoleSummary = summary;

fs.writeFileSync('../docs/ux-pipeline/baseline/evidencia/walkthrough-detail.json', JSON.stringify({ out, pages }, null, 2));
console.log('RESULT_JSON=' + JSON.stringify(out, null, 1));
await browser.close();
