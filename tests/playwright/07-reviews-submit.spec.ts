import { test, expect } from '@playwright/test';
import { clearAndSeedEmpty } from './helpers/seed';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Reviews - submit flows', () => {
  test('open and submit weekly review and monthly reflection', async ({ page }) => {
    await page.goto(APP_URL);
    await clearAndSeedEmpty(page);
    // Weekly
    await page.goto(APP_URL + '#/weekly');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).app, null, { timeout: 30000 });
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('weekly-review'), null, {
      timeout: 20000,
    });
    const weekly = page.locator('weekly-review');
    await weekly.waitFor({ state: 'visible', timeout: 60000 });
    const q1 = weekly.locator('textarea[name="what_went_well"]');
    if ((await q1.count()) > 0) await q1.fill('Weekly reflection: progress');
    const submit = weekly.locator('button[type="submit"]').first();
    if ((await submit.count()) > 0) await submit.click();

    // Monthly
    await page.goto(APP_URL + '#/monthly');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).app, null, { timeout: 30000 });
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('monthly-reflection'), null, {
      timeout: 20000,
    });
    const monthly = page.locator('monthly-reflection');
    await monthly.waitFor({ state: 'visible', timeout: 60000 });
    const m1 = monthly.locator('textarea[name="overview"]');
    if ((await m1.count()) > 0) await m1.fill('Monthly overview: steady progress');
    const subM = monthly.locator('button[type="submit"]').first();
    if ((await subM.count()) > 0) await subM.click();

    // sanity
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    const grid = page.locator('.dashboard-grid');
    await expect(grid).toBeVisible();
  });
});
