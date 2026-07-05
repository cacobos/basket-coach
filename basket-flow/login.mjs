import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
await page.locator('input[type="email"]').fill('carlos.cobos.ex@gmail.com');
await page.locator('input[type="password"]').fill('triple3');
await page.locator('button.btn-primary').click();
await page.waitForURL('**/dashboard', { timeout: 10000 });
await context.storageState({ path: 'playwright-auth-state.json' });
console.log('✅ Sesión guardada');
await browser.close();
