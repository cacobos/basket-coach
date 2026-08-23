import { chromium } from '@playwright/test';

const BASE = process.env.PB_BASE || 'http://localhost:4200';
const email = process.env.PB_EMAIL;
const pass = process.env.PB_PASS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const ngWarnings = [];
page.on('console', m => {
  if (m.type() === 'warning' && m.text().includes('NG0956')) ngWarnings.push(m.text().slice(0, 120));
});
const out = {};

// login
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(pass);
await page.getByRole('button').filter({ hasText: /iniciar/i }).first().click();
await page.waitForURL(u => !String(u).includes('/login'), { timeout: 20000 });
await page.waitForTimeout(2500);

// UX-001 + UX-003
out.groupLabels = await page.locator('.nav-group-label').allInnerTexts();
out.navItems = await page.locator('.nav .nav-item span:last-child').allInnerTexts();
out.hasCrearSesionItem = out.navItems.some(t => t.trim() === 'Crear Sesión');
out.userNameChip = await page.locator('.user-name').innerText().catch(() => '(no)');
out.userEmailCount = await page.locator('.user-email').count();
out.greeting = await page.locator('.greeting-sub').innerText().catch(() => '(no)');

// UX-002: calendar redirect
await page.goto(BASE + '/calendar', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
out.calendarRedirectUrl = page.url();
out.embeddedCalendarVisible = await page.locator('app-sessions app-calendar .calendar-grid').isVisible().catch(() => false);
// toggle back to list
await page.getByRole('tab', { name: 'Lista' }).click().catch(e => { out.toggleErr = String(e).slice(0, 80); });
await page.waitForTimeout(800);
out.listVisibleAfterToggle = await page.locator('.session-list').isVisible().catch(() => false);

// UX-005: tactics warnings
ngWarnings.length = 0;
await page.goto(BASE + '/tactics', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(4000);
out.tacticsNG0956 = ngWarnings.length;

console.log('P0=' + JSON.stringify(out, null, 1));
await browser.close();
