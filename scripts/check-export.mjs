import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const APP_URL = process.env.APP_URL || 'http://localhost:3000/#/settings';
  console.log('Navigating to', APP_URL);
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const swController = await page.evaluate(() => {
    return {
      controller: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    };
  });
  console.log('navigator.serviceWorker.controller:', swController.controller);
  const registrationInfo = await page.evaluate(async () => {
    try {
      const r = await navigator.serviceWorker.getRegistration();
      return r
        ? {
            scriptURL: r.scriptURL,
            scope: r.scope,
            active: !!r.active,
            installing: !!r.installing,
            waiting: !!r.waiting,
          }
        : null;
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log('registration:', registrationInfo);

  const lastPayloadBefore = await page.evaluate(() => window.__lastExportPayload || null);
  console.log('lastExportPayload before:', lastPayloadBefore ? 'present' : 'null');

  console.log('Invoking window.exportGrowthDb()...');
  await page.evaluate(() => {
    try {
      if (window.exportGrowthDb) window.exportGrowthDb();
    } catch (e) {
      // ignore
    }
  });

  // wait for gj:export-ready or __lastExportPayload
  const signaled = await page.evaluate(() =>
    new Promise((resolve) => {
      if (window.__lastExportPayload) return resolve(true);
      const onReady = () => {
        window.removeEventListener('gj:export-ready', onReady);
        resolve(true);
      };
      window.addEventListener('gj:export-ready', onReady);
      setTimeout(() => resolve(false), 10000);
    }),
  );
  console.log('gj:export-ready signaled:', signaled);
  const lastPayloadAfter = await page.evaluate(() => window.__lastExportPayload || null);
  console.log('lastExportPayload after:', lastPayloadAfter ? 'present' : 'null');
  if (lastPayloadAfter) {
    console.log('Payload keys:', Object.keys(lastPayloadAfter));
  }

  await browser.close();
})();
