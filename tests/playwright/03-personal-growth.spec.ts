import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('personal growth view opens', async ({ page }) => {
  await page.goto(APP_URL + '#/growth');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!(window as any).customElements?.get?.('personal-growth'), null, {
    timeout: 30000,
  });

  const pg = page.locator('personal-growth');
  await pg.waitFor({ state: 'visible', timeout: 30000 });
  await expect(pg).toBeVisible({ timeout: 30000 });
});
