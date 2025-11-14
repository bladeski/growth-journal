import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

type TestBeforeInstallPromptEvent = {
  prompt?: () => void;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
} & Event;

test('PWA install prompt UI appears when beforeinstallprompt fired', async ({ page }) => {
  await page.goto(APP_URL);
  await page.evaluate(() => {
    const ev = new Event('beforeinstallprompt') as unknown as TestBeforeInstallPromptEvent;
    (ev as unknown as TestBeforeInstallPromptEvent).prompt = () => {};
    (ev as unknown as TestBeforeInstallPromptEvent).userChoice = Promise.resolve({
      outcome: 'dismissed',
    });
    window.dispatchEvent(ev as unknown as Event);
  });

  await page.waitForSelector('.install-container', { timeout: 5000 });
  const container = await page.$('.install-container');
  expect(container).not.toBeNull();

  await page.click('#install-ignore');
  await page.waitForTimeout(200);
  const hidden = await page.$eval(
    '.install-container',
    (el) => (el as HTMLElement).style.display === 'none'
  );
  expect(hidden).toBeTruthy();
});
