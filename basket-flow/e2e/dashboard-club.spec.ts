import { test, expect, Page } from '@playwright/test';

const BASE = 'https://planbasket.netlify.app';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Correo electrónico').fill('carlos.cobos.ex@gmail.com');
  await page.getByPlaceholder('Contraseña').fill('triple3');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('**/dashboard', { timeout: 25_000 });
}

test('dashboard loads club data after auth (prod)', async ({ page }) => {
  const logs: string[] = [];
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

  await login(page);

  // El dashboard no debe quedarse cargando: debe llegar a mostrar Coach Insights
  await expect(page.getByText('Coach Insights', { exact: true })).toBeVisible({ timeout: 20_000 });

  // El club debe aparecer en la cabecera/sidebar
  await expect(page.locator('.club-label')).toContainText('CB Plasencia', { timeout: 10_000 });

  console.log('Club label:', await page.locator('.club-label').textContent());

  if (logs.length) {
    console.log('PAGE ERRORS:\n' + logs.join('\n'));
    test.fail();
  }
});
