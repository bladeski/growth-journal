import { test, expect } from '@playwright/test';
import { clearAndSeedEmpty } from './helpers/seed';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Settings - export/import/clear', () => {
  test('export DB, import minimal payload, clear cache', async ({ page }) => {
    await page.goto(APP_URL);
    await clearAndSeedEmpty(page);
    await page.goto(APP_URL + '#/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as any).customElements?.get?.('app-settings'));
    const settings = page.locator('app-settings');
    await settings.waitFor({ state: 'visible' });

    // Export (click export button if present)
    const exportBtn = settings.locator('button#export-db');
    if ((await exportBtn.count()) > 0) await exportBtn.click();

    // Import: use the global helper to import a minimal payload
    await page.evaluate(() => {
      // small import payload format matches IndexedDbDataService.importDatabase
      (window as any).importGrowthDb?.({
        'growth-intentions': [],
        'morning-checkins': [],
      });
    });

    // Clear cache button (if present)
    const clearBtn = settings.locator('button#clear-cache');
    if ((await clearBtn.count()) > 0) await clearBtn.click();

    // Assert settings page still visible
    await expect(settings).toBeVisible();
  });
});
