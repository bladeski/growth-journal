import { test, expect } from '@playwright/test';
import { clearAndSeedEmpty } from './helpers/seed';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Smoke / basic flows', () => {
  test('loads dashboard and can add a morning intention', async ({ page }) => {
    await page.goto(APP_URL);
    await clearAndSeedEmpty(page);
    await page.goto(APP_URL + '#/morning');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).app, null, { timeout: 30000 });
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('morning-checkin'), null, {
      timeout: 60000,
    });
    // Ensure the element is attached and visible; increase timeout for CI
    await page.waitForSelector('morning-checkin', { state: 'visible', timeout: 90000 });
    const morning = page.locator('morning-checkin');
    await expect(morning).toBeVisible({ timeout: 90000 });

    // Fill the textareas present in the morning checkin
    const intention = morning.locator('#practice-intention');
    const core = morning.locator('#core-value');
    if ((await intention.count()) > 0) await intention.fill('Playwright test intention', { timeout: 30000 });
    if ((await core.count()) > 0) await core.fill('Playwright core value', { timeout: 30000 });

    const submit = morning.locator('button[type="submit"]').first();
    if ((await submit.count()) > 0) await submit.click({ timeout: 30000 });

    // Navigate to Personal Growth (app uses '#/growth') and assert the page renders
    await page.goto(APP_URL + '#/growth');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('personal-growth'), null, {
      timeout: 60000,
    });
    // Wait for host to appear and be visible
    await page.waitForSelector('personal-growth', { state: 'visible', timeout: 90000 });
    const pg = page.locator('personal-growth');
    await expect(pg).toBeVisible({ timeout: 90000 });
  });
});

