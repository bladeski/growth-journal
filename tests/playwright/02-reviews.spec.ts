import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('open weekly review', async ({ page }) => {
  await page.goto(APP_URL + '#/weekly');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!(window as any).customElements?.get?.('weekly-review'), null, {
    timeout: 20000,
  });
  await page.waitForSelector('weekly-review', { timeout: 20000 });
  await expect(page.locator('weekly-review')).toBeVisible({ timeout: 20000 });
});

test('open monthly reflection', async ({ page }) => {
  await page.goto(APP_URL + '#/monthly');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!(window as any).customElements?.get?.('monthly-reflection'), null, {
    timeout: 20000,
  });
  await page.waitForSelector('monthly-reflection', { timeout: 20000 });
  await expect(page.locator('monthly-reflection')).toBeVisible({ timeout: 20000 });
});
