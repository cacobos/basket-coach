import { test, expect, Page } from '@playwright/test';

const BASE = 'https://planbasket.netlify.app';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Correo electrónico').fill('carlos.cobos.ex@gmail.com');
  await page.getByPlaceholder('Contraseña').fill('triple3');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('**/dashboard', { timeout: 25_000 });
}

test('builder exercise picker classifies exercises (prod)', async ({ page }) => {
  const logs: string[] = [];
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

  // capturar respuestas de tags (clasificación por tags del club)
  page.on('response', async (resp) => {
    const u = resp.url();
    if (u.includes('/tags')) {
      try {
        const body = await resp.json();
        const arr = Array.isArray(body) ? body : (body && (body as any).data);
        logs.push(`[tags ${resp.status()}] count=${Array.isArray(arr) ? arr.length : 'n/a'}`);
      } catch (e) {
        logs.push(`[tags ${resp.status()}] non-json`);
      }
    }
  });

  await login(page);

  await page.goto(`${BASE}/sessions/99704cb0-99ef-4255-b7a6-e41c996aff0e/builder`);
  const addBtn = page.locator('.btn-add-ex-toggle').first();
  await expect(addBtn).toBeVisible({ timeout: 20_000 });

  await addBtn.click();
  const modal = page.locator('.ex-picker');
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);

  console.log('### RESPONSES/LOGS ###');
  logs.forEach((l) => console.log(l));

  // chips de tag (el club tiene 15 tags → debe aparecer el grupo de chips)
  const catChips = modal.locator('.ex-cat-chip');
  const catCount = await catChips.count();
  console.log('n chips de tag:', catCount);
  expect(catCount).toBeGreaterThan(1);

  // chips de dificultad (siempre 4: Todas/Básico/Intermedio/Avanzado)
  const diffChips = modal.locator('.ex-diff-chip');
  console.log('n dificultades:', await diffChips.count());
  expect(await diffChips.count()).toBe(4);

  // clasificación por tags visible SIN filtro: hay al menos 1 grupo con cabecera
  let groupHeads = modal.locator('.ex-picker-group-head');
  const groupCountNoFilter = await groupHeads.count();
  console.log('n grupos sin filtro:', groupCountNoFilter);
  expect(groupCountNoFilter).toBeGreaterThan(0);

  // filtro por dificultad (fiable): intermedio → hay items o grupo
  await modal.locator('.ex-diff-chip', { hasText: 'Intermedio' }).click();
  await page.waitForTimeout(400);
  const itemsInter = await modal.locator('.ex-picker-item').count();
  console.log('n items (Intermedio):', itemsInter);

  // limpiar filtros
  const clearBtn = modal.locator('.ex-picker-clear');
  if (await clearBtn.count()) await clearBtn.click();
  await page.waitForTimeout(300);

  // volver a agrupar sin filtro
  groupHeads = modal.locator('.ex-picker-group-head');
  const groupCount = await groupHeads.count();
  console.log('n grupos tras limpiar:', groupCount);

  const items = await modal.locator('.ex-picker-item').count();
  console.log('n items en listado:', items);

  console.log('### PAGEERRORS ###');
  logs.forEach((l) => console.log(l));
  expect(logs.filter((l) => l.startsWith('[pageerror]'))).toEqual([]);

  await page.screenshot({ path: 'test-results/picker-classified-prod.png' });
});
