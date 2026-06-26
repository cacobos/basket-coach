import puppeteer from 'puppeteer';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  defaultViewport: { width: 1440, height: 900 },
});
const [page] = await browser.pages();

page.on('pageerror', err => console.log('PAGE_ERR:', err.message));

// Go to editor URL directly
console.log('1. Opening editor...');
await page.goto('https://www.drillsandplays.com/es/playbooks/10408-test/edit', {
  waitUntil: 'networkidle0',
  timeout: 30000,
});
await sleep(3000);
await page.screenshot({ path: 'dp-initial.png' });

const url = page.url();
console.log('   Current URL:', url);
const title = await page.title();
console.log('   Title:', title);

if (url.includes('login') || url.includes('auth')) {
  console.log('\n2. Login page detected, looking for form...');
  
  // Find auth buttons/options
  const authOptions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a')).filter(el => {
      const t = (el.textContent || '').toLowerCase();
      return t.includes('google') || t.includes('email') || t.includes('inicia') || t.includes('login');
    }).map(b => ({
      text: (b.textContent || '').trim().substring(0, 80),
      tag: b.tagName,
      classes: (b.className || '').substring(0, 60),
    }));
  });
  console.log('   Auth options:', JSON.stringify(authOptions, null, 2));
  
  // Click "Continue with email" button
  const emailOption = authOptions.find(o => o.text.toLowerCase().includes('email'));
  if (emailOption) {
    console.log('3. Clicking email option...');
    const [btn] = await page.$x(`//button[contains(text(), '${emailOption.text.substring(0, 30)}')]`);
    if (btn) {
      await btn.click();
      await sleep(2000);
      await page.screenshot({ path: 'dp-email-form.png' });
    }
  }
  
  // Now find inputs
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, autocomplete: i.autocomplete
    }));
  });
  console.log('   Inputs:', JSON.stringify(inputs, null, 2));
  
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  if (emailInput) {
    await emailInput.click({ clickCount: 3 });
    await emailInput.type('carlos.cobos.ex@gmail.com', { delay: 15 });
    
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.type('triple3', { delay: 15 });
    }
    
    await page.screenshot({ path: 'dp-filled.png' });
    await sleep(500);
    
    // Find and click submit
    const [submitBtn] = await page.$x('//button[contains(text(), "Continuar") or contains(text(), "Iniciar") or contains(text(), "Login") or contains(text(), "email")]');
    if (submitBtn) {
      console.log('4. Clicking submit...');
      await submitBtn.click();
      await sleep(5000);
      await page.screenshot({ path: 'dp-loggedin.png' });
      console.log('   After login URL:', page.url());
    }
  }
}

const currentUrl = page.url();
if (!currentUrl.includes('login') && !currentUrl.includes('auth')) {
  console.log('\n5. On editor! Extracting layout...');

  const ui = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('*'));
    const visible = allEls.filter(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 5 && r.height > 5 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    const buttons = visible.filter(el => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button');
    
    return {
      totalVisible: visible.length,
      buttons: buttons.slice(0, 100).map(b => {
        const r = b.getBoundingClientRect();
        return {
          text: (b.textContent || '').trim().substring(0, 50),
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.w), h: Math.round(r.h),
        };
      }),
      areas: visible.filter(el => {
        const r = el.getBoundingClientRect();
        return r.w > 200 && r.h > 200 && ['DIV', 'SECTION', 'MAIN', 'ASIDE', 'CANVAS'].includes(el.tagName);
      }).map(el => ({
        tag: el.tagName,
        id: el.id?.substring(0, 30) || '',
        cls: (el.className || '').substring(0, 80),
        x: Math.round(el.getBoundingClientRect().x),
        y: Math.round(el.getBoundingClientRect().y),
        w: Math.round(el.getBoundingClientRect().w),
        h: Math.round(el.getBoundingClientRect().h),
        children: el.children.length,
      })),
    };
  });

  console.log('\n=== UI LAYOUT ===');
  console.log('Total visible:', ui.totalVisible);
  
  console.log('\n=== MAIN AREAS ===');
  ui.areas.sort((a, b) => a.y - b.y || a.x - b.x);
  ui.areas.forEach(e => {
    console.log(`  <${e.tag}#${e.id}> [${e.x},${e.y} ${e.w}x${e.h}] ${e.children}c`);
  });

  console.log('\n=== BUTTONS (sorted by position) ===');
  ui.buttons.sort((a, b) => a.y - b.y || a.x - b.x);
  ui.buttons.forEach(b => {
    console.log(`  [${b.x},${b.y} ${b.w}x${b.h}] "${b.text}"`);
  });
}

await page.screenshot({ path: 'dp-final.png', fullPage: true });
console.log('\n6. Final screenshot saved');

await browser.close();
console.log('Done!');
