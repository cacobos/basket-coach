import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4200';
const email = process.env.PB_EMAIL;
const pass = process.env.PB_PASS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
const badReqs = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));
page.on('response', r => { if (r.url().includes('/rest/v1/')) badReqs.push(r.status() + ' ' + decodeURIComponent(r.url().split('/rest/v1/')[1] || '').slice(0, 120)); });

await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(pass);
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
await page.waitForTimeout(2500);

await page.goto(BASE + '/announcements', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(4000);

const header = await page.locator('.page-header').innerHTML().catch(() => '(no header)');
console.log('HEADER=' + header.slice(0, 600));
console.log('URL=' + page.url());
console.log('OUTLET=' + JSON.stringify(await page.locator('main, .content, router-outlet + *, app-announcements-list').allInnerTexts()).slice(0, 800));
console.log('BTNS=' + JSON.stringify(await page.getByRole('link').allInnerTexts()));
console.log('ERRORS=' + JSON.stringify(errors.slice(0, 5)));
console.log('BADREQS=' + JSON.stringify(badReqs, null, 0));
await browser.close();
