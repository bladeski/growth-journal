import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('open weekly review', async ({ page }) => {
  await page.goto(APP_URL + '#/weekly');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!(window as any).customElements?.get?.('weekly-review'), null, {
    timeout: 30000,
  });

  const weekly = page.locator('weekly-review');
  await weekly.waitFor({ state: 'visible', timeout: 30000 });
  await expect(weekly).toBeVisible({ timeout: 30000 });
});

test('open monthly reflection', async ({ page }) => {
  await page.goto(APP_URL + '#/monthly');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!(window as any).customElements?.get?.('monthly-reflection'), null, {
    timeout: 30000,
  });

  const monthly = page.locator('monthly-reflection');
  await monthly.waitFor({ state: 'visible', timeout: 30000 });
  await expect(monthly).toBeVisible({ timeout: 30000 });
});
