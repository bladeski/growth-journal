import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('dashboard smoke test', async ({ page }) => {
  // try navigation and allow server a bit longer to start locally
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!(window as any).customElements?.get?.('growth-dashboard'), null, { timeout: 60000 });
  await page.waitForSelector('growth-dashboard', { timeout: 60000 });
  await page.waitForSelector('h1', { timeout: 60000 });
  await expect(page.locator('h1')).toHaveText(/Growth Journal/i, { timeout: 60000 });
});
