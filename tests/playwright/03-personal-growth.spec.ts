import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('personal growth view opens', async ({ page }) => {
  await page.goto(APP_URL + '#/growth');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!(window as any).customElements?.get?.('personal-growth'), null, {
    timeout: 20000,
  });
  await page.waitForSelector('personal-growth', { timeout: 20000 });
  await expect(page.locator('personal-growth')).toBeVisible({ timeout: 20000 });
});
