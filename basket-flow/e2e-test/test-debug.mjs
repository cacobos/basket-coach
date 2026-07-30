import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('response', r => {
  if (r.status() >= 400) console.log('ERR RESP:', r.status(), r.url().substring(0, 250));
});

// Login
await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
await page.fill('input[type="email"]', 'carlos.cobos.ex@gmail.com');
await page.fill('input[type="password"]', 'triple3');
await page.click('button:has-text("Iniciar")');
await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(5000);

// Navigate to matches
console.log('Navigating to /matches...');
await page.goto('http://localhost:4200/matches', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(5000);
console.log('Final URL:', page.url());

// Try clicking the sidebar link instead of navigating directly
console.log('\nTrying sidebar click...');
await page.goto('http://localhost:4200/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(3000);

// Find and click "Partidos" in sidebar
const links = page.locator('a, button, [role="button"]');
const count = await links.count();
for (let i = 0; i < count; i++) {
  try {
    const text = await links.nth(i).textContent();
    if (text && text.trim() === 'Partidos') {
      console.log('Found Partidos link at index', i);
      await links.nth(i).click();
      await page.waitForTimeout(5000);
      console.log('URL after click:', page.url());
      break;
    }
  } catch {}
}

await browser.close();
