const { chromium } = require('playwright');

const BASE = 'http://localhost:4200';
const EMAIL = 'carlos.cobos.ex@gmail.com';
const PASS = 'test1234';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));

  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button:has-text("Iniciar sesión")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Go to session builder
  await page.goto(`${BASE}/session-builder`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const html = await page.evaluate(() => document.querySelector('app-session-builder')?.outerHTML || 'NOT FOUND');
  console.log(`Page content (first 1500 chars):`);
  console.log(html.substring(0, 1500));

  // Check key elements
  const title = await page.locator('.page-title').isVisible();
  const sections = await page.locator('.section-card').count();
  const exercises = await page.locator('.ex-empty').count();
  const saveBtn = await page.locator('button:has-text("Guardar Sesión")').isVisible();
  const cancelBtn = await page.locator('button:has-text("Cancelar")').isVisible();
  const addSectionBtn = await page.locator('button:has-text("Añadir Sección")').isVisible();

  console.log(`\nChecks:
  title: ${title}
  sections: ${sections}
  empty states: ${exercises}
  save btn: ${saveBtn}
  cancel btn: ${cancelBtn}
  add section btn: ${addSectionBtn}`);

  await page.screenshot({ path: 'e2e-screenshots/session-builder.png' });
  await browser.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
