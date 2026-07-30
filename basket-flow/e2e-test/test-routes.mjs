import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
await page.fill('input[type="email"]', 'carlos.cobos.ex@gmail.com');
await page.fill('input[type="password"]', 'triple3');
await page.click('button:has-text("Iniciar")');
await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);
console.log('Start URL:', page.url());

const tests = ['/matches', '/tactics', '/planning', '/evaluations', '/documents', '/finance', '/portal', '/configuration', '/sessions', '/players'];
for (const p of tests) {
  await page.goto('http://localhost:4200' + p, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(3000);
  console.log(p, '->', page.url());
}
await browser.close();
