import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/app/settings?tab=integrations');
  await page.waitForSelector('button');
  
  const html = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map(b => b.innerText + ' (' + b.className + ')');
  });
  console.log('Buttons:', html);
  
  // Try to click "Connect" on WhatsApp Business
  const connectBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Connect'));
  });
  
  if (connectBtn) {
    console.log('Clicking Connect...');
    await connectBtn.click();
    await page.waitForTimeout(1000);
    const modalHtml = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal ? modal.innerHTML : 'No modal found';
    });
    console.log('Modal HTML:', modalHtml);
  } else {
    console.log('Connect button not found');
  }

  await browser.close();
})();
