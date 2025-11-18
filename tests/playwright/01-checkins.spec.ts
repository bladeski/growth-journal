import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Check-ins', () => {
  test('open morning, fill minimal and submit', async ({ page }) => {
    await page.goto(APP_URL + '#/morning');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('morning-checkin')).toBeVisible({ timeout: 15000 });
    const input = await page.locator('morning-checkin input[type="text"]').first();
    if (await input.count()) await input.fill('Test morning intention');
    const submit = await page.locator('morning-checkin button[type="submit"]').first();
    if (await submit.count()) await submit.click();
  });

  test('open midday and evening forms', async ({ page }) => {
    await page.goto(APP_URL + '#/midday');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('midday-checkin')).toBeVisible({ timeout: 15000 });
    await page.goto(APP_URL + '#/evening');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('evening-checkin')).toBeVisible({ timeout: 15000 });
  });
});
