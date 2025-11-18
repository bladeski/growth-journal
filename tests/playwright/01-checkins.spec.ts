import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Check-ins', () => {
  test('open morning, fill minimal and submit', async ({ page }) => {
    await page.goto(APP_URL + '#/morning');
    // Wait for network to settle and the app to render
    await page.waitForLoadState('networkidle');
    // Ensure the custom element is defined and present in the DOM
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('morning-checkin'), null, {
      timeout: 30000,
    });

    const morning = page.locator('morning-checkin');
    await morning.waitFor({ state: 'visible', timeout: 30000 });
    await expect(morning).toBeVisible({ timeout: 30000 });

    const input = morning.locator('input[type="text"]').first();
    if ((await input.count()) > 0) await input.fill('Test morning intention', { timeout: 30000 });

    const submit = morning.locator('button[type="submit"]').first();
    if ((await submit.count()) > 0) await submit.click({ timeout: 30000 });
  });

  test('open midday and evening forms', async ({ page }) => {
    await page.goto(APP_URL + '#/midday');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('midday-checkin'), null, {
      timeout: 30000,
    });

    const midday = page.locator('midday-checkin');
    await midday.waitFor({ state: 'visible', timeout: 30000 });
    await expect(midday).toBeVisible({ timeout: 30000 });

    await page.goto(APP_URL + '#/evening');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('evening-checkin'), null, {
      timeout: 30000,
    });

    const evening = page.locator('evening-checkin');
    await evening.waitFor({ state: 'visible', timeout: 30000 });
    await expect(evening).toBeVisible({ timeout: 30000 });
  });
});
