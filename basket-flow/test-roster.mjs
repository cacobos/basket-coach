import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ storageState: 'playwright-auth-state.json' });
const page = await context.newPage();

// Listen for console errors
page.on('console', msg => {
  if (msg.type() === 'error') console.log('🧨 ERROR:', msg.text());
});

// Go to teams
await page.goto('http://localhost:4200/teams', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('URL:', page.url());

// Click on the first team card's "ABRIR ROSTER"
const rosterLinks = page.locator('.card-action');
const count = await rosterLinks.count();
console.log(`"ABRIR ROSTER" links encontrados: ${count}`);

if (count > 0) {
  // Click on the text "ABRIR ROSTER" (or the card itself since both trigger openPlayers)
  await rosterLinks.first().click();
  await page.waitForTimeout(2000);
  
  console.log('URL después de click:', page.url());
  
  // Check what's on the players page
  const pageText = await page.textContent('body');
  console.log('¿Filtro de equipo presente?', pageText.includes('Todos los equipos'));
  
  // Check if the select shows a specific team
  const teamSelect = page.locator('.select-input').first();
  const selectedValue = await teamSelect.inputValue();
  console.log(`Valor del select de equipo: "${selectedValue}"`);
  
  const selectedText = await teamSelect.locator('option:checked').textContent().catch(() => 'N/A');
  console.log(`Texto seleccionado: "${selectedText}"`);
  
  await page.screenshot({ path: 'roster-result.png' });
  console.log('📸 roster-result.png');
}

await new Promise(r => setTimeout(r, 5000));
await browser.close();
