const { chromium } = require('playwright');
const { join } = require('path');

const BASE = 'http://localhost:4200';
const EMAIL = 'carlos.cobos.ex@gmail.com';
const PASSWORD = 'triple3';
const OUT = join(__dirname, 'test-screenshots');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.locator('input[placeholder="Correo electrónico"]').fill(EMAIL);
  await page.locator('input[placeholder="Contraseña"]').fill(PASSWORD);
  await page.locator('button:has-text("Iniciar sesión")').click();
  await page.waitForTimeout(5000);
  if (page.url().includes('login')) throw new Error('Login failed');
  console.log('  ✓ Logged in');
}

async function explorePage(page, url, name) {
  console.log(`\n--- ${name} ---`);
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, name.replace(/\s+/g, '_') + '.png') });
  
  // Log what's on the page
  const info = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean);
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => {
      const label = i.previousElementSibling?.textContent?.trim() || i.placeholder || '';
      return { type: i.tagName, name: i.getAttribute('name') || '', placeholder: i.placeholder || '', label };
    });
    const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim()).filter(Boolean);
    return { chars: text.length, text: text.substring(0, 300), buttons: buttons.slice(0, 15), inputs: inputs.slice(0, 10), links: links.slice(0, 10) };
  });
  console.log(`  Text: ${info.chars} chars`);
  if (info.buttons.length) console.log(`  Buttons: ${info.buttons.slice(0, 8).join(', ')}`);
  if (info.links.length) console.log(`  Links: ${info.links.slice(0, 5).join(', ')}`);
  return info;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => console.log('  ! PAGE ERROR:', e.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) console.log('  ! CONSOLE ERROR:', msg.text().substring(0, 200));
  });

  await login(page);

  // 1. Explore dashboard
  await explorePage(page, '/dashboard', 'Dashboard');
  
  // 2. TEAMS - create a team
  console.log('\n--- TEAMS ---');
  await page.goto(BASE + '/teams', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, 'teams_initial.png') });
  
  // Check existing teams
  const teamsText = await page.evaluate(() => document.body?.innerText || '');
  console.log(`  Existing teams data present: ${teamsText.includes('Equipo') || teamsText.includes('team')}`);
  
  // Try to create a new team if there's a create button
  const createBtn = page.locator('button:has-text("Nuevo"), button:has-text("Crear"), button:has-text("Añadir")').first();
  if (await createBtn.isVisible().catch(() => false)) {
    console.log('  Found create button:', await createBtn.textContent());
  }

  // 3. PLAYERS - create a player
  console.log('\n--- PLAYERS ---');
  await page.goto(BASE + '/players', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, 'players_initial.png') });
  
  // Check if players exist / create form works
  const playersText = await page.evaluate(() => document.body?.innerText || '');
  console.log(`  Page text starts with: ${playersText.substring(0, 200)}`);

  // Click "Nuevo Jugador" if visible
  const newPlayerBtn = page.locator('button:has-text("Nuevo Jugador")');
  if (await newPlayerBtn.isVisible().catch(() => false)) {
    await newPlayerBtn.click();
    await page.waitForTimeout(500);
    
    // Fill form
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`  Inputs visible: ${inputCount}`);
    
    // Try filling the form
    if (inputCount >= 2) {
      await inputs.nth(0).fill('Ana');
      await inputs.nth(1).fill('García');
      console.log('  Filled name fields');
      await page.screenshot({ path: join(OUT, 'player_form_filled.png') });
      
      // Click save
      const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Crear")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        console.log('  Submitted player');
        await page.screenshot({ path: join(OUT, 'player_created.png') });
      }
    }
  }

  // 4. EXERCISES - explore
  console.log('\n--- EXERCISES ---');
  await explorePage(page, '/exercises', 'Exercises');
  
  // 5. SESSIONS
  console.log('\n--- SESSIONS ---');
  await explorePage(page, '/sessions', 'Sessions');
  
  // 6. MATCHES
  console.log('\n--- MATCHES ---');
  await explorePage(page, '/matches', 'Matches');
  
  // 7. MATCH NEW - try creating a match
  console.log('\n--- MATCH NEW ---');
  await page.goto(BASE + '/matches/new', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, 'match_new.png') });
  
  // Check what's on the match form
  const matchForm = await page.evaluate(() => {
    const allText = document.body?.innerText || '';
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean);
    const inputs = Array.from(document.querySelectorAll('input, select')).map(i => ({ 
      tag: i.tagName, 
      type: i.getAttribute('type') || '', 
      placeholder: i.placeholder || '',
      value: i.value || '',
    }));
    return { text: allText.substring(0, 500), buttons: btns.slice(0, 20), inputs: inputs.slice(0, 10) };
  });
  console.log(`  Text: ${matchForm.text.substring(0, 300)}`);
  console.log(`  Buttons: ${matchForm.buttons.join(', ')}`);
  if (matchForm.inputs.length) console.log(`  Inputs: ${JSON.stringify(matchForm.inputs)}`);

  // 8. CALENDAR
  console.log('\n--- CALENDAR ---');
  await explorePage(page, '/calendar', 'Calendar');
  
  // 9. TACTICS
  console.log('\n--- TACTICS ---');
  await explorePage(page, '/tactics', 'Tactics');
  
  // 10. EVALUATIONS
  console.log('\n--- EVALUATIONS ---');
  await explorePage(page, '/evaluations', 'Evaluations');
  
  // 11. CONFIGURATION
  console.log('\n--- CONFIGURATION ---');
  await explorePage(page, '/configuration', 'Configuration');

  // 12. SUPERADMIN
  console.log('\n--- SUPERADMIN ---');
  await explorePage(page, '/superadmin', 'Superadmin');
  
  // 13. PLANNING
  console.log('\n--- PLANNING ---');
  await explorePage(page, '/planning', 'Planning');

  await browser.close();
  console.log('\n=== ALL EXPLORATION COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
