import puppeteer from 'puppeteer';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: { width: 1440, height: 900 },
});
const [page] = await browser.pages();

page.on('pageerror', err => console.log('PAGE_ERR:', err.message));

console.log('1. Opening editor...');
await page.goto('https://www.drillsandplays.com/es/playbooks/10408-test/edit', {
  waitUntil: 'networkidle0',
  timeout: 30000,
});
await sleep(3000);

// Accept cookies if present
try {
  const [acceptCookies] = await page.$x('//button[contains(text(), "Aceptar todo")]');
  if (acceptCookies) {
    await acceptCookies.click();
    console.log('Cookies accepted');
    await sleep(1000);
  }
} catch(e) { console.log('No cookies dialog'); }

// Check what's visible
const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
console.log('\nPage text:', bodyText.replace(/\n/g, ' | '));

// Try clicking "Continuar con email" 
try {
  const [emailBtn] = await page.$x('//button[contains(text(), "email")]');
  if (emailBtn) {
    await emailBtn.click();
    console.log('\nClicked "Continuar con email"');
    await sleep(2000);
  } else {
    console.log('\nNo "Continuar con email" button found');
    // Try finding any login-related clickable
    const allClickable = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, [role=button]')).map(el => ({
        text: (el.textContent || '').trim().substring(0, 60),
        visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0,
        rect: {
          x: Math.round(el.getBoundingClientRect().x),
          y: Math.round(el.getBoundingClientRect().y),
          w: Math.round(el.getBoundingClientRect().w),
          h: Math.round(el.getBoundingClientRect().h),
        }
      })).filter(b => b.visible);
    });
    console.log('All visible clickable:', JSON.stringify(allClickable.slice(0, 30), null, 2));
  }
} catch(e) { console.log('Error clicking:', e.message); }

// After clicking email, try to find email/password fields
await sleep(1000);
const inputsAfter = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('input')).map(i => ({
    type: i.type,
    name: i.name,
    id: i.id,
    placeholder: i.placeholder,
    className: (i.className || '').substring(0, 40),
  }));
});
console.log('\nInputs after:', JSON.stringify(inputsAfter, null, 2));

// Fill credentials if inputs exist
const emailField = await page.$('input[type="email"], input[name="email"]');
if (emailField) {
  console.log('\nFilling credentials...');
  await emailField.click({ clickCount: 3 });
  await emailField.type('carlos.cobos.ex@gmail.com', { delay: 15 });
  
  const passField = await page.$('input[type="password"]');
  if (passField) {
    await passField.type('triple3', { delay: 15 });
  }
  
  // Find submit
  const [submit] = await page.$x('//button[contains(text(), "Iniciar") or contains(text(), "Continuar")]');
  if (submit) {
    await submit.click();
    console.log('Submitted login');
    await sleep(5000);
  }
}

// Check URL after login attempt
console.log('\nURL after:', page.url());

// If we're on editor, extract full UI
if (!page.url().includes('login')) {
  console.log('\nOn editor! Taking screenshots...');
  await sleep(3000);
  await page.screenshot({ path: 'dp-editor.png' });
  
  const ui = await page.evaluate(() => {
    const allEls = Array.from(document.body.querySelectorAll('*'));
    const visible = allEls.filter(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 5 && r.height > 5 && style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
    });
    
    // Find the main court area (largest positioned element)
    const areas = visible.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 400 && r.height > 200 && ['DIV', 'SECTION', 'MAIN', 'ASIDE', 'CANVAS', 'SVG'].includes(el.tagName);
    }).map(el => ({
      tag: el.tagName,
      id: el.id?.substring(0, 30),
      cls: (el.className || '').substring(0, 100),
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y),
      w: Math.round(el.getBoundingClientRect().w),
      h: Math.round(el.getBoundingClientRect().h),
      zIndex: getComputedStyle(el).zIndex,
      position: getComputedStyle(el).position,
    }));
    
    // Canvas elements
    const canvases = visible.filter(el => el.tagName === 'CANVAS').map(el => ({
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y),
      w: Math.round(el.getBoundingClientRect().w),
      h: Math.round(el.getBoundingClientRect().h),
    }));
    
    // Buttons
    const buttons = visible.filter(el => el.tagName === 'BUTTON').map(b => ({
      text: (b.textContent || '').trim().substring(0, 40),
      x: Math.round(b.getBoundingClientRect().x),
      y: Math.round(b.getBoundingClientRect().y),
      w: Math.round(b.getBoundingClientRect().w),
      h: Math.round(b.getBoundingClientRect().h),
    }));
    
    return { areas, canvases, buttons };
  });
  
  console.log('\n=== MAIN AREAS ===');
  ui.areas.sort((a, b) => a.y - b.y || a.x - b.x);
  ui.areas.forEach(a => console.log(`  [${a.x},${a.y} ${a.w}x${a.h}] <${a.tag}> ${a.id || a.cls?.substring(0, 50)} pos:${a.position} z:${a.zIndex}`));
  
  console.log('\n=== CANVASES ===');
  ui.canvases.forEach(c => console.log(`  [${c.x},${c.y} ${c.w}x${c.h}]`));
  
  console.log('\n=== BUTTONS ===');
  ui.buttons.sort((a, b) => a.y - b.y || a.x - b.x);
  ui.buttons.forEach(b => console.log(`  [${b.x},${b.y} ${b.w}x${b.h}] "${b.text}"`));
  
  await page.screenshot({ path: 'dp-editor-full.png', fullPage: true });
  console.log('\nFull page screenshot saved');
}

console.log('\nDone!');
// Keep browser open for manual inspection
await sleep(120000);
await browser.close();
