import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.PB_BASE || 'http://localhost:4200';
const email = process.env.PB_EMAIL;
const pass = process.env.PB_PASS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = {};

// --- LOGIN: wrong password feedback probe
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill('contrasena-erronea-123');
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForTimeout(4000);
out.wrongPass = {
  url: page.url(),
  bodyText: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1200),
};

// --- LOGIN: correct
await page.locator('input[type="password"]').first().fill(pass);
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
await page.waitForTimeout(3000);

// --- DASHBOARD content probe
out.dashboard = {
  url: page.url(),
  mainText: (await page.locator('main').innerText().catch(() => '')).slice(0, 1500),
};

// --- MATCHES probe
await page.goto(BASE + '/matches', { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);
out.matches = {
  url: page.url(),
  mainText: (await page.locator('main').innerText().catch(() => '')).slice(0, 1200),
};

// --- FINANCE probe
await page.goto(BASE + '/finance', { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);
out.finance = {
  url: page.url(),
  mainText: (await page.locator('main').innerText().catch(() => '')).slice(0, 1200),
};

// --- SESSIONS probe (empty state check)
await page.goto(BASE + '/sessions', { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2000);
out.sessions = {
  url: page.url(),
  mainText: (await page.locator('main').innerText().catch(() => '')).slice(0, 800),
};

fs.writeFileSync('../docs/ux-pipeline/baseline/evidencia/dom-probe.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
await browser.close();
