import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));

  await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  const emailInput = page.locator('input[placeholder="Correo electrónico"]');
  const passInput = page.locator('input[placeholder="Contraseña"]');

  console.log('Email visible:', await emailInput.isVisible());
  console.log('Pass visible:', await passInput.isVisible());

  await emailInput.fill('club_admin@basketflow.com');
  await passInput.fill('1234');

  const btn = page.locator('button:has-text("Iniciar sesión")');
  console.log('Button visible:', await btn.isVisible());
  console.log('Button enabled:', await btn.isEnabled());

  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }).catch(e => console.log('Nav timeout:', e.message?.substring(0, 100))),
    btn.click(),
  ]);

  await page.waitForTimeout(3000);
  console.log('Final URL:', page.url());

  const errorMsg = await page.locator('.message').textContent().catch(() => 'none');
  console.log('Error message:', errorMsg);

  await page.screenshot({ path: 'screenshots/debug-login.png' });
  await browser.close();
})();
