const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 30000 });
    // Wait a bit for SW registration to occur
    await page.waitForTimeout(2000);
    const info = await page.evaluate(async () => {
      const controller = !!navigator.serviceWorker && !!navigator.serviceWorker.controller;
      let registrationInfo = null;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          registrationInfo = {
            scope: reg.scope,
            active: !!reg.active,
            installing: !!reg.installing,
            waiting: !!reg.waiting,
          };
        }
      } catch (e) {
        registrationInfo = { error: String(e) };
      }

      return {
        controller,
        registration: registrationInfo,
        userAgent: navigator.userAgent,
      };
    });

    console.log('SW info:', JSON.stringify(info, null, 2));
    console.log('Now printing page console logs for 3s...');
    page.on('console', (msg) => console.log('PAGE CONSOLE>', msg.type(), msg.text()));
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('Error checking SW:', e);
  } finally {
    await browser.close();
  }
})();
