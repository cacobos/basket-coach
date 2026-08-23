import { chromium } from '@playwright/test';

const BASE = process.env.PB_BASE || 'http://localhost:4200';
const email = process.env.PB_EMAIL;
const pass = process.env.PB_PASS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('token')) logs.push(`[NET ${r.status()}] ${r.url().slice(0, 140)}`); });

await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(pass);
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
await page.waitForTimeout(4000);

const out_ = {
  url: page.url(),
  hasSession: await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k => k.includes('sb-'));
    return keys.map(k => ({ k, hasToken: !!localStorage.getItem(k) }));
  }),
};
console.log(JSON.stringify(out_, null, 1));
console.log('POST-LOGIN LOGS:\n' + logs.slice(0, 30).join('\n'));

// NG0956 full text on tactics
logs.length = 0;
await page.goto(BASE + '/tactics', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(4000);
console.log('TACTICS LOGS:\n' + logs.filter(l => l.includes('NG0956') || l.startsWith('[error]')).slice(0, 10).join('\n'));
await browser.close();
