import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('personal growth view opens', async ({ page }) => {
  await page.goto(APP_URL + '#/growth');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('personal-growth')).toBeVisible({ timeout: 15000 });
});
