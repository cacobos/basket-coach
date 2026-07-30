import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('app loads and shows login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/basket/i);
  });

  test('upgrade page is accessible without auth', async ({ page }) => {
    await page.goto('/upgrade');
    await expect(page.locator('body')).toBeVisible();
  });

  test('non-authenticated user redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
