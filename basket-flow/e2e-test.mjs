import { chromium, BrowserContext } from 'playwright';

const BASE_URL = 'http://localhost:4200';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  const errors: string[] = [];

  context.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  context.on('pageerror', (err) => {
    errors.push(`[PAGE ERROR] ${err.message}`);
  });

  context.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  const page = await context.newPage();

  // 1. Login page
  console.log('\n=== 1. Login Page ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e-screenshots/login.png' });
  console.log(`Title: ${await page.title()}`);

  // 2. Try app root (should redirect to login)
  console.log('\n=== 2. App Root (redirect) ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e-screenshots/root.png' });
  console.log(`Current URL: ${page.url()}`);

  // 3. Check public routes
  console.log('\n=== 3. Check Various Routes ===');
  const routes = ['/login', '/register', '/tactics', '/whiteboard', '/exercises', '/sessions', '/calendar', '/teams', '/players', '/dashboard'];
  for (const route of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const url = page.url();
    console.log(`${route} -> ${url}`);
  }

  // 4. Check Auth UI elements on login page
  console.log('\n=== 4. Login Page Elements ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const buttons = await page.locator('button, a').all();
  console.log(`Buttons/links found: ${buttons.length}`);
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text?.trim()) console.log(`  - "${text.trim()}"`);
  }

  // 5. Check for missing assets
  console.log('\n=== 5. Asset Loading Check ===');
  const assetErrors = errors.filter(e => e.includes('[HTTP') && (e.includes('.js') || e.includes('.css') || e.includes('.png') || e.includes('.svg')));
  if (assetErrors.length) {
    console.log('Asset errors:');
    assetErrors.forEach(e => console.log(`  ${e}`));
  } else {
    console.log('No asset loading errors detected');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  if (errors.length === 0) {
    console.log('✅ No errors detected');
  } else {
    console.log(`❌ ${errors.length} errors detected:`);
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  await browser.close();
}

run().catch(console.error);
