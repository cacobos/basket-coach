import { chromium } from '@playwright/test';

const BASE = process.env.PB_BASE || 'http://localhost:4200';
const ADMIN_EMAIL = process.env.PB_EMAIL;
const ADMIN_PASS = process.env.PB_PASS;
const TEST_PASS = 'Test1234!';

const norm = t => (t || '').trim().toLowerCase();

// Expected sidebar per role (derived from staffNavGroups + role_permissions seeds)
const CLUB_ADMIN_ITEMS = [
  'dashboard', 'sesiones', 'planificación', 'ejercicios', 'pizarra táctica',
  'partidos', 'jugadores', 'equipos', 'evaluaciones',
  'club', 'cuotas', 'documentos', 'avisos', 'configuración', 'panel admin',
];
const TEAM_ADMIN_ITEMS = [
  'dashboard', 'sesiones', 'planificación', 'ejercicios', 'pizarra táctica',
  'partidos', 'jugadores', 'equipos', 'evaluaciones', 'avisos',
];
const COACH_ITEMS = [
  'dashboard', 'sesiones', 'ejercicios', 'pizarra táctica',
  'partidos', 'jugadores', 'evaluaciones', 'avisos',
];
const FAMILY_ITEMS = ['mi portal', 'calendario', 'avisos'];

const ROLES = [
  { key: 'club_admin', email: ADMIN_EMAIL, pass: ADMIN_PASS, expectItems: CLUB_ADMIN_ITEMS, expectGroups: 6 },
  { key: 'team_admin', email: 'teamadmin.p1@baskettest.dev', pass: TEST_PASS, expectItems: TEAM_ADMIN_ITEMS, expectGroups: 5 },
  { key: 'coach', email: 'coach.p1@baskettest.dev', pass: TEST_PASS, expectItems: COACH_ITEMS, expectGroups: 5 },
  { key: 'family', email: 'family.p1@baskettest.dev', pass: TEST_PASS, expectItems: FAMILY_ITEMS, expectGroups: 0 },
];

async function login(page, email, pass) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(email);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
  await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(2500);
}

async function readSidebar(page) {
  return {
    groups: (await page.locator('.nav-group-label').allInnerTexts()).map(norm),
    items: (await page.locator('.nav .nav-item span:last-child').allInnerTexts()).map(norm),
  };
}

const results = {};
let failures = 0;

for (const role of ROLES) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const r = {};

  try {
    await login(page, role.email, role.pass);
    r.landedOn = new URL(page.url()).pathname;
    const sb = await readSidebar(page);
    r.groups = sb.groups.length;
    r.items = sb.items;

    // exact item match (order-insensitive)
    const missing = role.expectItems.filter(i => !sb.items.includes(i));
    const extra = sb.items.filter(i => !role.expectItems.includes(i));
    r.missing = missing;
    r.extra = extra;
    r.sidebarOk = missing.length === 0 && extra.length === 0 && sb.groups.length === role.expectGroups;

    if (role.key === 'family') {
      // /portal accessible, /finance bounced to dashboard, /calendar stays
      await page.goto(BASE + '/portal', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);
      r.portalOk = new URL(page.url()).pathname.startsWith('/portal');
      await page.goto(BASE + '/finance', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForURL(u => ['/dashboard', '/clubs'].includes(new URL(u).pathname), { timeout: 15000 })
        .catch(() => {});
      r.financeRedirectedToDashboard = ['/dashboard', '/clubs'].includes(new URL(page.url()).pathname);
      await page.goto(BASE + '/calendar', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1500);
      r.calendarStaysForFamily = new URL(page.url()).pathname === '/calendar';
      r.ok = r.sidebarOk && r.portalOk && r.financeRedirectedToDashboard && r.calendarStaysForFamily;
    } else {
      // guard bounces for non-admin roles
      await page.goto(BASE + '/configuration', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2500);
      r.configurationRedirectedToDashboard = new URL(page.url()).pathname === '/dashboard';
      await page.goto(BASE + '/finance', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(3000);
      r.financeRedirectedToDashboard = new URL(page.url()).pathname === '/dashboard';
      r.ok =
        r.sidebarOk &&
        (role.key === 'club_admin'
          ? true
          : r.configurationRedirectedToDashboard && r.financeRedirectedToDashboard);
    }
  } catch (e) {
    r.ok = false;
    r.error = String(e).slice(0, 200);
  }

  if (!r.ok) failures++;
  results[role.key] = r;
  await browser.close();
}

// UX-012 compat redirect: /exercises/tags -> /exercises?tab=tags (as admin)
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(BASE + '/exercises/tags', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
    const url = new URL(page.url());
    results.tagsRedirect = {
      pathname: url.pathname,
      tab: url.searchParams.get('tab'),
      tagsTabVisible: await page.locator('app-tags').first().isVisible().catch(() => false),
      ok:
        url.pathname === '/exercises' && url.searchParams.get('tab') === 'tags'
          ? true
          : false,
    };
    if (!results.tagsRedirect.ok) failures++;
  } catch (e) {
    results.tagsRedirect = { ok: false, error: String(e).slice(0, 200) };
    failures++;
  }
  await browser.close();
}

console.log('ROLES=' + JSON.stringify(results, null, 1));
console.log(failures === 0 ? 'ALL GREEN' : `FAILURES=${failures}`);
process.exit(failures === 0 ? 0 : 1);
