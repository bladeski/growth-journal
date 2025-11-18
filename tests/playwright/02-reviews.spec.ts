import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('open weekly review', async ({ page }) => {
  await page.goto(APP_URL + '#/weekly');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('weekly-review')).toBeVisible({ timeout: 15000 });
});

test('open monthly reflection', async ({ page }) => {
  await page.goto(APP_URL + '#/monthly');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('monthly-reflection')).toBeVisible({ timeout: 15000 });
});
