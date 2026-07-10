import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';

const BASE_URL = 'http://localhost:4200';
const OUTPUT_DIR = 'screenshots';
const PASSWORD = '123456';

const profiles = [
  {
    name: 'superadmin',
    email: 'superadmin@basketflow.com',
    label: 'Super Admin',
    pages: [
      { route: '/dashboard', name: 'dashboard' },
      { route: '/superadmin', name: 'panel-superadmin' },
      { route: '/superadmin/clubs', name: 'superadmin-clubs' },
      { route: '/superadmin/permissions', name: 'superadmin-permissions' },
      { route: '/teams', name: 'equipos' },
      { route: '/players', name: 'jugadores' },
      { route: '/exercises', name: 'ejercicios' },
      { route: '/sessions', name: 'sesiones' },
      { route: '/calendar', name: 'calendario' },
      { route: '/matches', name: 'partidos' },
      { route: '/planning', name: 'planificacion' },
    ],
  },
  {
    name: 'club_admin',
    email: 'club_admin@basketflow.com',
    label: 'Club Admin',
    pages: [
      { route: '/dashboard', name: 'dashboard' },
      { route: '/teams', name: 'equipos' },
      { route: '/players', name: 'jugadores' },
      { route: '/exercises', name: 'ejercicios' },
      { route: '/exercises/new', name: 'nuevo-ejercicio' },
      { route: '/sessions', name: 'sesiones' },
      { route: '/calendar', name: 'calendario' },
      { route: '/matches', name: 'partidos' },
      { route: '/documents', name: 'documentos' },
      { route: '/announcements', name: 'comunicacion' },
      { route: '/announcements/new', name: 'nuevo-anuncio' },
      { route: '/finance', name: 'finanzas' },
      { route: '/finance/fee-plans', name: 'planes-cuota' },
      { route: '/planning', name: 'planificacion' },
      { route: '/tactics', name: 'pizarra-tactica' },
      { route: '/configuration', name: 'configuracion' },
    ],
  },
  {
    name: 'coach',
    email: 'coach@basketflow.com',
    label: 'Coach',
    pages: [
      { route: '/dashboard', name: 'dashboard' },
      { route: '/players', name: 'jugadores' },
      { route: '/exercises', name: 'ejercicios' },
      { route: '/sessions', name: 'sesiones' },
      { route: '/sessions/new', name: 'nueva-sesion' },
      { route: '/calendar', name: 'calendario' },
      { route: '/matches', name: 'partidos' },
      { route: '/evaluations', name: 'evaluaciones' },
      { route: '/tactics', name: 'pizarra-tactica' },
      { route: '/planning', name: 'planificacion' },
    ],
  },
  {
    name: 'family',
    email: 'family@basketflow.com',
    label: 'Familia',
    pages: [
      { route: '/dashboard', name: 'dashboard' },
      { route: '/portal', name: 'portal-familia' },
      { route: '/calendar', name: 'calendario' },
      { route: '/announcements', name: 'comunicacion' },
    ],
  },
];

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
  });

  for (const profile of profiles) {
    console.log(`\n📸 Capturing screenshots for: ${profile.label}`);
    const page = await context.newPage();

    try {
      // Login
      console.log(`  🔑 Logging in as ${profile.email}...`);
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Fill login form
      await page.locator('input[placeholder="Correo electrónico"]').fill(profile.email);
      await page.locator('input[placeholder="Contraseña"]').fill(PASSWORD);
      await page.locator('button:has-text("Iniciar sesión")').click();
      await page.waitForTimeout(5000);

      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(async () => {
        console.log(`  ⚠️  No redirect to dashboard, current URL: ${page.url()}`);
        // Try re-navigating
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      });
      await page.waitForTimeout(3000);

      // Navigate to each page
      for (const { route, name } of profile.pages) {
        try {
          console.log(`  📄 ${route} → ${name}`);
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
          await page.waitForTimeout(3000);

          // Screenshot full page
          await page.screenshot({
            path: `${OUTPUT_DIR}/${profile.name}-${name}.png`,
            fullPage: true,
          });
        } catch (err) {
          console.log(`    ❌ Error: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`  ❌ Login error: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✅ All screenshots captured!');
}

capture().catch(console.error);
