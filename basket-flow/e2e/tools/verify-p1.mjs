import { chromium } from '@playwright/test';

const BASE = process.env.PB_BASE || 'http://localhost:4200';
const email = process.env.PB_EMAIL;
const pass = process.env.PB_PASS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = {};

// login
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(pass);
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
await page.waitForTimeout(2500);

// UX-007: exercises categories inline management
await page.goto(BASE + '/exercises', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
out.catChipsRowVisible = await page.locator('.cat-row').isVisible().catch(() => false);
out.catChipCount = await page.locator('.cat-chip').count();
out.catManageBtn = await page.locator('.cat-manage').isVisible().catch(() => false);
if (out.catManageBtn) {
  await page.locator('.cat-manage').click();
  await page.waitForTimeout(500);
  out.catDialogOpen = await page.locator('.modal-card h3').first().isVisible().catch(() => false);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// UX-010: finance overdue block
await page.goto(BASE + '/finance', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
out.overdueBlockVisible = await page.locator('.overdue-block').isVisible().catch(() => false);
out.allClearVisible = await page.locator('.all-clear').isVisible().catch(() => false);
out.overdueRows = await page.locator('.table.clickable tbody tr').count();

// UX-011: announcements manage button for club_admin
await page.goto(BASE + '/announcements', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
out.newAnnouncementBtnForAdmin = await page.getByRole('link', { name: /nuevo aviso/i }).count();

// UX-008: shared empty states render when lists are empty
await page.goto(BASE + '/sessions', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
out.sessionsEmptyStateCount = await page.locator('app-empty-state').count();

console.log('P1=' + JSON.stringify(out, null, 1));
await browser.close();
