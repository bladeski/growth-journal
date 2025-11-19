import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const rawAppUrl = process.env.APP_URL || 'http://localhost:3000';
// Ensure the URL used for this spec always navigates to the settings hash
const APP_URL = rawAppUrl.includes('#') ? rawAppUrl : rawAppUrl.replace(/\/$/, '') + '/#/settings';

test('settings export/import/clear flows', async ({ page }) => {
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  // Scope all selectors to the rendered settings component (shadow DOM)
  await page.waitForFunction(() => !!(window as any).app, null, { timeout: 30000 });
  const settings = page.locator('app-settings');
  await settings.waitFor({ state: 'attached', timeout: 60000 });

  // Wait for the settings content (or the export button) to be available inside the component
  const exportBtn = settings.locator('#export-db');
  await exportBtn.waitFor({ state: 'visible', timeout: 60000 });
  await expect(exportBtn).toBeVisible({ timeout: 60000 });

  const downloadsDir = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

  const [download] = await Promise.all([page.waitForEvent('download'), exportBtn.click()]);
  const filename = download.suggestedFilename() || 'backup.json';
  const saved = path.join(downloadsDir, filename);
  await download.saveAs(saved);

  const fileInput = settings.locator('#import-file');
  await expect(fileInput).toBeAttached({ timeout: 15000 });
  await fileInput.setInputFiles(saved);
  await settings.locator('#import-db').click();

  const message = settings.locator('#settings-message');
  await expect(message).toHaveText(/import completed/i, { timeout: 15000 });

  page.on('dialog', async (d) => d.accept());
  await settings.locator('#clear-db').click();
  await expect(message).toHaveText(/all data cleared|failed to clear data/i, { timeout: 30000 });

  await settings.locator('#clear-cache').click();
  await expect(message).toHaveText(/cache cleared|failed to clear cache/i, { timeout: 30000 });

  try {
    fs.rmSync(downloadsDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
