import { chromium } from '@playwright/test';

const BASE = process.env.PB_BASE || 'http://localhost:4200';
const email = process.env.PB_EMAIL;
const pass = process.env.PB_PASS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const badResponses = [];
page.on('response', r => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url().slice(0, 160)}`); });
const out = {};

// 1. wrong password shows friendly message
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill('contrasena-erronea-123');
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForTimeout(3500);
out.loginErrorMessage = await page.locator('.message').innerText().catch(() => '(no aparece)');

// 2. login correct + root redirect
await page.locator('input[type="password"]').first().fill(pass);
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
await page.waitForTimeout(1500);
out.afterLoginUrl = page.url();

badResponses.length = 0;
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1800);
out.rootLandsOn = page.url();

// 3. matches without 400
badResponses.length = 0;
await page.goto(BASE + '/matches', { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);
out.matchesBadResponses = [...badResponses];
out.matchesEmptyState = (await page.locator('main').innerText().catch(() => '')).includes('No hay partidos');

// 4. finance without 404
badResponses.length = 0;
await page.goto(BASE + '/finance', { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);
out.financeBadResponses = [...badResponses];

console.log('VERIFY=' + JSON.stringify(out, null, 1));
await page.screenshot({ path: '../docs/ux-pipeline/baseline/evidencia/fix-login-error-visible.png' });
await browser.close();
