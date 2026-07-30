import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text().substring(0, 300)); });
page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), ':', r.url().substring(0, 200)); });

// Login
await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
await page.fill('input[type="email"]', 'carlos.cobos.ex@gmail.com');
await page.fill('input[type="password"]', 'triple3');
await page.click('button:has-text("Iniciar")');
await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);

// Visit pages that showed 1568 chars (suspicious)
const suspicious = ['/matches', '/tactics', '/planning', '/evaluations', '/documents', '/finance', '/portal', '/configuration'];
for (const path of suspicious) {
  await page.goto(`http://localhost:4200${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(6000);
  const text = await page.locator('body').innerText();
  console.log(`\n=== ${path} (${text.length} chars) ===`);
  // Show just the middle/main content area, skip sidebar
  const lines = text.split('\n').filter(l => !['BasketFlow', 'calendar_month', 'settings', 'dashboard', 'groups', 'face', 'sports_basketball', 'fitness_center', 'calendar_month', 'playlist_add', 'timeline', 'calendar_view_month', 'draw', 'fact_check', 'description', 'campaign', 'payments', 'admin_panel_settings', 'logout', 'c', 'carlos.cobos.ex@gmail.com', 'CB Plasencia Ambroz', 'Mejorar plan', 'Club', 'Dashboard', 'Equipos', 'Jugadores', 'Partidos', 'Ejercicios', 'Sesiones', 'Crear Sesión', 'Planificación', 'Calendario', 'Pizarra', 'Evaluar', 'Documentos', 'Comunicación', 'Finanzas', 'Configuración', 'Admin', '2025-2026', '2026-2027'].includes(l.trim()));
  console.log(lines.join('\n').substring(0, 1000));
}

// Also check PlayerDetail with a real player ID
// First find a real player
await page.goto('http://localhost:4200/players', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(5000);
const body = await page.locator('body').innerText();
console.log('\n=== PLAYERS PAGE CONTENT ===');
console.log(body.substring(0, 2000));

await browser.close();
