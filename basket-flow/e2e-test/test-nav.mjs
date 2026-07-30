import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('response', r => {
  if (r.status() >= 400) console.log('HTTP ERR:', r.status(), r.url().substring(0, 200));
});

await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
await page.fill('input[type="email"]', 'carlos.cobos.ex@gmail.com');
await page.fill('input[type="password"]', 'triple3');
await page.click('button:has-text("Iniciar")');
await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(5000);

// Try navigating slowly with SPA navigation (click sidebar link)
// First, check what links are in the sidebar
const sidebarLinks = await page.evaluate(() => {
  const links = document.querySelectorAll('a');
  return Array.from(links).map(l => ({ href: l.getAttribute('href'), text: l.textContent.trim() }));
});
console.log('Sidebar links:');
sidebarLinks.forEach(l => console.log('  ', l.href, '-', l.text));

// Try clicking the "Partidos" link
const partidosLink = sidebarLinks.find(l => l.text === 'Partidos' || l.href === '/matches');
if (partidosLink) {
  console.log('\nClicking Partidos link:', partidosLink.href);
  await page.evaluate((href) => {
    const link = document.querySelector(`a[href="${href}"]`);
    if (link) link.click();
  }, partidosLink.href);
  await page.waitForTimeout(5000);
  console.log('URL after click:', page.url());
}

// Also try exercises link
const exercisesLink = sidebarLinks.find(l => l.text === 'Ejercicios');
if (exercisesLink) {
  console.log('\nClicking Ejercicios link:', exercisesLink.href);
  await page.evaluate((href) => {
    const link = document.querySelector(`a[href="${href}"]`);
    if (link) link.click();
  }, exercisesLink.href);
  await page.waitForTimeout(5000);
  console.log('URL after click:', page.url());
}

await browser.close();
