import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('dashboard smoke test', async ({ page }) => {
  await page.goto(APP_URL);
  await page.waitForSelector('growth-dashboard', { timeout: 5000 });
  await page.waitForSelector('h1', { timeout: 5000 });
  await expect(page.locator('h1')).toHaveText(/Growth Journal/i);
});
