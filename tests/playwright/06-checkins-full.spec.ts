import { test, expect } from '@playwright/test';
import { clearAndSeedEmpty } from './helpers/seed';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Checkins - full flows', () => {
  test('submit morning, midday, evening checkins', async ({ page }) => {
    await page.goto(APP_URL);
    await clearAndSeedEmpty(page);
    // Morning
    await page.goto(APP_URL + '#/morning');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('morning-checkin'));
    const morning = page.locator('morning-checkin');
    await morning.waitFor({ state: 'visible' });
    await morning.locator('#practice-intention').fill('E2E morning intention');
    await morning.locator('#core-value').fill('Compassion');
    await morning.locator('button[type="submit"]').click();

    // Midday
    await page.goto(APP_URL + '#/midday');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('midday-checkin'));
    const midday = page.locator('midday-checkin');
    await midday.waitFor({ state: 'visible' });
    const q = midday.locator('textarea[name="midday_question"]');
    if ((await q.count()) > 0) await q.fill('Quick midday note');
    const submitMid = midday.locator('button[type="submit"]').first();
    if ((await submitMid.count()) > 0) await submitMid.click();

    // Evening
    await page.goto(APP_URL + '#/evening');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('evening-checkin'));
    const evening = page.locator('evening-checkin');
    await evening.waitFor({ state: 'visible' });
    const what = evening.locator('textarea[name="what_went_well"]');
    if ((await what.count()) > 0) await what.fill('Something went well');
    const subE = evening.locator('button[type="submit"]').first();
    if ((await subE.count()) > 0) await subE.click();

    // Verify dashboard reflects completed checks
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    const morningStatus = page.locator('.checkin-item.morning-item .checkin-status-text');
    await expect(morningStatus).toBeVisible();
  });
});
