import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text().substring(0, 1000)); });
page.on('response', r => { if (r.status() >= 400) errs.push('HTTP '+r.status()+': '+r.url().substring(0,200)); });

await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
await page.fill('input[type="email"]', 'carlos.cobos.ex@gmail.com');
await page.fill('input[type="password"]', 'triple3');
await page.click('button:has-text("Iniciar")');
await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);

console.log('=== DASHBOARD URL:', page.url());

await page.goto('http://localhost:4200/sessions', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(8000);

const text = await page.locator('body').innerText();
console.log('=== FULL PAGE TEXT ===');
console.log(text);
console.log('\n=== ERRORS ===');
errs.forEach(e => console.log(e));
if (errs.length === 0) console.log('(none)');
await browser.close();
