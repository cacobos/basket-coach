import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log('HTTP ERROR:', resp.status(), resp.url().substring(0, 120));
    }
  });

  await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  await page.locator('input[placeholder="Correo electrónico"]').fill('club_admin@basketflow.com');
  await page.locator('input[placeholder="Contraseña"]').fill('1234');
  await page.locator('button:has-text("Iniciar sesión")').click();

  await page.waitForTimeout(5000);
  console.log('Final URL:', page.url());

  const errorMsg = await page.locator('.message').textContent().catch(() => '(none)');
  console.log('Error message on page:', errorMsg);

  // Get page text content
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
  console.log('Page body text:', bodyText);

  await page.screenshot({ path: 'screenshots/debug-login2.png' });
  await browser.close();
})();
