import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const results = [];
let allErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') allErrors.push({ page: page.url(), type: 'console.error', text: msg.text().substring(0, 500) });
});
page.on('pageerror', err => allErrors.push({ page: page.url(), type: 'unhandled', text: err.message.substring(0, 500) }));
page.on('response', r => {
  if (r.status() >= 400) allErrors.push({ page: page.url(), type: `HTTP ${r.status()}`, url: r.url().substring(0, 200) });
});

async function visit(path, label, waitMs = 7000) {
  allErrors = [];
  await page.goto(`http://localhost:4200${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(waitMs);
  const text = await page.locator('body').innerText();
  const title = await page.title();
  const screenshots = [];
  const pageErrors = [...allErrors];
  results.push({ label, path, url: page.url(), textLength: text.length, hasContent: text.length > 100, title, errors: pageErrors, text: text.substring(0, 2000) });
  // Screenshot
  await page.screenshot({ path: `e2e-test/screen_${label.replace(/[^a-z0-9]/gi, '_')}.png`, fullPage: true });
}

// Login
await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle', timeout: 20000 });
await page.fill('input[type="email"]', 'carlos.cobos.ex@gmail.com');
await page.fill('input[type="password"]', 'triple3');
await page.click('button:has-text("Iniciar")');
await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);

// Visit all pages
const pages = [
  ['/dashboard', 'Dashboard'],
  ['/sessions', 'Sessions'],
  ['/calendar', 'Calendar'],
  ['/players', 'Players'],
  ['/players/8e4b9bfc-95dc-4c37-a7e4-e198559173a0', 'PlayerDetail'],
  ['/teams', 'Teams'],
  ['/exercises', 'Exercises'],
  ['/exercises/new', 'ExerciseNew'],
  ['/matches', 'Matches'],
  ['/tactics', 'Tactics'],
  ['/planning', 'Planning'],
  ['/evaluations', 'Evaluations'],
  ['/documents', 'Documents'],
  ['/announcements', 'Announcements'],
  ['/finance', 'Finance'],
  ['/configuration', 'Configuration'],
  ['/portal', 'Portal'],
];

for (const [path, label] of pages) {
  await visit(path, label);
}

// Print results
console.log('\n=== PAGE TEST RESULTS ===\n');
let hasIssues = false;
for (const r of results) {
  const status = r.errors.length === 0 ? '✅' : '❌';
  if (r.errors.length > 0) hasIssues = true;
  console.log(`${status} ${r.label.padEnd(20)} ${r.textLength.toString().padStart(5)} chars  ${r.errors.length > 0 ? r.errors.length + ' error(s)' : 'ok'}`);
  if (r.errors.length > 0) {
    r.errors.forEach(e => {
      const msg = e.text || e.url || '';
      console.log(`       ${e.type}: ${msg.substring(0, 200)}`);
    });
  }
}

console.log(`\n${hasIssues ? '❌ Some pages have errors' : '✅ All pages clean'}`);

// Fix for non-existent player ID - check actual player
console.log('\n=== PLAYER PAGE: checking existing player IDs...');
const { data: players } = await (await import('@supabase/supabase-js')).createClient(
  'https://ttythziuthbrfopzxtvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eXRoeml1dGhicmZvcHp4dHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMjk0NjgsImV4cCI6MjA1MjYwNTQ2OH0.LS5c2r01ldH-Nt6zFoY_W8L4N_nI7fFAt6z4SrxzMV8'
).from('players').select('id, first_name, last_name').eq('club_id', '10c90cbe-a742-4bc2-acba-c0154917b2d7').limit(5);
console.log('Available players:', JSON.stringify(players));

await browser.close();
